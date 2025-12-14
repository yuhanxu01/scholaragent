import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.urls import reverse
from django.conf import settings


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True, help_text="个人简介")
    location = models.CharField(max_length=100, blank=True, help_text="所在地")
    website = models.URLField(blank=True, help_text="个人网站")
    github_username = models.CharField(max_length=100, blank=True, help_text="GitHub用户名")
    is_verified = models.BooleanField(default=False, help_text="是否验证用户")
    is_featured = models.BooleanField(default=False, help_text="是否推荐用户")
    followers_count = models.PositiveIntegerField(default=0, help_text="粉丝数")
    following_count = models.PositiveIntegerField(default=0, help_text="关注数")
    public_documents_count = models.PositiveIntegerField(default=0, help_text="公开文档数")
    likes_count = models.PositiveIntegerField(default=0, help_text="获得点赞数")

    # OAuth 字段
    google_id = models.CharField(max_length=100, blank=True, null=True, unique=True, help_text="Google OAuth ID")
    wechat_openid = models.CharField(max_length=100, blank=True, null=True, unique=True, help_text="微信 OpenID")
    wechat_unionid = models.CharField(max_length=100, blank=True, null=True, unique=True, help_text="微信 UnionID")
    auth_provider = models.CharField(max_length=20, blank=True, help_text="认证提供商 (google, wechat, local)")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['followers_count']),
            models.Index(fields=['following_count']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['is_featured']),
        ]

    def __str__(self):
        return self.username or self.email

    @property
    def display_name(self):
        """显示名称"""
        return self.get_full_name() or self.username

    @property
    def profile_url(self):
        """个人资料URL"""
        return reverse('users:profile', kwargs={'username': self.username})

    @property
    def avatar_url(self):
        """头像URL，支持默认头像"""
        if self.avatar:
            return self.avatar.url
        return f"https://ui-avatars.com/api/?name={self.display_name}&background=0D8ABC&color=fff&size=200"

    def update_counts(self):
        """更新统计计数"""
        from .models import Follow, Like, DocumentCollection
        from apps.documents.models import Document

        self.followers_count = Follow.objects.filter(following=self).count()
        self.following_count = Follow.objects.filter(follower=self).count()

        self.public_documents_count = Document.objects.filter(
            user=self,
            privacy='public',
            status='ready'
        ).count()

        document_ids = Document.objects.filter(user=self).values_list('id', flat=True)
        self.likes_count = Like.objects.filter(
            content_type__model='document',
            object_id__in=document_ids
        ).count()

        self.save(update_fields=[
            'followers_count',
            'following_count',
            'public_documents_count',
            'likes_count'
        ])

    def is_following(self, user):
        """检查是否关注了某个用户"""
        if not user or user.id == self.id:
            return False
        return Follow.objects.filter(follower=self, following=user).exists()

    def follow(self, user):
        """关注用户"""
        if self.is_following(user):
            return False
        Follow.objects.create(follower=self, following=user)
        self.update_counts()
        user.update_counts()
        return True

    def unfollow(self, user):
        """取消关注"""
        if not self.is_following(user):
            return False
        Follow.objects.filter(follower=self, following=user).delete()
        self.update_counts()
        user.update_counts()
        return True

    def get_followers(self, limit=20):
        """获取粉丝列表"""
        return Follow.objects.filter(
            following=self
        ).select_related('follower').order_by('-created_at')[:limit]

    def get_following(self, limit=20):
        """获取关注列表"""
        return Follow.objects.filter(
            follower=self
        ).select_related('following').order_by('-created_at')[:limit]

    def is_friend(self, user):
        """检查是否与某个用户是好友关系"""
        if not user or user.id == self.id:
            return False
        return Friend.objects.filter(
            (models.Q(sender=self, receiver=user) | models.Q(sender=user, receiver=self)),
            status='accepted'
        ).exists()

    def send_friend_request(self, user):
        """发送好友请求"""
        if self.is_friend(user):
            return False, "已经是好友关系"

        # 检查是否已经有待处理的好友请求
        existing_request = Friend.objects.filter(
            (models.Q(sender=self, receiver=user) | models.Q(sender=user, receiver=self)),
            status='pending'
        ).first()

        if existing_request:
            if existing_request.sender == self:
                return False, "已经发送过好友请求，请等待对方确认"
            else:
                return False, "对方已经发送过好友请求，请先处理该请求"

        # 创建好友请求
        Friend.objects.create(sender=self, receiver=user, status='pending')
        return True, "好友请求发送成功"

    def accept_friend_request(self, user):
        """接受好友请求"""
        try:
            friend_request = Friend.objects.get(
                sender=user,
                receiver=self,
                status='pending'
            )
            friend_request.status = 'accepted'
            friend_request.save()
            return True, "好友请求已接受"
        except Friend.DoesNotExist:
            return False, "没有找到待处理的好友请求"

    def reject_friend_request(self, user):
        """拒绝好友请求"""
        try:
            friend_request = Friend.objects.get(
                sender=user,
                receiver=self,
                status='pending'
            )
            friend_request.delete()  # 删除请求记录
            return True, "好友请求已拒绝"
        except Friend.DoesNotExist:
            return False, "没有找到待处理的好友请求"

    def remove_friend(self, user):
        """删除好友"""
        try:
            friend_relation = Friend.objects.get(
                (models.Q(sender=self, receiver=user) | models.Q(sender=user, receiver=self)),
                status='accepted'
            )
            friend_relation.delete()
            return True, "已删除好友关系"
        except Friend.DoesNotExist:
            return False, "没有找到好友关系"

    def get_friends(self, limit=50):
        """获取好友列表"""
        friend_relations = Friend.objects.filter(
            (models.Q(sender=self) | models.Q(receiver=self)),
            status='accepted'
        ).select_related('sender', 'receiver')
        
        # 获取好友用户对象（排除自己）
        friends = []
        for relation in friend_relations:
            friend = relation.sender if relation.receiver == self else relation.receiver
            friends.append(friend)
        
        return friends[:limit]

    def get_friend_requests(self):
        """获取收到的好友请求列表"""
        return Friend.objects.filter(
            receiver=self,
            status='pending'
        ).select_related('sender').order_by('-created_at')

    def get_sent_requests(self):
        """获取发送的好友请求列表"""
        return Friend.objects.filter(
            sender=self,
            status='pending'
        ).select_related('receiver').order_by('-created_at')

    def can_view_profile(self, user):
        """检查用户是否有权限查看个人资料"""
        # 如果是自己的资料，总是可以查看
        if user and user.id == self.id:
            return True

        # 如果是验证用户或推荐用户，所有人可以查看
        if self.is_verified or self.is_featured:
            return True

        # 如果有公开文档，所有人可以查看
        from apps.documents.models import Document
        if Document.objects.filter(user=self, privacy='public', status='ready').exists():
            return True

        # 其他情况需要登录才能查看
        return user is not None


class UserProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    education_level = models.CharField(max_length=50, blank=True)
    major = models.CharField(max_length=100, blank=True)
    math_level = models.IntegerField(default=1, choices=[(i, i) for i in range(1, 6)])
    programming_level = models.IntegerField(default=1, choices=[(i, i) for i in range(1, 6)])
    preferences = models.JSONField(default=dict, blank=True)
    research_interests = models.JSONField(default=list, blank=True)
    documents_read = models.IntegerField(default=0)
    questions_asked = models.IntegerField(default=0)
    study_time_hours = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} Profile"


class Follow(models.Model):
    """关注关系模型"""
    follower = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='following_relations',
        help_text="关注者"
    )
    following = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='follower_relations',
        help_text="被关注者"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['follower', 'following']
        indexes = [
            models.Index(fields=['follower', '-created_at']),
            models.Index(fields=['following', '-created_at']),
        ]
        verbose_name = "关注关系"
        verbose_name_plural = "关注关系"

    def __str__(self):
        return f"{self.follower.username} 关注了 {self.following.username}"

    def clean(self):
        # 不能关注自己
        if self.follower == self.following:
            from django.core.exceptions import ValidationError
            raise ValidationError("不能关注自己")


class Like(models.Model):
    """点赞模型 - 通用点赞系统"""
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    content_type = models.ForeignKey(
        'contenttypes.ContentType',
        on_delete=models.CASCADE,
        help_text="被点赞的内容类型"
    )
    object_id = models.CharField(max_length=255, help_text="被点赞的对象ID")  # 支持UUID和整数
    content_object = None  # GenericForeignKey
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'content_type', 'object_id']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = "点赞"
        verbose_name_plural = "点赞"

    def __str__(self):
        return f"{self.user.username} 赞了 {self.content_type.model} #{self.object_id}"


