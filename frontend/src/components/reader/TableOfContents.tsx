import { cn } from '../../utils/cn';
import type { DocumentSection } from '../../types/document';

interface TableOfContentsProps {
  sections: DocumentSection[];
  activeSection?: string;
  onSectionClick: (anchor: string) => void;
}

export function TableOfContents({ sections, activeSection, onSectionClick }: TableOfContentsProps) {
  if (!sections || sections.length === 0) {
    return (
      <nav className="space-y-1">
        <p className="text-gray-500 dark:text-gray-500 text-sm">暂无目录</p>
      </nav>
    );
  }

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
          'hover:bg-gray-100 dark:bg-gray-700',
          isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 dark:text-gray-400',
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