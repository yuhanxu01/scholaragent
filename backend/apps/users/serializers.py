from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from .models import CustomUser, UserProfile, Follow, Friend, ChatConversation, ChatParticipant, ChatMessage, DocumentCollection, Comment, Like, Activity, StudyGroup, GroupChannel, GroupMember, GroupInvitation

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    def validate_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Preferences must be a JSON object.")
        return value

    def validate_research_interests(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Research interests must be a list.")
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError("Each research interest must be a string.")
        return value

    class Meta:
        model = UserProfile
        fields = [
            'education_level',
            'major',
            'math_level',
            'programming_level',
            'preferences',
            'research_interests',
            'documents_read',
            'questions_asked',
            'study_time_hours',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['documents_read', 'questions_asked', 'study_time_hours', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'avatar',
            'date_joined',
            'last_login',
            'profile'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = CustomUser
        fields = [
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'profile'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', None)
        password = validated_data.pop('password')
        password_confirm = validated_data.pop('password_confirm')

        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )

        if profile_data:
            # Update the automatically created profile with user-provided data
            for key, value in profile_data.items():
                setattr(user.profile, key, value)
            user.profile.save()

        return user


class MeSerializer(UserSerializer):
    """Serializer for the current user's profile - includes editable profile"""
    profile = UserProfileSerializer()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields
        read_only_fields = UserSerializer.Meta.read_only_fields

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)

        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update profile fields
        if profile_data:
            for attr, value in profile_data.items():
                if hasattr(instance.profile, attr):
                    setattr(instance.profile, attr, value)
            instance.profile.save()

        return instance


class SocialUserProfileSerializer(serializers.ModelSerializer):
    """社交功能用户资料序列化器"""
    avatar_url = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    profile_url = serializers.ReadOnlyField()
    followers_count = serializers.ReadOnlyField()
    following_count = serializers.ReadOnlyField()
    public_documents_count = serializers.ReadOnlyField()
    likes_count = serializers.ReadOnlyField()
    is_following = serializers.SerializerMethodField()
    is_collected = serializers.SerializerMethodField()
    is_friend = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'avatar', 'avatar_url', 'display_name', 'profile_url',
            'bio', 'location', 'website', 'github_username',
            'is_verified', 'is_featured', 'followers_count',
            'following_count', 'public_documents_count', 'likes_count',
            'date_joined', 'last_login', 'is_following', 'is_collected', 'is_friend'
        ]
        read_only_fields = [
            'id', 'email', 'avatar_url', 'display_name', 'profile_url',
            'followers_count', 'following_count', 'public_documents_count',
            'likes_count', 'date_joined', 'last_login', 'is_verified', 'is_featured'
        ]

    def get_is_following(self, obj):
        """获取当前用户是否关注该用户"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return request.user.is_following(obj)

    def get_is_collected(self, obj):
        """获取当前用户是否收藏了该用户（这里可以扩展为用户级别的收藏）"""
        # 暂时返回False，可以扩展为收藏用户功能
        return False

    def get_is_friend(self, obj):
        """获取当前用户是否与该用户是好友"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return request.user.is_friend(obj)


class UserListSerializer(serializers.ModelSerializer):
    """用户列表序列化器"""
    avatar_url = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'avatar', 'avatar_url', 'display_name',
            'bio', 'is_verified', 'is_featured', 'followers_count',
            'public_documents_count', 'is_following'
        ]

    def get_is_following(self, obj):
        """获取当前用户是否关注该用户"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return request.user.is_following(obj)


class FollowSerializer(serializers.ModelSerializer):
    """关注关系序列化器"""
    follower = UserListSerializer(read_only=True)
    following = UserListSerializer(read_only=True)

    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at']
        read_only_fields = ['id', 'follower', 'created_at']

    def validate(self, attrs):
        """验证关注数据"""
        if 'following' in attrs:
            follower = self.context['request'].user
            following = attrs['following']

            # 不能关注自己
            if follower == following:
                raise serializers.ValidationError("不能关注自己")

            # 不能重复关注
            if Follow.objects.filter(follower=follower, following=following).exists():
                raise serializers.ValidationError("已经关注了该用户")

        return attrs


class DocumentCollectionSerializer(serializers.ModelSerializer):
    """文档收藏序列化器"""
    user = SocialUserProfileSerializer(read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_user = UserListSerializer(source='document.user', read_only=True)

    class Meta:
        model = DocumentCollection
        fields = [
            'id', 'user', 'document', 'document_title', 'document_user',
            'collection_name', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']


class CreateDocumentCollectionSerializer(serializers.ModelSerializer):
    """创建文档收藏序列化器"""
    class Meta:
        model = DocumentCollection
        fields = ['document', 'collection_name', 'notes']

    def validate_document(self, value):
        """验证文档是否可以收藏"""
        # 只能收藏公开的、已处理的文档
        if value.privacy != 'public' or value.status != 'ready':
            raise serializers.ValidationError("只能收藏公开的已处理文档")

        # 不能收藏自己的文档
        request = self.context.get('request')
        if request and request.user == value.user:
            raise serializers.ValidationError("不能收藏自己的文档")

        # 不能重复收藏
        if DocumentCollection.objects.filter(
            user=request.user,
            document=value
        ).exists():
            raise serializers.ValidationError("已经收藏了该文档")

        return value


class CommentSerializer(serializers.ModelSerializer):
    """评论序列化器"""
    user = UserListSerializer(read_only=True)
    is_reply = serializers.ReadOnlyField()
    replies_count = serializers.ReadOnlyField()
    likes_count = serializers.ReadOnlyField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'user', 'content', 'parent', 'is_reply',
            'replies_count', 'likes_count', 'is_liked', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'likes_count', 'replies_count', 'created_at']

    def get_is_liked(self, obj):
        """当前用户是否点赞了该评论"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        comment_content_type = ContentType.objects.get_for_model(Comment)
        return Like.objects.filter(
            user=request.user,
            content_type=comment_content_type,
            object_id=obj.id
        ).exists()

    def validate_content(self, value):
        """验证评论内容"""
        if not value.strip():
            raise serializers.ValidationError("评论内容不能为空")
        return value.strip()

    def validate_parent(self, value):
        """验证父评论"""
        if value:
            # 确保父评论存在且未被删除
            if value.is_deleted:
                raise serializers.ValidationError("不能回复已删除的评论")
        return value


