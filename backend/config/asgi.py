"""
ASGI config for scholarmind project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

django_asgi_app = get_asgi_application()

# Import WebSocket routing after Django setup
from apps.agent.routing import websocket_urlpatterns as agent_websocket_urlpatterns
from apps.agent.middleware import JWTAuthMiddleware
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import document tracking routing
from routing import websocket_urlpatterns as doc_tracking_urls

# Combine all WebSocket URL patterns
websocket_urlpatterns = [
    *agent_websocket_urlpatterns,
    *doc_tracking_urls
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})