class DocumentCollection(models.Model):
    """文档收藏夹模型 - 用户可以收藏他人的公开文档"""
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='collections'
    )
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='collections'
    )
    collection_name = models.CharField(
        max_length=100,
        default='默认收藏夹',
        help_text="收藏夹名称"
    )
    notes = models.TextField(
        blank=True,
        help_text="收藏备注"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'document']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['document', '-created_at']),
            models.Index(fields=['collection_name']),
        ]
        verbose_name = "文档收藏"
        verbose_name_plural = "文档收藏"

    def __str__(self):
        return f"{self.user.username} 收藏了 {self.document.title}"


class Comment(models.Model):
    """评论模型 - 通用评论系统"""
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    content_type = models.ForeignKey(
        'contenttypes.ContentType',
        on_delete=models.CASCADE,
        help_text="被评论的内容类型"
    )
    object_id = models.CharField(max_length=255, help_text="被评论的对象ID")  # 支持UUID和整数
    content_object = None  # GenericForeignKey
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        help_text="父评论"
    )
    content = models.TextField(
        max_length=1000,
        help_text="评论内容"
    )
    is_deleted = models.BooleanField(
        default=False,
        help_text="是否已删除"
    )
    likes_count = models.PositiveIntegerField(
        default=0,
        help_text="点赞数"
    )
    replies_count = models.PositiveIntegerField(
        default=0,
        help_text="回复数"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['content_type', 'object_id', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['parent', '-created_at']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['-likes_count']),
        ]
        ordering = ['-created_at']
        verbose_name = "评论"
        verbose_name_plural = "评论"

    def __str__(self):
        return f"{self.user.username} 评论了 {self.content_type.model} #{self.object_id}"

    @property
    def is_reply(self):
        """是否是回复"""
        return self.parent is not None

    def get_replies(self):
        """获取回复"""
        return Comment.objects.filter(
            parent=self,
            is_deleted=False
        ).select_related('user').order_by('created_at')

    def update_counts(self):
        """更新计数"""
        self.likes_count = Like.objects.filter(
            content_type__model='comment',
            object_id=self.id
        ).count()

        self.replies_count = Comment.objects.filter(
            parent=self,
            is_deleted=False
        ).count()

        self.save(update_fields=['likes_count', 'replies_count'])

    def delete_comment(self):
        """软删除评论"""
        self.is_deleted = True
        self.content = '[该评论已删除]'
        self.save(update_fields=['is_deleted', 'content'])

        # 更新父评论的回复数
        if self.parent:
            self.parent.update_counts()


