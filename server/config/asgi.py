import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
from django.core.asgi import get_asgi_application
http_application = get_asgi_application()
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from world.consumers import WorldConsumer
application = ProtocolTypeRouter({'http': http_application, 'websocket': URLRouter([path('ws/world', WorldConsumer.as_asgi())])})
