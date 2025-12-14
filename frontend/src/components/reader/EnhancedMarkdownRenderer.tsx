import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '../../utils/cn';
import 'katex/dist/katex.min.css';

interface EnhancedMarkdownRendererProps {
  content: string;
  className?: string;
  onSelectText?: (text: string, position: { x: number; y: number }) => void;
  onDictionaryLookup?: (text: string, position: { x: number; y: number }, context?: string) => void;
  enableDictionary?: boolean;
  enableHoverDictionary?: boolean;
}

export function EnhancedMarkdownRenderer({
  content,
  className,
  onSelectText,
  onDictionaryLookup,
  enableDictionary = true,
  enableHoverDictionary = true
}: EnhancedMarkdownRendererProps) {
  console.log('EnhancedMarkdownRenderer content length:', content?.length || 0);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const selectedText = selection.toString();

      onSelectText?.(selectedText, {
        x: rect.x + rect.width / 2,
        y: rect.y,
      });
    }
  };

  const handleWordDoubleClick = (event: React.MouseEvent) => {
    if (!enableDictionary || !onDictionaryLookup) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const selectedText = selection.toString().trim();

      // 获取上下文
      const container = range.startContainer;
      const context = getContextFromNode(container, selectedText);

      onDictionaryLookup(selectedText, {
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      }, context);
    }
  };

  const handleWordHover = (event: React.MouseEvent) => {
    if (!enableHoverDictionary || !onDictionaryLookup) return;

    const target = event.target as HTMLElement;
    if (target.tagName.match(/^(P|SPAN|DIV|H[1-6]|LI|TD)$/)) {
      const selection = window.getSelection();
      if (selection && selection.isCollapsed) {
        // 使用当前鼠标位置查找单词
        const range = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          const text = range.startContainer.textContent || '';
          const offset = range.startOffset;

          const word = findWordAtPosition(text, offset);
          if (word && word.length > 2) {
            // 延迟显示避免误触发
            setTimeout(() => {
              if (isMouseStillOverElement(target)) {
                const context = getContextFromNode(range.startContainer, word);
                onDictionaryLookup(word, {
                  x: event.clientX,
                  y: event.clientY - 10
                }, context);
              }
            }, 800);
          }
        }
      }
    }
  };

  // 查找文本中指定位置的单词
  const findWordAtPosition = (text: string, position: number): string => {
    const wordChars = /[a-zA-Z'-]/;

    let start = position;
    let end = position;

    while (start > 0 && wordChars.test(text[start - 1])) {
      start--;
    }

    while (end < text.length && wordChars.test(text[end])) {
      end++;
    }

    return text.slice(start, end);
  };

  // 获取上下文
  const getContextFromNode = (node: Node, word: string): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const contextLength = 100;
      const wordIndex = text.toLowerCase().indexOf(word.toLowerCase());

      if (wordIndex !== -1) {
        const start = Math.max(0, wordIndex - contextLength);
        const end = Math.min(text.length, wordIndex + word.length + contextLength);
        return text.slice(start, end);
      }
    }
    return '';
  };

  // 检查鼠标是否仍然悬停在元素上
  const isMouseStillOverElement = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    ) === element;
  };

  // 生成锚点ID
  const generateAnchor = (children: React.ReactNode): string => {
    const text = React.Children.toArray(children).join('');
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <div
      className={cn(
        'prose prose-slate max-w-none',
        enableDictionary && 'dictionary-enabled',
        enableHoverDictionary && 'hover-dictionary-enabled',
        className
      )}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleWordDoubleClick}
      onMouseMove={handleWordHover}
      style={{
        cursor: enableDictionary ? 'text' : 'default'
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // 自定义标题渲染
          h1: ({ children, ...props }) => (
            <h1 id={generateAnchor(children)} {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 id={generateAnchor(children)} {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 id={generateAnchor(children)} {...props}>{children}</h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 id={generateAnchor(children)} {...props}>{children}</h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 id={generateAnchor(children)} {...props}>{children}</h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 id={generateAnchor(children)} {...props}>{children}</h6>
          ),

          // 自定义段落渲染，添加词典功能支持
          p: ({ children, ...props }) => (
            <p
              {...props}
              className={cn(
                props.className,
                enableDictionary && 'select-text cursor-text'
              )}
            >
              {children}
            </p>
          ),

          // 代码块样式
          code: (props: any) => {
            const isInline = !props.className;
            if (isInline) {
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono"
                  {...props}
                />
              );
            }
            return (
              <code
                className="block bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 p-3 rounded-md text-sm font-mono overflow-x-auto"
                {...props}
              />
            );
          },

          // 自定义链接样式
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),

          // 列表样式
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li
              className={cn(
                'my-1',
                enableDictionary && 'cursor-text'
              )}
              {...props}
            >
              {children}
            </li>
          ),

          // 表格样式
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className={cn(
                'border border-gray-300 dark:border-gray-600 px-4 py-2',
                enableDictionary && 'cursor-text'
              )}
              {...props}
            >
              {children}
            </td>
          ),

          // 引用块样式
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-500 dark:text-gray-400 my-4"
              {...props}
            >
              {children}
            </blockquote>
          ),

          // 分隔线
          hr: (props) => (
            <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
          ),

          // 强调文本
          strong: ({ children, ...props }) => (
            <strong className="font-semibold" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic" {...props}>
              {children}
            </em>
          ),
        }}
      >
        {content || '*暂无内容*'}
      </ReactMarkdown>

      {/* 添加词典功能的样式提示 */}
      {enableDictionary && (
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-4 border-t pt-2">
          <p>💡 提示：双击单词可查看词典释义，悬停单词可快速查词</p>
        </div>
      )}
    </div>
  );
}