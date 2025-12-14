import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '../../utils/cn';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onSelectText?: (text: string, position: { x: number; y: number }) => void;
}

export function MarkdownRenderer({ content, className, onSelectText }: MarkdownRendererProps) {
  // Debug: 添加调试信息
  console.log('MarkdownRenderer content length:', content?.length || 0);
  console.log('MarkdownRenderer content preview:', content?.substring(0, 100) || 'No content');

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
          code: (props: any) => {
            const { inline, className, children, ...rest } = props;
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm" {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code className={cn('block p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto', className)} {...rest}>
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