import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.utils import timezone
from datetime import timedelta
from django.db import close_old_connections, connections
from django.test import Client, TestCase, TransactionTestCase

from config.asgi import application
from .models import Attempt, BehaviorEvent, ChatMessage, Completion, Presence, Traveler
from .repositories import DjangoPresenceRepository, DjangoTravelerRepository
from .scenarios import SCENARIO_BY_ID


class ApiTests(TestCase):
    def setUp(self):
        self.repository = DjangoTravelerRepository()
        self.session = self.repository.create_session('여행자', 'explorer')
        self.headers = {'HTTP_AUTHORIZATION': f"Bearer {self.session['token']}"}

    def post(self, path, value):
        return self.client.post(path, data=json.dumps(value), content_type='application/json', **self.headers)

    def test_progress_requires_auth_and_tokens_are_hashed(self):
        self.assertEqual(self.client.get('/api/progress').status_code, 401)
        traveler = Traveler.objects.get(id=self.session['sessionId'])
        self.assertNotEqual(traveler.token_hash, self.session['token'])
        self.assertEqual(self.client.get('/api/progress', **self.headers).json(), {'completed': [], 'xp': 0})

    def test_server_grades_and_repeat_reward_is_not_issued(self):
        steps = SCENARIO_BY_ID['prepare']['steps']
        wrong = [next(option['id'] for option in step['options'] if option['id'] != step['correctOptionId']) for step in steps]
        first = self.post('/api/scenarios/prepare/attempt', {'answers': wrong, 'idempotencyKey': 'wrong', 'score': 999, 'xp': 999}).json()
        self.assertFalse(first['passed'])
        self.assertEqual(first['xp'], 0)
        answers = [step['correctOptionId'] for step in steps]
        first = self.post('/api/scenarios/prepare/attempt', {'answers': answers, 'idempotencyKey': 'correct'}).json()
        replay = self.post('/api/scenarios/prepare/attempt', {'answers': answers, 'idempotencyKey': 'correct'}).json()
        second = self.post('/api/scenarios/prepare/attempt', {'answers': answers, 'idempotencyKey': 'new'}).json()
        self.assertEqual(first, replay)
        self.assertEqual(first['xpEarned'], 100)
        self.assertEqual(second['xpEarned'], 0)
        self.assertEqual(second['xp'], 100)
        self.assertEqual(Completion.objects.count(), 1)
        self.assertEqual(self.post('/api/scenarios/prepare/attempt', {'answers': wrong, 'idempotencyKey': 'correct'}).status_code, 409)

    def test_telemetry_dedup_and_user_isolation(self):
        batch = {'events': [{'id': 'event-1', 'type': 'mission_opened', 'properties': {'scenarioId': 'prepare'}, 'timestamp': '2026-11-16T00:00:00Z'}]}
        self.assertEqual(self.post('/api/events', batch).json(), {'accepted': 1})
        self.assertEqual(self.post('/api/events', batch).json(), {'accepted': 0})
        summary = self.client.get('/api/events/summary', **self.headers).json()
        self.assertEqual(summary, {'total': 1, 'counts': {'mission_opened': 1}})
        stranger = self.repository.create_session('다른 여행자', 'explorer')
        self.assertEqual(self.client.get('/api/events/summary', HTTP_AUTHORIZATION=f"Bearer {stranger['token']}").json()['total'], 0)

    def test_invalid_input_and_origin(self):
        self.assertEqual(self.post('/api/scenarios/prepare/attempt', {'answers': [], 'idempotencyKey': 'x'}).status_code, 400)
        self.assertEqual(self.post('/api/events', {'events': [{'id': 'x', 'type': 'x', 'properties': 'wrong'}]}).status_code, 400)
        self.assertEqual(self.client.post('/api/sessions', data='[]', content_type='application/json').status_code, 400)
        self.assertEqual(self.client.get('/api/health', HTTP_ORIGIN='https://evil.example').status_code, 403)
        self.assertEqual(self.client.post('/api/sessions', data='[' * 2000 + '0' + ']' * 2000, content_type='application/json').status_code, 400)
        self.assertEqual(self.post('/api/sessions', {'nickname': '\ud800', 'avatar': 'mint'}).status_code, 400)

    def test_max_length_idempotency_key_works_on_all_databases(self):
        answers = [step['correctOptionId'] for step in SCENARIO_BY_ID['prepare']['steps']]
        self.assertEqual(self.post('/api/scenarios/prepare/attempt', {'answers': answers, 'idempotencyKey': 'a' * 80}).status_code, 200)
        event = BehaviorEvent.objects.get()
        self.assertLessEqual(len(event.event_id), 80)


    def test_replayed_attempt_keeps_current_journey_progress(self):
        answers = [step['correctOptionId'] for step in SCENARIO_BY_ID['prepare']['steps']]
        self.post('/api/scenarios/prepare/attempt', {'answers': answers, 'idempotencyKey': 'first'})
        hotel_answers = [step['correctOptionId'] for step in SCENARIO_BY_ID['hotel']['steps']]
        self.post('/api/scenarios/hotel/attempt', {'answers': hotel_answers, 'idempotencyKey': 'hotel'})
        replay = self.post('/api/scenarios/prepare/attempt', {'answers': answers, 'idempotencyKey': 'first'}).json()
        self.assertEqual(replay['xp'], 250)
        self.assertEqual(replay['completed'], ['prepare', 'hotel'])
        self.assertEqual(Completion.objects.count(), 2)

    def test_opaque_keys_preserve_case_distinctions_across_databases(self):
        answers = [step['correctOptionId'] for step in SCENARIO_BY_ID['prepare']['steps']]
        first = self.post('/api/scenarios/prepare/attempt', {'answers': answers, 'idempotencyKey': 'CaseKey'}).json()
        second = self.post('/api/scenarios/prepare/attempt', {'answers': answers, 'idempotencyKey': 'casekey'}).json()
        self.assertEqual(first['xpEarned'], 100)
        self.assertEqual(second['xpEarned'], 0)
        self.assertEqual(Attempt.objects.count(), 2)
        batch = {'events': [{'id': 'EventKey', 'type': 'opened'}, {'id': 'eventkey', 'type': 'opened'}]}
        self.assertEqual(self.post('/api/events', batch).json(), {'accepted': 2})
        self.assertEqual(self.post('/api/events', batch).json(), {'accepted': 0})


