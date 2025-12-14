import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Book,
  MessageCircle,
  Mail,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  Code,
  HelpCircle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  // FAQ 数据
  const faqData: Record<string, FAQItem[]> = {
    'getting-started': [
      {
        question: '如何开始使用 ScholarMind？',
        answer: '首先注册账号并登录，然后上传您的第一个文档。系统会自动处理文档，您可以使用阅读器查看、创建笔记和闪卡来辅助学习。'
      },
      {
        question: '支持哪些文档格式？',
        answer: '目前支持 PDF、TXT、Markdown (.md) 和 LaTeX (.tex) 格式的文档。'
      },
      {
        question: '如何上传文档？',
        answer: '进入"文档"页面，点击"新建文档"按钮或"上传文档"按钮，选择您要上传的文件即可。'
      }
    ],
    'features': [
      {
        question: '什么是知识图谱？',
        answer: '知识图谱是您文档中概念的可视化展示，帮助您理解概念之间的关系，更好地组织知识结构。'
      },
      {
        question: '如何创建笔记和闪卡？',
        answer: '在阅读器中选择文本后，可以使用选中文本工具栏创建笔记或闪卡，也可以在知识库中手动创建。'
      },
      {
        question: '闪卡复习如何工作？',
        answer: '系统使用间隔重复算法，根据您的掌握程度智能安排复习时间，帮助您更有效地记忆知识点。'
      }
    ],
    'account': [
      {
        question: '如何修改个人信息？',
        answer: '进入"设置"页面，点击"个人信息"旁的"编辑"按钮，即可修改您的用户名、邮箱等信息。'
      },
      {
        question: '如何更改密码？',
        answer: '在"设置"页面中，点击"密码"旁的"更改"按钮，输入当前密码和新密码即可完成修改。'
      },
      {
        question: '忘记密码怎么办？',
        answer: '在登录页面点击"忘记密码？"链接，输入您的邮箱地址，我们会发送密码重置链接到您的邮箱。'
      }
    ],
    'troubleshooting': [
      {
        question: '文档上传失败怎么办？',
        answer: '请检查文件大小是否超过限制（50MB），确认文件格式是否受支持，并确保网络连接稳定。如果问题持续，请联系客服。'
      },
      {
        question: '文档处理时间过长？',
        answer: '文档处理时间取决于文件大小和复杂度。通常PDF和LaTeX文档处理时间较长。您可以在文档列表中查看处理状态。'
      },
      {
        question: '阅读器加载缓慢？',
        answer: '尝试刷新页面，或检查网络连接。如果问题持续，可以尝试重新处理文档。'
      }
    ]
  };

  const categories = [
    {
      id: 'getting-started',
      name: '快速入门',
      icon: Book,
      color: 'text-blue-600'
    },
    {
      id: 'features',
      name: '功能介绍',
      icon: HelpCircle,
      color: 'text-green-600'
    },
    {
      id: 'account',
      name: '账户设置',
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      id: 'troubleshooting',
      name: '问题排查',
      icon: MessageCircle,
      color: 'text-orange-600'
    }
  ];

  // 搜索过滤
  const filteredFAQs: Record<string, FAQItem[]> = {};
  if (searchQuery.trim()) {
    Object.keys(faqData).forEach(category => {
      const filtered = faqData[category].filter(item =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        filteredFAQs[category] = filtered;
      }
    });
  }

  const displayFAQs = searchQuery.trim() ? filteredFAQs : faqData;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">帮助中心</h1>
        <p className="text-gray-600 dark:text-gray-500">
          快速找到您需要的答案，或联系我们的支持团队
        </p>
      </div>

      {/* 搜索框 */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <Input
            type="text"
            placeholder="搜索问题或关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3 text-lg"
          />
        </div>
      </div>

      {/* 快速链接 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Button variant="outline" className="h-auto p-6 flex flex-col items-center gap-3">
          <Video className="w-8 h-8 text-blue-600" />
          <div className="text-center">
            <div className="font-medium mb-1">视频教程</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">观看使用教程</div>
          </div>
        </Button>

        <Button variant="outline" className="h-auto p-6 flex flex-col items-center gap-3">
          <Book className="w-8 h-8 text-green-600" />
          <div className="text-center">
            <div className="font-medium mb-1">用户手册</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">详细功能说明</div>
          </div>
        </Button>

        <Button variant="outline" className="h-auto p-6 flex flex-col items-center gap-3">
          <Code className="w-8 h-8 text-purple-600" />
          <div className="text-center">
            <div className="font-medium mb-1">API 文档</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">开发者指南</div>
          </div>
        </Button>
      </div>

      {/* FAQ 分类 */}
      {!searchQuery && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">常见问题</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategory === category.id;
              return (
                <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(
                      isExpanded ? '' : category.id
                    )}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${category.color}`} />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      {faqData[category.id].map((item, index) => (
                        <FAQAccordionItem key={index} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {searchQuery && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            搜索结果 ({Object.values(displayFAQs).flat().length})
          </h2>
          {Object.keys(displayFAQs).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-500">没有找到相关问题</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                尝试使用不同的关键词，或联系我们的支持团队
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(displayFAQs).map(([category, items]) => {
                const categoryInfo = categories.find(c => c.id === category);
                return (
                  <div key={category}>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      {categoryInfo?.name}
                    </h3>
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <FAQAccordionItem key={index} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 联系支持 */}
      <div className="bg-blue-50 rounded-xl p-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">需要更多帮助？</h2>
        <p className="text-gray-600 dark:text-gray-500 mb-6">
          如果您没有找到答案，我们的支持团队随时为您提供帮助
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" className="justify-start">
            <Mail className="w-5 h-5 mr-2" />
            support@scholarmind.com
          </Button>
          <Button variant="outline" className="justify-start">
            <MessageCircle className="w-5 h-5 mr-2" />
            在线客服
          </Button>
        </div>
      </div>
    </div>
  );
};

// FAQ 项目组件
const FAQAccordionItem: React.FC<{ item: FAQItem }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left hover:bg-gray-50 dark:bg-gray-900 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-gray-100">{item.question}</span>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transform transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-gray-600 dark:text-gray-500 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
};