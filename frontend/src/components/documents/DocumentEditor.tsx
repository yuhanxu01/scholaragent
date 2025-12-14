import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  Eye,
  Upload,
  FileText,
  Code,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  File,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { documentService } from '../../services/documentService';
import type { Document } from '../../services/documentService';
import { triggerDocumentUpload } from '../document/DocumentProcessingManager';

// 动态加载KaTeX
const loadKatex = () => {
  return new Promise((resolve) => {
    if (window.katex) {
      resolve(window.katex);
      return;
    }

    // 加载CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
    document.head.appendChild(link);

    // 加载JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
    script.onload = () => resolve(window.katex);
    document.head.appendChild(script);
  });
};

// 扩展window类型声明
declare global {
  interface Window {
    katex: any;
  }
}

interface DocumentEditorProps {
  document?: Document | null;
  onSave: () => void;
  onCancel: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.content || '');
  const [fileType, setFileType] = useState<'md' | 'tex'>(document?.file_type || 'md');
  const [isPreview, setIsPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [katexLoaded, setKatexLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // 初始化KaTeX
  useEffect(() => {
    loadKatex().then(() => {
      setKatexLoaded(true);
    }).catch(console.error);
  }, []);

  // 渲染LaTeX公式
  const renderLatexInElement = (element: HTMLElement) => {
    if (!window.katex || !katexLoaded) return;

    // 渲染行内公式
    const inlineElements = element.querySelectorAll('.latex-inline');
    inlineElements.forEach((el) => {
      try {
        window.katex.render(el.textContent || '', el as HTMLElement, {
          throwOnError: false,
          displayMode: false
        });
      } catch (e) {
        console.warn('KaTeX render error:', e);
      }
    });

    // 渲染块级公式
    const blockElements = element.querySelectorAll('.latex-block');
    blockElements.forEach((el) => {
      try {
        const latexText = el.textContent?.replace(/^\$\$|\$\$$/g, '') || '';
        window.katex.render(latexText, el as HTMLElement, {
          throwOnError: false,
          displayMode: true
        });
      } catch (e) {
        console.warn('KaTeX render error:', e);
      }
    });
  };

  // 当预览内容改变时，重新渲染LaTeX
  useEffect(() => {
    if (isPreview && previewRef.current) {
      // 延迟渲染，确保DOM已经更新
      setTimeout(() => renderLatexInElement(previewRef.current!), 100);
    }
  }, [content, isPreview, katexLoaded]);

  // 简单的LaTeX公式渲染函数
  const renderLatex = (text: string) => {
    // 行内公式：$...$
    text = text.replace(/\$([^$]+)\$/g, '<span class="latex-inline">$1</span>');
    
    // 块级公式：$$...$$
    text = text.replace(/\$\$([^$]+)\$\$/g, '<div class="latex-block">$$$1$$</div>');
    
    return text;
  };

  // Markdown渲染函数
  const renderMarkdown = (text: string) => {
    // 先处理LaTeX公式
    text = renderLatex(text);
    
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 mt-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3 mt-6">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 mt-8">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/`([^`]*)`/gim, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto mb-4"><code>$1</code></pre>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:text-gray-400 my-4">$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/gim, '</p><p class="mb-4">')
      .replace(/^(?!<[h|l|b|c|p|d|a]|<span class="latex-inline">|<div class="latex-block">)/gm, '<p class="mb-4">')
      .replace(/$/, '</p>');
  };

  // 插入Markdown语法
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = before + selectedText + after;
    
    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
    
    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  // 工具栏按钮处理
  const handleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        insertMarkdown('**', '**');
        break;
      case 'italic':
        insertMarkdown('*', '*');
        break;
      case 'code':
        insertMarkdown('`', '`');
        break;
      case 'quote':
        insertMarkdown('> ');
        break;
      case 'ul':
        insertMarkdown('- ');
        break;
      case 'ol':
        insertMarkdown('1. ');
        break;
      case 'link':
        insertMarkdown('[', '](url)');
        break;
      case 'inline-latex':
        insertMarkdown('$', '$');
        break;
      case 'block-latex':
        insertMarkdown('$$\n', '\n$$');
        break;
      case 'h1':
        insertMarkdown('# ');
        break;
      case 'h2':
        insertMarkdown('## ');
        break;
      case 'h3':
        insertMarkdown('### ');
        break;
    }
  };

  // 文件上传处理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md') && !file.name.endsWith('.tex') && !file.name.endsWith('.txt')) {
      alert('请选择 Markdown (.md) 或 LaTeX (.tex) 文件');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target?.result as string;
        setContent(fileContent);
        if (!title) {
          setTitle(file.name.replace(/\.(md|tex|txt)$/, ''));
        }

        // 触发文档处理跟踪（模拟）
        const tempDocument = {
          id: `temp_${Date.now()}`,
          title: file.name.replace(/\.(md|tex|txt)$/, ''),
          file_name: file.name,
          file_type: file.name.endsWith('.tex') ? 'tex' : 'md',
          status: 'uploading' as const
        };

        // 触发跟踪事件
        triggerDocumentUpload(tempDocument);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Failed to read file:', error);
      alert('文件读取失败');
    } finally {
      setUploading(false);
    }
  };

  // 拖拽上传
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const input = fileInputRef.current;
      if (input) {
        // 创建一个新的 FileList
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        // 触发 onChange 事件
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // 保存文档
  const handleSave = async () => {
    if (!title.trim()) {
      alert('请输入文档标题');
      return;
    }

    if (!content.trim()) {
      alert('请输入文档内容');
      return;
    }

    setSaving(true);
    try {
      if (document) {
        // 更新现有文档
        await documentService.update(document.id, {
          title: title.trim(),
          content: content.trim(),
        });
        onSave();
      } else {
        // 创建新文档
        const response = await documentService.createFromContent({
          title: title.trim(),
          content: content.trim(),
          file_type: fileType,
        });

        const newDoc = response.data?.data;

        if (!newDoc || !newDoc.id) {
          throw new Error('创建文档失败：响应数据无效');
        }

        // 触发文档处理跟踪
        triggerDocumentUpload({
          id: newDoc.id,
          title: newDoc.title,
          file_name: newDoc.title,
          file_type: newDoc.file_type,
          status: 'uploading'
        });

        // 对于新文档，立即调用 onSave 来刷新列表，然后监控处理状态
        onSave();

        // 可选：延迟再次刷新以确保处理状态更新
        setTimeout(() => {
          onSave();
        }, 2000); // 2秒后再次刷新，给Celery处理时间
      }
    } catch (error) {
      console.error('Failed to save document:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 下载文档
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${title || 'document'}.${fileType}`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 重置内容
  const handleReset = () => {
    if (confirm('确定要清空所有内容吗？')) {
      setContent('');
      setTitle('');
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${isFullscreen ? 'p-0' : ''}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg flex flex-col ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl max-h-[95vh]'}`}>
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {document ? '编辑文档' : '新建文档'}
            </h2>
            
            {/* 文件类型选择 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">类型:</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as 'md' | 'tex')}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
              >
                <option value="md">Markdown</option>
                <option value="tex">LaTeX</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsPreview(!isPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreview ? '编辑' : '预览'}
            </Button>
            
            <Button
              variant="outline"
              onClick={onCancel}
            >
              取消
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 标题按钮 */}
            <Button variant="ghost" size="sm" onClick={() => handleFormat('h1')}>
              H1
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFormat('h2')}>
              H2
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFormat('h3')}>
              H3
            </Button>
            
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            
            {/* 格式化按钮 */}
            <Button variant="ghost" size="sm" onClick={() => handleFormat('bold')}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFormat('italic')}>
              <Italic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFormat('code')}>
              <Code className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            
            {/* 列表和引用 */}
            <Button variant="ghost" size="sm" onClick={() => handleFormat('ul')}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFormat('ol')}>
              <ListOrdered className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFormat('quote')}>
              <Quote className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFormat('link')}>
              <Link className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            
            {/* LaTeX公式按钮 */}
            <Button variant="ghost" size="sm" onClick={() => handleFormat('inline-latex')}>
              公式
            </Button>
            
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            
            {/* 文件操作 */}
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              上传文件
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              下载
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
          </div>
        </div>

        {/* 编辑器内容 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Input
              type="text"
              placeholder="输入文档标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium"
            />
          </div>
          
          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.tex,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* 编辑器主体 */}
          <div 
            className="flex-1 overflow-auto p-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {dragOver && (
              <div className="absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-300 flex items-center justify-center z-10">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <p className="text-lg text-blue-600">拖拽文件到这里上传</p>
                </div>
              </div>
            )}
            
            {isPreview ? (
              <div className="prose max-w-none bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border min-h-[400px]">
                <div 
                  ref={previewRef}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} 
                />
                {!katexLoaded && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    正在加载数学公式渲染器...
                  </div>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`开始编写你的${fileType === 'md' ? 'Markdown' : 'LaTeX'}文档...\n\n支持LaTeX公式语法：\n- 行内公式：$E = mc^2$\n- 块级公式：$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$`}
                className="w-full h-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm leading-relaxed"
                style={{ minHeight: '400px' }}
              />
            )}
          </div>
        </div>

        {/* 状态栏 */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>字符数: {content.length}</span>
            <span>行数: {content.split('\n').length}</span>
            {uploading && <span className="text-blue-600">正在上传文件...</span>}
            {saving && <span className="text-green-600">正在保存...</span>}
          </div>
          
          <div className="flex items-center gap-4">
            {!isPreview && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                支持 Markdown 和 LaTeX 语法
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};