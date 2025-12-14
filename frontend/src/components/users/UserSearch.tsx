import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Verified, Star } from 'lucide-react';
import { userService, type User } from '../../services/userService';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { UserCard } from './UserCard';
import { FollowButton } from './FollowButton';

interface UserSearchProps {
  onUserSelect?: (user: User) => void;
  showFollowButtons?: boolean;
  compactResults?: boolean;
}

export const UserSearch: React.FC<UserSearchProps> = ({
  onUserSelect,
  showFollowButtons = true,
  compactResults = false
}) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    is_verified: false,
    order_by: '-followers_count'
  });
  const [showFilters, setShowFilters] = useState(false);

  const searchUsers = async (pageNum: number = 1, reset: boolean = false) => {
    if (loading || (!query.trim() && pageNum === 1)) return;

    setLoading(true);
    try {
      const response = await userService.search({
        q: query.trim(),
        page: pageNum,
        page_size: 20,
        ...filters
      });

      const newUsers = response.data.results || [];

      if (reset || pageNum === 1) {
        setUsers(newUsers);
      } else {
        setUsers(prev => [...prev, ...newUsers]);
      }

      setHasMore(newUsers.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      searchUsers(1, true);
    } else {
      setUsers([]);
      setHasMore(false);
    }
  };

  const loadMore = () => {
    searchUsers(page + 1);
  };

  const handleFollowChange = (username: string, isFollowing: boolean, followersCount?: number) => {
    setUsers(prev => prev.map(user =>
      user.username === username
        ? { ...user, is_following: isFollowing, followers_count: followersCount || user.followers_count }
        : user
    ));
  };

  const orderOptions = [
    { value: '-followers_count', label: '粉丝数（多到少）' },
    { value: 'followers_count', label: '粉丝数（少到多）' },
    { value: '-public_documents_count', label: '文档数（多到少）' },
    { value: 'public_documents_count', label: '文档数（少到多）' },
    { value: '-date_joined', label: '加入时间（新到旧）' },
    { value: 'date_joined', label: '加入时间（旧到新）' }
  ];

  useEffect(() => {
    if (query.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsers(1, true);
      }, 300); // 防抖

      return () => clearTimeout(timeoutId);
    }
  }, [query, filters]);

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <Input
            type="text"
            placeholder="搜索用户名、邮箱或简介..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 text-lg"
          />
        </div>

        {/* 过滤器 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            筛选
          </Button>

          {query && (
            <div className="text-sm text-gray-500 dark:text-gray-500">
              找到 {users.length} 个用户
            </div>
          )}
        </div>

        {/* 过滤器面板 */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 验证用户筛选 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verified-only"
                  checked={filters.is_verified}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    is_verified: e.target.checked
                  }))}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="verified-only" className="text-sm text-gray-700 dark:text-gray-600">
                  只显示验证用户
                </label>
              </div>

              {/* 排序方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                  排序方式
                </label>
                <select
                  value={filters.order_by}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    order_by: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {orderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {loading && users.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 搜索结果 */}
      {users.length > 0 && (
        <div className="space-y-4">
          {compactResults ? (
            // 紧凑模式
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow">
                  <UserCard
                    user={user}
                    compact={true}
                    showFollowButton={false}
                  />
                  <div className="flex items-center gap-2 ml-auto">
                    {onUserSelect && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUserSelect(user)}
                      >
                        查看
                      </Button>
                    )}
                    {showFollowButtons && (
                      <FollowButton
                        username={user.username}
                        isFollowing={user.is_following}
                        onFollowChange={(isFollowing) => handleFollowChange(user.username, isFollowing)}
                        size="sm"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 卡片模式
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onFollow={(username) => {
                    handleFollowChange(username, true);
                  }}
                  onUnfollow={(username) => {
                    handleFollowChange(username, false);
                  }}
                  showFollowButton={showFollowButtons}
                />
              ))}
            </div>
          )}

          {/* 加载更多 */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 无结果 */}
      {!loading && query && users.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            未找到用户
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            尝试使用不同的关键词或筛选条件
          </p>
        </div>
      )}

      {/* 空状态 */}
      {!query && !loading && users.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            搜索用户
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            输入关键词搜索其他用户
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-600 rounded-full text-sm">
              用户名
            </span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-600 rounded-full text-sm">
              邮箱
            </span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-600 rounded-full text-sm">
              个人简介
            </span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-600 rounded-full text-sm">
              所在地
            </span>
          </div>
        </div>
      )}
    </div>
  );
};