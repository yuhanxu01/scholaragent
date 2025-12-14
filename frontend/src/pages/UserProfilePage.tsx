import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User, Mail, Calendar, FileText, Users, Heart, Bookmark } from 'lucide-react';
import { Button } from '../components/common/Button';
import { DocumentList } from '../components/documents/DocumentList';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar: string;
  bio: string;
  location: string;
  website: string;
  github_username: string;
  is_verified: boolean;
  is_featured: boolean;
  followers_count: number;
  following_count: number;
  public_documents_count: number;
  likes_count: number;
  created_at: string;
}

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // 使用用户API获取用户信息
        const response = await apiService.get(`/auth/profile/${userId}/`);
        setProfile(response);
      } catch (err: any) {
        console.error('Failed to fetch user profile:', err);
        setError(err.response?.data?.error || '无法加载用户信息');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('userProfile.notFound')}</h2>
          <p className="text-gray-600 dark:text-gray-500 mb-4">{error || '用户不存在'}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.goBack')}
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = String(currentUser?.id) === String(profile.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部导航 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.back')}
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('userProfile.title')}</h1>
            </div>
            {isOwnProfile && (
              <Button variant="outline" onClick={() => navigate('/settings')}>
                {t('userProfile.editProfile')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 用户信息卡片 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* 头像 */}
            <div className="relative">
              <img
                src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.display_name || profile.username}&background=0D8ABC&color=fff&size=200`}
                alt={profile.display_name || profile.username}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
              />
              {profile.is_verified && (
                <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* 基本信息 */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {profile.display_name || profile.username}
                    {profile.is_featured && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        推荐用户
                      </span>
                    )}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-500 flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant={isOwnProfile ? 'outline' : 'primary'}>
                    {isOwnProfile ? t('userProfile.editProfile') : t('userProfile.follow')}
                  </Button>
                </div>
              </div>

              {/* 简介 */}
              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-600 mb-4">{profile.bio}</p>
              )}

              {/* 统计信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.followers_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-500 flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" />
                    {t('userProfile.followers')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.following_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-500">{t('userProfile.following')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.public_documents_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-500 flex items-center justify-center gap-1">
                    <FileText className="w-4 h-4" />
                    {t('userProfile.documents')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.likes_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-500 flex items-center justify-center gap-1">
                    <Heart className="w-4 h-4" />
                    {t('userProfile.likes')}
                  </div>
                </div>
              </div>

              {/* 其他信息 */}
              <div className="flex flex-wrap gap-4 mt-6 text-sm text-gray-600 dark:text-gray-500">
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    {profile.location}
                  </div>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <span>🌐</span>
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {profile.github_username && (
                  <a
                    href={`https://github.com/${profile.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-gray-800 dark:text-gray-200 hover:underline"
                  >
                    <span>🐙</span>
                    {profile.github_username}
                  </a>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  加入于 {new Date(profile.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 用户的文档 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('userProfile.publicDocuments')}
          </h3>
          <DocumentList />
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
