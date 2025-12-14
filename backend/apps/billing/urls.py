from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import TokenUsageViewSet

router = DefaultRouter()
router.register(r'token-usage', TokenUsageViewSet, basename='token-usage')

urlpatterns = [
    path('', include(router.urls)),
]