class CreateCommentSerializer(serializers.ModelSerializer):
    """创建评论序列化器"""
    content_type = serializers.CharField(write_only=True)

    class Meta:
        model = Comment
        fields = ['content', 'parent', 'object_id', 'content_type']

    def validate_content(self, value):
        """验证评论内容"""
        if not value.strip():
            raise serializers.ValidationError("评论内容不能为空")
        return value.strip()

    def validate_content_type(self, value):
        """验证并转换content_type"""
        from django.contrib.contenttypes.models import ContentType
        from apps.documents.models import Document
        from apps.knowledge.models import Note

        # 将字符串转换为ContentType对象
        if value == 'document':
            try:
                return ContentType.objects.get_for_model(Document)
            except ContentType.DoesNotExist:
                raise serializers.ValidationError("文档类型不存在")
        elif value == 'note':
            try:
                return ContentType.objects.get_for_model(Note)
            except ContentType.DoesNotExist:
                raise serializers.ValidationError("笔记类型不存在")
        else:
            raise serializers.ValidationError("无效的内容类型")

    def create(self, validated_data):
        """创建评论"""
        content_type = validated_data.pop('content_type')
        user = self.context['request'].user
        comment = Comment.objects.create(
            user=user,
            content_type=content_type,
            **validated_data
        )
        return comment


