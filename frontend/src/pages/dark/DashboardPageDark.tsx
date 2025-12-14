import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AIAssistantChat } from '../../components/common/AIAssistantChat';
import TokenUsageCard from '../../components/common/TokenUsageCard';
import { documentService } from '../../services/documentService';
import { knowledgeService } from '../../services/knowledgeService';
import { api } from '../../services/api';
import type { Document } from '../../services/documentService';
import { VocabularyStatsCard } from '../../components/dashboard/VocabularyStatsCard';
import { RecentVocabularyWords } from '../../components/dashboard/RecentVocabularyWords';

export const DashboardPageDark: React.FC = () => {
   const { user } = useAuth();
   const navigate = useNavigate();
   const [isAIChatOpen, setIsAIChatOpen] = useState(false);
   const [isChatMinimized, setIsChatMinimized] = useState(false);
   const [stats, setStats] = useState({
      documents: 0,
      notes: 0,
      flashcards: 0,
      studyHours: 0,
   });
   const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
   const [loading, setLoading] = useState(true);

   const { t } = useTranslation();

   useEffect(() => {
      const fetchDashboardData = async () => {
         try {
            setLoading(true);
            console.log('Fetching dashboard data...');

            // 获取最近文档
            console.log('Fetching documents...');
            const documentsResponse = await documentService.getList({
               page_size: 5
            });
            console.log('Documents response:', documentsResponse);

            // 处理不同的响应格式
            const responseData = documentsResponse.data as any;
            const documentsData = responseData.data || responseData;
            const docs = documentsData.results || [];
            const totalCount = documentsData.count || docs.length;

            setRecentDocuments(docs);

            // 获取统计数据
            console.log('Fetching stats...');
            const [notesResponse, flashcardsResponse, userStatsResponse] = await Promise.all([
               knowledgeService.notes.getList({ page_size: 1 }),
               knowledgeService.flashcards.getList({ page_size: 1 }),
               api.get('/auth/stats/'),
            ]);
            console.log('Notes response:', notesResponse);
            console.log('Flashcards response:', flashcardsResponse);
            console.log('User stats response:', userStatsResponse);

            // 处理知识库API响应格式
            const notesResponseData = notesResponse.data as any;
            const notesData = notesResponseData.data || notesResponseData;
            const notesCount = notesData.count || notesData.results?.length || 0;

            const flashcardsResponseData = flashcardsResponse.data as any;
            const flashcardsData = flashcardsResponseData.data || flashcardsResponseData;
            const flashcardsCount = flashcardsData.count || flashcardsData.results?.length || 0;

            // 获取学习时间统计
            const studyHours = userStatsResponse.data?.study_time_hours || 0;

            setStats({
               documents: totalCount,
               notes: notesCount,
               flashcards: flashcardsCount,
               studyHours: studyHours,
            });
            console.log('Stats updated:', {
               documents: totalCount,
               notes: notesCount,
               flashcards: flashcardsCount,
            });
         } catch (error: any) {
            console.error('Failed to fetch dashboard data:', error);
            // 如果API调用失败，可能是认证问题
            if (error.response?.status === 401) {
               console.log('Authentication failed, user may need to login');
            }
         } finally {
            setLoading(false);
         }
      };

      fetchDashboardData();
   }, []);

   const handleUploadDocument = () => {
    navigate('/documents');
   };

   const handleCreateNote = () => {
    navigate('/knowledge', { state: { activeTab: 'notes' } });
   };

   const handleAskAI = () => {
    setIsAIChatOpen(true);
    setIsChatMinimized(false);
   };

   const handleViewVocabulary = () => {
    navigate('/vocabulary');
   };

   return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {t('dashboard.welcome')}, {user?.firstName || user?.username}! 👋
            </h1>
            <p className="text-gray-500 mt-2">
              Ready to continue your learning journey?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-900/30 rounded-full">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.documents')}</p>
                  <p className="text-2xl font-semibold text-gray-900">{loading ? '...' : stats.documents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-900/30 rounded-full">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.notes')}</p>
                  <p className="text-2xl font-semibold text-gray-900">{loading ? '...' : stats.notes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-900/30 rounded-full">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.flashcards')}</p>
                  <p className="text-2xl font-semibold text-gray-900">{loading ? '...' : stats.flashcards}</p>
                </div>
              </div>
            </div>

            {/* Vocabulary Stats Card */}
            <VocabularyStatsCard compact={true} onClick={handleViewVocabulary} />

            {/* Study Hours Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-900/30 rounded-full">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.studyHours')}</p>
                  <p className="text-2xl font-semibold text-gray-900">{loading ? '...' : stats.studyHours}</p>
                </div>
              </div>
            </div>

            {/* Token Usage Card */}
            <div className="lg:col-span-1">
              <TokenUsageCard compact={true} showRefresh={false} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentDocuments')}</h2>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Loading...</p>
                </div>
               ) : recentDocuments.length > 0 ? (
                 <div className="space-y-3">
                   {recentDocuments.map((doc) => (
                     <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-100">
                       <div className="flex items-center">
                         <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                         </svg>
                         <div>
                           <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                           <p className="text-xs text-gray-500">
                             {new Date(doc.created_at).toLocaleDateString()} • {doc.file_type.toUpperCase()}
                           </p>
                         </div>
                       </div>
                       <div className="text-right">
                         <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                           doc.status === 'ready' ? 'bg-green-900/30 dark:text-green-400' :
                           doc.status === 'processing' ? 'bg-yellow-900/30 dark:text-yellow-400' :
                           'bg-red-900/30 dark:text-red-400'
                         }`}>
                           {doc.status}
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8 text-gray-500">
                   <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                   </svg>
                   <p>{t('dashboard.noDocuments')}</p>
                   <p className="text-sm mt-2">{t('dashboard.uploadFirstDocument')}</p>
                 </div>
               )}
             </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
              <div className="space-y-3">
                <button
                  onClick={handleUploadDocument}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-gray-600">{t('dashboard.uploadDocument')}</span>
                </button>
                <button
                  onClick={handleCreateNote}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-gray-600">{t('dashboard.createNote')}</span>
                </button>
                <button
                  onClick={handleAskAI}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-600">{t('dashboard.askAIAssistant')}</span>
                </button>
                <button
                  onClick={handleViewVocabulary}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-gray-600">管理生词本</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Vocabulary Words Section */}
          <div className="mb-6">
            <RecentVocabularyWords limit={5} />
          </div>
        </div>

      {/* AI Assistant Chat */}
      <AIAssistantChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        isMinimized={isChatMinimized}
        onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
      />
    </>
  );
};