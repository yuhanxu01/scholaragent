from django.contrib import admin
from .models import Document, DocumentChunk, Formula, DocumentSection


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'file_type', 'status', 'word_count', 'file_size', 'created_at', 'processed_at')
    list_filter = ('status', 'file_type', 'created_at', 'processed_at', 'user')
    search_fields = ('title', 'original_filename', 'user__email', 'user__username')
    readonly_fields = ('id', 'file_size', 'word_count', 'chunk_count', 'formula_count', 'created_at', 'updated_at', 'processed_at')

    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'title', 'original_filename', 'file_type', 'status')
        }),
        ('File Info', {
            'fields': ('file', 'file_size', 'word_count')
        }),
        ('Content', {
            'fields': ('raw_content', 'cleaned_content', 'index_data'),
            'classes': ('collapse',)
        }),
        ('Processing Stats', {
            'fields': ('chunk_count', 'formula_count', 'reading_progress'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'processed_at'),
            'classes': ('collapse',)
        }),
        ('ID', {
            'fields': ('id',),
            'classes': ('collapse',)
        }),
    )

    # 允许按用户过滤
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user')

    # 在列表视图中显示用户邮箱
    def user_email(self, obj):
        return obj.user.email if obj.user else 'N/A'
    user_email.short_description = 'User Email'

    # 添加自定义动作
    actions = ['reprocess_documents']

    def reprocess_documents(self, request, queryset):
        """重新处理选中的文档"""
        for document in queryset:
            if document.status != 'processing':
                document.status = 'processing'
                document.error_message = ''
                document.save()

                # 触发重新处理任务
                from .tasks import process_document_task
                process_document_task.delay(str(document.id))

        self.message_user(request, f'Successfully queued {queryset.count()} documents for reprocessing.')
    reprocess_documents.short_description = 'Reprocess selected documents'


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ('document', 'order', 'chunk_type', 'title', 'start_line', 'end_line', 'created_at')
    list_filter = ('chunk_type', 'created_at', 'document__file_type')
    search_fields = ('document__title', 'title', 'content')
    readonly_fields = ('id', 'created_at')

    fieldsets = (
        ('Basic Info', {
            'fields': ('document', 'order', 'chunk_type', 'title')
        }),
        ('Content', {
            'fields': ('content', 'summary')
        }),
        ('Location', {
            'fields': ('start_line', 'end_line')
        }),
        ('Metadata', {
            'fields': ('metadata', 'id', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('document')


@admin.register(Formula)
class FormulaAdmin(admin.ModelAdmin):
    list_display = ('document', 'formula_type', 'latex_preview', 'line_number', 'created_at')
    list_filter = ('formula_type', 'created_at', 'document__file_type')
    search_fields = ('document__title', 'latex')
    readonly_fields = ('id', 'created_at')

    fieldsets = (
        ('Basic Info', {
            'fields': ('document', 'formula_type', 'description')
        }),
        ('Formula', {
            'fields': ('latex',)
        }),
        ('Context', {
            'fields': ('variables', 'context')
        }),
        ('Location', {
            'fields': ('line_number',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    def latex_preview(self, obj):
        """显示LaTeX预览"""
        return obj.latex[:50] + '...' if len(obj.latex) > 50 else obj.latex
    latex_preview.short_description = 'LaTeX Preview'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('document')


@admin.register(DocumentSection)
class DocumentSectionAdmin(admin.ModelAdmin):
    list_display = ('document', 'title', 'level', 'order', 'created_at')
    list_filter = ('level', 'created_at', 'document__file_type')
    search_fields = ('document__title', 'title')
    readonly_fields = ('id', 'created_at')

    fieldsets = (
        ('Basic Info', {
            'fields': ('document', 'title', 'level', 'order')
        }),
        ('Location', {
            'fields': ('start_line', 'end_line')
        }),
        ('Hierarchy', {
            'fields': ('parent',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('document', 'parent').prefetch_related('children')