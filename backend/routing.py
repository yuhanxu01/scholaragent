from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/document-tracking/(?P<document_id>\w+)/$', consumers.DocumentTrackingConsumer.as_asgi()),
]