import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, BookOpen, Info, Sparkles } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { MarkdownRenderer } from '../components/reader/MarkdownRenderer';
import { TableOfContents } from '../components/reader/TableOfContents';
import { SelectionToolbar } from '../components/reader/SelectionToolbar';
import { DocumentInfo } from '../components/reader/DocumentInfo';
import { ReaderChat } from '../components/reader/ReaderChat';
import { DocumentSummary } from '../components/reader/DocumentSummary';
import { DictionaryPopup } from '../components/dictionary/DictionaryPopup';
import { DictionaryManager } from '../components/dictionary/DictionaryManager';
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
  const [selectedTextForChat, setSelectedTextForChat] = useState<string>('');

  // 词典相关状态
  const [dictionaryPopup, setDictionaryPopup] = useState<{
    word: string;
    position: { x: number; y: number };
    context?: string;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const lastScrollPosition = useRef<number>(0);
  const saveScrollTimeout = useRef<number | null>(null);

  // 阅读位置管理
  const saveReadingPosition = useCallback((scrollPosition: number) => {
    if (!id) return;

    try {
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      readingProgress[id] = {
        scrollPosition,
        lastRead: new Date().toISOString(),
        documentTitle: currentDocument?.title || '',
      };
      localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
    } catch (error) {
      console.error('Failed to save reading position:', error);
    }
  }, [id, currentDocument?.title]);

  const restoreReadingPosition = useCallback(() => {
    if (!id || !contentRef.current) return;

    try {
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      const progress = readingProgress[id];

      if (progress?.scrollPosition) {
        // 延迟恢复滚动位置，确保内容已经渲染完成
        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.scrollTop = progress.scrollPosition;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to restore reading position:', error);
    }
  }, [id]);

  // 防抖保存滚动位置
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;

    const scrollPosition = contentRef.current.scrollTop;

    // 清除之前的超时
    if (saveScrollTimeout.current) {
      clearTimeout(saveScrollTimeout.current);
    }

    // 设置新的超时，用户停止滚动1秒后保存位置
    saveScrollTimeout.current = setTimeout(() => {
      saveReadingPosition(scrollPosition);
    }, 1000);
  }, [saveReadingPosition]);

  useEffect(() => {
    if (id) {
      fetchDocument(id);
    }
  }, [id, fetchDocument]);

  // 当文档加载完成后恢复阅读位置
  useEffect(() => {
    if (currentDocument && id) {
      restoreReadingPosition();
    }
  }, [currentDocument, id, restoreReadingPosition]);

  // 清理函数，组件卸载时保存最后位置并清理定时器
  useEffect(() => {
    return () => {
      if (saveScrollTimeout.current) {
        clearTimeout(saveScrollTimeout.current);
      }
      if (contentRef.current && id) {
        saveReadingPosition(contentRef.current.scrollTop);
      }
    };
  }, [id, saveReadingPosition]);

  // Debug: 添加调试信息
  useEffect(() => {
    if (currentDocument) {
      console.log('currentDocument:', currentDocument);
      console.log('raw_content length:', currentDocument.raw_content?.length || 0);
      console.log('sections length:', currentDocument.sections?.length || 0);
      console.log('index_data exists:', !!currentDocument.index_data);
    } else {
      console.log('currentDocument is null');
    }
  }, [currentDocument]);

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
    setSelectedTextForChat(text);
    setSelection(null);
    // 将选中的文本保存到状态中，这样聊天组件可以使用
    setRightPanel('chat');
  };

  // 词典查询处理
  const handleDictionaryLookup = (
    word: string,
    position: { x: number; y: number },
    context?: string
  ) => {
    setDictionaryPopup({ word, position, context });
    setSelection(null); // 清除文本选择
  };

  // 关闭词典弹窗
  const closeDictionaryPopup = () => {
    setDictionaryPopup(null);
  };

  // 处理生词保存成功
  const handleWordSaved = (vocabulary: any) => {
    console.log('Word saved to vocabulary:', vocabulary);
  };

  if (loading || !currentDocument) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 顶部工具栏 */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
        <button
          onClick={() => navigate('/documents')}
          className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
          {currentDocument.title}
        </h1>
        <div className="flex gap-2">
          {/* 词典管理器 */}
          <DictionaryManager
            sourceDocumentId={id}
            onDictionaryLookup={handleDictionaryLookup}
          />

          {/* 升级到增强版按钮 */}
          <button
            onClick={() => navigate(`/enhanced-reader/${id}`)}
            className="p-2 rounded-lg transition-colors bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 flex items-center gap-1"
            title="升级到增强版（支持词典查词和生词本）"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">升级</span>
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'chat' ? null : 'chat')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              rightPanel === 'chat' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:bg-gray-700'
            )}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'info' ? null : 'info')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              rightPanel === 'info' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:bg-gray-700'
            )}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧目录 */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            目录
          </h2>
          <TableOfContents
            sections={currentDocument?.sections || []}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
          />
        </aside>

        {/* 中间内容区 */}
        <main
          ref={contentRef}
          className="flex-1 overflow-y-auto p-8"
          onScroll={handleScroll}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 文档摘要 */}
            <DocumentSummary
              documentId={id || ''}
              content={currentDocument.raw_content}
              title={currentDocument.title}
            />

            {/* 文档内容 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
              <MarkdownRenderer
                content={currentDocument.raw_content}
                onSelectText={handleSelectText}
              />
            </div>
          </div>
        </main>

        {/* 右侧面板 */}
        {rightPanel && (
          <aside className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            {rightPanel === 'info' && (
              <DocumentInfo index={currentDocument?.index_data || {}} />
            )}
            {rightPanel === 'chat' && (
              <ReaderChat
                documentId={id || ''}
                documentTitle={currentDocument?.title || ''}
                selectedText={selectedTextForChat}
                onClose={() => {
                  setRightPanel(null);
                  setSelectedTextForChat('');
                }}
              />
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
          onDictionary={(text, position) => {
            handleDictionaryLookup(text, position, selection.text);
          }}
          onClose={() => setSelection(null)}
        />
      )}

      {/* 词典弹窗 */}
      {dictionaryPopup && (
        <DictionaryPopup
          word={dictionaryPopup.word}
          position={dictionaryPopup.position}
          context={dictionaryPopup.context}
          sourceDocumentId={id}
          onClose={closeDictionaryPopup}
          onWordSaved={handleWordSaved}
        />
      )}
    </div>
  );
}