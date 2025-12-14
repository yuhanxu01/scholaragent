"""URL Configuration for scholarmind project."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from apps.agent.views import ai_chat

def health_check(request):
    """Health check endpoint"""
    return JsonResponse({'status': 'healthy'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('apps.users.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/knowledge/', include('apps.knowledge.urls')),
    path('api/agent/', include('apps.agent.urls')),
    path('api/billing/', include('apps.billing.urls')),
    path('api/ai/chat/', ai_chat, name='ai-chat'),
    path('api/study/', include('apps.study.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Serve media and static files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)