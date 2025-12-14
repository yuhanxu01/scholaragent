# Phase 2: 文档系统 (Sprint 3-4)

## 阶段目标
实现文档上传、解析、存储、渲染功能，包括MD/TeX文件的处理和LaTeX公式渲染。

---

## Task 2.1: 创建Documents应用 - 数据模型

### 任务描述
创建文档管理的数据模型，包括文档、分块、公式等。

### AI Code Agent 提示词

```
请创建Django documents应用的数据模型：

## 目录结构
```
apps/documents/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── services/
│   ├── __init__.py
│   ├── parser.py       # 文档解析
│   ├── indexer.py      # 索引生成
│   └── cleaner.py      # LaTeX清洗
├── tasks.py            # Celery任务
└── tests.py
```

## models.py 完整定义

```python
from django.db import models
from django.conf import settings
import uuid


class Document(models.Model):
    """文档主表"""
    
    class Status(models.TextChoices):
        UPLOADING = 'uploading', '上传中'
        PROCESSING = 'processing', '处理中'
        READY = 'ready', '就绪'
        ERROR = 'error', '错误'
    
    class FileType(models.TextChoices):
        MARKDOWN = 'md', 'Markdown'
        LATEX = 'tex', 'LaTeX'
        PDF = 'pdf', 'PDF'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    # 基本信息
    title = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10, choices=FileType.choices)
    file = models.FileField(upload_to='documents/%Y/%m/')
    file_size = models.IntegerField(default=0)  # bytes
    
    # 处理状态
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.UPLOADING
    )
    error_message = models.TextField(blank=True)
    
    # 内容
    raw_content = models.TextField(blank=True)  # 原始内容
    cleaned_content = models.TextField(blank=True)  # 清洗后内容
    
    # LLM生成的索引（JSON）
    index_data = models.JSONField(default=dict, blank=True)
    # 结构: {
    #   "summary": "文档摘要",
    #   "sections": [...],
    #   "concepts": [...],
    #   "keywords": [...],
    #   "difficulty": 1-5,
    #   "prerequisites": [...]
    # }
    
    # 统计
    word_count = models.IntegerField(default=0)
    chunk_count = models.IntegerField(default=0)
    formula_count = models.IntegerField(default=0)
    
    # 用户交互统计
    view_count = models.IntegerField(default=0)
    last_viewed_at = models.DateTimeField(null=True, blank=True)
    reading_progress = models.FloatField(default=0)  # 0-1
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.title


class DocumentChunk(models.Model):
    """文档分块"""
    
    class ChunkType(models.TextChoices):
        SECTION = 'section', '章节'
        PARAGRAPH = 'paragraph', '段落'
        THEOREM = 'theorem', '定理'
        DEFINITION = 'definition', '定义'
        PROOF = 'proof', '证明'
        EXAMPLE = 'example', '例子'
        FORMULA = 'formula', '公式块'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document, 
        on_delete=models.CASCADE,
        related_name='chunks'
    )
    
    # 位置信息
    order = models.IntegerField()  # 在文档中的顺序
    parent_chunk = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.CASCADE,
        related_name='children'
    )
    level = models.IntegerField(default=0)  # 层级深度
    
    # 内容
    chunk_type = models.CharField(max_length=20, choices=ChunkType.choices)
    title = models.CharField(max_length=500, blank=True)  # 章节标题
    content = models.TextField()  # 原始内容
    content_clean = models.TextField(blank=True)  # 用于检索的清洗内容
    
    # LLM生成的摘要
    summary = models.TextField(blank=True)
    
    # 位置（用于定位）
    start_line = models.IntegerField(default=0)
    end_line = models.IntegerField(default=0)
    
    # 元数据
    metadata = models.JSONField(default=dict, blank=True)
    # 可包含: heading_level, theorem_name, etc.
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['document', 'order']
        indexes = [
            models.Index(fields=['document', 'order']),
            models.Index(fields=['chunk_type']),
        ]


class Formula(models.Model):
    """公式表"""
    
    class FormulaType(models.TextChoices):
        INLINE = 'inline', '行内公式'
        DISPLAY = 'display', '独立公式'
        EQUATION = 'equation', '带编号公式'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document, 
        on_delete=models.CASCADE,
        related_name='formulas'
    )
    chunk = models.ForeignKey(
        DocumentChunk,
        on_delete=models.CASCADE,
        related_name='formulas',
        null=True,
        blank=True
    )
    
    # 公式内容
    latex = models.TextField()  # LaTeX源码
    formula_type = models.CharField(max_length=20, choices=FormulaType.choices)
    label = models.CharField(max_length=100, blank=True)  # 公式标签 (如 eq:energy)
    number = models.CharField(max_length=50, blank=True)  # 公式编号 (如 (3.1))
    
    # LLM生成的描述
    description = models.TextField(blank=True)  # 公式含义描述
    variables = models.JSONField(default=list, blank=True)  # 变量说明列表
    # 结构: [{"symbol": "E", "meaning": "能量", "unit": "J"}, ...]
    
    # 位置
    order = models.IntegerField(default=0)
    line_number = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['document', 'order']


class DocumentSection(models.Model):
    """文档章节结构（目录树）"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='sections'
    )
    
    # 层级结构
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )
    order = models.IntegerField()
    level = models.IntegerField()  # 1=H1, 2=H2, ...
    
    # 内容
    title = models.CharField(max_length=500)
    anchor = models.CharField(max_length=200, blank=True)  # 锚点ID
    
    # 关联chunk
    start_chunk = models.ForeignKey(
        DocumentChunk,
        on_delete=models.SET_NULL,
        null=True,
        related_name='+'
    )
    
    # LLM摘要
    summary = models.TextField(blank=True)
    
    class Meta:
        ordering = ['document', 'order']


class ReadingHistory(models.Model):
    """阅读历史记录"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reading_history'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='reading_history'
    )
    
    # 阅读位置
    last_chunk = models.ForeignKey(
        DocumentChunk,
        on_delete=models.SET_NULL,
        null=True
    )
    scroll_position = models.FloatField(default=0)  # 滚动百分比
    
    # 时间
    started_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(auto_now=True)
    total_minutes = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['user', 'document']
```

## admin.py 配置

```python
from django.contrib import admin
from .models import Document, DocumentChunk, Formula, DocumentSection, ReadingHistory

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'file_type', 'status', 'created_at']
    list_filter = ['status', 'file_type', 'created_at']
    search_fields = ['title', 'user__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'processed_at']

@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['document', 'chunk_type', 'title', 'order']
    list_filter = ['chunk_type']

@admin.register(Formula)
class FormulaAdmin(admin.ModelAdmin):
    list_display = ['document', 'formula_type', 'label', 'order']
    list_filter = ['formula_type']

@admin.register(DocumentSection)
class DocumentSectionAdmin(admin.ModelAdmin):
    list_display = ['document', 'title', 'level', 'order']
    list_filter = ['level']

@admin.register(ReadingHistory)
class ReadingHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'document', 'last_read_at', 'total_minutes']
```

## 验收标准
1. 所有模型能正常创建和迁移
2. Admin后台能正常管理这些模型
3. 模型关系正确（外键、级联删除等）
4. 索引配置正确
```

### 验收检查
```bash
python manage.py makemigrations documents
python manage.py migrate
python manage.py runserver
# 访问 /admin/ 检查模型是否正常显示
```

---

## Task 2.2: 文档解析服务

### 任务描述
实现MD和TeX文件的解析服务，提取结构化内容。

### AI Code Agent 提示词

```
请实现文档解析服务：

## apps/documents/services/parser.py

```python
"""
文档解析服务
支持Markdown和LaTeX文件的解析
"""
import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from enum import Enum
import markdown
import frontmatter


class ChunkType(Enum):
    SECTION = 'section'
    PARAGRAPH = 'paragraph'
    THEOREM = 'theorem'
    DEFINITION = 'definition'
    PROOF = 'proof'
    EXAMPLE = 'example'
    FORMULA = 'formula'


@dataclass
class ParsedChunk:
    """解析后的内容块"""
    chunk_type: ChunkType
    content: str
    title: str = ''
    level: int = 0
    start_line: int = 0
    end_line: int = 0
    metadata: dict = field(default_factory=dict)


@dataclass 
class ParsedFormula:
    """解析后的公式"""
    latex: str
    formula_type: str  # inline, display, equation
    label: str = ''
    line_number: int = 0


@dataclass
class ParsedSection:
    """解析后的章节"""
    title: str
    level: int
    order: int
    start_line: int
    children: List['ParsedSection'] = field(default_factory=list)


@dataclass
class ParsedDocument:
    """解析后的完整文档"""
    title: str
    raw_content: str
    cleaned_content: str
    chunks: List[ParsedChunk]
    formulas: List[ParsedFormula]
    sections: List[ParsedSection]
    word_count: int
    metadata: dict = field(default_factory=dict)


class MarkdownParser:
    """Markdown文档解析器"""
    
    # 正则模式
    HEADING_PATTERN = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
    INLINE_MATH_PATTERN = re.compile(r'\$([^\$]+)\$')
    DISPLAY_MATH_PATTERN = re.compile(r'\$\$(.+?)\$\$', re.DOTALL)
    FENCED_MATH_PATTERN = re.compile(r'```math\n(.+?)\n```', re.DOTALL)
    
    # 特殊块模式 (常见学术文档格式)
    THEOREM_PATTERN = re.compile(
        r'(?:>\s*)?(?:\*\*)?(?:定理|Theorem|定义|Definition|引理|Lemma|推论|Corollary|证明|Proof|例|Example)\s*[\d.]*(?:\*\*)?[:\s：]?\s*(.+?)(?=(?:>\s*)?(?:\*\*)?(?:定理|Theorem|定义|Definition|引理|Lemma|推论|Corollary|证明|Proof|例|Example)|\Z)',
        re.DOTALL | re.IGNORECASE
    )
    
    def parse(self, content: str, filename: str = '') -> ParsedDocument:
        """解析Markdown文档"""
        # 1. 解析frontmatter
        post = frontmatter.loads(content)
        metadata = dict(post.metadata)
        raw_content = post.content
        
        # 2. 提取标题
        title = metadata.get('title', '')
        if not title:
            # 尝试从第一个H1提取
            first_heading = self.HEADING_PATTERN.search(raw_content)
            if first_heading and first_heading.group(1) == '#':
                title = first_heading.group(2).strip()
            else:
                title = filename.rsplit('.', 1)[0] if filename else 'Untitled'
        
        # 3. 提取公式
        formulas = self._extract_formulas(raw_content)
        
        # 4. 提取章节结构
        sections = self._extract_sections(raw_content)
        
        # 5. 分块
        chunks = self._create_chunks(raw_content, sections)
        
        # 6. 清洗内容（用于检索）
        cleaned_content = self._clean_for_search(raw_content)
        
        # 7. 统计字数
        word_count = len(cleaned_content)
        
        return ParsedDocument(
            title=title,
            raw_content=raw_content,
            cleaned_content=cleaned_content,
            chunks=chunks,
            formulas=formulas,
            sections=sections,
            word_count=word_count,
            metadata=metadata
        )
    
    def _extract_formulas(self, content: str) -> List[ParsedFormula]:
        """提取所有数学公式"""
        formulas = []
        lines = content.split('\n')
        
        # Display math ($$...$$)
        for match in self.DISPLAY_MATH_PATTERN.finditer(content):
            latex = match.group(1).strip()
            line_num = content[:match.start()].count('\n') + 1
            formulas.append(ParsedFormula(
                latex=latex,
                formula_type='display',
                line_number=line_num
            ))
        
        # Inline math ($...$)
        for match in self.INLINE_MATH_PATTERN.finditer(content):
            latex = match.group(1).strip()
            # 排除已经在display math中的
            if f'${latex}$' not in [f'${f.latex}$' for f in formulas]:
                line_num = content[:match.start()].count('\n') + 1
                formulas.append(ParsedFormula(
                    latex=latex,
                    formula_type='inline',
                    line_number=line_num
                ))
        
        return formulas
    
    def _extract_sections(self, content: str) -> List[ParsedSection]:
        """提取章节结构"""
        sections = []
        stack = []  # 用于构建层级
        
        for i, match in enumerate(self.HEADING_PATTERN.finditer(content)):
            level = len(match.group(1))
            title = match.group(2).strip()
            start_line = content[:match.start()].count('\n') + 1
            
            section = ParsedSection(
                title=title,
                level=level,
                order=i,
                start_line=start_line
            )
            
            # 构建层级结构
            while stack and stack[-1].level >= level:
                stack.pop()
            
            if stack:
                stack[-1].children.append(section)
            else:
                sections.append(section)
            
            stack.append(section)
        
        return sections
    
    def _create_chunks(self, content: str, sections: List[ParsedSection]) -> List[ParsedChunk]:
        """创建内容分块"""
        chunks = []
        lines = content.split('\n')
        
        # 按章节分块
        section_positions = self._get_section_positions(content)
        
        for i, (start, end, section_title, level) in enumerate(section_positions):
            section_content = '\n'.join(lines[start:end])
            
            # 检测特殊块类型
            chunk_type = self._detect_chunk_type(section_content, section_title)
            
            chunks.append(ParsedChunk(
                chunk_type=chunk_type,
                content=section_content,
                title=section_title,
                level=level,
                start_line=start,
                end_line=end
            ))
        
        # 如果没有章节，整体作为一个chunk
        if not chunks:
            chunks.append(ParsedChunk(
                chunk_type=ChunkType.PARAGRAPH,
                content=content,
                start_line=0,
                end_line=len(lines)
            ))
        
        return chunks
    
    def _get_section_positions(self, content: str) -> List[Tuple[int, int, str, int]]:
        """获取章节位置"""
        lines = content.split('\n')
        positions = []
        
        headings = list(self.HEADING_PATTERN.finditer(content))
        
        for i, match in enumerate(headings):
            level = len(match.group(1))
            title = match.group(2).strip()
            start_line = content[:match.start()].count('\n')
            
            # 结束位置是下一个标题或文档末尾
            if i + 1 < len(headings):
                end_line = content[:headings[i+1].start()].count('\n')
            else:
                end_line = len(lines)
            
            positions.append((start_line, end_line, title, level))
        
        return positions
    
    def _detect_chunk_type(self, content: str, title: str) -> ChunkType:
        """检测块类型"""
        lower_title = title.lower()
        lower_content = content[:200].lower()
        
        if any(kw in lower_title or kw in lower_content for kw in ['定理', 'theorem']):
            return ChunkType.THEOREM
        if any(kw in lower_title or kw in lower_content for kw in ['定义', 'definition']):
            return ChunkType.DEFINITION
        if any(kw in lower_title or kw in lower_content for kw in ['证明', 'proof']):
            return ChunkType.PROOF
        if any(kw in lower_title or kw in lower_content for kw in ['例', 'example']):
            return ChunkType.EXAMPLE
        if title:
            return ChunkType.SECTION
        return ChunkType.PARAGRAPH
    
    def _clean_for_search(self, content: str) -> str:
        """清洗内容用于搜索"""
        # 移除公式（保留简单描述）
        cleaned = self.DISPLAY_MATH_PATTERN.sub('[公式]', content)
        cleaned = self.INLINE_MATH_PATTERN.sub('[公式]', cleaned)
        
        # 移除Markdown语法
        cleaned = re.sub(r'#{1,6}\s+', '', cleaned)  # 标题符号
        cleaned = re.sub(r'\*\*(.+?)\*\*', r'\1', cleaned)  # 粗体
        cleaned = re.sub(r'\*(.+?)\*', r'\1', cleaned)  # 斜体
        cleaned = re.sub(r'`(.+?)`', r'\1', cleaned)  # 行内代码
        cleaned = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', cleaned)  # 链接
        
        return cleaned.strip()


class LaTeXParser:
    """LaTeX文档解析器"""
    
    # LaTeX模式
    DOCUMENT_CLASS_PATTERN = re.compile(r'\\documentclass(?:\[.+?\])?\{(.+?)\}')
    TITLE_PATTERN = re.compile(r'\\title\{(.+?)\}', re.DOTALL)
    SECTION_PATTERN = re.compile(r'\\(section|subsection|subsubsection|chapter)\*?\{(.+?)\}')
    
    # 数学环境
    EQUATION_PATTERN = re.compile(r'\\begin\{(equation|align|gather|multline)\*?\}(.+?)\\end\{\1\*?\}', re.DOTALL)
    INLINE_MATH_PATTERN = re.compile(r'\\\((.+?)\\\)|\$([^\$]+)\$')
    
    # 定理环境
    THEOREM_ENV_PATTERN = re.compile(
        r'\\begin\{(theorem|lemma|proposition|corollary|definition|example|proof|remark)\*?\}(?:\[(.+?)\])?\s*(.+?)\\end\{\1\*?\}',
        re.DOTALL | re.IGNORECASE
    )
    
    def parse(self, content: str, filename: str = '') -> ParsedDocument:
        """解析LaTeX文档"""
        # 1. 清理注释
        cleaned = self._remove_comments(content)
        
        # 2. 提取标题
        title_match = self.TITLE_PATTERN.search(cleaned)
        title = self._clean_latex(title_match.group(1)) if title_match else filename.rsplit('.', 1)[0]
        
        # 3. 提取正文（在\begin{document}和\end{document}之间）
        body = self._extract_body(cleaned)
        
        # 4. 提取公式
        formulas = self._extract_formulas(body)
        
        # 5. 提取章节
        sections = self._extract_sections(body)
        
        # 6. 分块
        chunks = self._create_chunks(body, sections)
        
        # 7. 清洗用于搜索
        cleaned_content = self._clean_for_search(body)
        
        return ParsedDocument(
            title=title,
            raw_content=content,
            cleaned_content=cleaned_content,
            chunks=chunks,
            formulas=formulas,
            sections=sections,
            word_count=len(cleaned_content),
            metadata={}
        )
    
    def _remove_comments(self, content: str) -> str:
        """移除LaTeX注释"""
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            # 移除行注释（但保留\%）
            idx = 0
            while True:
                idx = line.find('%', idx)
                if idx == -1:
                    break
                if idx == 0 or line[idx-1] != '\\':
                    line = line[:idx]
                    break
                idx += 1
            cleaned_lines.append(line)
        return '\n'.join(cleaned_lines)
    
    def _extract_body(self, content: str) -> str:
        """提取文档正文"""
        begin_match = re.search(r'\\begin\{document\}', content)
        end_match = re.search(r'\\end\{document\}', content)
        
        if begin_match and end_match:
            return content[begin_match.end():end_match.start()].strip()
        return content
    
    def _extract_formulas(self, content: str) -> List[ParsedFormula]:
        """提取数学公式"""
        formulas = []
        
        # 环境公式
        for match in self.EQUATION_PATTERN.finditer(content):
            env_type = match.group(1)
            latex = match.group(2).strip()
            line_num = content[:match.start()].count('\n') + 1
            
            # 检查是否有label
            label_match = re.search(r'\\label\{(.+?)\}', latex)
            label = label_match.group(1) if label_match else ''
            
            formulas.append(ParsedFormula(
                latex=latex,
                formula_type='equation',
                label=label,
                line_number=line_num
            ))
        
        # 行内公式
        for match in self.INLINE_MATH_PATTERN.finditer(content):
            latex = (match.group(1) or match.group(2)).strip()
            line_num = content[:match.start()].count('\n') + 1
            formulas.append(ParsedFormula(
                latex=latex,
                formula_type='inline',
                line_number=line_num
            ))
        
        return formulas
    
    def _extract_sections(self, content: str) -> List[ParsedSection]:
        """提取章节结构"""
        sections = []
        level_map = {'chapter': 0, 'section': 1, 'subsection': 2, 'subsubsection': 3}
        stack = []
        
        for i, match in enumerate(self.SECTION_PATTERN.finditer(content)):
            cmd = match.group(1)
            title = self._clean_latex(match.group(2))
            level = level_map.get(cmd, 1)
            start_line = content[:match.start()].count('\n') + 1
            
            section = ParsedSection(
                title=title,
                level=level,
                order=i,
                start_line=start_line
            )
            
            while stack and stack[-1].level >= level:
                stack.pop()
            
            if stack:
                stack[-1].children.append(section)
            else:
                sections.append(section)
            
            stack.append(section)
        
        return sections
    
    def _create_chunks(self, content: str, sections: List[ParsedSection]) -> List[ParsedChunk]:
        """创建内容分块"""
        chunks = []
        
        # 提取定理环境作为特殊块
        for match in self.THEOREM_ENV_PATTERN.finditer(content):
            env_type = match.group(1).lower()
            env_name = match.group(2) or ''
            env_content = match.group(3).strip()
            
            chunk_type_map = {
                'theorem': ChunkType.THEOREM,
                'lemma': ChunkType.THEOREM,
                'proposition': ChunkType.THEOREM,
                'corollary': ChunkType.THEOREM,
                'definition': ChunkType.DEFINITION,
                'example': ChunkType.EXAMPLE,
                'proof': ChunkType.PROOF,
            }
            
            chunks.append(ParsedChunk(
                chunk_type=chunk_type_map.get(env_type, ChunkType.PARAGRAPH),
                content=env_content,
                title=f"{env_type.title()}{': ' + env_name if env_name else ''}",
                start_line=content[:match.start()].count('\n') + 1,
                end_line=content[:match.end()].count('\n') + 1,
                metadata={'environment': env_type, 'name': env_name}
            ))
        
        return chunks if chunks else [ParsedChunk(
            chunk_type=ChunkType.PARAGRAPH,
            content=content,
            start_line=0,
            end_line=content.count('\n')
        )]
    
    def _clean_latex(self, text: str) -> str:
        """清理LaTeX命令"""
        # 移除常见格式命令
        text = re.sub(r'\\textbf\{(.+?)\}', r'\1', text)
        text = re.sub(r'\\textit\{(.+?)\}', r'\1', text)
        text = re.sub(r'\\emph\{(.+?)\}', r'\1', text)
        text = re.sub(r'\\[a-zA-Z]+\{(.+?)\}', r'\1', text)
        return text.strip()
    
    def _clean_for_search(self, content: str) -> str:
        """清洗用于搜索"""
        # 移除数学环境
        cleaned = self.EQUATION_PATTERN.sub('[公式]', content)
        cleaned = self.INLINE_MATH_PATTERN.sub('[公式]', cleaned)
        
        # 移除LaTeX命令
        cleaned = re.sub(r'\\[a-zA-Z]+(?:\[.+?\])?\{(.+?)\}', r'\1', cleaned)
        cleaned = re.sub(r'\\[a-zA-Z]+', '', cleaned)
        cleaned = re.sub(r'[{}]', '', cleaned)
        
        return cleaned.strip()


def get_parser(file_type: str):
    """根据文件类型获取解析器"""
    parsers = {
        'md': MarkdownParser(),
        'tex': LaTeXParser(),
    }
    return parsers.get(file_type)
```

## 验收标准
1. 能正确解析Markdown文件，提取标题、章节、公式
2. 能正确解析LaTeX文件，提取标题、章节、公式
3. 分块逻辑正确，保持内容完整性
4. 公式提取正确，区分行内和独立公式
5. 章节层级结构正确
```

---

## Task 2.3: LLM索引生成服务

### 任务描述
实现调用DeepSeek API生成文档索引（摘要、概念、关键词等）。

### AI Code Agent 提示词

```
请实现LLM索引生成服务：

## core/llm/client.py - DeepSeek客户端

```python
"""
DeepSeek API 客户端
"""
import httpx
import json
from typing import Optional, Dict, Any, AsyncGenerator
from django.conf import settings


class DeepSeekClient:
    """DeepSeek API客户端"""
    
    DEFAULT_MODEL = "deepseek-chat"
    
    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.base_url = settings.DEEPSEEK_BASE_URL or "https://api.deepseek.com"
        self.timeout = 60.0
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: str = "text"  # "text" or "json"
    ) -> Dict[str, Any]:
        """
        生成文本回复
        
        Args:
            prompt: 用户提示词
            system_prompt: 系统提示词
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大token数
            response_format: 响应格式
            
        Returns:
            {"content": "...", "usage": {...}}
        """
        model = model or self.DEFAULT_MODEL
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        request_body = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if response_format == "json":
            request_body["response_format"] = {"type": "json_object"}
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json=request_body
            )
            response.raise_for_status()
            data = response.json()
        
        content = data["choices"][0]["message"]["content"]
        
        # 如果期望JSON格式，尝试解析
        if response_format == "json":
            try:
                content = json.loads(content)
            except json.JSONDecodeError:
                # 尝试提取JSON部分
                import re
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    content = json.loads(json_match.group())
        
        return {
            "content": content,
            "usage": data.get("usage", {})
        }
    
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str = "",
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> AsyncGenerator[str, None]:
        """
        流式生成文本
        """
        model = model or self.DEFAULT_MODEL
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        request_body = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json=request_body
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                        except json.JSONDecodeError:
                            continue


# 全局实例
llm_client = DeepSeekClient()
```

## apps/documents/services/indexer.py - 索引生成服务

```python
"""
文档索引生成服务
调用LLM生成文档摘要、概念、关键词等
"""
from typing import Dict, Any, List
from core.llm.client import llm_client


INDEX_GENERATION_PROMPT = '''
请分析以下学术文档内容，生成结构化的索引信息。

## 文档内容
{content}

## 任务要求
请提取并生成以下信息，以JSON格式返回：

1. **summary** (string): 文档整体摘要，200字以内，概括主要内容和贡献
2. **sections** (array): 章节摘要列表
   - title: 章节标题
   - summary: 章节摘要，50字以内
   - key_points: 关键要点列表
3. **concepts** (array): 核心概念列表
   - name: 概念名称
   - type: 类型 (definition/theorem/method/formula/other)
   - description: 简要描述，50字以内
   - prerequisites: 前置知识列表
   - related: 相关概念列表
4. **formulas** (array): 重要公式说明（如果有）
   - latex: 公式LaTeX（原样保留）
   - name: 公式名称
   - meaning: 含义说明
   - variables: 变量说明列表 [{symbol, meaning, unit}]
5. **keywords** (array): 关键词列表，10-20个
6. **difficulty** (integer): 难度等级 1-5
7. **prerequisites** (array): 阅读本文档需要的前置知识
8. **domain** (string): 所属领域（如：数学/物理/计算机等）

## 注意事项
- 使用中文回答
- 保持学术准确性
- 概念提取要精准，避免过于宽泛
- 公式的LaTeX保持原样，不要修改

请直接返回JSON，不要包含markdown代码块标记。
'''


SECTION_SUMMARY_PROMPT = '''
请为以下章节内容生成简短摘要。

## 章节标题
{title}

## 章节内容
{content}

## 要求
1. 摘要控制在50字以内
2. 概括该章节的核心内容
3. 使用中文

请直接返回摘要文本，不要包含其他内容。
'''


class DocumentIndexer:
    """文档索引生成器"""
    
    def __init__(self):
        self.llm = llm_client
    
    async def generate_index(self, content: str, max_content_length: int = 15000) -> Dict[str, Any]:
        """
        生成文档索引
        
        Args:
            content: 文档内容
            max_content_length: 最大内容长度（避免超出token限制）
            
        Returns:
            索引数据字典
        """
        # 截断过长内容
        if len(content) > max_content_length:
            content = content[:max_content_length] + "\n\n[内容已截断...]"
        
        prompt = INDEX_GENERATION_PROMPT.format(content=content)
        
        try:
            response = await self.llm.generate(
                prompt=prompt,
                system_prompt="你是一个学术文档分析专家，擅长提取和组织学术内容的结构化信息。",
                temperature=0.3,  # 低温度保证一致性
                max_tokens=3000,
                response_format="json"
            )
            
            index_data = response["content"]
            
            # 确保所有必需字段存在
            index_data = self._validate_and_fill_defaults(index_data)
            
            return index_data
            
        except Exception as e:
            # 返回默认索引
            return self._get_default_index(str(e))
    
    async def generate_section_summary(self, title: str, content: str) -> str:
        """生成单个章节的摘要"""
        # 截断过长内容
        if len(content) > 3000:
            content = content[:3000] + "..."
        
        prompt = SECTION_SUMMARY_PROMPT.format(title=title, content=content)
        
        try:
            response = await self.llm.generate(
                prompt=prompt,
                temperature=0.3,
                max_tokens=200
            )
            return response["content"].strip()
        except Exception:
            return ""
    
    async def generate_formula_description(self, latex: str, context: str = "") -> Dict[str, Any]:
        """生成公式的描述和变量说明"""
        prompt = f'''
请解释以下数学公式：

公式：${latex}$

{f"上下文：{context}" if context else ""}

请返回JSON格式：
{{
    "name": "公式名称（如果是知名公式）",
    "meaning": "公式含义，100字以内",
    "variables": [
        {{"symbol": "变量符号", "meaning": "含义", "unit": "单位（如果适用）"}}
    ]
}}
'''
        try:
            response = await self.llm.generate(
                prompt=prompt,
                temperature=0.3,
                max_tokens=500,
                response_format="json"
            )
            return response["content"]
        except Exception:
            return {"name": "", "meaning": "", "variables": []}
    
    def _validate_and_fill_defaults(self, index_data: Dict) -> Dict:
        """验证并填充默认值"""
        defaults = {
            "summary": "",
            "sections": [],
            "concepts": [],
            "formulas": [],
            "keywords": [],
            "difficulty": 3,
            "prerequisites": [],
            "domain": "未分类"
        }
        
        if not isinstance(index_data, dict):
            return defaults
        
        for key, default_value in defaults.items():
            if key not in index_data:
                index_data[key] = default_value
        
        return index_data
    
    def _get_default_index(self, error_message: str = "") -> Dict[str, Any]:
        """返回默认索引（LLM调用失败时使用）"""
        return {
            "summary": "",
            "sections": [],
            "concepts": [],
            "formulas": [],
            "keywords": [],
            "difficulty": 3,
            "prerequisites": [],
            "domain": "未分类",
            "_error": error_message
        }


# 全局实例
document_indexer = DocumentIndexer()
```

## 验收标准
1. DeepSeek API调用正常工作
2. 能正确生成JSON格式的索引
3. 索引包含所有必需字段
4. 错误处理正确，失败时返回默认值
5. 支持流式输出（用于后续Agent）
```

---

## Task 2.4: 文档上传API

### 任务描述
实现文档上传的完整API，包括文件验证、保存、异步处理。

### AI Code Agent 提示词

```
请实现文档上传API：

## apps/documents/serializers.py

```python
from rest_framework import serializers
from .models import Document, DocumentChunk, Formula, DocumentSection


class DocumentUploadSerializer(serializers.Serializer):
    """文档上传序列化器"""
    file = serializers.FileField()
    title = serializers.CharField(max_length=500, required=False)
    
    def validate_file(self, value):
        # 验证文件类型
        allowed_extensions = ['md', 'tex', 'txt']
        ext = value.name.rsplit('.', 1)[-1].lower()
        
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f'不支持的文件类型。支持的类型: {", ".join(allowed_extensions)}'
            )
        
        # 验证文件大小 (10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('文件大小不能超过10MB')
        
        return value


class FormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formula
        fields = ['id', 'latex', 'formula_type', 'label', 'number', 
                  'description', 'variables', 'order']


class DocumentChunkSerializer(serializers.ModelSerializer):
    formulas = FormulaSerializer(many=True, read_only=True)
    
    class Meta:
        model = DocumentChunk
        fields = ['id', 'order', 'chunk_type', 'title', 'content', 
                  'summary', 'start_line', 'end_line', 'formulas']


class DocumentSectionSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentSection
        fields = ['id', 'title', 'level', 'order', 'anchor', 'summary', 'children']
    
    def get_children(self, obj):
        return DocumentSectionSerializer(obj.children.all(), many=True).data


class DocumentListSerializer(serializers.ModelSerializer):
    """文档列表序列化器"""
    class Meta:
        model = Document
        fields = ['id', 'title', 'file_type', 'status', 'word_count', 
                  'reading_progress', 'created_at', 'last_viewed_at']


class DocumentDetailSerializer(serializers.ModelSerializer):
    """文档详情序列化器"""
    sections = DocumentSectionSerializer(many=True, read_only=True)
    chunk_count = serializers.IntegerField(read_only=True)
    formula_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Document
        fields = ['id', 'title', 'original_filename', 'file_type', 'status',
                  'raw_content', 'cleaned_content', 'index_data',
                  'word_count', 'chunk_count', 'formula_count',
                  'view_count', 'reading_progress',
                  'created_at', 'updated_at', 'processed_at', 'sections']


class DocumentContentSerializer(serializers.ModelSerializer):
    """文档内容序列化器（用于阅读器）"""
    chunks = DocumentChunkSerializer(many=True, read_only=True)
    sections = DocumentSectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Document
        fields = ['id', 'title', 'raw_content', 'index_data', 
                  'chunks', 'sections']
```

## apps/documents/views.py

```python
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone

from .models import Document, DocumentChunk, ReadingHistory
from .serializers import (
    DocumentUploadSerializer, DocumentListSerializer,
    DocumentDetailSerializer, DocumentContentSerializer,
    DocumentChunkSerializer
)
from .tasks import process_document_task


class DocumentViewSet(viewsets.ModelViewSet):
    """文档视图集"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DocumentListSerializer
        if self.action == 'retrieve':
            return DocumentDetailSerializer
        if self.action == 'create':
            return DocumentUploadSerializer
        if self.action == 'content':
            return DocumentContentSerializer
        return DocumentDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """上传文档"""
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file = serializer.validated_data['file']
        title = serializer.validated_data.get('title') or file.name.rsplit('.', 1)[0]
        
        # 确定文件类型
        ext = file.name.rsplit('.', 1)[-1].lower()
        file_type_map = {'md': 'md', 'tex': 'tex', 'txt': 'md'}
        file_type = file_type_map.get(ext, 'md')
        
        # 创建文档记录
        document = Document.objects.create(
            user=request.user,
            title=title,
            original_filename=file.name,
            file_type=file_type,
            file=file,
            file_size=file.size,
            status=Document.Status.PROCESSING
        )
        
        # 触发异步处理任务
        process_document_task.delay(str(document.id))
        
        return Response(
            DocumentDetailSerializer(document).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def content(self, request, pk=None):
        """获取文档内容（用于阅读器）"""
        document = self.get_object()
        
        # 更新阅读记录
        document.view_count += 1
        document.last_viewed_at = timezone.now()
        document.save(update_fields=['view_count', 'last_viewed_at'])
        
        # 更新或创建阅读历史
        ReadingHistory.objects.update_or_create(
            user=request.user,
            document=document,
            defaults={'last_read_at': timezone.now()}
        )
        
        serializer = DocumentContentSerializer(document)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def chunks(self, request, pk=None):
        """获取文档分块列表"""
        document = self.get_object()
        chunks = document.chunks.all()
        
        # 支持按类型过滤
        chunk_type = request.query_params.get('type')
        if chunk_type:
            chunks = chunks.filter(chunk_type=chunk_type)
        
        serializer = DocumentChunkSerializer(chunks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """重新处理文档"""
        document = self.get_object()
        document.status = Document.Status.PROCESSING
        document.error_message = ''
        document.save()
        
        # 触发重新处理
        process_document_task.delay(str(document.id))
        
        return Response({'status': 'processing'})
    
    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """更新阅读进度"""
        document = self.get_object()
        progress = request.data.get('progress', 0)
        
        document.reading_progress = max(document.reading_progress, progress)
        document.save(update_fields=['reading_progress'])
        
        # 更新阅读历史
        history, _ = ReadingHistory.objects.get_or_create(
            user=request.user,
            document=document
        )
        history.scroll_position = progress
        history.save()
        
        return Response({'progress': document.reading_progress})
```

## apps/documents/tasks.py - Celery任务

```python
from celery import shared_task
from django.utils import timezone
from asgiref.sync import async_to_sync
import asyncio

from .models import Document, DocumentChunk, Formula, DocumentSection
from .services.parser import get_parser
from .services.indexer import document_indexer


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
        # 1. 读取文件内容
        with document.file.open('r') as f:
            content = f.read()
        
        document.raw_content = content
        document.save(update_fields=['raw_content'])
        
        # 2. 解析文档
        parser = get_parser(document.file_type)
        if not parser:
            raise ValueError(f"不支持的文件类型: {document.file_type}")
        
        parsed = parser.parse(content, document.original_filename)
        
        # 更新文档基本信息
        if parsed.title and parsed.title != document.title:
            document.title = parsed.title
        document.cleaned_content = parsed.cleaned_content
        document.word_count = parsed.word_count
        document.save()
        
        # 3. 保存分块
        DocumentChunk.objects.filter(document=document).delete()
        for i, chunk in enumerate(parsed.chunks):
            DocumentChunk.objects.create(
                document=document,
                order=i,
                chunk_type=chunk.chunk_type.value,
                title=chunk.title,
                content=chunk.content,
                start_line=chunk.start_line,
                end_line=chunk.end_line,
                metadata=chunk.metadata
            )
        document.chunk_count = len(parsed.chunks)
        
        # 4. 保存公式
        Formula.objects.filter(document=document).delete()
        for i, formula in enumerate(parsed.formulas):
            Formula.objects.create(
                document=document,
                latex=formula.latex,
                formula_type=formula.formula_type,
                label=formula.label,
                line_number=formula.line_number,
                order=i
            )
        document.formula_count = len(parsed.formulas)
        
        # 5. 保存章节结构
        DocumentSection.objects.filter(document=document).delete()
        _save_sections(document, parsed.sections)
        
        # 6. 调用LLM生成索引（异步转同步）
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            index_data = loop.run_until_complete(
                document_indexer.generate_index(parsed.cleaned_content)
            )
        finally:
            loop.close()
        
        document.index_data = index_data
        
        # 7. 更新状态
        document.status = Document.Status.READY
        document.processed_at = timezone.now()
        document.save()
        
    except Exception as e:
        document.status = Document.Status.ERROR
        document.error_message = str(e)
        document.save()
        
        # 重试
        raise self.retry(exc=e, countdown=60)


def _save_sections(document, sections, parent=None, counter=[0]):
    """递归保存章节结构"""
    for section in sections:
        db_section = DocumentSection.objects.create(
            document=document,
            parent=parent,
            order=counter[0],
            level=section.level,
            title=section.title,
            anchor=f"section-{counter[0]}"
        )
        counter[0] += 1
        
        if section.children:
            _save_sections(document, section.children, db_section, counter)
```

## apps/documents/urls.py

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet

router = DefaultRouter()
router.register('', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]
```

## 在config/urls.py中注册

```python
urlpatterns = [
    # ... 其他路由
    path('api/documents/', include('apps.documents.urls')),
]
```

## 验收标准
1. 能够上传MD/TeX文件
2. 文件验证正常（类型、大小）
3. 异步处理任务正常执行
4. 文档解析和索引生成正常
5. API返回正确的数据结构
6. 阅读进度更新正常
```

---

## Task 2.5: 前端文档管理页面

### AI Code Agent 提示词

```
请实现前端文档管理功能：

## 1. 类型定义 (src/types/document.ts)

```typescript
export interface Document {
  id: string;
  title: string;
  original_filename: string;
  file_type: 'md' | 'tex' | 'pdf';
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error_message?: string;
  word_count: number;
  chunk_count: number;
  formula_count: number;
  reading_progress: number;
  created_at: string;
  updated_at: string;
  last_viewed_at?: string;
}

export interface DocumentContent extends Document {
  raw_content: string;
  cleaned_content: string;
  index_data: DocumentIndex;
  chunks: DocumentChunk[];
  sections: DocumentSection[];
}

export interface DocumentIndex {
  summary: string;
  sections: SectionSummary[];
  concepts: Concept[];
  formulas: FormulaInfo[];
  keywords: string[];
  difficulty: number;
  prerequisites: string[];
  domain: string;
}

export interface DocumentChunk {
  id: string;
  order: number;
  chunk_type: string;
  title: string;
  content: string;
  summary: string;
  start_line: number;
  end_line: number;
}

export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  order: number;
  anchor: string;
  summary: string;
  children: DocumentSection[];
}

export interface Concept {
  name: string;
  type: 'definition' | 'theorem' | 'method' | 'formula' | 'other';
  description: string;
  prerequisites: string[];
  related: string[];
}

export interface FormulaInfo {
  latex: string;
  name: string;
  meaning: string;
  variables: { symbol: string; meaning: string; unit?: string }[];
}
```

## 2. 文档服务 (src/services/documentService.ts)

```typescript
import { api } from './api';
import type { Document, DocumentContent } from '../types/document';

export const documentService = {
  async list(): Promise<Document[]> {
    const response = await api.get('/documents/');
    return response.data;
  },

  async get(id: string): Promise<Document> {
    const response = await api.get(`/documents/${id}/`);
    return response.data;
  },

  async getContent(id: string): Promise<DocumentContent> {
    const response = await api.get(`/documents/${id}/content/`);
    return response.data;
  },

  async upload(file: File, title?: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    const response = await api.post('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}/`);
  },

  async updateProgress(id: string, progress: number): Promise<void> {
    await api.post(`/documents/${id}/update_progress/`, { progress });
  },

  async reprocess(id: string): Promise<void> {
    await api.post(`/documents/${id}/reprocess/`);
  },
};
```

## 3. 文档状态管理 (src/stores/documentStore.ts)

```typescript
import { create } from 'zustand';
import type { Document, DocumentContent } from '../types/document';
import { documentService } from '../services/documentService';

interface DocumentState {
  documents: Document[];
  currentDocument: DocumentContent | null;
  loading: boolean;
  error: string | null;
  
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  uploadDocument: (file: File, title?: string) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (doc: DocumentContent | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const documents = await documentService.list();
      set({ documents, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchDocument: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const document = await documentService.getContent(id);
      set({ currentDocument: document, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  uploadDocument: async (file: File, title?: string) => {
    set({ loading: true, error: null });
    try {
      const document = await documentService.upload(file, title);
      set((state) => ({
        documents: [document, ...state.documents],
        loading: false,
      }));
      return document;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await documentService.delete(id);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setCurrentDocument: (doc) => set({ currentDocument: doc }),
}));
```

## 4. 文档上传组件 (src/components/documents/DocumentUpload.tsx)

```typescript
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { useDocumentStore } from '../../stores/documentStore';
import { cn } from '../../utils/cn';

interface DocumentUploadProps {
  onSuccess?: () => void;
}

export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadDocument = useDocumentStore((state) => state.uploadDocument);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      await uploadDocument(file);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.file?.[0] || '上传失败');
    } finally {
      setUploading(false);
    }
  }, [uploadDocument, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md'],
      'text/x-tex': ['.tex'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-300 hover:border-gray-400',
        uploading && 'pointer-events-none opacity-50'
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center">
        {uploading ? (
          <>
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
            <p className="text-gray-600">正在上传...</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              {isDragActive ? '释放以上传文件' : '拖拽文件到此处，或点击选择'}
            </p>
            <p className="text-sm text-gray-400">
              支持 .md, .tex 文件，最大 10MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
```

## 5. 文档列表组件 (src/components/documents/DocumentList.tsx)

```typescript
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, MoreVertical, Trash2, RefreshCw } from 'lucide-react';
import { useDocumentStore } from '../../stores/documentStore';
import { cn } from '../../utils/cn';
import type { Document } from '../../types/document';

const statusConfig = {
  uploading: { label: '上传中', color: 'text-gray-500', bg: 'bg-gray-100' },
  processing: { label: '处理中', color: 'text-blue-500', bg: 'bg-blue-100' },
  ready: { label: '就绪', color: 'text-green-500', bg: 'bg-green-100' },
  error: { label: '错误', color: 'text-red-500', bg: 'bg-red-100' },
};

export function DocumentList() {
  const { documents, loading, fetchDocuments, deleteDocument } = useDocumentStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">暂无文档，上传第一篇文档开始学习吧</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onDelete={() => deleteDocument(doc.id)}
        />
      ))}
    </div>
  );
}

interface DocumentCardProps {
  document: Document;
  onDelete: () => void;
}

function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const status = statusConfig[document.status];
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link
            to={document.status === 'ready' ? `/reader/${document.id}` : '#'}
            className={cn(
              'block font-medium text-gray-900 truncate',
              document.status === 'ready' && 'hover:text-primary-600'
            )}
          >
            {document.title}
          </Link>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className={cn('px-2 py-0.5 rounded-full text-xs', status.bg, status.color)}>
              {status.label}
            </span>
            <span>{document.word_count} 字</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(document.created_at).toLocaleDateString()}
            </span>
          </div>
          
          {document.reading_progress > 0 && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${document.reading_progress * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 mt-1">
                阅读进度 {Math.round(document.reading_progress * 100)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 6. 文档页面 (src/pages/DocumentsPage.tsx)

```typescript
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';

export default function DocumentsPage() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的文档</h1>
          <p className="text-gray-600 mt-1">管理和阅读你的学术文档</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="w-4 h-4 mr-2" />
          上传文档
        </Button>
      </div>

      <DocumentList />

      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="上传文档"
      >
        <DocumentUpload onSuccess={() => setShowUpload(false)} />
      </Modal>
    </div>
  );
}
```

## 7. 添加路由

在App.tsx中添加:
```typescript
import DocumentsPage from './pages/DocumentsPage';

// 在Routes中添加
<Route
  path="/documents"
  element={
    <ProtectedRoute>
      <MainLayout>
        <DocumentsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

## 需要安装的额外依赖
```bash
npm install react-dropzone
```

## 验收标准
1. 能够显示文档列表
2. 能够拖拽上传文件
3. 上传后显示处理状态
4. 能够删除文档
5. 显示阅读进度
6. 点击就绪状态的文档能跳转到阅读器
```

---

## Task 2.6: 前端文档阅读器

### AI Code Agent 提示词

```
请实现文档阅读器页面：

## 1. LaTeX渲染组件 (src/components/reader/MarkdownRenderer.tsx)

```typescript
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '../../utils/cn';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onSelectText?: (text: string, position: { x: number; y: number }) => void;
}

export function MarkdownRenderer({ content, className, onSelectText }: MarkdownRendererProps) {
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      onSelectText?.(selection.toString(), {
        x: rect.x + rect.width / 2,
        y: rect.y,
      });
    }
  };

  return (
    <div 
      className={cn('prose prose-slate max-w-none', className)}
      onMouseUp={handleMouseUp}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // 自定义标题渲染，添加锚点
          h1: ({ children, ...props }) => (
            <h1 id={generateAnchor(children)} {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 id={generateAnchor(children)} {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 id={generateAnchor(children)} {...props}>{children}</h3>
          ),
          // 代码块样式
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={cn('block p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto', className)} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function generateAnchor(children: React.ReactNode): string {
  const text = typeof children === 'string' ? children : '';
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}
```

## 2. 目录导航组件 (src/components/reader/TableOfContents.tsx)

```typescript
import { cn } from '../../utils/cn';
import type { DocumentSection } from '../../types/document';

interface TableOfContentsProps {
  sections: DocumentSection[];
  activeSection?: string;
  onSectionClick: (anchor: string) => void;
}

export function TableOfContents({ sections, activeSection, onSectionClick }: TableOfContentsProps) {
  return (
    <nav className="space-y-1">
      {sections.map((section) => (
        <TOCItem
          key={section.id}
          section={section}
          activeSection={activeSection}
          onSectionClick={onSectionClick}
        />
      ))}
    </nav>
  );
}

interface TOCItemProps {
  section: DocumentSection;
  activeSection?: string;
  onSectionClick: (anchor: string) => void;
}

function TOCItem({ section, activeSection, onSectionClick }: TOCItemProps) {
  const isActive = activeSection === section.anchor;
  
  return (
    <div>
      <button
        onClick={() => onSectionClick(section.anchor)}
        className={cn(
          'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
          'hover:bg-gray-100',
          isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600',
          section.level === 2 && 'pl-6',
          section.level === 3 && 'pl-9',
          section.level >= 4 && 'pl-12'
        )}
      >
        {section.title}
      </button>
      
      {section.children && section.children.length > 0 && (
        <div className="mt-1">
          {section.children.map((child) => (
            <TOCItem
              key={child.id}
              section={child}
              activeSection={activeSection}
              onSectionClick={onSectionClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

## 3. 文本选择浮动工具栏 (src/components/reader/SelectionToolbar.tsx)

```typescript
import { useState, useEffect } from 'react';
import { MessageSquare, BookmarkPlus, Lightbulb, Copy } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectionToolbarProps {
  selectedText: string;
  position: { x: number; y: number };
  onAsk: (text: string) => void;
  onNote: (text: string) => void;
  onExplain: (text: string) => void;
  onClose: () => void;
}

export function SelectionToolbar({
  selectedText,
  position,
  onAsk,
  onNote,
  onExplain,
  onClose,
}: SelectionToolbarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.selection-toolbar')) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const buttons = [
    { icon: MessageSquare, label: '提问', onClick: () => onAsk(selectedText) },
    { icon: Lightbulb, label: '解释', onClick: () => onExplain(selectedText) },
    { icon: BookmarkPlus, label: '笔记', onClick: () => onNote(selectedText) },
    { icon: Copy, label: '复制', onClick: () => navigator.clipboard.writeText(selectedText) },
  ];

  return (
    <div
      className={cn(
        'selection-toolbar fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1',
        'transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        left: position.x,
        top: position.y - 50,
        transform: 'translateX(-50%)',
      }}
    >
      {buttons.map(({ icon: Icon, label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title={label}
        >
          <Icon className="w-4 h-4 text-gray-600" />
        </button>
      ))}
    </div>
  );
}
```

## 4. 文档信息面板 (src/components/reader/DocumentInfo.tsx)

```typescript
import { BookOpen, Brain, Tag, BarChart } from 'lucide-react';
import type { DocumentIndex } from '../../types/document';

interface DocumentInfoProps {
  index: DocumentIndex;
}

export function DocumentInfo({ index }: DocumentInfoProps) {
  const difficultyLabels = ['入门', '基础', '中等', '进阶', '高级'];

  return (
    <div className="space-y-6">
      {/* 摘要 */}
      <div>
        <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-2">
          <BookOpen className="w-4 h-4" />
          文档摘要
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {index.summary || '暂无摘要'}
        </p>
      </div>

      {/* 难度和领域 */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <BarChart className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            难度: {difficultyLabels[index.difficulty - 1] || '未知'}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          领域: {index.domain}
        </div>
      </div>

      {/* 关键概念 */}
      {index.concepts && index.concepts.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-2">
            <Brain className="w-4 h-4" />
            核心概念
          </h3>
          <div className="space-y-2">
            {index.concepts.slice(0, 5).map((concept, i) => (
              <div key={i} className="p-2 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm text-gray-900">
                  {concept.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {concept.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 关键词 */}
      {index.keywords && index.keywords.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-2">
            <Tag className="w-4 h-4" />
            关键词
          </h3>
          <div className="flex flex-wrap gap-2">
            {index.keywords.map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 5. 阅读器页面 (src/pages/ReaderPage.tsx)

```typescript
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, BookOpen, Info } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { MarkdownRenderer } from '../components/reader/MarkdownRenderer';
import { TableOfContents } from '../components/reader/TableOfContents';
import { SelectionToolbar } from '../components/reader/SelectionToolbar';
import { DocumentInfo } from '../components/reader/DocumentInfo';
import { cn } from '../utils/cn';

type RightPanel = 'chat' | 'info' | null;

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDocument, loading, fetchDocument } = useDocumentStore();
  
  const [activeSection, setActiveSection] = useState<string>();
  const [rightPanel, setRightPanel] = useState<RightPanel>('info');
  const [selection, setSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchDocument(id);
    }
  }, [id, fetchDocument]);

  const handleSectionClick = (anchor: string) => {
    setActiveSection(anchor);
    const element = document.getElementById(anchor);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectText = (text: string, position: { x: number; y: number }) => {
    setSelection({ text, position });
  };

  const handleAsk = (text: string) => {
    setSelection(null);
    setRightPanel('chat');
    // TODO: 将选中文本发送到Agent
  };

  if (loading || !currentDocument) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
        <button
          onClick={() => navigate('/documents')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-medium text-gray-900 truncate flex-1">
          {currentDocument.title}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setRightPanel(rightPanel === 'chat' ? null : 'chat')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              rightPanel === 'chat' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
            )}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'info' ? null : 'info')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              rightPanel === 'info' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
            )}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧目录 */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4">
          <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            目录
          </h2>
          <TableOfContents
            sections={currentDocument.sections}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
          />
        </aside>

        {/* 中间内容区 */}
        <main 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-8"
        >
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
            <MarkdownRenderer
              content={currentDocument.raw_content}
              onSelectText={handleSelectText}
            />
          </div>
        </main>

        {/* 右侧面板 */}
        {rightPanel && (
          <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
            {rightPanel === 'info' && (
              <DocumentInfo index={currentDocument.index_data} />
            )}
            {rightPanel === 'chat' && (
              <div className="h-full flex flex-col">
                <h2 className="font-medium text-gray-900 mb-4">AI助手</h2>
                {/* Agent聊天组件将在Phase 3实现 */}
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  AI问答功能即将上线
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 选择工具栏 */}
      {selection && (
        <SelectionToolbar
          selectedText={selection.text}
          position={selection.position}
          onAsk={handleAsk}
          onNote={() => {}}
          onExplain={() => {}}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
```

## 6. 添加路由

```typescript
import ReaderPage from './pages/ReaderPage';

// 在Routes中添加（不需要MainLayout，阅读器有自己的布局）
<Route
  path="/reader/:id"
  element={
    <ProtectedRoute>
      <ReaderPage />
    </ProtectedRoute>
  }
/>
```

## 验收标准
1. 能正确渲染Markdown内容
2. LaTeX公式正确显示
3. 目录导航正常工作
4. 选中文本显示浮动工具栏
5. 右侧面板可切换显示
6. 文档信息正确显示
7. 响应式布局合理
```

---

## Phase 2 完成检查清单

- [ ] Documents应用模型创建完成
- [ ] 文档解析服务实现完成（MD/TeX）
- [ ] LLM索引生成服务实现完成
- [ ] 文档上传API完成
- [ ] Celery异步任务配置完成
- [ ] 前端文档管理页面完成
- [ ] 前端文档阅读器完成
- [ ] LaTeX渲染正常工作
- [ ] 文档处理流程端到端测试通过

完成以上所有检查项后，可以继续Phase 3。
