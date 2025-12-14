import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector, LanguageToggle } from './LanguageSelector';
import { Button } from './Button';

export const I18nTest: React.FC = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">{t('settings.title')}</h2>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-500 mb-2">当前语言 / Current Language:</p>
          <p className="font-medium">{i18n.language === 'zh' ? '中文' : 'English'}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-500 mb-2">Language Selector:</p>
          <LanguageSelector />
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-500 mb-2">Language Toggle:</p>
          <LanguageToggle />
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600 dark:text-gray-500 mb-2">Sample translations:</p>
          <ul className="space-y-1 text-sm">
            <li><strong>Dashboard:</strong> {t('navigation.dashboard')}</li>
            <li><strong>Documents:</strong> {t('navigation.documents')}</li>
            <li><strong>Settings:</strong> {t('navigation.settings')}</li>
            <li><strong>Total Cards:</strong> {t('flashcards.totalCards')}</li>
            <li><strong>Correct:</strong> {t('flashcards.correct')}</li>
            <li><strong>Save:</strong> {t('common.save')}</li>
            <li><strong>Edit:</strong> {t('common.edit')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default I18nTest;