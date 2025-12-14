from django.urls import path
from . import vocabulary_views as views

app_name = 'study'

urlpatterns = [
    # Dictionary lookup
    path('dictionary/lookup/', views.dictionary_lookup, name='dictionary_lookup'),
    path('dictionary/search/', views.dictionary_search, name='dictionary_search'),
    path('dictionary/autocomplete/', views.dictionary_autocomplete, name='dictionary_autocomplete'),

    # Vocabulary management
    path('vocabulary/', views.vocabulary_list, name='vocabulary_list'),
    path('vocabulary/stats/', views.vocabulary_stats, name='vocabulary_stats'),
    path('vocabulary/create/', views.create_vocabulary, name='create_vocabulary'),
    path('vocabulary/batch-create/', views.batch_create_vocabulary, name='batch_create_vocabulary'),
    path('vocabulary/update-missing-definitions/', views.update_missing_definitions, name='update_missing_definitions'),
    path('vocabulary/export/', views.export_vocabulary, name='export_vocabulary'),
    path('vocabulary/<uuid:pk>/', views.vocabulary_detail, name='vocabulary_detail'),
    path('vocabulary/<uuid:pk>/update/', views.update_vocabulary, name='update_vocabulary'),
    path('vocabulary/<uuid:pk>/delete/', views.delete_vocabulary, name='delete_vocabulary'),
    path('vocabulary/<uuid:pk>/favorite/', views.toggle_favorite, name='toggle_favorite'),
    path('vocabulary/<uuid:pk>/update-definition/', views.update_word_definition, name='update_word_definition'),

    # Vocabulary review
    path('vocabulary/<uuid:pk>/review/', views.review_vocabulary, name='review_vocabulary'),
    path('vocabulary/review/next/', views.next_review_word, name='next_review_word'),
    path('vocabulary/review/history/', views.review_history, name='review_history'),

    # Vocabulary lists
    path('vocabulary-lists/', views.vocabulary_list_collections, name='vocabulary_list_collections'),
    path('vocabulary-lists/create/', views.create_vocabulary_list, name='create_vocabulary_list'),
    path('vocabulary-lists/<uuid:pk>/', views.vocabulary_list_detail, name='vocabulary_list_detail'),
    path('vocabulary-lists/<uuid:pk>/add-word/', views.add_word_to_list, name='add_word_to_list'),
    path('vocabulary-lists/<uuid:pk>/remove-word/', views.remove_word_from_list, name='remove_word_from_list'),

    ]
