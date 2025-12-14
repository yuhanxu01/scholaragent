from rest_framework import status, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import authenticate
from django.contrib.contenttypes.models import ContentType
from django.shortcuts import get_object_or_404, redirect
from django.db.models import Q
from django.conf import settings
from django.urls import reverse
import requests
from apps.documents.models import Document
from .models import CustomUser, Follow, Friend, ChatConversation, ChatParticipant, ChatMessage, DocumentCollection, Comment, Like, Activity, StudyGroup, GroupChannel, GroupMember, GroupInvitation
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    RegisterSerializer,
    MeSerializer,
    SocialUserProfileSerializer,
    UserListSerializer,
    FollowSerializer,
    FriendSerializer,
    FriendListSerializer,
    CreateFriendRequestSerializer,
    FriendActionSerializer,
    FriendStatsSerializer,
    ChatConversationSerializer,
    CreateChatConversationSerializer,
    ChatMessageSerializer,
    CreateChatMessageSerializer,
    DocumentCollectionSerializer,
    CreateDocumentCollectionSerializer,
    CommentSerializer,
    CreateCommentSerializer,
    LikeSerializer,
    ActivitySerializer,
    UserStatsSerializer,
    UserSearchSerializer,
    DocumentLikeSerializer,
    StudyGroupSerializer,
    CreateStudyGroupSerializer,
    GroupChannelSerializer,
    CreateGroupChannelSerializer,
    GroupMemberSerializer,
    GroupInvitationSerializer,
    CreateGroupInvitationSerializer
)


class RegisterView(APIView):
    """Register a new user"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Generate tokens for the new user
            refresh = RefreshToken.for_user(user)

            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def token_obtain(request):
    """Custom token view - supports both email and username login"""
    email_or_username = request.data.get('email')  # Frontend still sends 'email' field
    password = request.data.get('password')

    print(f"Backend token_obtain: Login attempt for {email_or_username}")

    if not email_or_username or not password:
        return Response({
            'error': 'Please provide username/email and password'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Try to find user by email or username
    user = None
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        # Check if it's an email format
        if '@' in email_or_username:
            user = User.objects.get(email=email_or_username)
        else:
            # If not email, try username
            user = User.objects.get(username=email_or_username)
    except User.DoesNotExist:
        pass

    # If user found, verify password
    if user and user.check_password(password):
        print(f"Backend token_obtain: Login successful for user {user.username}")
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })
    else:
        print(f"Backend token_obtain: Login failed for {email_or_username}")
        # Generic error to avoid leaking information
        return Response({
            'error': 'Invalid username/email or password'
        }, status=status.HTTP_401_UNAUTHORIZED)


class ProfileView(RetrieveUpdateAPIView):
    """View or update user profile (requires user ID)"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CustomUser.objects.all().select_related('profile')

    def get_object(self):
        # Get user ID from URL parameter
        user_id = self.kwargs.get('user_id')
        if user_id == 'me':
            return self.request.user
        try:
            return self.get_queryset().get(id=user_id)
        except CustomUser.DoesNotExist:
            return self.request.user