class PresenceLeaseTests(TestCase):
    def test_heartbeat_preserves_position_and_recovers_collected_lease(self):
        session = DjangoTravelerRepository().create_session('여행자', 'mint')
        repository = DjangoPresenceRepository()
        repository.join('channel-1', session['sessionId'], 'shanghai')
        repository.move('channel-1', 30, 40, session['sessionId'], 'shanghai')
        repository.refresh('channel-1', session['sessionId'], 'shanghai')
        self.assertEqual(repository.players('shanghai')[0]['x'], 30)
        Presence.objects.update(last_seen=timezone.now() - timedelta(seconds=100))
        self.assertEqual(repository.players('shanghai'), [])
        repository.cleanup()
        self.assertFalse(Presence.objects.exists())
        repository.refresh('channel-1', session['sessionId'], 'shanghai')
        self.assertEqual(len(repository.players('shanghai')), 1)
        Presence.objects.all().delete()
        moved = repository.move('channel-1', 35, 45, session['sessionId'], 'shanghai')
        self.assertEqual((moved['x'], moved['y']), (35, 45))


class ConcurrencyTests(TransactionTestCase):
    def test_concurrent_attempts_issue_one_reward_and_replay_one_attempt(self):
        repository = DjangoTravelerRepository()
        session = repository.create_session('동시 접속', 'explorer')
        answers = [step['correctOptionId'] for step in SCENARIO_BY_ID['prepare']['steps']]

        def submit(key):
            close_old_connections()
            try:
                return DjangoTravelerRepository().submit_attempt(session['sessionId'], 'prepare', answers, key)
            finally:
                connections.close_all()

        # Different request IDs arriving together must still earn only one reward.
        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(submit, [f'parallel-{index}' for index in range(6)]))
        self.assertEqual(sum(result['xpEarned'] for result in results), 100)
        self.assertEqual(Completion.objects.count(), 1)
        self.assertEqual(repository.progress(session['sessionId'])['xp'], 100)
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(submit, ['same-key'] * 4))
        self.assertTrue(all(result == results[0] for result in results))
        self.assertEqual(Attempt.objects.count(), 7)


