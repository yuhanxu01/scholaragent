from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ConceptViewSet,
    ConceptRelationViewSet,
    NoteViewSet,
    FlashcardViewSet,
    FlashcardReviewViewSet,
    StudySessionViewSet,
    HighlightViewSet,
    SearchViewSet,
    GraphViewSet,
    StatisticsViewSet
)
from .unified_content_views import UnifiedContentViewSet, UnifiedSearchViewSet

# 创建路由器
router = DefaultRouter()
router.register(r'concepts', ConceptViewSet, basename='concepts')
router.register(r'concept-relations', ConceptRelationViewSet, basename='concept-relations')
router.register(r'notes', NoteViewSet, basename='notes')
router.register(r'flashcards', FlashcardViewSet, basename='flashcards')
router.register(r'flashcard-reviews', FlashcardReviewViewSet, basename='flashcard-reviews')
router.register(r'study-sessions', StudySessionViewSet, basename='study-sessions')
router.register(r'highlights', HighlightViewSet, basename='highlights')
router.register(r'search', SearchViewSet, basename='search')
router.register(r'graph', GraphViewSet, basename='graph')
router.register(r'statistics', StatisticsViewSet, basename='statistics')

# 统一内容管理路由
router.register(r'unified-content', UnifiedContentViewSet, basename='unified-content')
router.register(r'unified-search', UnifiedSearchViewSet, basename='unified-search')

app_name = 'knowledge'

urlpatterns = [
    path('', include(router.urls)),
]