class Friend(models.Model):
    """好友关系模型 - 管理用户之间的好友关系"""
    STATUS_CHOICES = [
        ('pending', '待确认'),
        ('accepted', '已确认'),
        ('blocked', '已屏蔽'),
    ]
    
    sender = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='friend_requests_sent',
        help_text="发送好友请求的用户"
    )
    receiver = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='friend_requests_received',
        help_text="接收好友请求的用户"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="好友关系状态"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['sender', 'receiver']
        indexes = [
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['receiver', '-created_at']),
            models.Index(fields=['status']),
        ]
        verbose_name = "好友关系"
        verbose_name_plural = "好友关系"

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.get_status_display()})"

    def clean(self):
        # 不能加自己为好友
        if self.sender == self.receiver:
            from django.core.exceptions import ValidationError
            raise ValidationError("不能加自己为好友")


class ChatConversation(models.Model):
    """用户聊天会话模型"""
    TYPE_CHOICES = [
        ('private', '私人聊天'),
        ('group', '群组聊天'),
        ('channel', '频道聊天'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='private', help_text="聊天类型")

    # 对于私人聊天和群聊
    participants = models.ManyToManyField(
        CustomUser,
        through='ChatParticipant',
        related_name='chat_conversations',
        help_text="聊天参与者",
        blank=True
    )

    # 对于频道聊天
    group_channel = models.OneToOneField(
        'GroupChannel',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='conversation',
        help_text="关联的频道"
    )

    name = models.CharField(max_length=100, blank=True, help_text="聊天名称")
    description = models.TextField(blank=True, help_text="聊天描述")
    avatar = models.ImageField(upload_to='chat_avatars/', blank=True, null=True, help_text="聊天头像")

    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='created_conversations',
        help_text="创建者"
    )

    last_message = models.ForeignKey(
        'ChatMessage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        help_text="最后一条消息"
    )
    message_count = models.PositiveIntegerField(default=0, help_text="消息数量")
    is_active = models.BooleanField(default=True, help_text="是否活跃")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['-updated_at']),
            models.Index(fields=['type']),
            models.Index(fields=['is_active']),
        ]
        ordering = ['-updated_at']
        verbose_name = "聊天会话"
        verbose_name_plural = "聊天会话"

    def __str__(self):
        if self.type == 'channel':
            return f"频道: {self.group_channel.group.name}#{self.group_channel.name}"
        elif self.type == 'group':
            return f"群聊: {self.name or '未命名群聊'}"
        else:
            # 私人聊天，显示参与者
            participants = list(self.participants.all())
            if len(participants) == 2:
                return f"私聊: {participants[0].username} <-> {participants[1].username}"
            else:
                return f"私聊: {self.id}"

    def get_other_participant(self, user):
        """获取与指定用户聊天的另一方（仅限私人聊天）"""
        if self.type != 'private':
            return None
        participants = list(self.participants.all())
        if len(participants) == 2:
            return participants[0] if participants[1] == user else participants[1]
        return None

    @property
    def display_name(self):
        """显示名称"""
        if self.type == 'channel':
            return f"{self.group_channel.group.name}#{self.group_channel.name}"
        elif self.type == 'group':
            return self.name or '未命名群聊'
        else:
            participants = list(self.participants.all())
            if len(participants) == 2:
                other = participants[0] if participants[1].id == self.created_by.id else participants[1]
                return other.display_name
            else:
                return "私聊"


class ChatParticipant(models.Model):
    """聊天参与者关联模型"""
    ROLE_CHOICES = [
        ('member', '成员'),
        ('admin', '管理员'),
        ('owner', '群主'),
    ]

    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member', help_text="角色")
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(auto_now=True, help_text="最后阅读时间")
    is_active = models.BooleanField(default=True, help_text="是否活跃")

    class Meta:
        unique_together = ['conversation', 'user']
        indexes = [
            models.Index(fields=['conversation', 'user']),
            models.Index(fields=['user', '-joined_at']),
        ]
        verbose_name = "聊天参与者"
        verbose_name_plural = "聊天参与者"

    def __str__(self):
        return f"{self.user.username} 在 {self.conversation.id}"


