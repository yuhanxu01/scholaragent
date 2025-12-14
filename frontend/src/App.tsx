import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import ReaderPage from './pages/ReaderPage';
import { ReaderLandingPage } from './pages/ReaderLandingPage';
import { KnowledgePage } from './pages/knowledge/KnowledgePage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import NoteReaderPage from './pages/NoteReaderPage';
import DocumentProcessingDemo from './pages/DocumentProcessingDemo';
import UserProfilePage from './pages/UserProfilePage';
import EnhancedReaderPage from './pages/EnhancedReaderPage';
import { VocabularyPage } from './pages/VocabularyPage';
import { DictionaryDemoPage } from './pages/DictionaryDemoPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import ChatPage from './pages/ChatPage';
import { ThemeTest } from './components/debug/ThemeTest';
import { SimpleThemeTest } from './components/debug/SimpleThemeTest';
import { ThemeDebugPage } from './pages/ThemeDebugPage';
import { ThemeTestPage } from './pages/ThemeTestPage';
import { PrivateRoute } from './components/common/PrivateRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { MainLayout } from './components/layout/MainLayout';
import { useAuth } from './hooks/useAuth';
import { useAuthHealthCheck } from './hooks/useAuthHealthCheck';
import { queryClient } from './services/queryClient';
import { GlobalDictionaryProvider } from './components/dictionary/GlobalDictionaryProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutWrapper } from './components/common/LayoutWrapper';
import './i18n';

function App() {
  const { isLoading } = useAuth();
  const { t } = useTranslation();

  // Enable authentication health monitoring
  useAuthHealthCheck();

  // 添加主题调试
  useEffect(() => {
    console.log('App component mounted');
    console.log('Initial HTML classes:', document.documentElement.className);
    console.log('Initial localStorage theme:', localStorage.getItem('theme'));
    console.log('Initial tokens:', {
      access: !!localStorage.getItem('access_token'),
      refresh: !!localStorage.getItem('refresh_token')
    });
  }, []);

  console.log('App rendering, isLoading:', isLoading, 'timestamp:', new Date().toISOString());

  if (isLoading) {
    console.log('Showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  console.log('Rendering main app');

  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}>
        <ThemeProvider>
          <Routes>
            {/* Public routes - protected for unauthenticated users only */}
            <Route
              path="/"
              element={
                <PublicRoute>
                  <HomePage />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route
              path="/auth/callback"
              element={
                <PublicRoute>
                  <AuthCallbackPage />
                </PublicRoute>
              }
            />

            {/* Protected routes */}
            <Route path="/dashboard" element={<PrivateRoute><MainLayout><DashboardPage /></MainLayout></PrivateRoute>} />
            <Route path="/documents" element={<PrivateRoute><LayoutWrapper><DocumentsPage /></LayoutWrapper></PrivateRoute>} />
            <Route path="/notes" element={<PrivateRoute><LayoutWrapper><NotesPage /></LayoutWrapper></PrivateRoute>} />
            <Route path="/chat" element={<PrivateRoute><LayoutWrapper><ChatPage /></LayoutWrapper></PrivateRoute>} />
            <Route path="/knowledge" element={<PrivateRoute><LayoutWrapper><KnowledgePage /></LayoutWrapper></PrivateRoute>} />
            <Route path="/reader" element={<PrivateRoute><LayoutWrapper><ReaderLandingPage /></LayoutWrapper></PrivateRoute>} />
            <Route path="/vocabulary" element={<PrivateRoute><LayoutWrapper><VocabularyPage /></LayoutWrapper></PrivateRoute>} />
            <Route path="/study" element={<PrivateRoute><LayoutWrapper><div>{t('study.comingSoon')}</div></LayoutWrapper></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><LayoutWrapper><SettingsPage /></LayoutWrapper></PrivateRoute>} />
            <Route path="/help" element={<PrivateRoute><LayoutWrapper><HelpPage /></LayoutWrapper></PrivateRoute>} />
            <Route path="/user/:userId" element={<PrivateRoute><LayoutWrapper><UserProfilePage /></LayoutWrapper></PrivateRoute>} />

            {/* Reader routes - have their own layout */}
            <Route
              path="/reader/:id"
              element={
                <PrivateRoute>
                  <ReaderPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/enhanced-reader/:id"
              element={
                <PrivateRoute>
                  <EnhancedReaderPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/reader/note/:id"
              element={
                <PrivateRoute>
                  <NoteReaderPage />
                </PrivateRoute>
              }
            />

            {/* Demo route - standalone page for document processing tracking */}
            <Route
              path="/demo/document-processing"
              element={
                <PrivateRoute>
                  <DocumentProcessingDemo />
                </PrivateRoute>
              }
            />

            {/* Dictionary demo route */}
            <Route
              path="/demo/dictionary"
              element={
                <PrivateRoute>
                  <DictionaryDemoPage />
                </PrivateRoute>
              }
            />

            {/* Theme test route */}
            <Route
              path="/theme-test"
              element={
                <PrivateRoute>
                  <ThemeTest />
                </PrivateRoute>
              }
            />

            {/* Simple theme test route */}
            <Route
              path="/simple-theme-test"
              element={
                <PrivateRoute>
                  <SimpleThemeTest />
                </PrivateRoute>
              }
            />

            {/* Theme debug route */}
            <Route
              path="/theme-debug"
              element={
                <PrivateRoute>
                  <ThemeDebugPage />
                </PrivateRoute>
              }
            />

            {/* Theme test route */}
            <Route
              path="/theme-test-page"
              element={
                <PrivateRoute>
                  <ThemeTestPage />
                </PrivateRoute>
              }
            />

            {/* Fallback - redirect to home for unauthenticated users */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
