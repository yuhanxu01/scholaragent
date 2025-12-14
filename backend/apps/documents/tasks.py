import logging
from celery import shared_task
from django.utils import timezone
from asgiref.sync import async_to_sync
import asyncio

from .models import Document, DocumentChunk, Formula, DocumentSection
from .services.parser import get_parser
from .services.indexer import document_indexer

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_document_task(self, document_id: str):
    """
    异步处理文档任务

    1. 读取文件内容
    2. 解析文档结构
    3. 调用LLM生成索引
    4. 保存结果到数据库
    """
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return

    try:
        # 1. 读取文件内容，优先使用raw_content
        if document.raw_content:
            content = document.raw_content
        else:
            try:
                with document.file.open('r') as f:
                    content = f.read()
                document.raw_content = content
                document.save(update_fields=['raw_content'])
            except FileNotFoundError:
                # 如果文件不存在但有raw_content，使用raw_content
                if document.raw_content:
                    content = document.raw_content
                else:
                    raise FileNotFoundError(f"Document file not found and no raw_content available: {document.file.name}")

        # 2. 解析文档
        parser = get_parser(document.file_type)
        if not parser:
            raise ValueError(f"不支持的文件类型: {document.file_type}")

        parsed = parser.parse(content)

        # 更新文档基本信息
        if parsed.title and parsed.title != document.title:
            document.title = parsed.title
        document.cleaned_content = parsed.cleaned_content
        # 计算字数（如果ParsedDocument没有word_count属性）
        document.word_count = len(content.split())
        document.save()

        # 3. 保存分块
        DocumentChunk.objects.filter(document=document).delete()
        for i, chunk in enumerate(parsed.chunks):
            DocumentChunk.objects.create(
                document=document,
                order=i,
                chunk_type=chunk.get('type', 'text'),
                title=chunk.get('title', ''),
                content=chunk.get('content', ''),
                start_line=chunk.get('start_line', 0),
                end_line=chunk.get('end_line', 0)
            )
        document.chunk_count = len(parsed.chunks)

        # 4. 保存公式
        Formula.objects.filter(document=document).delete()
        for i, formula in enumerate(parsed.formulas):
            Formula.objects.create(
                document=document,
                latex=formula.get('latex', ''),
                formula_type=formula.get('formula_type', 'inline'),
                label=formula.get('label', ''),
                line_number=formula.get('line_number', 0),
                order=i
            )
        document.formula_count = len(parsed.formulas)

        # 5. 保存章节结构
        DocumentSection.objects.filter(document=document).delete()
        _save_sections(document, parsed.sections)

        # 6. 调用LLM生成索引（异步转同步）
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                index_data = loop.run_until_complete(
                    document_indexer.generate_index(parsed.cleaned_content, user=document.user)
                )
                document.index_data = index_data
                logger.info(f"LLM indexing successful for document {document_id}")
            finally:
                loop.close()
        except Exception as llm_error:
            # LLM 服务不可用时的处理
            logger.warning(f"LLM indexing failed for document {document_id}: {llm_error}")
            # 设置默认的索引数据，不因 LLM 错误而中断整个处理流程
            document.index_data = {
                "summary": parsed.cleaned_content[:200] + "..." if len(parsed.cleaned_content) > 200 else parsed.cleaned_content,
                "concepts": [],
                "keywords": [],
                "difficulty": 3,
                "estimated_reading_time": max(1, document.word_count // 200),  # 假设每分钟读200字
                "prerequisites": [],
                "sections_summary": [],
                "formula_summary": "",
                "recommended_questions": [],
                "error": f"LLM indexing failed: {str(llm_error)}"
            }

        # 7. 更新状态
        document.status = 'ready'
        document.processed_at = timezone.now()
        document.save()

    except Exception as e:
        document.status = 'error'
        document.error_message = str(e)
        document.save()

        # 重试
        raise self.retry(exc=e, countdown=60)


def _save_sections(document, sections, parent=None, counter=[0]):
    """递归保存章节结构"""
    for section in sections:
        # sections are dictionaries, not objects
        db_section = DocumentSection.objects.create(
            document=document,
            parent=parent,
            order=counter[0],
            level=section['level'],
            title=section['title'],
            start_line=section.get('start_line', 0),
            end_line=section.get('end_line', 0)
        )
        counter[0] += 1

        # Check if section has children (depends on parser output structure)
        if 'children' in section and section['children']:
            _save_sections(document, section['children'], db_section, counter)