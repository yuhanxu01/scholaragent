import { useState, useEffect } from 'react';
import { MessageSquare, BookmarkPlus, Lightbulb, Copy, Book } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectionToolbarProps {
  selectedText: string;
  position: { x: number; y: number };
  onAsk: (text: string) => void;
  onNote: (text: string) => void;
  onExplain: (text: string) => void;
  onDictionary?: (text: string, position: { x: number; y: number }) => void;
  onClose: () => void;
}

export function SelectionToolbar({
  selectedText,
  position,
  onAsk,
  onNote,
  onExplain,
  onDictionary,
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
    { icon: Book, label: '词典', onClick: () => onDictionary?.(selectedText, position) },
    { icon: BookmarkPlus, label: '笔记', onClick: () => onNote(selectedText) },
    { icon: Copy, label: '复制', onClick: () => navigator.clipboard.writeText(selectedText) },
  ];

  return (
    <div
      className={cn(
        'selection-toolbar fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 flex gap-1',
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
          className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-md transition-colors"
          title={label}
        >
          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-500" />
        </button>
      ))}
    </div>
  );
}