class ChatMessage(models.Model):
    """聊天消息模型"""
    TYPE_CHOICES = [
        ('text', '文本'),
        ('image', '图片'),
        ('file', '文件'),
        ('voice', '语音'),
        ('video', '视频'),
        ('system', '系统消息'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name='messages',
        help_text="所属聊天"
    )
    sender = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        help_text="发送者"
    )
    message_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='text', help_text="消息类型")
    content = models.TextField(help_text="消息内容")
    file_url = models.URLField(blank=True, help_text="文件URL")
    file_name = models.CharField(max_length=255, blank=True, help_text="文件名")
    file_size = models.BigIntegerField(default=0, help_text="文件大小（字节）")
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        help_text="回复的消息"
    )
    is_edited = models.BooleanField(default=False, help_text="是否已编辑")
    is_deleted = models.BooleanField(default=False, help_text="是否已删除")
    is_read = models.BooleanField(default=False, help_text="是否已读")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['is_read']),
        ]
        ordering = ['-created_at']
        verbose_name = "聊天消息"
        verbose_name_plural = "聊天消息"

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}{'...' if len(self.content) > 50 else ''}"

    def mark_as_read(self):
        """标记消息为已读"""
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])


class StudyGroup(models.Model):
    """学习小组模型 - 类似Discord的服务器"""
    name = models.CharField(max_length=100, help_text="小组名称")
    description = models.TextField(blank=True, help_text="小组描述")
    avatar = models.ImageField(upload_to='group_avatars/', blank=True, null=True, help_text="小组头像")
    cover_image = models.ImageField(upload_to='group_covers/', blank=True, null=True, help_text="封面图片")

    # 隐私设置
    privacy = models.CharField(
        max_length=10,
        choices=[
            ('public', '公开'),
            ('private', '私有'),
        ],
        default='private',
        help_text="小组隐私设置"
    )

    # 创建者和管理员
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='created_study_groups',
        help_text="创建者"
    )

    # 统计信息
    member_count = models.PositiveIntegerField(default=1, help_text="成员数量")
    channel_count = models.PositiveIntegerField(default=0, help_text="频道数量")

    # 设置
    allow_invites = models.BooleanField(default=True, help_text="允许成员邀请他人")
    require_approval = models.BooleanField(default=False, help_text="新成员需要审批")

    # 主题和标签
    subject = models.CharField(max_length=100, blank=True, help_text="学习主题")
    tags = models.JSONField(default=list, blank=True, help_text="标签列表")

    is_active = models.BooleanField(default=True, help_text="是否活跃")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['privacy']),
            models.Index(fields=['created_by']),
            models.Index(fields=['subject']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = "学习小组"
        verbose_name_plural = "学习小组"

    def __str__(self):
        return f"{self.name} ({self.member_count}人)"

    @property
    def avatar_url(self):
        """小组头像URL"""
        if self.avatar:
            return self.avatar.url
        return f"https://ui-avatars.com/api/?name={self.name}&background=4F46E5&color=fff&size=200"

    def add_member(self, user, role='member', invited_by=None):
        """添加成员"""
        member, created = GroupMember.objects.get_or_create(
            group=self,
            user=user,
            defaults={'role': role, 'invited_by': invited_by}
        )
        if created:
            self.member_count += 1
            self.save(update_fields=['member_count'])
        return member

    def remove_member(self, user):
        """移除成员"""
        deleted_count, _ = GroupMember.objects.filter(group=self, user=user).delete()
        if deleted_count > 0:
            self.member_count = max(0, self.member_count - 1)
            self.save(update_fields=['member_count'])
        return deleted_count > 0

    def get_members(self, role=None):
        """获取成员列表"""
        queryset = GroupMember.objects.filter(group=self).select_related('user')
        if role:
            queryset = queryset.filter(role=role)
        return queryset.order_by('-joined_at')

    def create_default_channel(self):
        """创建默认频道"""
        return GroupChannel.objects.create(
            group=self,
            name='general',
            description='通用讨论',
            channel_type='text',
            created_by=self.created_by
        )


class GroupChannel(models.Model):
    """小组频道模型 - 类似Discord的频道"""
    CHANNEL_TYPE_CHOICES = [
        ('text', '文本频道'),
        ('voice', '语音频道'),  # 为未来扩展预留
    ]

    name = models.CharField(max_length=100, help_text="频道名称")
    description = models.TextField(blank=True, help_text="频道描述")
    channel_type = models.CharField(
        max_length=10,
        choices=CHANNEL_TYPE_CHOICES,
        default='text',
        help_text="频道类型"
    )

    # 所属小组
    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='channels',
        help_text="所属学习小组"
    )

    # 创建者
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='created_channels',
        help_text="创建者"
    )

    # 排序和设置
    order = models.PositiveIntegerField(default=0, help_text="排序位置")
    is_private = models.BooleanField(default=False, help_text="是否为私有频道")

    # 统计信息
    message_count = models.PositiveIntegerField(default=0, help_text="消息数量")
    last_message_at = models.DateTimeField(null=True, blank=True, help_text="最后消息时间")

    is_active = models.BooleanField(default=True, help_text="是否活跃")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['group', 'name']
        indexes = [
            models.Index(fields=['group', 'order']),
            models.Index(fields=['group', 'channel_type']),
            models.Index(fields=['is_active']),
            models.Index(fields=['-last_message_at']),
        ]
        ordering = ['order', 'created_at']
        verbose_name = "小组频道"
        verbose_name_plural = "小组频道"

    def __str__(self):
        return f"{self.group.name}#{self.name}"

    def can_access(self, user):
        """检查用户是否可以访问此频道"""
        if not self.is_private:
            # 公开频道，所有小组成员都可以访问
            return GroupMember.objects.filter(group=self.group, user=user).exists()
        else:
            # 私有频道需要额外权限检查（未来扩展）
            return GroupMember.objects.filter(group=self.group, user=user).exists()

    def update_message_count(self):
        """更新消息计数"""
        from .models import ChatMessage
        self.message_count = ChatMessage.objects.filter(
            conversation__group_channel=self,
            is_deleted=False
        ).count()
        self.save(update_fields=['message_count'])