class LikeSerializer(serializers.ModelSerializer):
    """点赞序列化器"""
    user = UserListSerializer(read_only=True)

    class Meta:
        model = Like
        fields = ['id', 'user', 'content_type', 'object_id', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class ActivitySerializer(serializers.ModelSerializer):
    """活动流序列化器"""
    user = UserListSerializer(read_only=True)
    target_user = UserListSerializer(read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = Activity
        fields = [
            'id', 'user', 'action', 'action_display', 'target_user',
            'content_type', 'object_id', 'description', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']


class UserStatsSerializer(serializers.ModelSerializer):
    """用户统计序列化器"""
    avatar_url = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    recent_followers = serializers.SerializerMethodField()
    recent_activities = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'avatar', 'avatar_url', 'display_name',
            'is_verified', 'is_featured', 'followers_count', 'following_count',
            'public_documents_count', 'likes_count', 'date_joined',
            'recent_followers', 'recent_activities'
        ]

    def get_recent_followers(self, obj):
        """获取最近的粉丝"""
        recent_follows = obj.get_followers(limit=5)
        return UserListSerializer(
            [follow.follower for follow in recent_follows],
            many=True,
            context=self.context
        ).data

    def get_recent_activities(self, obj):
        """获取最近的活动"""
        recent_activities = Activity.objects.filter(
            user=obj
        ).order_by('-created_at')[:10]
        return ActivitySerializer(recent_activities, many=True).data


class UserSearchSerializer(serializers.Serializer):
    """用户搜索序列化器"""
    q = serializers.CharField(help_text="搜索关键词")
    is_verified = serializers.BooleanField(required=False, help_text="是否只搜索验证用户")
    order_by = serializers.ChoiceField(
        choices=[
            ('followers_count', '粉丝数'),
            ('public_documents_count', '文档数'),
            ('date_joined', '注册时间'),
            ('-followers_count', '粉丝数(降序)'),
            ('-public_documents_count', '文档数(降序)'),
            ('-date_joined', '注册时间(降序)'),
        ],
        default='-followers_count'
    )


class DocumentLikeSerializer(serializers.Serializer):
    """文档点赞序列化器"""
    document_id = serializers.CharField(help_text="文档ID")
    action = serializers.ChoiceField(
        choices=['like', 'unlike'],
        help_text="操作类型"
    )


class FriendSerializer(serializers.ModelSerializer):
    """好友关系序列化器"""
    sender = UserListSerializer(read_only=True)
    receiver = UserListSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Friend
        fields = ['id', 'sender', 'receiver', 'status', 'status_display', 'created_at', 'updated_at']
        read_only_fields = ['id', 'sender', 'receiver', 'created_at', 'updated_at']


class FriendListSerializer(serializers.ModelSerializer):
    """好友列表序列化器"""
    user = UserListSerializer(read_only=True)
    is_friend = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'avatar', 'avatar_url', 'display_name',
            'bio', 'is_verified', 'is_featured', 'followers_count',
            'public_documents_count', 'is_friend'
        ]

    def get_is_friend(self, obj):
        """获取当前用户是否与该用户是好友"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return request.user.is_friend(obj)


class CreateFriendRequestSerializer(serializers.Serializer):
    """创建好友请求序列化器"""
    user_identifier = serializers.CharField(help_text="目标用户ID、用户名或邮箱")

    def validate_user_identifier(self, value):
        """验证用户标识符（ID、用户名或邮箱）"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("需要用户认证")

        # 尝试通过不同方式查找用户
        user = None

        # 1. 尝试通过ID查找
        if value.isdigit():
            try:
                user = CustomUser.objects.get(id=int(value))
            except CustomUser.DoesNotExist:
                pass

        # 2. 如果没找到，尝试通过邮箱查找
        if user is None:
            try:
                user = CustomUser.objects.get(email=value)
            except CustomUser.DoesNotExist:
                pass

        # 3. 如果还没找到，尝试通过用户名查找
        if user is None:
            try:
                user = CustomUser.objects.get(username=value)
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("用户不存在")

        # 检查是否是自己
        if user == request.user:
            raise serializers.ValidationError("不能添加自己为好友")

        return user.id  # 返回用户ID用于后续处理


class FriendActionSerializer(serializers.Serializer):
    """好友操作序列化器"""
    action = serializers.ChoiceField(
        choices=['accept', 'reject', 'remove'],
        help_text="操作类型"
    )
    user_id = serializers.IntegerField(help_text="目标用户ID", required=False)

    def validate_user_id(self, value):
        """验证用户ID"""
        if self.initial_data.get('action') in ['reject', 'remove'] and not value:
            raise serializers.ValidationError("执行该操作需要提供用户ID")
        
        if value:
            try:
                user = CustomUser.objects.get(id=value)
                return value
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("用户不存在")
        return value


class FriendStatsSerializer(serializers.Serializer):
    """好友统计序列化器"""
    friends_count = serializers.ReadOnlyField()
    received_requests_count = serializers.ReadOnlyField()
    sent_requests_count = serializers.ReadOnlyField()


class ChatParticipantSerializer(serializers.ModelSerializer):
    """聊天参与者序列化器"""
    user = UserListSerializer(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = ChatParticipant
        fields = ['user', 'role', 'role_display', 'joined_at', 'last_read_at', 'is_active']
        read_only_fields = ['user', 'joined_at']


class ChatConversationSerializer(serializers.ModelSerializer):
    """聊天会话序列化器"""
    participants = UserListSerializer(many=True, read_only=True)
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            'id', 'type', 'type_display', 'name', 'description', 'avatar',
            'participants', 'other_participant', 'last_message',
            'message_count', 'is_active', 'unread_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'message_count', 'updated_at']

    def get_other_participant(self, obj):
        """获取私人聊天的另一方"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_other_participant(request.user)
        return None

    def get_last_message(self, obj):
        """获取最后一条消息"""
        if obj.last_message:
            return ChatMessageSerializer(obj.last_message).data
        return None

    def get_unread_count(self, obj):
        """获取未读消息数量"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ChatMessage.objects.filter(
                conversation=obj,
                is_read=False
            ).exclude(sender=request.user).count()  # 排除自己发送的消息
        return 0


class CreateChatConversationSerializer(serializers.ModelSerializer):
    """创建聊天会话序列化器"""
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="参与者用户ID列表"
    )

    class Meta:
        model = ChatConversation
        fields = ['type', 'name', 'description', 'participant_ids']

    def validate_participant_ids(self, value):
        """验证参与者ID"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("需要用户认证")

        # 确保当前用户在参与者列表中
        if request.user.id not in value:
            value.append(request.user.id)

        # 检查用户是否存在
        existing_users = CustomUser.objects.filter(id__in=value)
        if existing_users.count() != len(value):
            raise serializers.ValidationError("部分用户不存在")

        # 私人聊天只能有两个参与者
        if self.initial_data.get('type') == 'private' and len(value) != 2:
            raise serializers.ValidationError("私人聊天只能有两个参与者")

        return value

    def create(self, validated_data):
        """创建聊天会话"""
        participant_ids = validated_data.pop('participant_ids')
        conversation = ChatConversation.objects.create(
            created_by=self.context['request'].user,
            **validated_data
        )

        # 添加参与者
        for user_id in participant_ids:
            user = CustomUser.objects.get(id=user_id)
            ChatParticipant.objects.create(
                conversation=conversation,
                user=user,
                role='member'
            )

        return conversation


class ChatMessageSerializer(serializers.ModelSerializer):
    """聊天消息序列化器"""
    sender = UserListSerializer(read_only=True)
    message_type_display = serializers.CharField(source='get_message_type_display', read_only=True)
    reply_to_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'conversation', 'sender', 'message_type', 'message_type_display',
            'content', 'file_url', 'file_name', 'file_size',
            'reply_to', 'reply_to_message', 'is_edited', 'is_deleted',
            'is_read', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sender', 'is_edited', 'is_deleted', 'is_read', 'created_at', 'updated_at'
        ]

    def get_reply_to_message(self, obj):
        """获取回复的消息"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content[:100],
                'sender': obj.reply_to.sender.display_name
            }
        return None


