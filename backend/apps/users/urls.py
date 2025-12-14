from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'users'

# 创建路由器
router = DefaultRouter()
router.register(r'collections', views.DocumentCollectionViewSet, basename='collections')
router.register(r'comments', views.CommentViewSet, basename='comments')

urlpatterns = [
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.token_obtain, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Google OAuth
    path('auth/google/', views.GoogleOAuthView.as_view(), name='google_oauth'),
    path('auth/google/callback/', views.GoogleOAuthCallbackView.as_view(), name='google_oauth_callback'),

    # WeChat OAuth
    path('auth/wechat/', views.WeiXinOAuthView.as_view(), name='wechat_oauth'),
    path('auth/wechat/callback/', views.WeiXinOAuthCallbackView.as_view(), name='wechat_oauth_callback'),

    # Profile
    path('profile/<str:user_id>/', views.ProfileView.as_view(), name='profile'),
    path('profile/<str:username>/', views.UserProfileView.as_view(), name='user_profile'),
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.change_password, name='change_password'),
    path('stats/', views.get_user_stats, name='stats'),
    path('social-stats/<str:username>/', views.get_user_social_stats, name='social_stats'),
    path('social-stats/', views.get_user_social_stats, name='my_social_stats'),

    # Follow System
    path('follow/<str:username>/', views.UserFollowView.as_view(), name='follow'),
    path('<str:username>/followers/', views.UserFollowersListView.as_view(), name='followers'),
    path('<str:username>/following/', views.UserFollowingListView.as_view(), name='following'),

    # Social Features
    path('search/', views.UserSearchView.as_view(), name='search'),
    path('activities/<str:username>/', views.ActivityListView.as_view(), name='user_activities'),
    path('activities/me/', views.ActivityListView.as_view(), name='my_activities'),
    path('like-document/', views.DocumentLikeView.as_view(), name='like_document'),

    # Friend System
    path('friends/', views.FriendListView.as_view(), name='friends'),
    path('friends/requests/', views.FriendRequestListView.as_view(), name='friend_requests'),
    path('friends/request/', views.FriendRequestView.as_view(), name='send_friend_request'),
    path('friends/action/', views.FriendActionView.as_view(), name='friend_action'),
    path('friends/stats/', views.FriendStatsView.as_view(), name='friend_stats'),

    # Chat System
    path('chat/conversations/', views.ChatConversationListView.as_view(), name='chat_conversations'),
    path('chat/conversations/create/', views.CreateChatConversationView.as_view(), name='create_chat_conversation'),
    path('chat/conversations/<uuid:pk>/', views.ChatConversationDetailView.as_view(), name='chat_conversation_detail'),
    path('chat/messages/', views.ChatMessageCreateView.as_view(), name='create_chat_message'),
    path('chat/conversations/<uuid:conversation_id>/messages/', views.ChatMessageListView.as_view(), name='chat_messages'),
    path('chat/messages/<uuid:pk>/', views.ChatMessageDetailView.as_view(), name='chat_message_detail'),
    path('chat/mark-read/', views.ChatMarkReadView.as_view(), name='chat_mark_read'),

    # Study Groups
    path('groups/', views.StudyGroupListView.as_view(), name='study_groups'),
    path('groups/create/', views.CreateStudyGroupView.as_view(), name='create_study_group'),
    path('groups/<uuid:pk>/', views.StudyGroupDetailView.as_view(), name='study_group_detail'),
    path('groups/<uuid:group_id>/join/', views.JoinStudyGroupView.as_view(), name='join_study_group'),
    path('groups/<uuid:group_id>/leave/', views.LeaveStudyGroupView.as_view(), name='leave_study_group'),
    path('groups/<uuid:group_id>/members/', views.StudyGroupMembersView.as_view(), name='study_group_members'),
    path('groups/<uuid:group_id>/channels/', views.StudyGroupChannelsView.as_view(), name='study_group_channels'),
    path('groups/<uuid:group_id>/channels/create/', views.CreateGroupChannelView.as_view(), name='create_group_channel'),
    path('groups/<uuid:group_id>/invitations/', views.GroupInvitationListView.as_view(), name='group_invitations'),
    path('groups/<uuid:group_id>/invitations/create/', views.CreateGroupInvitationView.as_view(), name='create_group_invitation'),
    path('groups/<uuid:group_id>/members/action/', views.GroupMemberActionView.as_view(), name='group_member_action'),
    path('groups/join/<str:invite_code>/', views.AcceptGroupInvitationView.as_view(), name='accept_group_invitation'),

    # Router URLs
    path('', include(router.urls)),
]