class GroupMember(models.Model):
    """小组成员模型"""
    ROLE_CHOICES = [
        ('owner', '群主'),
        ('admin', '管理员'),
        ('moderator', '版主'),
        ('member', '成员'),
    ]

    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='members',
        help_text="所属小组"
    )
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='study_group_memberships',
        help_text="成员用户"
    )

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='member',
        help_text="成员角色"
    )

    # 邀请信息
    invited_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='group_invitations_sent',
        help_text="邀请者"
    )

    # 状态
    is_active = models.BooleanField(default=True, help_text="是否活跃")
    joined_at = models.DateTimeField(auto_now_add=True)
    last_active_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['group', 'user']
        indexes = [
            models.Index(fields=['group', 'role']),
            models.Index(fields=['user', 'joined_at']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = "小组成员"
        verbose_name_plural = "小组成员"

    def __str__(self):
        return f"{self.user.username} 在 {self.group.name} ({self.get_role_display()})"

    @property
    def role_level(self):
        """角色等级（用于权限判断）"""
        levels = {
            'member': 1,
            'moderator': 2,
            'admin': 3,
            'owner': 4,
        }
        return levels.get(self.role, 1)

    def can_manage_group(self):
        """是否可以管理小组"""
        return self.role in ['owner', 'admin']

    def can_manage_channel(self):
        """是否可以管理频道"""
        return self.role in ['owner', 'admin', 'moderator']

    def can_invite_members(self):
        """是否可以邀请成员"""
        return self.role in ['owner', 'admin', 'moderator'] or self.group.allow_invites


class GroupInvitation(models.Model):
    """小组邀请模型"""
    STATUS_CHOICES = [
        ('pending', '待接受'),
        ('accepted', '已接受'),
        ('declined', '已拒绝'),
        ('expired', '已过期'),
    ]

    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='invitations',
        help_text="目标小组"
    )

    # 邀请人
    invited_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='group_invitations_created',
        help_text="邀请者"
    )

    # 被邀请人（如果是通过链接邀请，可能为空）
    invitee = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='group_invitations_received',
        help_text="被邀请者"
    )

    # 邀请信息
    invite_code = models.CharField(max_length=32, unique=True, help_text="邀请码")
    email = models.EmailField(blank=True, help_text="邀请邮箱")
    message = models.TextField(blank=True, help_text="邀请消息")

    # 状态
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="邀请状态"
    )

    # 过期时间
    expires_at = models.DateTimeField(null=True, blank=True, help_text="过期时间")

    # 角色设置
    assigned_role = models.CharField(
        max_length=10,
        choices=GroupMember.ROLE_CHOICES,
        default='member',
        help_text="分配的角色"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['invite_code']),
            models.Index(fields=['status']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['group', 'status']),
        ]
        verbose_name = "小组邀请"
        verbose_name_plural = "小组邀请"

    def __str__(self):
        if self.invitee:
            return f"{self.invited_by.username} 邀请 {self.invitee.username} 加入 {self.group.name}"
        else:
            return f"{self.invited_by.username} 创建了 {self.group.name} 的邀请链接"

    def accept(self, user):
        """接受邀请"""
        if self.status != 'pending':
            return False, "邀请已失效"

        if self.invitee and self.invitee != user:
            return False, "邀请不属于此用户"

        # 检查是否已经是成员
        if GroupMember.objects.filter(group=self.group, user=user).exists():
            return False, "已经是小组成员"

        # 添加成员
        self.group.add_member(user, role=self.assigned_role, invited_by=self.invited_by)
        self.status = 'accepted'
        self.invitee = user
        self.save()

        return True, f"成功加入 {self.group.name}"

    def decline(self, user):
        """拒绝邀请"""
        if self.invitee != user:
            return False, "邀请不属于此用户"

        self.status = 'declined'
        self.save()
        return True, "已拒绝邀请"


