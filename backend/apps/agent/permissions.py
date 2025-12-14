from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    只允许对象的所有者访问
    """
    def has_object_permission(self, request, view, obj):
        # 对于拥有user字段的模型
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # 对于拥有conversation字段的模型
        if hasattr(obj, 'conversation'):
            return obj.conversation.user == request.user

        # 对于拥有task字段的模型
        if hasattr(obj, 'task'):
            return obj.task.conversation.user == request.user

        return False