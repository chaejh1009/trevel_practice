import hashlib
import secrets
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count
from django.utils import timezone

from .models import Attempt, BehaviorEvent, ChatMessage, Completion, Presence, Traveler
from .scenarios import SCENARIO_BY_ID


def chat_payload(message):
    return {'id': str(message.id), 'sessionId': str(message.traveler_id), 'nickname': message.traveler.nickname,
            'text': message.text, 'createdAt': message.created_at.isoformat()}


class DjangoTravelerRepository:
    def create_session(self, nickname, avatar):
        token = secrets.token_urlsafe(32)
        traveler = Traveler.objects.create(nickname=nickname, avatar=avatar, token_hash=hashlib.sha256(token.encode()).hexdigest())
        return {'sessionId': str(traveler.id), 'token': token, 'nickname': nickname, 'avatar': avatar,
                'progress': {'completed': [], 'xp': 0}}

    def authenticate(self, token):
        if not token or len(token) > 200:
            return None
        return Traveler.objects.filter(token_hash=hashlib.sha256(token.encode()).hexdigest()).first()

    def progress(self, traveler_id):
        # Derive both fields from one query so concurrent completions cannot split the snapshot.
        completions = list(Completion.objects.filter(traveler_id=traveler_id).order_by('created_at').values('scenario_id', 'reward'))
        return {'completed': [row['scenario_id'] for row in completions],
                'xp': sum(row['reward'] for row in completions)}

    def submit_attempt(self, traveler_id, scenario_id, answers, key):
        scenario = SCENARIO_BY_ID[scenario_id]
        # Hex digests preserve opaque-key case distinctions under MySQL's default collation.
        key_digest = hashlib.sha256(key.encode()).hexdigest()
        # SQLite IMMEDIATE transactions acquire the writer lease before reads.
        # MySQL serializes attempts for one traveler through SELECT FOR UPDATE.
        for retry in range(3):
            try:
                with transaction.atomic():
                    Traveler.objects.select_for_update().get(id=traveler_id)
                    existing = Attempt.objects.filter(traveler_id=traveler_id, scenario_id=scenario_id, idempotency_key=key_digest).first()
                    if existing:
                        if existing.answers != answers:
                            raise ValueError('같은 요청 키로 다른 답안을 제출할 수 없습니다.')
                        # Replay the original grading outcome with current journey state.
                        return {**existing.result, **self.progress(traveler_id)}
                    feedback = [{'correct': answer == step['correctOptionId'], 'explanation': step['explanation']}
                                for step, answer in zip(scenario['steps'], answers)]
                    score = sum(item['correct'] for item in feedback)
                    passed = score == len(scenario['steps'])
                    earned = 0
                    if passed:
                        _, created = Completion.objects.get_or_create(traveler_id=traveler_id, scenario_id=scenario_id,
                                                                     defaults={'reward': scenario['reward']})
                        if created:
                            earned = scenario['reward']
                    result = {'passed': passed, 'score': score, 'total': len(scenario['steps']), 'xpEarned': earned,
                              'feedback': feedback, **self.progress(traveler_id)}
                    Attempt.objects.create(traveler_id=traveler_id, scenario_id=scenario_id, idempotency_key=key_digest,
                                           answers=answers, result=result)
                    BehaviorEvent.objects.create(traveler_id=traveler_id, event_id='attempt:' + hashlib.sha256(f'{scenario_id}:{key}'.encode()).hexdigest(),
                                                 type='scenario_completed' if passed else 'scenario_attempted',
                                                 properties={'scenarioId': scenario_id, 'score': score, 'xpEarned': earned})
                    return result
            except IntegrityError:
                if retry == 2:
                    raise
        raise RuntimeError('Could not persist attempt')

    def collect_events(self, traveler_id, events):
        accepted = 0
        with transaction.atomic():
            Traveler.objects.select_for_update().get(id=traveler_id)
            for event in events:
                _, created = BehaviorEvent.objects.get_or_create(traveler_id=traveler_id, event_id='client:' + hashlib.sha256(event['id'].encode()).hexdigest(), defaults={
                    'type': event['type'], 'properties': event.get('properties', {}), 'client_timestamp': event.get('timestamp', '')})
                accepted += created
        return accepted

    def event_summary(self, traveler_id):
        query = BehaviorEvent.objects.filter(traveler_id=traveler_id)
        return {'total': query.count(), 'counts': {row['type']: row['count'] for row in query.values('type').annotate(count=Count('id'))}}

    def add_chat(self, traveler_id, room, text):
        message = ChatMessage.objects.create(traveler_id=traveler_id, room=room, text=text)
        return chat_payload(message)

    def recent_chat(self, room):
        messages = list(ChatMessage.objects.filter(room=room).select_related('traveler').order_by('-created_at')[:30])
        return [chat_payload(message) for message in reversed(messages)]


class DjangoPresenceRepository:
    lease_seconds = 75

    def join(self, connection_id, traveler_id, room):
        Presence.objects.update_or_create(connection_id=connection_id, defaults={'traveler_id': traveler_id, 'room': room, 'x': 50, 'y': 68})

    def leave(self, connection_id):
        Presence.objects.filter(connection_id=connection_id).delete()

    def refresh(self, connection_id, traveler_id, room):
        # Another worker may have collected an expired lease during a long pause.
        # Upsert restores that lease; existing coordinates remain unchanged.
        Presence.objects.update_or_create(connection_id=connection_id, defaults={'traveler_id': traveler_id, 'room': room})

    def move(self, connection_id, x, y, traveler_id, room):
        presence, _ = Presence.objects.update_or_create(connection_id=connection_id, defaults={
            'traveler_id': traveler_id, 'room': room, 'x': x, 'y': y})
        return self.payload(presence)

    def players(self, room):
        cutoff = timezone.now() - timedelta(seconds=self.lease_seconds)
        # Ignore expired leases on reads; only the occasional heartbeat deletes them.
        rows = Presence.objects.filter(room=room, last_seen__gte=cutoff).select_related('traveler').order_by('last_seen')
        return list({str(row.traveler_id): self.payload(row) for row in rows}.values())

    def cleanup(self):
        Presence.objects.filter(last_seen__lt=timezone.now() - timedelta(seconds=self.lease_seconds)).delete()

    @staticmethod
    def payload(row):
        return {'id': str(row.traveler_id), 'nickname': row.traveler.nickname, 'avatar': row.traveler.avatar, 'x': row.x, 'y': row.y}
