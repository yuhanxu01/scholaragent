from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserProfile
from apps.billing.models import UserTokenUsage


class UserTokenUsageInline(admin.TabularInline):
    """在用户管理页面内联显示token使用统计"""
    model = UserTokenUsage
    can_delete = False
    readonly_fields = (
        'total_input_tokens', 'total_output_tokens', 'total_tokens',
        'api_call_count', 'last_updated'
    )
    extra = 0
    max_num = 1
    verbose_name = 'Token Usage'
    verbose_name_plural = 'Token Usage'


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 'documents_count', 'is_staff', 'is_active', 'created_at')
    list_filter = ('is_staff', 'is_active', 'is_superuser', 'groups', 'created_at')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('email',)
    filter_horizontal = ('groups', 'user_permissions')
    inlines = [UserTokenUsageInline]

    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'avatar')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2'),
        }),
    )

    readonly_fields = ('created_at', 'updated_at', 'last_login', 'date_joined')

    def documents_count(self, obj):
        """显示用户的文档数量"""
        count = obj.documents.count()
        url = f'/admin/documents/document/?user__id__exact={obj.id}'
        return f'<a href="{url}">{count} documents</a>'
    documents_count.short_description = 'Documents'
    documents_count.allow_tags = True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('documents')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'education_level', 'major', 'math_level', 'programming_level', 'documents_read', 'questions_asked')
    list_filter = ('education_level', 'math_level', 'programming_level', 'created_at')
    search_fields = ('user__email', 'user__username', 'major')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (None, {'fields': ('user',)}),
        ('Academic Info', {'fields': ('education_level', 'major', 'research_interests')}),
        ('Skill Levels', {'fields': ('math_level', 'programming_level')}),
        ('Activity Stats', {'fields': ('documents_read', 'questions_asked', 'study_time_hours')}),
        ('Preferences', {'fields': ('preferences',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )