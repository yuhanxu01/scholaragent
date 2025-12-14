import re
import frontmatter
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any

logger = logging.getLogger(__name__)


@dataclass
class ParsedDocument:
    """解析后的文档结构"""
    title: str = ""
    frontmatter: Dict[str, Any] = field(default_factory=dict)
    sections: List[Dict] = field(default_factory=list)      # 每个section: {level, title, content, start_line, end_line}
    chunks: List[Dict] = field(default_factory=list)        # 每个chunk: {type, content, start_line, end_line}
    formulas: List[Dict] = field(default_factory=list)      # 每个formula: {latex, formula_type, line_number}
    cleaned_content: str = ""                               # 清洗后的内容（无frontmatter、注释等）
    raw_content: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)  # 额外的元数据，如作者、摘要等
    tags: List[str] = field(default_factory=list)           # 从内容中提取的标签


class MarkdownParser:
    """解析Markdown，提取：标题、章节、公式、内容块"""

    # 匹配行内公式 $...$（避免匹配到代码块中的$）
    INLINE_FORMULA_PATTERN = re.compile(r'(?<!\\)(?<!`)`?\$([^$\n]+?)(?<!\\)\$`(?!`)')

    # 匹配独立公式 $$...$$
    DISPLAY_FORMULA_PATTERN = re.compile(r'(?<!\\)\$\$([^$]+?)(?<!\\)\$\$', re.DOTALL)
    # 匹配标题 #, ##, ###
    HEADING_PATTERN = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
    # 匹配代码块 ```language...```
    CODE_BLOCK_PATTERN = re.compile(r'```[\w]*\n(.*?)\n```', re.DOTALL)
    # 匹配行内代码 `code`
    INLINE_CODE_PATTERN = re.compile(r'`([^`]+)`')
    # 匹配表格
    TABLE_PATTERN = re.compile(r'(\|.*?\|(\n\|.*?\|)*)')
    # 匹配图片
    IMAGE_PATTERN = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
    # 匹配链接
    LINK_PATTERN = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
    # 匹配引用块
    BLOCKQUOTE_PATTERN = re.compile(r'^>\s+(.+)$', re.MULTILINE)
    # 匹配列表
    LIST_PATTERN = re.compile(r'^\s*[-*+]\s+(.+)$', re.MULTILINE)
    # 匹配数字列表
    NUMBERED_LIST_PATTERN = re.compile(r'^\s*\d+\.\s+(.+)$', re.MULTILINE)
    
    def parse(self, content: str) -> ParsedDocument:
        """解析Markdown内容"""
        doc = ParsedDocument(raw_content=content)

        try:
            # 1. 解析frontmatter（如果存在）
            try:
                parsed = frontmatter.loads(content)
                doc.frontmatter = parsed.metadata
                content_without_frontmatter = parsed.content
            except:
                content_without_frontmatter = content

            # 2. 提取元数据和标签
            doc.metadata = self._extract_metadata(doc.frontmatter, content_without_frontmatter)
            doc.tags = self._extract_tags(doc.frontmatter, content_without_frontmatter)

            # 3. 提取公式（在代码块提取之前）
            doc.formulas = self._extract_formulas(content_without_frontmatter)

            # 4. 提取章节结构
            doc.sections = self._extract_sections(content_without_frontmatter)

            # 5. 分块（按章节和其他元素）
            doc.chunks = self._chunk_content(content_without_frontmatter, doc.sections)

            # 6. 生成清洗后内容
            doc.cleaned_content = self._clean_content(content_without_frontmatter)

            # 7. 提取标题
            doc.title = self._extract_title(doc.frontmatter, doc.sections)

            logger.info(f"Successfully parsed Markdown document: {doc.title or 'Untitled'}")
            return doc

        except Exception as e:
            logger.error(f"Error parsing Markdown content: {e}")
            # 返回基本的解析结果
            doc.title = "Parse Error"
            doc.cleaned_content = content
            doc.chunks = [{
                'type': 'error',
                'title': 'Parse Error',
                'content': f"解析文档时出错: {str(e)}",
                'start_line': 1,
                'end_line': content.count('\n') + 1,
            }]
            return doc
    
    def _extract_formulas(self, content: str) -> List[Dict]:
        """提取所有公式（避免在代码块中提取）"""
        formulas = []

        # 先提取代码块，避免在代码中误识别公式
        code_blocks = list(self.CODE_BLOCK_PATTERN.finditer(content))
        code_ranges = [(match.start(), match.end()) for match in code_blocks]

        # 辅助函数：检查位置是否在代码块内
        def is_in_code_block(pos):
            for start, end in code_ranges:
                if start <= pos < end:
                    return True
            return False

        # 独立公式
        for match in self.DISPLAY_FORMULA_PATTERN.finditer(content):
            if not is_in_code_block(match.start()):
                latex = match.group(1).strip()
                start = match.start()
                line_number = content[:start].count('\n') + 1
                formulas.append({
                    'latex': latex,
                    'formula_type': 'display',
                    'line_number': line_number,
                })

        # 行内公式
        for match in self.INLINE_FORMULA_PATTERN.finditer(content):
            if not is_in_code_block(match.start()):
                latex = match.group(1).strip()
                start = match.start()
                line_number = content[:start].count('\n') + 1
                formulas.append({
                    'latex': latex,
                    'formula_type': 'inline',
                    'line_number': line_number,
                })

        return formulas
    
    def _extract_sections(self, content: str) -> List[Dict]:
        """提取标题章节"""
        sections = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            match = self.HEADING_PATTERN.match(line)
            if match:
                level = len(match.group(1))
                title = match.group(2).strip()
                sections.append({
                    'level': level,
                    'title': title,
                    'start_line': i + 1,  # 1-based
                    'end_line': None,     # 将在后续计算
                })
        
        # 计算每个章节的结束行（下一个标题之前）
        for i in range(len(sections)):
            start = sections[i]['start_line']
            if i < len(sections) - 1:
                end = sections[i + 1]['start_line'] - 1
            else:
                end = len(lines)
            sections[i]['end_line'] = end
        
        return sections
    
    def _chunk_content(self, content: str, sections: List[Dict]) -> List[Dict]:
        """智能分块：按章节、代码块、表格等元素分块"""
        chunks = []
        lines = content.split('\n')

        if not sections:
            # 如果没有标题，按其他元素分块
            return self._chunk_without_sections(lines)

        for section in sections:
            start = section['start_line'] - 1  # 转换为0-based
            end = section['end_line'] - 1
            section_lines = lines[start:end+1]

            # 提取章节内容（不含标题）
            if section_lines and self.HEADING_PATTERN.match(section_lines[0]):
                content_lines = section_lines[1:]
            else:
                content_lines = section_lines

            # 在章节内进一步分块
            section_chunks = self._chunk_section_content(
                content_lines, section['start_line'] + 1, section['title']
            )
            chunks.extend(section_chunks)

        return chunks

    def _chunk_without_sections(self, lines: List[str]) -> List[Dict]:
        """在没有章节时按其他元素分块"""
        chunks = []
        content_lines = []
        start_line = 1

        for i, line in enumerate(lines, 1):
            # 检查是否是特殊元素的开始
            if (self.CODE_BLOCK_PATTERN.match(line) or
                self.TABLE_PATTERN.match(line) or
                self.IMAGE_PATTERN.match(line) or
                self.BLOCKQUOTE_PATTERN.match(line)):

                # 保存之前的内容
                if content_lines:
                    content = '\n'.join(content_lines).strip()
                    if content:
                        chunks.append({
                            'type': 'paragraph',
                            'title': '',
                            'content': content,
                            'start_line': start_line,
                            'end_line': i - 1,
                        })
                    content_lines = []

                # 处理特殊元素
                if line.strip().startswith('```'):
                    # 代码块
                    end_line = self._find_code_block_end(lines, i - 1)
                    if end_line > i:
                        code_content = '\n'.join(lines[i-1:end_line])
                        chunks.append({
                            'type': 'code',
                            'title': 'Code Block',
                            'content': code_content,
                            'start_line': i,
                            'end_line': end_line,
                        })
                        start_line = end_line + 1
                        i = end_line
            else:
                content_lines.append(line)

        # 保存最后的内容
        if content_lines:
            content = '\n'.join(content_lines).strip()
            if content:
                chunks.append({
                    'type': 'paragraph',
                    'title': '',
                    'content': content,
                    'start_line': start_line,
                    'end_line': len(lines),
                })

        return chunks if chunks else [{
            'type': 'document',
            'title': '',
            'content': '\n'.join(lines),
            'start_line': 1,
            'end_line': len(lines),
        }]

    def _chunk_section_content(self, lines: List[str], start_line: int, section_title: str) -> List[Dict]:
        """在章节内进一步分块"""
        chunks = []
        current_chunk = []
        chunk_start = start_line

        for i, line in enumerate(lines):
            line_num = start_line + i

            # 检查是否需要分块
            if self._should_create_new_chunk(line):
                # 保存当前块
                if current_chunk:
                    content = '\n'.join(current_chunk).strip()
                    if content:
                        chunk_type = self._detect_chunk_type(content)
                        chunks.append({
                            'type': chunk_type,
                            'title': section_title if chunk_type == 'section' else '',
                            'content': content,
                            'start_line': chunk_start,
                            'end_line': line_num - 1,
                        })
                    current_chunk = []
                    chunk_start = line_num

            current_chunk.append(line)

        # 保存最后一块
        if current_chunk:
            content = '\n'.join(current_chunk).strip()
            if content:
                chunk_type = self._detect_chunk_type(content)
                chunks.append({
                    'type': chunk_type,
                    'title': section_title if chunk_type == 'section' else '',
                    'content': content,
                    'start_line': chunk_start,
                    'end_line': start_line + len(lines) - 1,
                })

        return chunks

    def _should_create_new_chunk(self, line: str) -> bool:
        """判断是否需要创建新块"""
        stripped = line.strip()
        return (
            stripped.startswith('```') or  # 代码块
            stripped.startswith('|') or     # 表格
            stripped.startswith('![') or    # 图片
            stripped.startswith('>') or     # 引用块
            (len(stripped) > 0 and stripped[0] in '-*+' and len(stripped) > 1 and stripped[1] == ' ') or  # 列表
            (re.match(r'^\d+\.\s', stripped))  # 数字列表
        )

    def _detect_chunk_type(self, content: str) -> str:
        """检测块的类型"""
        if '```' in content:
            return 'code'
        elif '|' in content and '\n|' in content:
            return 'table'
        elif content.strip().startswith('!['):
            return 'figure'
        elif content.strip().startswith('>'):
            return 'quote'
        elif re.search(r'^\s*[-*+]\s', content, re.MULTILINE):
            return 'list'
        elif re.search(r'^\s*\d+\.\s', content, re.MULTILINE):
            return 'list'
        elif any(keyword in content.lower() for keyword in ['theorem', 'proof', 'definition', 'lemma']):
            return 'theorem'
        else:
            return 'paragraph'

    def _find_code_block_end(self, lines: List[str], start_idx: int) -> int:
        """找到代码块的结束行"""
        for i in range(start_idx + 1, len(lines)):
            if lines[i].strip().startswith('```'):
                return i + 1  # 返回结束行的下一行
        return len(lines)

    def _extract_metadata(self, frontmatter: Dict, content: str) -> Dict[str, Any]:
        """提取文档元数据"""
        metadata = {}

        # 从frontmatter提取
        if frontmatter:
            for key in ['author', 'date', 'abstract', 'keywords', 'description']:
                if key in frontmatter:
                    metadata[key] = frontmatter[key]

        # 从内容中提取摘要（第一段）
        if 'abstract' not in metadata:
            paragraphs = content.split('\n\n')
            for paragraph in paragraphs:
                if paragraph.strip() and not paragraph.strip().startswith('#'):
                    metadata['abstract'] = paragraph.strip()
                    break

        return metadata

    def _extract_tags(self, frontmatter: Dict, content: str) -> List[str]:
        """提取标签"""
        tags = set()

        # 从frontmatter提取
        if 'tags' in frontmatter:
            if isinstance(frontmatter['tags'], list):
                tags.update(frontmatter['tags'])
            elif isinstance(frontmatter['tags'], str):
                tags.update([tag.strip() for tag in frontmatter['tags'].split(',')])

        if 'keywords' in frontmatter:
            if isinstance(frontmatter['keywords'], list):
                tags.update(frontmatter['keywords'])
            elif isinstance(frontmatter['keywords'], str):
                tags.update([kw.strip() for kw in frontmatter['keywords'].split(',')])

        # 从内容中提取常见学术关键词
        academic_keywords = [
            'machine learning', 'artificial intelligence', 'deep learning', 'neural network',
            'algorithm', 'optimization', 'probability', 'statistics', 'mathematics', 'calculus',
            'linear algebra', 'differential equation', 'theorem', 'proof', 'definition', 'lemma'
        ]

        content_lower = content.lower()
        for keyword in academic_keywords:
            if keyword in content_lower:
                tags.add(keyword)

        return list(tags)
    
    def _clean_content(self, content: str) -> str:
        """清洗内容：移除frontmatter（已处理）、注释（HTML注释）等"""
        # 移除HTML注释 <!-- ... -->
        cleaned = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
        # 移除多余空行
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)
        return cleaned.strip()
    
    def _extract_title(self, frontmatter: Dict, sections: List[Dict]) -> str:
        """提取文档标题"""
        # 优先使用frontmatter中的title
        if 'title' in frontmatter:
            return str(frontmatter['title'])
        
        # 其次使用第一个一级标题
        for section in sections:
            if section['level'] == 1:
                return section['title']
        
        # 默认返回空
        return ""