class CreateChatMessageSerializer(serializers.ModelSerializer):
    """创建聊天消息序列化器"""
    class Meta:
        model = ChatMessage
        fields = ['conversation', 'message_type', 'content', 'file_url', 'file_name', 'file_size', 'reply_to']

    def validate_conversation(self, value):
        """验证聊天会话"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("需要用户认证")

        # 检查用户是否在该聊天会话中
        if not value.participants.filter(id=request.user.id).exists():
            raise serializers.ValidationError("没有权限在该聊天会话中发送消息")

        return value

    def create(self, validated_data):
        """创建聊天消息"""
        message = ChatMessage.objects.create(
            sender=self.context['request'].user,
            **validated_data
        )

        # 更新聊天会话的最后消息和消息计数
        conversation = validated_data['conversation']
        conversation.last_message = message
        conversation.message_count += 1
        conversation.save(update_fields=['last_message', 'message_count', 'updated_at'])

        # 记录活动
        Activity.log_message(self.context['request'].user, message)

        return message


class StudyGroupSerializer(serializers.ModelSerializer):
    """学习小组序列化器"""
    avatar_url = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True)
    is_member = serializers.SerializerMethodField()
    member_role = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = StudyGroup
        fields = [
            'id', 'name', 'description', 'avatar', 'avatar_url', 'cover_image',
            'privacy', 'created_by', 'created_by_name', 'subject', 'tags',
            'member_count', 'channel_count', 'allow_invites', 'require_approval',
            'is_member', 'member_role', 'can_manage', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'member_count', 'channel_count',
            'is_member', 'member_role', 'can_manage', 'created_at', 'updated_at'
        ]

    def get_is_member(self, obj):
        """当前用户是否是成员"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return GroupMember.objects.filter(group=obj, user=request.user).exists()

    def get_member_role(self, obj):
        """当前用户的角色"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        member = GroupMember.objects.filter(group=obj, user=request.user).first()
        return member.role if member else None

    def get_can_manage(self, obj):
        """当前用户是否可以管理小组"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        member = GroupMember.objects.filter(group=obj, user=request.user).first()
        return member.can_manage_group() if member else False