class RealtimeTests(TransactionTestCase):
    def test_two_users_exchange_presence_movement_chat_and_reconnect_history(self):
        repository = DjangoTravelerRepository()
        first = repository.create_session('봄', 'explorer')
        second = repository.create_session('여름', 'explorer')

        async def receive_type(client, kind):
            for _ in range(12):
                message = await client.receive_json_from(timeout=3)
                if message.get('type') == kind:
                    return message
            self.fail(f'{kind} message missing')

        async def exercise():
            a = WebsocketCommunicator(application, f"/ws/world?token={first['token']}&room=shanghai")
            b = WebsocketCommunicator(application, f"/ws/world?token={second['token']}&room=SHANGHAI")
            self.assertTrue((await a.connect())[0])
            self.assertEqual(len((await receive_type(a, 'snapshot'))['players']), 1)
            self.assertTrue((await b.connect())[0])
            snapshot = await receive_type(b, 'snapshot')
            self.assertEqual(len(snapshot['players']), 2)
            await a.send_json_to({'type': 'move', 'x': 25, 'y': 70})
            movement = await receive_type(b, 'move')
            self.assertEqual(movement['player']['id'], first['sessionId'])
            self.assertEqual(movement['player']['x'], 25)
            await a.send_json_to({'type': 'chat', 'text': '같이 여행 준비해요!'})
            chat = await receive_type(b, 'chat')
            self.assertEqual(chat['message']['text'], '같이 여행 준비해요!')
            self.assertEqual(chat['message']['sessionId'], first['sessionId'])
            await b.send_to(text_data='broken json')
            self.assertEqual((await receive_type(b, 'error'))['type'], 'error')
            await b.send_json_to({'type': 'move', 'x': 10 ** 1000, 'y': 4})
            self.assertIn('좌표', (await receive_type(b, 'error'))['message'])
            await b.send_json_to({'type': 'chat', 'text': '\ud800'})
            self.assertIn('문자', (await receive_type(b, 'error'))['message'])
            await b.send_json_to({'type': 'move', 'x': -1, 'y': 4})
            self.assertIn('좌표', (await receive_type(b, 'error'))['message'])
            await a.disconnect()
            await b.disconnect()
            c = WebsocketCommunicator(application, f"/ws/world?token={second['token']}&room=shanghai")
            self.assertTrue((await c.connect())[0])
            snapshot = await receive_type(c, 'snapshot')
            self.assertEqual(len(snapshot['messages']), 1)
            self.assertEqual(len(snapshot['players']), 1)
            await c.disconnect()
            invalid = WebsocketCommunicator(application, '/ws/world?token=invalid')
            self.assertFalse((await invalid.connect())[0])

        async_to_sync(exercise)()
        self.assertEqual(ChatMessage.objects.count(), 1)
        self.assertEqual(Presence.objects.count(), 0)


