"""
WebSocket认证中间件 / WebSocket Authentication Middleware

为WebSocket连接提供JWT认证支持
Provides JWT authentication support for WebSocket connections
"""

import logging
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)
User = get_user_model()


class JWTAuthMiddleware(BaseMiddleware):
    """
    JWT认证中间件 / JWT Authentication Middleware

    从WebSocket连接的query参数中提取JWT token并验证用户身份
    Extracts JWT token from WebSocket connection query parameters and authenticates users
    """

    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        """
        处理WebSocket连接 / Handle WebSocket connection

        Args:
            scope: 连接范围 / Connection scope
            receive: 接收函数 / Receive function
            send: 发送函数 / Send function

        Returns:
            包装后的处理函数 / Wrapped handler function
        """
        try:
            # 从query string获取token / Get token from query string
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)

            token = query_params.get('token', [None])[0]

            if token:
                # 验证token并获取用户 / Validate token and get user
                user = await self.get_user_from_token(token)
                scope['user'] = user
                logger.debug(f"WebSocket authenticated user: {user.username if user else 'Anonymous'}")
            else:
                # 无token，使用匿名用户 / No token, use anonymous user
                scope['user'] = AnonymousUser()
                logger.debug("WebSocket connection without token - using anonymous user")

        except Exception as e:
            logger.error(f"WebSocket authentication error: {e}")
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user_from_token(self, token: str):
        """
        从JWT token获取用户 / Get user from JWT token

        Args:
            token: JWT访问令牌 / JWT access token

        Returns:
            User or AnonymousUser: 认证用户或匿名用户 / Authenticated user or anonymous user
        """
        try:
            # 验证token / Validate token
            access_token = AccessToken(token)
            user_id = access_token.payload.get('user_id')

            if user_id:
                # 获取用户 / Get user
                user = User.objects.get(id=user_id)
                return user
            else:
                logger.warning("Token payload missing user_id")
                return AnonymousUser()

        except (InvalidToken, TokenError) as e:
            logger.warning(f"Invalid JWT token: {e}")
            return AnonymousUser()
        except User.DoesNotExist:
            logger.warning(f"User not found for token user_id: {user_id}")
            return AnonymousUser()
        except Exception as e:
            logger.error(f"Unexpected error in token validation: {e}")
            return AnonymousUser()


class ConversationAccessMiddleware(BaseMiddleware):
    """
    会话访问控制中间件 / Conversation Access Control Middleware

    验证用户是否有权限访问指定的对话
    Validates that the user has permission to access the specified conversation
    """

    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        """
        验证对话访问权限 / Validate conversation access permission

        Args:
            scope: 连接范围 / Connection scope
            receive: 接收函数 / Receive function
            send: 发送函数 / Send function

        Returns:
            包装后的处理函数 / Wrapped handler function
        """
        try:
            user = scope.get('user')
            conversation_id = scope['url_route']['kwargs'].get('conversation_id')

            if conversation_id and user and not isinstance(user, AnonymousUser):
                # 验证用户是否有权限访问对话 / Validate user has permission to access conversation
                has_access = await self.check_conversation_access(user.id, conversation_id)
                if not has_access:
                    logger.warning(f"User {user.id} attempted to access conversation {conversation_id} without permission")
                    # 可以在这里设置一个标志或直接拒绝连接 / Can set a flag here or reject connection directly
                    scope['conversation_access_denied'] = True
            elif isinstance(user, AnonymousUser):
                logger.debug("Anonymous user attempting WebSocket connection")
                scope['conversation_access_denied'] = True

        except Exception as e:
            logger.error(f"Conversation access validation error: {e}")
            scope['conversation_access_denied'] = True

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def check_conversation_access(self, user_id: str, conversation_id: str) -> bool:
        """
        检查用户是否有权限访问对话 / Check if user has permission to access conversation

        Args:
            user_id: 用户ID / User ID
            conversation_id: 对话ID / Conversation ID

        Returns:
            bool: 是否有访问权限 / Whether access is allowed
        """
        try:
            from .models import Conversation
            conversation = Conversation.objects.filter(
                id=conversation_id,
                user_id=user_id
            ).exists()
            return conversation
        except Exception as e:
            logger.error(f"Error checking conversation access: {e}")
            return False