class CreateStudyGroupSerializer(serializers.ModelSerializer):
    """创建学习小组序列化器"""
    class Meta:
        model = StudyGroup
        fields = ['name', 'description', 'privacy', 'subject', 'tags', 'allow_invites', 'require_approval']

    def validate_name(self, value):
        """验证小组名称"""
        if not value.strip():
            raise serializers.ValidationError("小组名称不能为空")
        if len(value.strip()) < 2:
            raise serializers.ValidationError("小组名称至少需要2个字符")
        return value.strip()

    def create(self, validated_data):
        """创建学习小组"""
        user = self.context['request'].user
        group = StudyGroup.objects.create(created_by=user, **validated_data)

        # 创建者自动成为owner
        group.add_member(user, role='owner')

        # 创建默认频道
        group.create_default_channel()

        # 记录活动
        Activity.log_create_group(user, group)

        return group


class GroupChannelSerializer(serializers.ModelSerializer):
    """小组频道序列化器"""
    can_access = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = GroupChannel
        fields = [
            'id', 'name', 'description', 'channel_type', 'order',
            'is_private', 'message_count', 'last_message_at',
            'can_access', 'last_message_preview', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'message_count', 'last_message_at', 'can_access',
            'last_message_preview', 'created_at', 'updated_at'
        ]

    def get_can_access(self, obj):
        """当前用户是否可以访问此频道"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.can_access(request.user)

    def get_last_message_preview(self, obj):
        """最后一条消息预览"""
        if obj.last_message_at and hasattr(obj, 'conversation') and obj.conversation.last_message:
            message = obj.conversation.last_message
            return {
                'content': message.content[:100] + ('...' if len(message.content) > 100 else ''),
                'sender': message.sender.display_name,
                'created_at': message.created_at
            }
        return None


class CreateGroupChannelSerializer(serializers.ModelSerializer):
    """创建频道序列化器"""
    class Meta:
        model = GroupChannel
        fields = ['name', 'description', 'channel_type', 'is_private']

    def validate_name(self, value):
        """验证频道名称"""
        if not value.strip():
            raise serializers.ValidationError("频道名称不能为空")
        if ' ' in value:
            raise serializers.ValidationError("频道名称不能包含空格")
        return value.strip().lower()

    def validate(self, attrs):
        """验证频道数据"""
        group_id = self.context.get('group_id')
        if not group_id:
            raise serializers.ValidationError("需要指定小组ID")

        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            raise serializers.ValidationError("小组不存在")

        # 检查用户是否有权限创建频道
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("需要用户认证")

        member = GroupMember.objects.filter(group=group, user=request.user).first()
        if not member or not member.can_manage_channel():
            raise serializers.ValidationError("没有权限创建频道")

        attrs['group'] = group
        attrs['created_by'] = request.user

        return attrs

    def create(self, validated_data):
        """创建频道"""
        group = validated_data['group']
        channel = GroupChannel.objects.create(**validated_data)

        # 更新小组频道计数
        group.channel_count += 1
        group.save(update_fields=['channel_count'])

        # 为频道创建聊天会话
        conversation = ChatConversation.objects.create(
            type='channel',
            group_channel=channel,
            name=f"{group.name}#{channel.name}",
            created_by=validated_data['created_by']
        )

        return channel


class GroupMemberSerializer(serializers.ModelSerializer):
    """小组成员序列化器"""
    user_info = UserListSerializer(source='user', read_only=True)
    invited_by_name = serializers.CharField(source='invited_by.display_name', read_only=True)

    class Meta:
        model = GroupMember
        fields = [
            'id', 'user', 'user_info', 'role', 'invited_by', 'invited_by_name',
            'joined_at', 'last_active_at', 'is_active'
        ]
        read_only_fields = [
            'id', 'user', 'invited_by', 'joined_by_name', 'joined_at', 'last_active_at'
        ]


class GroupInvitationSerializer(serializers.ModelSerializer):
    """小组邀请序列化器"""
    invited_by_name = serializers.CharField(source='invited_by.display_name', read_only=True)
    invitee_name = serializers.CharField(source='invitee.display_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    invite_url = serializers.SerializerMethodField()

    class Meta:
        model = GroupInvitation
        fields = [
            'id', 'group', 'group_name', 'invited_by', 'invited_by_name',
            'invitee', 'invitee_name', 'invite_code', 'email', 'message',
            'status', 'expires_at', 'assigned_role', 'invite_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invite_code', 'invite_url', 'created_at', 'updated_at'
        ]

    def get_invite_url(self, obj):
        """获取邀请链接"""
        request = self.context.get('request')
        if request:
            base_url = f"{request.scheme}://{request.get_host()}"
            return f"{base_url}/groups/join/{obj.invite_code}"
        return None


class CreateGroupInvitationSerializer(serializers.Serializer):
    """创建邀请序列化器"""
    invitee_identifier = serializers.CharField(help_text="被邀请者ID、用户名或邮箱")
    message = serializers.CharField(required=False, help_text="邀请消息")
    assigned_role = serializers.ChoiceField(
        choices=GroupMember.ROLE_CHOICES,
        default='member',
        help_text="分配的角色"
    )

    def validate_invitee_identifier(self, value):
        """验证被邀请者标识符"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("需要用户认证")

        group_id = self.context.get('group_id')
        if not group_id:
            raise serializers.ValidationError("需要指定小组ID")

        try:
            group = StudyGroup.objects.get(id=group_id)
        except StudyGroup.DoesNotExist:
            raise serializers.ValidationError("小组不存在")

        # 检查邀请者是否有权限
        member = GroupMember.objects.filter(group=group, user=request.user).first()
        if not member or not member.can_invite_members():
            raise serializers.ValidationError("没有权限邀请成员")

        # 查找被邀请者
        invitee = None
        if value.isdigit():
            try:
                invitee = CustomUser.objects.get(id=int(value))
            except CustomUser.DoesNotExist:
                pass
        if invitee is None:
            try:
                invitee = CustomUser.objects.get(username=value)
            except CustomUser.DoesNotExist:
                pass
        if invitee is None:
            try:
                invitee = CustomUser.objects.get(email=value)
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("用户不存在")

        # 检查是否已经是成员
        if GroupMember.objects.filter(group=group, user=invitee).exists():
            raise serializers.ValidationError("该用户已经是小组成员")

        # 检查是否已有待处理的邀请
        existing_invitation = GroupInvitation.objects.filter(
            group=group,
            invitee=invitee,
            status='pending'
        ).first()
        if existing_invitation:
            raise serializers.ValidationError("该用户已有待处理的邀请")

        return invitee

    def create(self, validated_data):
        """创建邀请"""
        group_id = self.context.get('group_id')
        group = StudyGroup.objects.get(id=group_id)
        inviter = self.context['request'].user
        invitee = validated_data['invitee_identifier']

        # 生成邀请码
        import secrets
        invite_code = secrets.token_urlsafe(16)

        invitation = GroupInvitation.objects.create(
            group=group,
            invited_by=inviter,
            invitee=invitee,
            invite_code=invite_code,
            message=validated_data.get('message', ''),
            assigned_role=validated_data.get('assigned_role', 'member')
        )

        # 记录活动
        Activity.log_invite_to_group(inviter, invitee, group)

        return invitation
