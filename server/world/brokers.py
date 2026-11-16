from channels.layers import get_channel_layer
from .contracts import RoomBroker


class ChannelsRoomBroker:
    """Same port for the process-local layer or a configured Redis channel layer."""
    def __init__(self):
        self.layer = get_channel_layer()

    async def join(self, room, channel):
        await self.layer.group_add(f'world.{room}', channel)

    async def leave(self, room, channel):
        await self.layer.group_discard(f'world.{room}', channel)

    async def publish(self, room, payload):
        await self.layer.group_send(f'world.{room}', {'type': 'world.event', 'payload': payload})


def get_room_broker() -> RoomBroker:
    return ChannelsRoomBroker()