class FieldIsolationTests(TransactionTestCase):
    def test_field_switches_isolate_presence_chat_movement_and_history(self):
        repository = DjangoTravelerRepository()
        traveler = repository.create_session('필드 여행자', 'mint')
        companion = repository.create_session('준비 친구', 'explorer')
        hotel_guest = repository.create_session('호텔 친구', 'explorer')
        answers = [step['correctOptionId'] for step in SCENARIO_BY_ID['prepare']['steps']]
        repository.submit_attempt(traveler['sessionId'], 'prepare', answers, 'journey-progress')

        async def receive_type(client, kind):
            for _ in range(12):
                message = await client.receive_json_from(timeout=3)
                if message.get('type') == kind:
                    return message
            self.fail(f'{kind} message missing')

        async def drain(client):
            for _ in range(20):
                if await client.receive_nothing(timeout=0.01):
                    return
                await client.receive_json_from(timeout=1)
            self.fail('Unexpected continuous messages')

        async def enter(session, room):
            client = WebsocketCommunicator(application, f"/ws/world?token={session['token']}&room={room}")
            self.assertTrue((await client.connect())[0])
            snapshot = await receive_type(client, 'snapshot')
            return client, snapshot

        async def exercise():
            a, snapshot = await enter(traveler, 'prepare')
            self.assertEqual([player['id'] for player in snapshot['players']], [traveler['sessionId']])
            b, snapshot = await enter(companion, 'prepare')
            self.assertEqual(len(snapshot['players']), 2)
            c, snapshot = await enter(hotel_guest, 'hotel')
            self.assertEqual([player['id'] for player in snapshot['players']], [hotel_guest['sessionId']])
            self.assertEqual(snapshot['messages'], [])
            await drain(a)
            await drain(b)
            await drain(c)

            await a.send_json_to({'type': 'move', 'x': 28, 'y': 54})
            self.assertEqual((await receive_type(b, 'move'))['player']['x'], 28)
            await a.send_json_to({'type': 'chat', 'text': '준비 필드의 대화'})
            self.assertEqual((await receive_type(b, 'chat'))['message']['text'], '준비 필드의 대화')
            self.assertTrue(await c.receive_nothing(timeout=0.03))
            await drain(a)
            await c.send_json_to({'type': 'chat', 'text': '호텔 필드의 대화'})
            self.assertEqual((await receive_type(c, 'chat'))['message']['text'], '호텔 필드의 대화')
            self.assertTrue(await a.receive_nothing(timeout=0.03))
            self.assertTrue(await b.receive_nothing(timeout=0.03))

            await a.disconnect()
            presence = await receive_type(b, 'presence')
            self.assertEqual([player['id'] for player in presence['players']], [companion['sessionId']])
            a, snapshot = await enter(traveler, 'immigration')
            self.assertEqual([player['id'] for player in snapshot['players']], [traveler['sessionId']])
            self.assertEqual(snapshot['messages'], [])
            await drain(a)
            await b.send_json_to({'type': 'chat', 'text': '준비 필드에 남은 대화'})
            await receive_type(b, 'chat')
            self.assertTrue(await a.receive_nothing(timeout=0.03))

            await a.disconnect()
            a, snapshot = await enter(traveler, 'hotel')
            self.assertEqual({player['id'] for player in snapshot['players']}, {traveler['sessionId'], hotel_guest['sessionId']})
            self.assertEqual([message['text'] for message in snapshot['messages']], ['호텔 필드의 대화'])
            await a.disconnect()
            a, snapshot = await enter(traveler, 'didi')
            self.assertEqual([player['id'] for player in snapshot['players']], [traveler['sessionId']])
            self.assertEqual(snapshot['messages'], [])
            await a.disconnect()
            a, snapshot = await enter(traveler, 'prepare')
            self.assertEqual({player['id'] for player in snapshot['players']}, {traveler['sessionId'], companion['sessionId']})
            self.assertEqual([message['text'] for message in snapshot['messages']], ['준비 필드의 대화', '준비 필드에 남은 대화'])
            await a.disconnect()
            await b.disconnect()
            await c.disconnect()

        async_to_sync(exercise)()
        self.assertEqual(Presence.objects.count(), 0)
        self.assertEqual(ChatMessage.objects.count(), 3)
        self.assertEqual(repository.progress(traveler['sessionId']), {'completed': ['prepare'], 'xp': 100})
        self.assertEqual(str(repository.authenticate(traveler['token']).id), traveler['sessionId'])
