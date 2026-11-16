import asyncio
import contextlib
import json
import math
import re
import time
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings

from .brokers import get_room_broker
from .repositories import DjangoPresenceRepository, DjangoTravelerRepository

repository = DjangoTravelerRepository()
presence_repository = DjangoPresenceRepository()


class WorldConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.heartbeat_task = None
        self.joined = False
        headers = {key.decode().lower(): value.decode() for key, value in self.scope.get('headers', [])}
        origin = headers.get('origin')
        if origin and origin.rstrip('/') not in settings.ALLOWED_ORIGINS:
            await self.close(code=4403)
            return
        query = parse_qs(self.scope.get('query_string', b'').decode(errors='replace'))
        self.room = query.get('room', ['shanghai'])[0].lower()
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,40}', self.room):
            await self.close(code=4400)
            return
        self.traveler = await database_sync_to_async(repository.authenticate)(query.get('token', [''])[0])
        if self.traveler is None:
            await self.close(code=4401)
            return
        self.broker = get_room_broker()
        self.last_move = 0.0
        self.last_chat = 0.0
        await self.broker.join(self.room, self.channel_name)
        await database_sync_to_async(presence_repository.join)(self.channel_name, self.traveler.id, self.room)
        self.joined = True
        await self.accept()
        await self.send_json({'type': 'snapshot', 'players': await self.players(),
                              'messages': await database_sync_to_async(repository.recent_chat)(self.room)})
        await self.broadcast_presence()
        self.heartbeat_task = asyncio.create_task(self.heartbeat())

    async def disconnect(self, code):
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.heartbeat_task
        if self.joined:
            await self.broker.leave(self.room, self.channel_name)
            await database_sync_to_async(presence_repository.leave)(self.channel_name)
            await self.broadcast_presence()

    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        if text_data is None or len(text_data) > 8192:
            await self.send_json({'type': 'error', 'message': '메시지가 너무 크거나 형식이 올바르지 않습니다.'})
            return
        try:
            value = json.loads(text_data)
        except (ValueError, UnicodeError, RecursionError):
            await self.send_json({'type': 'error', 'message': '올바른 JSON 메시지가 필요합니다.'})
            return
        if not isinstance(value, dict):
            await self.send_json({'type': 'error', 'message': 'JSON 객체가 필요합니다.'})
            return
        await self.receive_json(value)

    async def receive_json(self, content, **kwargs):
        kind = content.get('type')
        now = time.monotonic()
        if kind == 'move':
            x, y = content.get('x'), content.get('y')
            if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 100 or not math.isfinite(value) for value in (x, y)):
                await self.send_json({'type': 'error', 'message': '이동 좌표는 0~100 사이여야 합니다.'})
                return
            if now - self.last_move < 0.075:
                return
            self.last_move = now
            player = await database_sync_to_async(presence_repository.move)(self.channel_name, x, y, self.traveler.id, self.room)
            await self.broker.publish(self.room, {'type': 'move', 'player': player})
        elif kind == 'chat':
            message = content.get('text')
            if not isinstance(message, str) or not 1 <= len(message.strip()) <= 300:
                await self.send_json({'type': 'error', 'message': '채팅은 1~300자로 입력해 주세요.'})
                return
            try:
                message.encode('utf-8')
            except UnicodeError:
                await self.send_json({'type': 'error', 'message': '유효한 문자로 채팅을 입력해 주세요.'})
                return
            if any(ord(char) < 32 and char not in '\n\t' for char in message):
                await self.send_json({'type': 'error', 'message': '채팅에 사용할 수 없는 문자가 포함되어 있습니다.'})
                return
            if now - self.last_chat < 0.7:
                await self.send_json({'type': 'error', 'message': '잠시 기다린 뒤 메시지를 보내 주세요.'})
                return
            self.last_chat = now
            saved = await database_sync_to_async(repository.add_chat)(self.traveler.id, self.room, message.strip())
            await self.broker.publish(self.room, {'type': 'chat', 'message': saved})
        elif kind == 'ping':
            await database_sync_to_async(presence_repository.refresh)(self.channel_name, self.traveler.id, self.room)
            await self.send_json({'type': 'pong'})
        else:
            await self.send_json({'type': 'error', 'message': '지원하지 않는 메시지입니다.'})

    async def world_event(self, event):
        await self.send_json(event['payload'])

    async def players(self):
        return await database_sync_to_async(presence_repository.players)(self.room)

    async def broadcast_presence(self):
        await self.broker.publish(self.room, {'type': 'presence', 'players': await self.players()})

    async def heartbeat(self):
        try:
            while True:
                await asyncio.sleep(20)
                await database_sync_to_async(presence_repository.refresh)(self.channel_name, self.traveler.id, self.room)
                await database_sync_to_async(presence_repository.cleanup)()
                await self.broadcast_presence()
        except asyncio.CancelledError:
            raise