class LaTeXParser:
    """解析LaTeX，提取：标题、章节、公式、定理环境"""

    # 匹配 \title{...}
    TITLE_PATTERN = re.compile(r'\\title\{([^}]+)\}')
    # 匹配 \author{...}
    AUTHOR_PATTERN = re.compile(r'\\author\{([^}]+)\}')
    # 匹配 \section{...}, \subsection{...}, \subsubsection{...}
    SECTION_PATTERN = re.compile(r'\\(section|subsection|subsubsection)\{([^}]+)\}')
    # 匹配 \begin{equation}...\end{equation}
    EQUATION_PATTERN = re.compile(r'\\begin\{equation\}(.*?)\\end\{equation\}', re.DOTALL)
    # 匹配 \begin{align}...\end{align}
    ALIGN_PATTERN = re.compile(r'\\begin\{align\}(.*?)\\end\{align\}', re.DOTALL)
    # 匹配 \begin{align*}...\end{align*}
    ALIGN_STAR_PATTERN = re.compile(r'\\begin\{align\*\}(.*?)\\end\{align\*\}', re.DOTALL)
    # 匹配 \begin{gather}...\end{gather}
    GATHER_PATTERN = re.compile(r'\\begin\{gather\}(.*?)\\end\{gather\}', re.DOTALL)
    # 匹配行内公式 $...$
    INLINE_FORMULA_PATTERN = re.compile(r'(?<!\\)\$([^$\n]+?)(?<!\\)\$')
    # 匹配独立公式 $$...$$
    DISPLAY_FORMULA_PATTERN = re.compile(r'(?<!\\)\$\$([^$]+?)(?<!\\)\$\$', re.DOTALL)
    # 匹配各种定理环境
    THEOREM_ENVIRONMENTS = ['theorem', 'lemma', 'proposition', 'corollary', 'definition', 'example', 'remark']
    THEOREM_PATTERN = re.compile(r'\\begin\{(' + '|'.join(THEOREM_ENVIRONMENTS) + r')\}(.*?)\\end\{\1\}', re.DOTALL)
    # 匹配proof环境
    PROOF_PATTERN = re.compile(r'\\begin\{proof\}(.*?)\\end\{proof\}', re.DOTALL)
    # 匹配itemize/enumerate环境
    ITEMIZE_PATTERN = re.compile(r'\\begin\{(itemize|enumerate)\}(.*?)\\end\{\1\}', re.DOTALL)
    # 匹配figure环境
    FIGURE_PATTERN = re.compile(r'\\begin\{figure\}(.*?)\\end\{figure\}', re.DOTALL)
    # 匹配table环境
    TABLE_PATTERN = re.compile(r'\\begin\{table\}(.*?)\\end\{table\}', re.DOTALL)
    # 匹配注释 %
    COMMENT_PATTERN = re.compile(r'^%.*$', re.MULTILINE)
    # 匹配\label{}和\ref{}
    LABEL_PATTERN = re.compile(r'\\label\{([^}]+)\}')
    REF_PATTERN = re.compile(r'\\(?:ref|eqref|cite)\{([^}]+)\}')
    
    def parse(self, content: str) -> ParsedDocument:
        """解析LaTeX内容"""
        doc = ParsedDocument(raw_content=content)

        try:
            # 1. 移除注释
            content_no_comments = self._remove_comments(content)

            # 2. 提取元数据和标签
            doc.metadata = self._extract_latex_metadata(content_no_comments)
            doc.tags = self._extract_latex_tags(content_no_comments)

            # 3. 提取标题
            doc.title = self._extract_title(content_no_comments)

            # 4. 提取章节
            doc.sections = self._extract_sections(content_no_comments)

            # 5. 提取公式
            doc.formulas = self._extract_formulas(content_no_comments)

            # 6. 提取定理环境和其他环境
            theorems = self._extract_theorems(content_no_comments)
            proofs = self._extract_proofs(content_no_comments)
            figures = self._extract_figures(content_no_comments)
            tables = self._extract_tables(content_no_comments)
            lists = self._extract_lists(content_no_comments)

            # 7. 提取标签和引用
            labels = self._extract_labels(content_no_comments)
            refs = self._extract_refs(content_no_comments)

            # 8. 分块（按章节和各种环境）
            doc.chunks = self._chunk_latex_content(
                content_no_comments, doc.sections, theorems, proofs, figures, tables, lists
            )

            # 9. 生成清洗后内容
            doc.cleaned_content = self._clean_content(content_no_comments)

            # 10. 将标签和引用信息添加到元数据
            if labels:
                doc.metadata['labels'] = labels
            if refs:
                doc.metadata['references'] = refs

            logger.info(f"Successfully parsed LaTeX document: {doc.title or 'Untitled'}")
            return doc

        except Exception as e:
            logger.error(f"Error parsing LaTeX content: {e}")
            # 返回基本的解析结果
            doc.title = "Parse Error"
            doc.cleaned_content = content
            doc.chunks = [{
                'type': 'error',
                'title': 'Parse Error',
                'content': f"解析LaTeX文档时出错: {str(e)}",
                'start_line': 1,
                'end_line': content.count('\n') + 1,
            }]
            return doc
    
    def _remove_comments(self, content: str) -> str:
        """移除LaTeX注释（以%开头的行）"""
        return self.COMMENT_PATTERN.sub('', content)
    
    def _extract_title(self, content: str) -> str:
        """提取标题"""
        match = self.TITLE_PATTERN.search(content)
        if match:
            return match.group(1).strip()
        return ""
    
    def _extract_sections(self, content: str) -> List[Dict]:
        """提取章节"""
        sections = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            match = self.SECTION_PATTERN.search(line)
            if match:
                cmd = match.group(1)  # section, subsection, subsubsection
                title = match.group(2).strip()
                # 映射到级别
                level_map = {'section': 1, 'subsection': 2, 'subsubsection': 3}
                level = level_map.get(cmd, 1)
                sections.append({
                    'level': level,
                    'title': title,
                    'start_line': i + 1,
                    'end_line': None,
                })
        
        # 计算结束行
        for i in range(len(sections)):
            start = sections[i]['start_line']
            if i < len(sections) - 1:
                end = sections[i + 1]['start_line'] - 1
            else:
                end = len(lines)
            sections[i]['end_line'] = end
        
        return sections
    
    def _extract_formulas(self, content: str) -> List[Dict]:
        """提取所有公式"""
        formulas = []

        # 独立公式 $$
        for match in self.DISPLAY_FORMULA_PATTERN.finditer(content):
            latex = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            formulas.append({
                'latex': latex,
                'formula_type': 'display',
                'line_number': line_number,
            })

        # 行内公式 $
        for match in self.INLINE_FORMULA_PATTERN.finditer(content):
            latex = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            formulas.append({
                'latex': latex,
                'formula_type': 'inline',
                'line_number': line_number,
            })

        # 方程环境 equation
        for match in self.EQUATION_PATTERN.finditer(content):
            latex = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            formulas.append({
                'latex': latex,
                'formula_type': 'equation',
                'line_number': line_number,
            })

        # 对齐环境 align
        for match in self.ALIGN_PATTERN.finditer(content):
            latex = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            formulas.append({
                'latex': latex,
                'formula_type': 'align',
                'line_number': line_number,
            })

        # 对齐环境 align*
        for match in self.ALIGN_STAR_PATTERN.finditer(content):
            latex = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            formulas.append({
                'latex': latex,
                'formula_type': 'align',
                'line_number': line_number,
            })

        # 收集环境 gather
        for match in self.GATHER_PATTERN.finditer(content):
            latex = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            formulas.append({
                'latex': latex,
                'formula_type': 'gather',
                'line_number': line_number,
            })

        return formulas
    
    def _extract_theorems(self, content: str) -> List[Dict]:
        """提取定理环境"""
        theorems = []
        for match in self.THEOREM_PATTERN.finditer(content):
            env_type = match.group(1)  # theorem, lemma, definition, etc.
            content_text = match.group(2).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            theorems.append({
                'type': env_type,
                'content': content_text,
                'line_number': line_number,
            })
        return theorems

    def _extract_proofs(self, content: str) -> List[Dict]:
        """提取证明环境"""
        proofs = []
        for match in self.PROOF_PATTERN.finditer(content):
            content_text = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            proofs.append({
                'type': 'proof',
                'content': content_text,
                'line_number': line_number,
            })
        return proofs

    def _extract_figures(self, content: str) -> List[Dict]:
        """提取图表环境"""
        figures = []
        for match in self.FIGURE_PATTERN.finditer(content):
            content_text = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            # 尝试提取 caption
            caption_match = re.search(r'\\caption\{([^}]+)\}', content_text)
            caption = caption_match.group(1) if caption_match else ''
            figures.append({
                'type': 'figure',
                'content': content_text,
                'caption': caption,
                'line_number': line_number,
            })
        return figures

    def _extract_tables(self, content: str) -> List[Dict]:
        """提取表格环境"""
        tables = []
        for match in self.TABLE_PATTERN.finditer(content):
            content_text = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            # 尝试提取 caption
            caption_match = re.search(r'\\caption\{([^}]+)\}', content_text)
            caption = caption_match.group(1) if caption_match else ''
            tables.append({
                'type': 'table',
                'content': content_text,
                'caption': caption,
                'line_number': line_number,
            })
        return tables

    def _extract_lists(self, content: str) -> List[Dict]:
        """提取列表环境"""
        lists = []
        for match in self.ITEMIZE_PATTERN.finditer(content):
            list_type = match.group(1)  # itemize or enumerate
            content_text = match.group(2).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            lists.append({
                'type': list_type,
                'content': content_text,
                'line_number': line_number,
            })
        return lists

    def _extract_labels(self, content: str) -> List[Dict]:
        """提取标签"""
        labels = []
        for match in self.LABEL_PATTERN.finditer(content):
            label_text = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            labels.append({
                'label': label_text,
                'line_number': line_number,
            })
        return labels

    def _extract_refs(self, content: str) -> List[Dict]:
        """提取引用"""
        refs = []
        for match in self.REF_PATTERN.finditer(content):
            ref_text = match.group(1).strip()
            start = match.start()
            line_number = content[:start].count('\n') + 1
            ref_type = match.group(0).split('{')[0].replace('\\', '')
            refs.append({
                'type': ref_type,  # ref, eqref, cite
                'ref': ref_text,
                'line_number': line_number,
            })
        return refs

    def _extract_latex_metadata(self, content: str) -> Dict[str, Any]:
        """提取LaTeX文档元数据"""
        metadata = {}

        # 提取作者
        author_match = self.AUTHOR_PATTERN.search(content)
        if author_match:
            metadata['author'] = author_match.group(1).strip()

        # 提取标题（如果没有在主解析中提取到）
        title_match = self.TITLE_PATTERN.search(content)
        if title_match and 'title' not in metadata:
            metadata['title'] = title_match.group(1).strip()

        # 提取摘要（abstract环境）
        abstract_pattern = re.compile(r'\\begin\{abstract\}(.*?)\\end\{abstract\}', re.DOTALL)
        abstract_match = abstract_pattern.search(content)
        if abstract_match:
            metadata['abstract'] = abstract_match.group(1).strip()

        # 提取关键词
        keywords_pattern = re.compile(r'\\keywords?\{([^}]+)\}')
        keywords_match = keywords_pattern.search(content)
        if keywords_match:
            keywords = [kw.strip() for kw in keywords_match.group(1).split(',')]
            metadata['keywords'] = keywords

        return metadata

    def _extract_latex_tags(self, content: str) -> List[str]:
        """从LaTeX文档中提取标签"""
        tags = set()

        # 从元数据中提取关键词
        keywords_pattern = re.compile(r'\\keywords?\{([^}]+)\}')
        keywords_match = keywords_pattern.search(content)
        if keywords_match:
            keywords = [kw.strip() for kw in keywords_match.group(1).split(',')]
            tags.update(keywords)

        # 提取常见的数学和学术关键词
        academic_keywords = [
            'theorem', 'proof', 'lemma', 'definition', 'proposition', 'corollary',
            'algorithm', 'optimization', 'probability', 'statistics', 'calculus',
            'linear algebra', 'differential equation', 'matrix', 'vector', 'function',
            'derivative', 'integral', 'limit', 'series', 'convergence', 'divergence'
        ]

        content_lower = content.lower()
        for keyword in academic_keywords:
            # 使用词边界确保匹配完整单词
            if re.search(r'\b' + re.escape(keyword) + r'\b', content_lower):
                tags.add(keyword)

        return list(tags)
    
    def _chunk_latex_content(self, content: str, sections: List[Dict], theorems: List[Dict],
                           proofs: List[Dict], figures: List[Dict], tables: List[Dict],
                           lists: List[Dict]) -> List[Dict]:
        """智能分块LaTeX内容"""
        chunks = []

        # 如果没有章节，按其他元素分块
        if not sections:
            return self._chunk_latex_without_sections(content, theorems, proofs, figures, tables, lists)

        # 按章节分块
        for section in sections:
            section_start = section['start_line'] - 1
            section_end = section['end_line'] - 1
            lines = content.split('\n')
            section_lines = lines[section_start:section_end + 1]

            # 移除章节命令行
            if section_lines and self.SECTION_PATTERN.search(section_lines[0]):
                section_lines = section_lines[1:]

            section_content = '\n'.join(section_lines).strip()
            if section_content:
                chunks.append({
                    'type': 'section',
                    'title': section['title'],
                    'content': section_content,
                    'start_line': section['start_line'] + 1,
                    'end_line': section['end_line'],
                })

        # 添加定理、证明、图表等作为独立块
        for theorem in theorems:
            chunks.append({
                'type': theorem['type'],
                'title': theorem['type'].capitalize(),
                'content': theorem['content'],
                'start_line': theorem['line_number'],
                'end_line': theorem['line_number'] + theorem['content'].count('\n'),
            })

        for proof in proofs:
            chunks.append({
                'type': 'proof',
                'title': 'Proof',
                'content': proof['content'],
                'start_line': proof['line_number'],
                'end_line': proof['line_number'] + proof['content'].count('\n'),
            })

        for figure in figures:
            chunks.append({
                'type': 'figure',
                'title': 'Figure',
                'content': figure['content'],
                'start_line': figure['line_number'],
                'end_line': figure['line_number'] + figure['content'].count('\n'),
            })

        for table in tables:
            chunks.append({
                'type': 'table',
                'title': 'Table',
                'content': table['content'],
                'start_line': table['line_number'],
                'end_line': table['line_number'] + table['content'].count('\n'),
            })

        for lst in lists:
            chunks.append({
                'type': 'list',
                'title': lst['type'].capitalize(),
                'content': lst['content'],
                'start_line': lst['line_number'],
                'end_line': lst['line_number'] + lst['content'].count('\n'),
            })

        # 按位置排序
        chunks.sort(key=lambda x: x['start_line'])

        return chunks

    def _chunk_latex_without_sections(self, content: str, theorems: List[Dict], proofs: List[Dict],
                                    figures: List[Dict], tables: List[Dict], lists: List[Dict]) -> List[Dict]:
        """在没有章节时按其他元素分块"""
        chunks = []

        # 添加所有特殊元素作为块
        for theorem in theorems:
            chunks.append({
                'type': theorem['type'],
                'title': theorem['type'].capitalize(),
                'content': theorem['content'],
                'start_line': theorem['line_number'],
                'end_line': theorem['line_number'] + theorem['content'].count('\n'),
            })

        for proof in proofs:
            chunks.append({
                'type': 'proof',
                'title': 'Proof',
                'content': proof['content'],
                'start_line': proof['line_number'],
                'end_line': proof['line_number'] + proof['content'].count('\n'),
            })

        for figure in figures:
            chunks.append({
                'type': 'figure',
                'title': 'Figure',
                'content': figure['content'],
                'start_line': figure['line_number'],
                'end_line': figure['line_number'] + figure['content'].count('\n'),
            })

        for table in tables:
            chunks.append({
                'type': 'table',
                'title': 'Table',
                'content': table['content'],
                'start_line': table['line_number'],
                'end_line': table['line_number'] + table['content'].count('\n'),
            })

        for lst in lists:
            chunks.append({
                'type': 'list',
                'title': lst['type'].capitalize(),
                'content': lst['content'],
                'start_line': lst['line_number'],
                'end_line': lst['line_number'] + lst['content'].count('\n'),
            })

        # 如果没有特殊元素，整个文档作为一个块
        if not chunks:
            lines = content.split('\n')
            chunks.append({
                'type': 'document',
                'title': '',
                'content': content,
                'start_line': 1,
                'end_line': len(lines),
            })

        # 按位置排序
        chunks.sort(key=lambda x: x['start_line'])

        return chunks
    
    def _clean_content(self, content: str) -> str:
        """清洗内容：移除注释、多余空格等"""
        # 注释已移除
        # 合并多余空行
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        return cleaned.strip()


def get_parser(file_type: str):
    """根据文件类型获取解析器"""
    parsers = {
        'md': MarkdownParser(),
        'tex': LaTeXParser(),
    }
    return parsers.get(file_type)