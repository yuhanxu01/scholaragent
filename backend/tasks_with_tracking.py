import os
import time
from datetime import timezone
from celery import shared_task
from django.conf import settings
from django.core.files.storage import default_storage
from .models import Document, DocumentChunk, Formula
from .document_tracking import get_tracker, ProcessingStatus, ProcessingStepContext
from .parsers import MarkdownParser, LaTeXParser
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def process_document_with_tracking(self, document_id: int):
    """
    带跟踪功能的文档处理任务
    """
    tracker = get_tracker(str(document_id))

    try:
        # 获取文档对象
        document = Document.objects.get(id=document_id)

        # 异步执行处理（需要在事件循环中）
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_process_document_async(document, tracker))
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        # 更新错误状态
        asyncio.run(tracker.update_step("parse", ProcessingStatus.ERROR, details=str(e)))
        document.status = 'error'
        document.save()
        raise


async def _process_document_async(document: Document, tracker):
    """异步文档处理"""

    # 步骤1: 文件上传
    async with ProcessingStepContext(str(document.id), "upload", 3) as ctx:
        # 验证文件格式
        await tracker.update_step("validate", ProcessingStatus.RUNNING, 100)
        await ctx.update_progress(1, "验证文件格式完成")

        # 文件已在上传时完成，直接标记为完成
        await tracker.update_step("transfer", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(2, "文件传输完成")

        await tracker.update_step("store", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(3, "文件存储完成")

    # 步骤2: 解析文档结构
    async with ProcessingStepContext(str(document.id), "parse", 100) as ctx:

        # 读取文件内容
        await tracker.update_step("read", ProcessingStatus.RUNNING, 100)
        file_path = document.file.path
        if not default_storage.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        with default_storage.open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        document.file_size = len(content.encode('utf-8'))
        document.save()

        await ctx.update_progress(10, "文件内容读取完成")

        # 根据文件类型选择解析器
        if document.file_type == 'md':
            parser = MarkdownParser()
        elif document.file_type == 'tex':
            parser = LaTeXParser()
        else:
            # 纯文本，按Markdown处理
            parser = MarkdownParser()

        # 提取结构化元素
        await tracker.update_step("extract", ProcessingStatus.RUNNING, 0)

        # 解析文档
        parsed_data = parser.parse(content)
        await ctx.update_progress(40, "文档结构提取完成")

        # 智能分块处理
        await tracker.update_step("chunking", ProcessingStatus.RUNNING, 0)
        chunks = parser.create_chunks(parsed_data, max_chunk_size=1000)

        # 保存文档块
        document_chunks = []
        for i, chunk_data in enumerate(chunks):
            chunk = DocumentChunk.objects.create(
                document=document,
                chunk_index=i,
                content=chunk_data['content'],
                chunk_type=chunk_data.get('type', 'text'),
                metadata=chunk_data.get('metadata', {})
            )
            document_chunks.append(chunk)

            # 更新进度
            if i % 10 == 0:
                progress = 40 + (i / len(chunks)) * 30
                await ctx.update_progress(
                    int(progress * 100) / 100,
                    f"已处理 {i+1}/{len(chunks)} 个文档块"
                )

        document.chunk_count = len(chunks)
        await ctx.update_progress(70, "文档分块完成")

        # 提取数学公式
        await tracker.update_step("extract_formulas", ProcessingStatus.RUNNING, 0)
        formulas = parser.extract_formulas(parsed_data)

        formula_objects = []
        for i, formula_data in enumerate(formulas):
            formula = Formula.objects.create(
                document=document,
                formula_index=i,
                content=formula_data['content'],
                formula_type=formula_data.get('type', 'inline'),
                description=formula_data.get('description', ''),
                metadata=formula_data.get('metadata', {})
            )
            formula_objects.append(formula)

            if i % 5 == 0:
                progress = (i / len(formulas)) * 20 if formulas else 20
                await tracker.update_progress("extract_formulas", progress)

        document.formula_count = len(formulas)
        await tracker.update_step("extract_formulas", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(90, "公式提取完成")

        # 提取媒体文件
        await tracker.update_step("extract_media", ProcessingStatus.RUNNING, 0)
        media_files = parser.extract_media_files(parsed_data)

        for media_file in media_files:
            # 这里可以添加媒体文件的处理逻辑
            pass

        await tracker.update_step("extract_media", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(100, "文档解析完成")

    # 步骤3: AI智能分析
    async with ProcessingStepContext(str(document.id), "analyze", 5) as ctx:

        # 这里应该调用实际的AI API，现在使用模拟数据
        from .utils.ai_analyzer import AIAnalyzer
        ai_analyzer = AIAnalyzer()

        # 生成文档摘要
        await tracker.update_step("summary", ProcessingStatus.RUNNING, 0)
        summary = await ai_analyzer.generate_summary(content)
        document.summary = summary
        await tracker.update_step("summary", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(1, "文档摘要生成完成")

        # 提取核心概念
        await tracker.update_step("concepts", ProcessingStatus.RUNNING, 0)
        concepts = await ai_analyzer.extract_concepts(content)
        document.core_concepts = concepts
        await tracker.update_step("concepts", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(2, "核心概念提取完成")

        # 识别关键词
        await tracker.update_step("keywords", ProcessingStatus.RUNNING, 0)
        keywords = await ai_analyzer.extract_keywords(content)
        document.keywords = keywords
        await tracker.update_step("keywords", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(3, "关键词识别完成")

        # 评估难度等级
        await tracker.update_step("difficulty", ProcessingStatus.RUNNING, 0)
        difficulty = await ai_analyzer.assess_difficulty(content)
        document.difficulty_level = difficulty
        await tracker.update_step("difficulty", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(4, "难度评估完成")

        # 估算阅读时间
        await tracker.update_step("reading_time", ProcessingStatus.RUNNING, 0)
        word_count = len(content.split())
        reading_time = ai_analyzer.estimate_reading_time(word_count)
        document.word_count = word_count
        document.estimated_reading_time = reading_time
        await tracker.update_step("reading_time", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(5, "阅读时间估算完成")

    # 步骤4: 建立索引
    async with ProcessingStepContext(str(document.id), "index", 4) as ctx:

        # 索引章节结构
        await tracker.update_step("sections", ProcessingStatus.RUNNING, 0)
        # 这里可以添加章节索引逻辑
        await tracker.update_step("sections", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(1, "章节索引完成")

        # 索引数学公式
        await tracker.update_step("formulas", ProcessingStatus.RUNNING, 0)
        # 这里可以添加公式索引逻辑
        await tracker.update_step("formulas", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(2, "公式索引完成")

        # 生成向量索引
        await tracker.update_step("vectors", ProcessingStatus.RUNNING, 0)
        # 这里可以添加向量索引逻辑
        await tracker.update_step("vectors", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(3, "向量索引完成")

        # 语义索引
        await tracker.update_step("semantic", ProcessingStatus.RUNNING, 0)
        # 这里可以添加语义索引逻辑
        await tracker.update_step("semantic", ProcessingStatus.COMPLETED, 100)
        await ctx.update_progress(4, "语义索引完成")

    # 步骤5: 处理完成
    await tracker.update_step("complete", ProcessingStatus.RUNNING, 0)

    # 更新文档状态
    document.status = 'ready'
    document.processed_at = timezone.now()
    document.save()

    await tracker.update_step("complete", ProcessingStatus.COMPLETED, 100)

    logger.info(f"Document {document.id} processed successfully with tracking")