class MeView(RetrieveUpdateAPIView):
    """View or update current user's profile"""
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CustomUser.objects.all().select_related('profile')

    def get_object(self):
        # Return the current user with profile preloaded
        return self.request.user

    def update(self, request, *args, **kwargs):
        # Handle file upload for avatar
        if request.FILES.get('avatar'):
            # The serializer will handle the avatar field
            pass
        return super().update(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_stats(request):
    """Get current user's statistics"""
    profile = request.user.profile
    stats = {
        'documents_read': profile.documents_read,
        'questions_asked': profile.questions_asked,
        'study_time_hours': profile.study_time_hours,
        'join_date': request.user.date_joined,
        'last_login': request.user.last_login,
    }
    return Response(stats)


class UserProfileView(RetrieveUpdateAPIView):
    """用户个人资料视图"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SocialUserProfileSerializer

    def get_object(self):
        """获取用户对象"""
        username_or_id = self.kwargs.get('username')
        if username_or_id == 'me':
            return self.request.user

        # Try to find by ID first, then by username
        user = None
        if username_or_id.isdigit():
            try:
                user = CustomUser.objects.get(id=int(username_or_id))
            except CustomUser.DoesNotExist:
                pass

        if user is None:
            try:
                user = CustomUser.objects.get(username=username_or_id)
            except CustomUser.DoesNotExist:
                raise self.permission_denied(
                    self.request,
                    message="用户不存在"
                )

        # 检查权限
        if not user.can_view_profile(self.request.user):
            self.permission_denied(
                self.request,
                message="没有权限查看该用户资料"
            )

        return user


class UserFollowView(APIView):
    """用户关注视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        """关注用户"""
        try:
            target_user = CustomUser.objects.get(username=username)

            if target_user == request.user:
                return Response(
                    {'error': '不能关注自己'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            success = request.user.follow(target_user)

            if success:
                # 记录活动
                Activity.log_follow(request.user, target_user)

                # 更新关注关系序列化器
                follow_relation = Follow.objects.get(
                    follower=request.user,
                    following=target_user
                )
                serializer = FollowSerializer(follow_relation)

                return Response({
                    'message': '关注成功',
                    'follow': serializer.data,
                    'is_following': True,
                    'followers_count': target_user.followers_count
                })
            else:
                return Response(
                    {'error': '已经关注了该用户'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except CustomUser.DoesNotExist:
            return Response(
                {'error': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

    def delete(self, request, username):
        """取消关注"""
        try:
            target_user = CustomUser.objects.get(username=username)

            success = request.user.unfollow(target_user)

            if success:
                return Response({
                    'message': '取消关注成功',
                    'is_following': False,
                    'followers_count': target_user.followers_count
                })
            else:
                return Response(
                    {'error': '未关注该用户'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except CustomUser.DoesNotExist:
            return Response(
                {'error': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserFollowersListView(ListAPIView):
    """用户粉丝列表"""
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取粉丝列表"""
        username = self.kwargs.get('username')
        user = get_object_or_404(CustomUser, username=username)

        follow_relations = user.get_followers()
        follower_ids = [rel.follower.id for rel in follow_relations]

        return CustomUser.objects.filter(id__in=follower_ids)


class UserFollowingListView(ListAPIView):
    """用户关注列表"""
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取关注列表"""
        username = self.kwargs.get('username')
        user = get_object_or_404(CustomUser, username=username)

        follow_relations = user.get_following()
        following_ids = [rel.following.id for rel in follow_relations]

        return CustomUser.objects.filter(id__in=following_ids)


class DocumentCollectionViewSet(viewsets.ModelViewSet):
    """文档收藏视图集"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DocumentCollection.objects.filter(
            user=self.request.user
        ).select_related('document', 'document__user').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateDocumentCollectionSerializer
        return DocumentCollectionSerializer

    def perform_create(self, serializer):
        """创建收藏"""
        collection = serializer.save(user=self.request.user)

        # 记录活动
        Activity.log_collect(self.request.user, collection.document)

        return collection

    @action(detail=False, methods=['get'])
    def by_document(self, request):
        """检查某个文档是否被收藏"""
        document_id = request.query_params.get('document_id')
        if not document_id:
            return Response(
                {'error': '需要提供document_id参数'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            document = Document.objects.get(id=document_id)
            collection = DocumentCollection.objects.filter(
                user=request.user,
                document=document
            ).first()

            if collection:
                serializer = self.get_serializer(collection)
                return Response({
                    'is_collected': True,
                    'collection': serializer.data
                })
            else:
                return Response({'is_collected': False})

        except Document.DoesNotExist:
            return Response(
                {'error': '文档不存在'},
                status=status.HTTP_404_NOT_FOUND
            )


class CommentViewSet(viewsets.ModelViewSet):
    """评论视图集"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取评论列表"""
        document_id = self.request.query_params.get('document_id')
        if document_id:
            # 获取特定文档的评论
            return Comment.objects.filter(
                content_type=ContentType.objects.get_for_model(Document),
                object_id=document_id,
                parent=None,  # 只获取顶级评论
                is_deleted=False
            ).select_related('user').order_by('-created_at')

        # 获取用户自己的评论
        return Comment.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('user').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateCommentSerializer
        return CommentSerializer

    def perform_create(self, serializer):
        """创建评论"""
        comment = serializer.save(user=self.request.user)

        # 记录活动
        Activity.log_comment(self.request.user, comment)

        return comment

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """点赞评论"""
        comment = self.get_object()
        user = request.user

        comment_content_type = ContentType.objects.get_for_model(Comment)
        like, created = Like.objects.get_or_create(
            user=user,
            content_type=comment_content_type,
            object_id=comment.id
        )

        if created:
            comment.update_counts()
            return Response({'is_liked': True, 'likes_count': comment.likes_count})
        else:
            return Response({'message': '已经点赞了'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def unlike(self, request, pk=None):
        """取消点赞评论"""
        comment = self.get_object()
        user = request.user

        comment_content_type = ContentType.objects.get_for_model(Comment)
        deleted_count, _ = Like.objects.filter(
            user=user,
            content_type=comment_content_type,
            object_id=comment.id
        ).delete()

        if deleted_count > 0:
            comment.update_counts()
            return Response({'is_liked': False, 'likes_count': comment.likes_count})
        else:
            return Response({'message': '未点赞该评论'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def delete_comment(self, request, pk=None):
        """删除评论"""
        comment = self.get_object()

        # 只有评论作者可以删除
        if comment.user != request.user:
            return Response(
                {'error': '没有权限删除该评论'},
                status=status.HTTP_403_FORBIDDEN
            )

        comment.delete_comment()
        return Response({'message': '评论已删除'})

    @action(detail=True, methods=['get'])
    def replies(self, request, pk=None):
        """获取评论回复"""
        comment = self.get_object()
        replies = comment.get_replies()

        serializer = CommentSerializer(
            replies,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)


class FriendListView(ListAPIView):
    """好友列表视图"""
    serializer_class = FriendListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取好友列表"""
        return self.request.user.get_friends()


class FriendRequestListView(ListAPIView):
    """好友请求列表视图"""
    serializer_class = FriendSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取好友请求列表"""
        type_param = self.request.query_params.get('type', 'received')
        
        if type_param == 'received':
            # 获取收到的好友请求
            return self.request.user.get_friend_requests()
        elif type_param == 'sent':
            # 获取发送的好友请求
            return self.request.user.get_sent_requests()
        else:
            # 默认返回收到的请求
            return self.request.user.get_friend_requests()


class FriendRequestView(APIView):
    """好友请求管理视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """发送好友请求"""
        serializer = CreateFriendRequestSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        target_user_id = serializer.validated_data
        try:
            target_user = CustomUser.objects.get(id=target_user_id)
            
            success, message = request.user.send_friend_request(target_user)
            
            if success:
                # 记录活动
                Activity.log_friend_request(request.user, target_user)
                
                return Response({
                    'message': message,
                    'friend_request': {
                        'id': Friend.objects.filter(
                            sender=request.user,
                            receiver=target_user
                        ).first().id
                    }
                })
            else:
                return Response(
                    {'error': message},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except CustomUser.DoesNotExist:
            return Response(
                {'error': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )


class FriendActionView(APIView):
    """好友操作视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """处理好友请求（接受/拒绝）或删除好友"""
        serializer = FriendActionSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        user_id = serializer.validated_data.get('user_id')
        
        try:
            if action == 'accept':
                # 接受好友请求
                target_user_id = request.data.get('user_id')
                if not target_user_id:
                    return Response(
                        {'error': '接受好友请求需要提供用户ID'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    target_user = CustomUser.objects.get(id=target_user_id)
                    success, message = request.user.accept_friend_request(target_user)
                    
                    if success:
                        # 记录活动
                        Activity.log_friend_accept(request.user, target_user)
                        return Response({'message': message})
                    else:
                        return Response(
                            {'error': message},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except CustomUser.DoesNotExist:
                    return Response(
                        {'error': '用户不存在'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
            elif action == 'reject':
                # 拒绝好友请求
                if not user_id:
                    return Response(
                        {'error': '拒绝好友请求需要提供用户ID'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    target_user = CustomUser.objects.get(id=user_id)
                    success, message = request.user.reject_friend_request(target_user)
                    
                    if success:
                        # 记录活动
                        Activity.log_friend_reject(request.user, target_user)
                        return Response({'message': message})
                    else:
                        return Response(
                            {'error': message},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except CustomUser.DoesNotExist:
                    return Response(
                        {'error': '用户不存在'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
            elif action == 'remove':
                # 删除好友
                if not user_id:
                    return Response(
                        {'error': '删除好友需要提供用户ID'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    target_user = CustomUser.objects.get(id=user_id)
                    success, message = request.user.remove_friend(target_user)
                    
                    if success:
                        # 记录活动
                        Activity.log_friend_remove(request.user, target_user)
                        return Response({'message': message})
                    else:
                        return Response(
                            {'error': message},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except CustomUser.DoesNotExist:
                    return Response(
                        {'error': '用户不存在'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
        except Exception as e:
            return Response(
                {'error': f'操作失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FriendStatsView(APIView):
    """好友统计视图"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """获取好友统计信息"""
        user = request.user
        
        stats = {
            'friends_count': len(user.get_friends()),
            'received_requests_count': user.get_friend_requests().count(),
            'sent_requests_count': user.get_sent_requests().count(),
        }
        
        serializer = FriendStatsSerializer(stats)
        return Response(serializer.data)


class ChatConversationListView(ListAPIView):
    """聊天会话列表视图"""
    serializer_class = ChatConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取用户的聊天会话列表"""
        return ChatConversation.objects.filter(
            participants=self.request.user
        ).order_by('-updated_at')


class ChatConversationDetailView(RetrieveAPIView):
    """聊天会话详情视图"""
    serializer_class = ChatConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ChatConversation.objects.all()

    def get_object(self):
        """获取聊天会话对象并验证权限"""
        conversation = super().get_object()
        
        # 检查用户是否在该聊天会话中
        if not conversation.participants.filter(id=self.request.user.id).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("没有权限访问该聊天会话")
        
        return conversation


class ChatMessageListView(ListAPIView):
    """聊天消息列表视图"""
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取聊天消息列表"""
        conversation_id = self.kwargs.get('conversation_id')
        
        try:
            conversation = ChatConversation.objects.get(id=conversation_id)
        except ChatConversation.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("聊天会话不存在")

        # 检查用户是否在该聊天会话中
        if not conversation.participants.filter(id=self.request.user.id).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("没有权限访问该聊天会话")

        return ChatMessage.objects.filter(
            conversation=conversation,
            is_deleted=False
        ).select_related('sender').order_by('-created_at')


class ChatMessageCreateView(APIView):
    """创建聊天消息视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """发送消息"""
        serializer = CreateChatMessageSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        message = serializer.save()
        
        return Response({
            'message': '消息发送成功',
            'data': ChatMessageSerializer(message).data
        })


class ChatMessageDetailView(RetrieveUpdateDestroyAPIView):
    """聊天消息详情视图"""
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ChatMessage.objects.filter(is_deleted=False)

    def get_object(self):
        """获取消息对象并验证权限"""
        message = super().get_object()
        
        # 检查用户是否在该消息的聊天会话中
        if not message.conversation.participants.filter(id=self.request.user.id).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("没有权限访问该消息")

        # 检查是否是消息发送者
        if message.sender != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("只能编辑/删除自己发送的消息")

        return message

    def update(self, request, *args, **kwargs):
        """编辑消息"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # 只允许编辑内容
        if 'content' in request.data:
            instance.content = request.data['content']
            instance.is_edited = True
            instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        """删除消息（软删除）"""
        instance = self.get_object()
        instance.is_deleted = True
        instance.content = '[该消息已删除]'
        instance.save()
        
        return Response({'message': '消息已删除'})


class CreateChatConversationView(APIView):
    """创建聊天会话视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """创建聊天会话"""
        serializer = CreateChatConversationSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        conversation = serializer.save()

        return Response({
            'message': '聊天会话创建成功',
            'conversation': ChatConversationSerializer(conversation).data
        })


class ChatMarkReadView(APIView):
    """标记消息已读视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """标记消息为已读"""
        message_ids = request.data.get('message_ids', [])

        if not message_ids:
            return Response(
                {'error': '需要提供消息ID列表'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 更新消息为已读
        updated_count = ChatMessage.objects.filter(
            id__in=message_ids,
            conversation__participants=request.user,
            is_deleted=False
        ).update(is_read=True)

        return Response({
            'message': f'已标记 {updated_count} 条消息为已读'
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """Change user password and invalidate all existing tokens"""
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password or not new_password:
        return Response({
            'error': 'Both current_password and new_password are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Verify current password
    if not user.check_password(current_password):
        return Response({
            'error': 'Current password is incorrect'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate new password
    from django.contrib.auth.password_validation import validate_password
    try:
        validate_password(new_password, user)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

    # Change password
    user.set_password(new_password)
    user.save()

    # Invalidate all existing tokens for this user
    tokens = OutstandingToken.objects.filter(user=user)
    for token in tokens:
        BlacklistedToken.objects.get_or_create(token=token)

    print(f"Backend change_password: Password changed for user {user.username}, invalidated {tokens.count()} tokens")

    return Response({
        'message': 'Password changed successfully. All existing tokens have been invalidated.'
    })


class StudyGroupListView(ListAPIView):
    """学习小组列表视图"""
    serializer_class = StudyGroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取用户相关的小组列表"""
        user = self.request.user

        # 获取用户是成员的小组
        member_groups = StudyGroup.objects.filter(
            members__user=user,
            members__is_active=True,
            is_active=True
        ).distinct()

        # 获取公开的小组（可以申请加入）
        public_groups = StudyGroup.objects.filter(
            privacy='public',
            is_active=True
        ).exclude(
            members__user=user
        )

        # 使用union合并查询集
        return member_groups.union(public_groups).order_by('-created_at')


class StudyGroupDetailView(RetrieveUpdateDestroyAPIView):
    """学习小组详情视图"""
    serializer_class = StudyGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = StudyGroup.objects.filter(is_active=True)

    def get_object(self):
        """获取小组对象并验证权限"""
        group = super().get_object()

        # 检查用户是否有权限查看小组
        if group.privacy == 'private':
            # 私有小组只有成员才能查看
            if not GroupMember.objects.filter(group=group, user=self.request.user).exists():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("没有权限访问该小组")

        return group

    def update(self, request, *args, **kwargs):
        """更新小组信息"""
        group = self.get_object()

        # 检查用户是否有管理权限
        member = GroupMember.objects.filter(group=group, user=request.user).first()
        if not member or not member.can_manage_group():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("没有权限修改小组信息")

        return super().update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        """删除小组（软删除）"""
        group = self.get_object()

        # 只有创建者才能删除小组
        if group.created_by != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("只有小组创建者才能删除小组")

        group.is_active = False
        group.save()
        return Response({'message': '小组已删除'})


class CreateStudyGroupView(APIView):
    """创建学习小组视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """创建学习小组"""
        serializer = CreateStudyGroupSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        group = serializer.save()

        return Response({
            'message': '学习小组创建成功',
            'group': StudyGroupSerializer(group, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class StudyGroupMembersView(ListAPIView):
    """小组成员列表视图"""
    serializer_class = GroupMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取小组成员列表"""
        group_id = self.kwargs.get('group_id')

        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("小组不存在")

        # 检查用户是否有权限查看成员列表
        if group.privacy == 'private':
            if not GroupMember.objects.filter(group=group, user=self.request.user).exists():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("没有权限查看该小组成员")

        return group.get_members()


class StudyGroupChannelsView(ListAPIView):
    """小组频道列表视图"""
    serializer_class = GroupChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取小组频道列表"""
        group_id = self.kwargs.get('group_id')

        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("小组不存在")

        # 检查用户是否是小组成员
        if not GroupMember.objects.filter(group=group, user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("只有小组成员才能查看频道")

        return group.channels.filter(is_active=True).order_by('order')


class CreateGroupChannelView(APIView):
    """创建频道视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id):
        """创建频道"""
        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            return Response(
                {'error': '小组不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CreateGroupChannelSerializer(
            data=request.data,
            context={'request': request, 'group_id': group_id}
        )
        serializer.is_valid(raise_exception=True)

        channel = serializer.save()

        return Response({
            'message': '频道创建成功',
            'channel': GroupChannelSerializer(channel, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class GroupInvitationListView(ListAPIView):
    """小组邀请列表视图"""
    serializer_class = GroupInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取邀请列表"""
        group_id = self.kwargs.get('group_id')

        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("小组不存在")

        # 检查用户是否有权限查看邀请
        member = GroupMember.objects.filter(group=group, user=self.request.user).first()
        if not member or not member.can_manage_group():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("没有权限查看邀请列表")

        return group.invitations.all().order_by('-created_at')


class CreateGroupInvitationView(APIView):
    """创建邀请视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id):
        """创建邀请"""
        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            return Response(
                {'error': '小组不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CreateGroupInvitationSerializer(
            data=request.data,
            context={'request': request, 'group_id': group_id}
        )
        serializer.is_valid(raise_exception=True)

        invitation = serializer.save()

        return Response({
            'message': '邀请发送成功',
            'invitation': GroupInvitationSerializer(invitation, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class AcceptGroupInvitationView(APIView):
    """接受邀请视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, invite_code):
        """接受邀请"""
        try:
            invitation = GroupInvitation.objects.get(
                invite_code=invite_code,
                status='pending'
            )
        except GroupInvitation.DoesNotExist:
            return Response(
                {'error': '邀请不存在或已过期'},
                status=status.HTTP_404_NOT_FOUND
            )

        success, message = invitation.accept(request.user)

        if success:
            # 记录活动
            Activity.log_join_group(request.user, invitation.group)

            return Response({
                'message': message,
                'group': StudyGroupSerializer(invitation.group, context={'request': request}).data
            })
        else:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )


class GroupMemberActionView(APIView):
    """小组成员操作视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id):
        """执行成员操作（移除成员、更改角色等）"""
        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            return Response(
                {'error': '小组不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        action = request.data.get('action')
        user_id = request.data.get('user_id')

        if not action or not user_id:
            return Response(
                {'error': '需要提供操作类型和用户ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 检查操作者权限
        operator_member = GroupMember.objects.filter(group=group, user=request.user).first()
        if not operator_member or not operator_member.can_manage_group():
            return Response(
                {'error': '没有权限执行此操作'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            target_user = CustomUser.objects.get(id=user_id)
            target_member = GroupMember.objects.filter(group=group, user=target_user).first()

            if not target_member:
                return Response(
                    {'error': '用户不是小组成员'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if action == 'remove':
                # 移除成员
                if target_member.role == 'owner':
                    return Response(
                        {'error': '不能移除小组创建者'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                group.remove_member(target_user)
                Activity.log_leave_group(target_user, group)

                return Response({'message': '成员已移除'})

            elif action == 'change_role':
                # 更改角色
                new_role = request.data.get('role')
                if new_role not in dict(GroupMember.ROLE_CHOICES):
                    return Response(
                        {'error': '无效的角色'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # 不能更改创建者角色
                if target_member.role == 'owner':
                    return Response(
                        {'error': '不能更改创建者角色'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                target_member.role = new_role
                target_member.save()

                return Response({'message': '角色已更新'})

            else:
                return Response(
                    {'error': '不支持的操作'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except CustomUser.DoesNotExist:
            return Response(
                {'error': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )


class JoinStudyGroupView(APIView):
    """加入学习小组视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id):
        """申请加入小组"""
        try:
            group = StudyGroup.objects.get(id=group_id, is_active=True)
        except StudyGroup.DoesNotExist:
            return Response(
                {'error': '小组不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 检查是否已经是成员
        if GroupMember.objects.filter(group=group, user=request.user).exists():
            return Response(
                {'error': '已经是小组成员'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 检查小组是否公开
        if group.privacy == 'private':
            return Response(
                {'error': '私有小组需要邀请才能加入'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 添加成员
        group.add_member(request.user, role='member')

        # 记录活动
        Activity.log_join_group(request.user, group)

        return Response({
            'message': f'成功加入 {group.name}',
            'group': StudyGroupSerializer(group, context={'request': request}).data
        })


class LeaveStudyGroupView(APIView):
    """离开学习小组视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id):
        """离开小组"""
        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            return Response(
                {'error': '小组不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        member = GroupMember.objects.filter(group=group, user=request.user).first()
        if not member:
            return Response(
                {'error': '不是小组成员'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 创建者不能离开小组
        if member.role == 'owner':
            return Response(
                {'error': '小组创建者不能离开小组'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 移除成员
        group.remove_member(request.user)

        # 记录活动
        Activity.log_leave_group(request.user, group)

        return Response({'message': f'已离开 {group.name}'})


class GoogleOAuthView(APIView):
    """Google OAuth 登录视图"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """重定向到Google OAuth"""
        if not settings.GOOGLE_OAUTH2_CLIENT_ID:
            return Response(
                {'error': 'Google OAuth not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Google OAuth URL
        base_url = 'https://accounts.google.com/o/oauth2/auth'
        params = {
            'client_id': settings.GOOGLE_OAUTH2_CLIENT_ID,
            'redirect_uri': settings.GOOGLE_OAUTH2_REDIRECT_URI,
            'scope': 'openid email profile',
            'response_type': 'code',
            'access_type': 'offline',
            'prompt': 'consent',
            'state': 'random_state_string'  # 应该使用更安全的state
        }

        from urllib.parse import urlencode
        auth_url = f"{base_url}?{urlencode(params)}"

        return redirect(auth_url)


class GoogleOAuthCallbackView(APIView):
    """Google OAuth 回调视图"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """处理Google OAuth回调"""
        code = request.GET.get('code')
        error = request.GET.get('error')

        if error:
            return Response(
                {'error': f'OAuth error: {error}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not code:
            return Response(
                {'error': 'No authorization code provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 交换授权码获取访问令牌
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'client_id': settings.GOOGLE_OAUTH2_CLIENT_ID,
            'client_secret': settings.GOOGLE_OAUTH2_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.GOOGLE_OAUTH2_REDIRECT_URI,
        }

        try:
            token_response = requests.post(token_url, data=token_data)
            token_response.raise_for_status()
            token_info = token_response.json()

            access_token = token_info.get('access_token')
            if not access_token:
                return Response(
                    {'error': 'Failed to get access token'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 获取用户信息
            user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
            headers = {'Authorization': f'Bearer {access_token}'}
            user_response = requests.get(user_info_url, headers=headers)
            user_response.raise_for_status()
            user_info = user_response.json()

            google_id = user_info.get('id')
            email = user_info.get('email')
            name = user_info.get('name', '')
            first_name = user_info.get('given_name', '')
            last_name = user_info.get('family_name', '')
            picture = user_info.get('picture', '')

            if not google_id or not email:
                return Response(
                    {'error': 'Incomplete user information from Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 检查是否已存在用户
            user = CustomUser.objects.filter(google_id=google_id).first()

            if user:
                # 更新用户信息
                user.email = email
                user.first_name = first_name
                user.last_name = last_name
                if picture and not user.avatar:
                    # 可以选择下载头像，这里先只保存URL
                    pass
                user.save()
            else:
                # 检查邮箱是否已被使用
                existing_user = CustomUser.objects.filter(email=email).first()
                if existing_user:
                    # 如果邮箱已被使用但没有Google ID，关联现有用户
                    if not existing_user.google_id:
                        existing_user.google_id = google_id
                        existing_user.auth_provider = 'google'
                        existing_user.save()
                        user = existing_user
                    else:
                        return Response(
                            {'error': 'Email already associated with another account'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    # 创建新用户
                    # 生成唯一的用户名
                    base_username = email.split('@')[0]
                    username = base_username
                    counter = 1
                    while CustomUser.objects.filter(username=username).exists():
                        username = f"{base_username}_{counter}"
                        counter += 1

                    user = CustomUser.objects.create(
                        username=username,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        google_id=google_id,
                        auth_provider='google',
                        is_active=True
                    )

                    # 创建用户配置文件
                    from .models import UserProfile
                    UserProfile.objects.create(user=user)

            # 生成JWT令牌
            refresh = RefreshToken.for_user(user)

            # 重定向到前端，带上令牌信息
            frontend_url = f"{request.scheme}://{request.get_host().replace('8000', '3000')}/auth/callback"
            params = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user.id
            }

            from urllib.parse import urlencode
            redirect_url = f"{frontend_url}?{urlencode(params)}"

            return redirect(redirect_url)

        except requests.RequestException as e:
            return Response(
                {'error': f'Failed to authenticate with Google: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WeiXinOAuthView(APIView):
    """微信 OAuth 登录视图"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """重定向到微信 OAuth"""
        if not settings.WECHAT_APP_ID:
            return Response(
                {'error': 'WeChat OAuth not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 微信 OAuth URL
        base_url = 'https://open.weixin.qq.com/connect/qrconnect'
        params = {
            'appid': settings.WECHAT_APP_ID,
            'redirect_uri': settings.WECHAT_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'snsapi_login',
            'state': 'random_state_string'  # 应该使用更安全的state
        }

        from urllib.parse import urlencode
        auth_url = f"{base_url}?{urlencode(params)}"

        return redirect(auth_url)


class WeiXinOAuthCallbackView(APIView):
    """微信 OAuth 回调视图"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """处理微信 OAuth回调"""
        code = request.GET.get('code')
        error = request.GET.get('error')

        if error:
            return Response(
                {'error': f'OAuth error: {error}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not code:
            return Response(
                {'error': 'No authorization code provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 交换授权码获取访问令牌
        token_url = 'https://api.weixin.qq.com/sns/oauth2/access_token'
        token_data = {
            'appid': settings.WECHAT_APP_ID,
            'secret': settings.WECHAT_APP_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
        }

        try:
            token_response = requests.get(token_url, params=token_data)
            token_response.raise_for_status()
            token_info = token_response.json()

            if 'errcode' in token_info:
                return Response(
                    {'error': f'WeChat API error: {token_info.get("errmsg", "Unknown error")}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            access_token = token_info.get('access_token')
            openid = token_info.get('openid')
            unionid = token_info.get('unionid', '')

            if not access_token or not openid:
                return Response(
                    {'error': 'Failed to get access token and openid'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 获取用户信息
            user_info_url = 'https://api.weixin.qq.com/sns/userinfo'
            headers = {'Authorization': f'Bearer {access_token}'}
            user_params = {
                'access_token': access_token,
                'openid': openid
            }
            user_response = requests.get(user_info_url, params=user_params)
            user_response.raise_for_status()
            user_info = user_response.json()

            if 'errcode' in user_info:
                return Response(
                    {'error': f'WeChat userinfo error: {user_info.get("errmsg", "Unknown error")}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            nickname = user_info.get('nickname', '')
            headimgurl = user_info.get('headimgurl', '')

            # 检查是否已存在用户
            user = CustomUser.objects.filter(wechat_openid=openid).first()

            if user:
                # 更新用户信息
                user.first_name = nickname[:30]  # 限制姓名长度
                if headimgurl and not user.avatar:
                    # 可以选择下载头像，这里先只保存URL
                    pass
                user.save()
            else:
                # 检查unionid是否已存在（如果有的话）
                if unionid:
                    existing_user = CustomUser.objects.filter(wechat_unionid=unionid).first()
                    if existing_user:
                        # 关联openid
                        existing_user.wechat_openid = openid
                        existing_user.auth_provider = 'wechat'
                        existing_user.save()
                        user = existing_user
                    else:
                        # 检查邮箱是否已被使用
                        existing_user = CustomUser.objects.filter(email=f"{openid}@wechat.local").first()
                        if existing_user:
                            # 如果邮箱已被使用但没有微信ID，关联现有用户
                            if not existing_user.wechat_openid:
                                existing_user.wechat_openid = openid
                                existing_user.wechat_unionid = unionid
                                existing_user.auth_provider = 'wechat'
                                existing_user.save()
                                user = existing_user
                            else:
                                return Response(
                                    {'error': 'Account already associated with another WeChat account'},
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                        else:
                            # 创建新用户
                            # 生成唯一的用户名
                            base_username = f"wechat_{openid[:8]}"
                            username = base_username
                            counter = 1
                            while CustomUser.objects.filter(username=username).exists():
                                username = f"{base_username}_{counter}"
                                counter += 1

                            user = CustomUser.objects.create(
                                username=username,
                                email=f"{openid}@wechat.local",
                                first_name=nickname[:30],
                                last_name='',
                                wechat_openid=openid,
                                wechat_unionid=unionid,
                                auth_provider='wechat',
                                is_active=True
                            )

                            # 创建用户配置文件
                            from .models import UserProfile
                            UserProfile.objects.create(user=user)
                else:
                    # 没有unionid，使用openid作为唯一标识
                    existing_user = CustomUser.objects.filter(email=f"{openid}@wechat.local").first()
                    if existing_user:
                        if not existing_user.wechat_openid:
                            existing_user.wechat_openid = openid
                            existing_user.auth_provider = 'wechat'
                            existing_user.save()
                            user = existing_user
                        else:
                            return Response(
                                {'error': 'Account already associated with another WeChat account'},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    else:
                        # 创建新用户
                        base_username = f"wechat_{openid[:8]}"
                        username = base_username
                        counter = 1
                        while CustomUser.objects.filter(username=username).exists():
                            username = f"{base_username}_{counter}"
                            counter += 1

                        user = CustomUser.objects.create(
                            username=username,
                            email=f"{openid}@wechat.local",
                            first_name=nickname[:30],
                            last_name='',
                            wechat_openid=openid,
                            wechat_unionid=unionid,
                            auth_provider='wechat',
                            is_active=True
                        )

                        # 创建用户配置文件
                        from .models import UserProfile
                        UserProfile.objects.create(user=user)

            # 生成JWT令牌
            refresh = RefreshToken.for_user(user)

            # 重定向到前端，带上令牌信息
            frontend_url = f"{request.scheme}://{request.get_host().replace('8000', '3000')}/auth/callback"
            params = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user.id
            }

            from urllib.parse import urlencode
            redirect_url = f"{frontend_url}?{urlencode(params)}"

            return redirect(redirect_url)

        except requests.RequestException as e:
            return Response(
                {'error': f'Failed to authenticate with WeChat: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentLikeView(APIView):
    """文档点赞视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """点赞/取消点赞文档"""
        serializer = DocumentLikeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data['document_id']
        action = serializer.validated_data['action']

        try:
            document = Document.objects.get(id=document_id)

            # 检查文档状态
            if document.status != 'ready' or document.privacy != 'public':
                return Response(
                    {'error': '只能点赞公开的已处理文档'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            document_content_type = ContentType.objects.get_for_model(Document)

            if action == 'like':
                like, created = Like.objects.get_or_create(
                    user=request.user,
                    content_type=document_content_type,
                    object_id=document.id
                )

                if created:
                    # 记录活动
                    Activity.log_like(request.user, document)

                    # 更新文档点赞数（需要在文档模型中添加likes_count字段）
                    return Response({
                        'message': '点赞成功',
                        'is_liked': True,
                        'likes_count': Like.objects.filter(
                            content_type=document_content_type,
                            object_id=document.id
                        ).count()
                    })
                else:
                    return Response(
                        {'message': '已经点赞了'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            elif action == 'unlike':
                deleted_count, _ = Like.objects.filter(
                    user=request.user,
                    content_type=document_content_type,
                    object_id=document.id
                ).delete()

                if deleted_count > 0:
                    return Response({
                        'message': '取消点赞成功',
                        'is_liked': False,
                        'likes_count': Like.objects.filter(
                            content_type=document_content_type,
                            object_id=document.id
                        ).count()
                    })
                else:
                    return Response(
                        {'message': '未点赞该文档'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        except Document.DoesNotExist:
            return Response(
                {'error': '文档不存在'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserSearchView(APIView):
    """用户搜索视图"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """搜索用户"""
        serializer = UserSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        q = serializer.validated_data['q']
        is_verified = serializer.validated_data.get('is_verified', False)
        order_by = serializer.validated_data['order_by']

        # 构建查询
        queryset = CustomUser.objects.all()

        if is_verified:
            queryset = queryset.filter(is_verified=True)

        # 搜索关键词
        if q:
            queryset = queryset.filter(
                Q(username__icontains=q) |
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q) |
                Q(email__icontains=q) |
                Q(bio__icontains=q)
            )

        # 排序
        queryset = queryset.order_by(order_by)

        # 分页
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        start = (page - 1) * page_size
        end = start + page_size

        users = queryset[start:end]

        serializer = UserListSerializer(
            users,
            many=True,
            context={'request': request}
        )

        return Response({
            'results': serializer.data,
            'count': queryset.count(),
            'page': page,
            'page_size': page_size
        })


class ActivityListView(ListAPIView):
    """活动流视图"""
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取活动流"""
        username = self.kwargs.get('username')

        if username == 'me' or not username:
            # 当前用户的活动
            return Activity.objects.filter(
                user=self.request.user
            ).order_by('-created_at')
        else:
            # 指定用户的活动（需要权限）
            user = get_object_or_404(CustomUser, username=username)

            # 检查权限
            if not user.can_view_profile(self.request.user):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("没有权限查看该用户活动")

            return Activity.objects.filter(
                user=user,
                is_private=False
            ).order_by('-created_at')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_social_stats(request, username=None):
    """获取用户社交统计"""
    if username == 'me' or not username:
        user = request.user
    else:
        user = get_object_or_404(CustomUser, username=username)

        # 检查权限
        if not user.can_view_profile(request.user):
            return Response(
                {'error': '没有权限查看该用户统计'},
                status=status.HTTP_403_FORBIDDEN
            )

    serializer = UserStatsSerializer(
        user,
        context={'request': request}
    )

    return Response(serializer.data)


class FriendListView(ListAPIView):
    """好友列表视图"""
    serializer_class = FriendListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取好友列表"""
        return self.request.user.get_friends()


class FriendRequestListView(ListAPIView):
    """好友请求列表视图"""
    serializer_class = FriendSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取好友请求列表"""
        type_param = self.request.query_params.get('type', 'received')
        
        if type_param == 'received':
            # 获取收到的好友请求
            return self.request.user.get_friend_requests()
        elif type_param == 'sent':
            # 获取发送的好友请求
            return self.request.user.get_sent_requests()
        else:
            # 默认返回收到的请求
            return self.request.user.get_friend_requests()


class FriendRequestView(APIView):
    """好友请求管理视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """发送好友请求"""
        serializer = CreateFriendRequestSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        target_user_id = serializer.validated_data['user_identifier']
        try:
            target_user = CustomUser.objects.get(id=target_user_id)

            success, message = request.user.send_friend_request(target_user)

            if success:
                # 记录活动
                Activity.log_friend_request(request.user, target_user)

                return Response({
                    'message': message,
                    'friend_request': {
                        'id': Friend.objects.filter(
                            sender=request.user,
                            receiver=target_user
                        ).first().id
                    }
                })
            else:
                return Response(
                    {'error': message},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except CustomUser.DoesNotExist:
            return Response(
                {'error': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )


class FriendActionView(APIView):
    """好友操作视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """处理好友请求（接受/拒绝）或删除好友"""
        serializer = FriendActionSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        user_id = serializer.validated_data.get('user_id')
        
        try:
            if action == 'accept':
                # 接受好友请求
                target_user_id = request.data.get('user_id')
                if not target_user_id:
                    return Response(
                        {'error': '接受好友请求需要提供用户ID'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    target_user = CustomUser.objects.get(id=target_user_id)
                    success, message = request.user.accept_friend_request(target_user)
                    
                    if success:
                        # 记录活动
                        Activity.log_friend_accept(request.user, target_user)
                        return Response({'message': message})
                    else:
                        return Response(
                            {'error': message},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except CustomUser.DoesNotExist:
                    return Response(
                        {'error': '用户不存在'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
            elif action == 'reject':
                # 拒绝好友请求
                if not user_id:
                    return Response(
                        {'error': '拒绝好友请求需要提供用户ID'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    target_user = CustomUser.objects.get(id=user_id)
                    success, message = request.user.reject_friend_request(target_user)
                    
                    if success:
                        # 记录活动
                        Activity.log_friend_reject(request.user, target_user)
                        return Response({'message': message})
                    else:
                        return Response(
                            {'error': message},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except CustomUser.DoesNotExist:
                    return Response(
                        {'error': '用户不存在'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
            elif action == 'remove':
                # 删除好友
                if not user_id:
                    return Response(
                        {'error': '删除好友需要提供用户ID'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    target_user = CustomUser.objects.get(id=user_id)
                    success, message = request.user.remove_friend(target_user)
                    
                    if success:
                        # 记录活动
                        Activity.log_friend_remove(request.user, target_user)
                        return Response({'message': message})
                    else:
                        return Response(
                            {'error': message},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except CustomUser.DoesNotExist:
                    return Response(
                        {'error': '用户不存在'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
        except Exception as e:
            return Response(
                {'error': f'操作失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FriendStatsView(APIView):
    """好友统计视图"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """获取好友统计信息"""
        user = request.user
        
        stats = {
            'friends_count': len(user.get_friends()),
            'received_requests_count': user.get_friend_requests().count(),
            'sent_requests_count': user.get_sent_requests().count(),
        }
        
        serializer = FriendStatsSerializer(stats)
        return Response(serializer.data)


class ChatConversationListView(ListAPIView):
    """聊天会话列表视图"""
    serializer_class = ChatConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取用户的聊天会话列表"""
        return ChatConversation.objects.filter(
            participants=self.request.user
        ).order_by('-updated_at')


class ChatConversationDetailView(RetrieveAPIView):
    """聊天会话详情视图"""
    serializer_class = ChatConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ChatConversation.objects.all()

    def get_object(self):
        """获取聊天会话对象并验证权限"""
        conversation = super().get_object()
        
        # 检查用户是否在该聊天会话中
        if not conversation.participants.filter(id=self.request.user.id).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("没有权限访问该聊天会话")
        
        return conversation


class ChatMessageListView(ListAPIView):
    """聊天消息列表视图"""
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """获取聊天消息列表"""
        conversation_id = self.kwargs.get('conversation_id')
        
        try:
            conversation = ChatConversation.objects.get(id=conversation_id)
        except ChatConversation.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("聊天会话不存在")

        # 检查用户是否在该聊天会话中
        if not conversation.participants.filter(id=self.request.user.id).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("没有权限访问该聊天会话")

        return ChatMessage.objects.filter(
            conversation=conversation,
            is_deleted=False
        ).select_related('sender').order_by('-created_at')


class ChatMessageCreateView(APIView):
    """创建聊天消息视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """发送消息"""
        serializer = CreateChatMessageSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        message = serializer.save()
        
        return Response({
            'message': '消息发送成功',
            'data': ChatMessageSerializer(message).data
        })


class ChatMessageDetailView(RetrieveUpdateDestroyAPIView):
    """聊天消息详情视图"""
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ChatMessage.objects.filter(is_deleted=False)

    def get_object(self):
        """获取消息对象并验证权限"""
        message = super().get_object()
        
        # 检查用户是否在该消息的聊天会话中
        if not message.conversation.participants.filter(id=self.request.user.id).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("没有权限访问该消息")

        # 检查是否是消息发送者
        if message.sender != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("只能编辑/删除自己发送的消息")

        return message

    def update(self, request, *args, **kwargs):
        """编辑消息"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # 只允许编辑内容
        if 'content' in request.data:
            instance.content = request.data['content']
            instance.is_edited = True
            instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        """删除消息（软删除）"""
        instance = self.get_object()
        instance.is_deleted = True
        instance.content = '[该消息已删除]'
        instance.save()
        
        return Response({'message': '消息已删除'})


class ChatMarkReadView(APIView):
    """标记消息已读视图"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """标记消息为已读"""
        message_ids = request.data.get('message_ids', [])
        
        if not message_ids:
            return Response(
                {'error': '需要提供消息ID列表'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 更新消息为已读
        updated_count = ChatMessage.objects.filter(
            id__in=message_ids,
            conversation__participants=request.user,
            is_deleted=False
        ).update(is_read=True)

        return Response({
            'message': f'已标记 {updated_count} 条消息为已读'
        })
