import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, BookOpen, Info, Edit } from 'lucide-react';
import { useKnowledgeStore } from '../stores/knowledgeStore.ts';
import { MarkdownRenderer } from '../components/reader/MarkdownRenderer';
import { SelectionToolbar } from '../components/reader/SelectionToolbar';
import { ReaderChat } from '../components/reader/ReaderChat';
import { NoteInfo } from '../components/reader/NoteInfo';
import { DictionaryPopup } from '../components/dictionary/DictionaryPopup';
import { DictionaryManager } from '../components/dictionary/DictionaryManager';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';

type RightPanel = 'chat' | 'info' | null;

export default function NoteReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentNote, loading, error, fetchNote } = useKnowledgeStore();

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
  const saveScrollTimeout = useRef<number | null>(null);

  // 阅读位置管理（笔记版本）
  const saveReadingPosition = useCallback((scrollPosition: number) => {
    if (!id) return;

    try {
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      readingProgress[`note_${id}`] = {
        scrollPosition,
        lastRead: new Date().toISOString(),
        noteTitle: currentNote?.title || '',
      };
      localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
    } catch (error) {
      console.error('Failed to save reading position for note:', error);
    }
  }, [id, currentNote?.title]);

  const restoreReadingPosition = useCallback(() => {
    if (!id || !contentRef.current) return;

    try {
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      const progress = readingProgress[`note_${id}`];

      if (progress?.scrollPosition) {
        // 延迟恢复滚动位置，确保内容已经渲染完成
        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.scrollTop = progress.scrollPosition;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to restore reading position for note:', error);
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
      fetchNote(id);
    }
  }, [id, fetchNote]);

  // 当笔记加载完成后恢复阅读位置
  useEffect(() => {
    if (currentNote && id) {
      restoreReadingPosition();
    }
  }, [currentNote, id, restoreReadingPosition]);

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

  // Debug logging
  useEffect(() => {
    if (currentNote) {
      console.log('NoteReaderPage - currentNote:', currentNote);
      console.log('NoteReaderPage - content:', currentNote.content);
      console.log('NoteReaderPage - content length:', currentNote.content?.length);
    }
  }, [currentNote]);

  const handleSelectText = (text: string, position: { x: number; y: number }) => {
    setSelection({ text, position });
  };

  const handleAsk = (text: string) => {
    setSelectedTextForChat(text);
    setSelection(null);
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

  const handleEdit = () => {
    navigate('/notes'); // This will need to be updated to open the note editor
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">无法访问笔记</h2>
          <p className="text-gray-600 dark:text-gray-500 mb-6">
            该笔记不存在或您没有访问权限
          </p>
          <Button onClick={() => navigate('/notes')}>
            返回笔记列表
          </Button>
        </div>
      </div>
    );
  }

  if (!currentNote) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">笔记未找到</h2>
          <p className="text-gray-600 dark:text-gray-500 mb-6">
            无法加载笔记内容
          </p>
          <Button onClick={() => navigate('/notes')}>
            返回笔记列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 顶部工具栏 */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
        <button
          onClick={() => navigate('/notes')}
          className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
          {currentNote.title}
        </h1>
        <div className="flex gap-2">
          {/* 词典管理器 */}
          <DictionaryManager
            sourceDocumentId={undefined}
            onDictionaryLookup={handleDictionaryLookup}
          />

          <Button
            onClick={handleEdit}
            variant="outline"
            size="sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </Button>
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
        {/* 左侧目录 - 暂时隐藏，因为笔记通常没有章节 */}
        <aside className="w-0 overflow-hidden">
          {/* 可以后续添加笔记目录功能 */}
        </aside>

        {/* 中间内容区 */}
        <main
          ref={contentRef}
          className="flex-1 overflow-y-auto p-8"
          onScroll={handleScroll}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 笔记内容 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {currentNote.title}
                </h1>
                {currentNote.document_title && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-500 mb-4">
                    <BookOpen className="w-4 h-4" />
                    <span>来自文档: {currentNote.document_title}</span>
                  </div>
                )}
              </div>

              {currentNote.content ? (
                <MarkdownRenderer
                  content={currentNote.content}
                  onSelectText={handleSelectText}
                />
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p>暂无笔记内容</p>
                </div>
              )}

              {/* 标签显示 */}
              {currentNote.tags && currentNote.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {currentNote.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* 右侧面板 */}
        {rightPanel && (
          <aside className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            {rightPanel === 'info' && (
              <NoteInfo note={currentNote} />
            )}
            {rightPanel === 'chat' && (
              <ReaderChat
                documentId={id || ''}
                documentTitle={currentNote.title}
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
          sourceDocumentId={undefined}
          onClose={closeDictionaryPopup}
          onWordSaved={handleWordSaved}
        />
      )}
    </div>
  );
}
