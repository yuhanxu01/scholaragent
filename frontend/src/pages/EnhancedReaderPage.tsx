import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  BookOpen,
  Info,
  Book,
  Volume2
} from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { EnhancedMarkdownRenderer } from '../components/reader/EnhancedMarkdownRenderer';
import { DictionaryPopup } from '../components/dictionary/DictionaryPopup';
import { VocabularyBook } from '../components/dictionary/VocabularyBook';
import { DictionaryManager } from '../components/dictionary/DictionaryManager';
import { TableOfContents } from '../components/reader/TableOfContents';
import { SelectionToolbar } from '../components/reader/SelectionToolbar';
import { DocumentInfo } from '../components/reader/DocumentInfo';
import { ReaderChat } from '../components/reader/ReaderChat';
import { DocumentSummary } from '../components/reader/DocumentSummary';
import { cn } from '../utils/cn';

type RightPanel = 'chat' | 'info' | 'vocabulary' | null;

export default function EnhancedReaderPage() {
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
  const [showVocabularyBook, setShowVocabularyBook] = useState(false);

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
    setSelectedTextForChat(text);
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

  // 工具栏回调函数
  const handleAsk = (text: string) => {
    setSelectedTextForChat(text);
    setRightPanel('chat');
    setSelection(null);
  };

  const handleNote = (text: string) => {
    // TODO: 实现笔记功能
    console.log('Add note:', text);
    setSelection(null);
  };

  const handleExplain = (text: string) => {
    setSelectedTextForChat(`请解释：${text}`);
    setRightPanel('chat');
    setSelection(null);
  };

  // 关闭词典弹窗
  const closeDictionaryPopup = () => {
    setDictionaryPopup(null);
  };

  // 处理生词保存成功
  const handleWordSaved = (vocabulary: any) => {
    console.log('Word saved to vocabulary:', vocabulary);
    // 可以显示成功提示
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 顶部工具栏 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/documents')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {currentDocument?.title || '文档加载中...'}
              </h1>
              {loading && (
                <p className="text-sm text-gray-500 dark:text-gray-500">正在加载文档内容...</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 词典管理器 */}
            <DictionaryManager
              sourceDocumentId={id}
              onDictionaryLookup={handleDictionaryLookup}
            />

            {/* 生词本快捷入口 */}
            <button
              onClick={() => setShowVocabularyBook(!showVocabularyBook)}
              className={cn(
                'p-2 rounded-lg transition-colors flex items-center gap-2',
                showVocabularyBook
                  ? 'bg-green-100 text-green-700'
                  : 'hover:bg-gray-100 dark:bg-gray-700'
              )}
              title="生词本"
            >
              <Book className="w-5 h-5" />
              <span className="text-sm">生词本</span>
            </button>

            {/* 右侧面板切换 */}
            <button
              onClick={() => setRightPanel(rightPanel === 'chat' ? null : 'chat')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                rightPanel === 'chat' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:bg-gray-700'
              )}
              title="AI 对话"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <button
              onClick={() => setRightPanel(rightPanel === 'info' ? null : 'info')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                rightPanel === 'info' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:bg-gray-700'
              )}
              title="文档信息"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
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
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 文档摘要 */}
            <DocumentSummary
              documentId={id || ''}
              content={currentDocument.raw_content}
              title={currentDocument.title}
            />

            {/* 文档内容 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 relative">
              {/* 词典功能提示 */}
              <div className="absolute top-2 right-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                💡 双击单词查词，选中文本使用工具栏
              </div>

              {/* 增强的Markdown渲染器 */}
              <EnhancedMarkdownRenderer
                content={currentDocument.raw_content || ''}
                enableDictionary={true}
                enableHoverDictionary={true}
                onSelectText={handleSelectText}
                onDictionaryLookup={handleDictionaryLookup}
              />
            </div>
          </div>
        </main>

        {/* 右侧面板 */}
        {rightPanel && (
          <aside className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            {rightPanel === 'chat' && (
              <ReaderChat
                documentId={id || ''}
                initialMessage={selectedTextForChat}
              />
            )}
            {rightPanel === 'info' && (
              <DocumentInfo
                documentId={id || ''}
                document={currentDocument}
              />
            )}
            {rightPanel === 'vocabulary' && (
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">生词本</h3>
                <VocabularyBook
                  onWordSelect={(vocabulary) => {
                    // 点击生词可以重新查看释义
                    handleDictionaryLookup(vocabulary.word, {
                      x: window.innerWidth / 2,
                      y: 200
                    });
                  }}
                />
              </div>
            )}
          </aside>
        )}

        {/* 生词本侧边栏 */}
        {showVocabularyBook && (
          <aside className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">我的生词本</h3>
              <button
                onClick={() => setShowVocabularyBook(false)}
                className="p-1 hover:bg-gray-100 dark:bg-gray-700 rounded"
              >
                ×
              </button>
            </div>
            <VocabularyBook
              onWordSelect={(vocabulary) => {
                // 点击生词可以重新查看释义
                handleDictionaryLookup(vocabulary.word, {
                  x: window.innerWidth / 2,
                  y: 200
                });
              }}
            />
          </aside>
        )}
      </div>

      {/* 文本选择工具栏 */}
      {selection && (
        <SelectionToolbar
          selectedText={selection.text}
          position={selection.position}
          onAsk={handleAsk}
          onNote={handleNote}
          onExplain={handleExplain}
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