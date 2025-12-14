import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/common/Button';

export const ReaderLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // 检查是否有上次阅读的文档
    try {
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');

      // 找到最近阅读的文档
      let lastReadDocument = null;
      let lastReadTime = null;

      for (const [documentId, progress] of Object.entries(readingProgress)) {
        if (progress && typeof progress === 'object' && 'lastRead' in progress) {
          const readTime = new Date(progress.lastRead as string).getTime();
          if (!lastReadTime || readTime > lastReadTime) {
            lastReadTime = readTime;
            lastReadDocument = {
              id: documentId,
              ...progress
            };
          }
        }
      }

      // 如果找到最近阅读的文档，自动跳转
      if (lastReadDocument) {
        navigate(`/reader/${lastReadDocument.id}`, { replace: true });
        return;
      }
    } catch (error) {
      console.error('Failed to load reading progress:', error);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('reader.selectDocument.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-500 mb-6">
          {t('reader.selectDocument.description')}
        </p>
        <Button
          onClick={() => navigate('/documents')}
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('reader.selectDocument.goToDocuments')}
        </Button>
      </div>
    </div>
  );
};