class Activity(models.Model):
    """活动流模型 - 记录用户活动"""
    ACTION_CHOICES = [
        ('follow', '关注'),
        ('unfollow', '取消关注'),
        ('friend_request', '发送好友请求'),
        ('friend_accept', '接受好友请求'),
        ('friend_reject', '拒绝好友请求'),
        ('friend_remove', '删除好友'),
        ('like', '点赞'),
        ('unlike', '取消点赞'),
        ('comment', '评论'),
        ('collect', '收藏'),
        ('upload_document', '上传文档'),
        ('publish_document', '发布文档'),
        ('send_message', '发送消息'),
        ('create_group', '创建学习小组'),
        ('join_group', '加入学习小组'),
        ('leave_group', '离开学习小组'),
        ('invite_to_group', '邀请加入小组'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        help_text="活动类型"
    )
    content_type = models.ForeignKey(
        'contenttypes.ContentType',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="相关内容类型"
    )
    object_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="相关对象ID"  # 支持UUID和整数
    )
    content_object = None  # GenericForeignKey
    target_user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='target_activities',
        help_text="目标用户"
    )
    description = models.TextField(
        blank=True,
        help_text="活动描述"
    )
    is_private = models.BooleanField(
        default=False,
        help_text="是否为私密活动"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['target_user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
        ordering = ['-created_at']
        verbose_name = "活动"
        verbose_name_plural = "活动流"

    def __str__(self):
        return f"{self.user.username} {self.get_action_display()} {self.description or ''}"

    @classmethod
    def log_follow(cls, follower, following):
        """记录关注活动"""
        return cls.objects.create(
            user=follower,
            action='follow',
            target_user=following,
            description=f'关注了 {following.display_name}'
        )

    @classmethod
    def log_like(cls, user, content_object):
        """记录点赞活动"""
        from django.contrib.contenttypes.models import ContentType

        return cls.objects.create(
            user=user,
            action='like',
            content_type=ContentType.objects.get_for_model(content_object),
            object_id=content_object.id,
            description=f'赞了 {content_object.title if hasattr(content_object, "title") else "内容"}'
        )

    @classmethod
    def log_comment(cls, user, comment):
        """记录评论活动"""
        from django.contrib.contenttypes.models import ContentType

        return cls.objects.create(
            user=user,
            action='comment',
            content_type=ContentType.objects.get_for_model(comment.content_object),
            object_id=comment.content_object.id,
            description=f'评论了内容'
        )

    @classmethod
    def log_collect(cls, user, document):
        """记录收藏活动"""
        from django.contrib.contenttypes.models import ContentType

        return cls.objects.create(
            user=user,
            action='collect',
            content_type=ContentType.objects.get_for_model(document),
            object_id=document.id,
            description=f'收藏了文档 {document.title}'
        )

    @classmethod
    def log_friend_request(cls, sender, receiver):
        """记录发送好友请求活动"""
        return cls.objects.create(
            user=sender,
            action='friend_request',
            target_user=receiver,
            description=f'向 {receiver.display_name} 发送了好友请求'
        )

    @classmethod
    def log_friend_accept(cls, user, target_user):
        """记录接受好友请求活动"""
        return cls.objects.create(
            user=user,
            action='friend_accept',
            target_user=target_user,
            description=f'接受了 {target_user.display_name} 的好友请求'
        )

    @classmethod
    def log_friend_reject(cls, user, target_user):
        """记录拒绝好友请求活动"""
        return cls.objects.create(
            user=user,
            action='friend_reject',
            target_user=target_user,
            description=f'拒绝了 {target_user.display_name} 的好友请求'
        )

    @classmethod
    def log_friend_remove(cls, user, target_user):
        """记录删除好友活动"""
        return cls.objects.create(
            user=user,
            action='friend_remove',
            target_user=target_user,
            description=f'删除了好友 {target_user.display_name}'
        )

    @classmethod
    def log_message(cls, user, message):
        """记录发送消息活动"""
        from django.contrib.contenttypes.models import ContentType

        return cls.objects.create(
            user=user,
            action='send_message',
            content_type=ContentType.objects.get_for_model(message),
            object_id=message.id,
            description=f'在聊天中发送了消息'
        )

    @classmethod
    def log_create_group(cls, user, group):
        """记录创建学习小组活动"""
        from django.contrib.contenttypes.models import ContentType

        return cls.objects.create(
            user=user,
            action='create_group',
            content_type=ContentType.objects.get_for_model(group),
            object_id=group.id,
            description=f'创建了学习小组 {group.name}'
        )

    @classmethod
    def log_join_group(cls, user, group):
        """记录加入学习小组活动"""
        from django.contrib.contenttypes.models import ContentType

        return cls.objects.create(
            user=user,
            action='join_group',
            content_type=ContentType.objects.get_for_model(group),
            object_id=group.id,
            description=f'加入了学习小组 {group.name}'
        )

    @classmethod
    def log_leave_group(cls, user, group):
        """记录离开学习小组活动"""
        from django.contrib.contenttypes.models import ContentType

        return cls.objects.create(
            user=user,
            action='leave_group',
            content_type=ContentType.objects.get_for_model(group),
            object_id=group.id,
            description=f'离开了学习小组 {group.name}'
        )

    @classmethod
    def log_invite_to_group(cls, inviter, invitee, group):
        """记录邀请加入小组活动"""
        from django.contrib.contenttypes.models import ContentType

        return cls.objects.create(
            user=inviter,
            action='invite_to_group',
            target_user=invitee,
            content_type=ContentType.objects.get_for_model(group),
            object_id=group.id,
            description=f'邀请 {invitee.display_name} 加入学习小组 {group.name}'
        )
