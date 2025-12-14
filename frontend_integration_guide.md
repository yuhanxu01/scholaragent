# 前端集成指南 - 用户社交功能

本文档为前端开发者提供集成 ScholarAgent 用户社交功能的详细指南。

## 功能概述

已实现的社交功能包括：
- ✅ 用户关注/取消关注
- ✅ 用户粉丝列表和关注列表
- ✅ 文档点赞/取消点赞
- ✅ 文档收藏/取消收藏
- ✅ 文档评论系统（发布、回复、删除）
- ✅ 评论点赞
- ✅ 用户搜索
- ✅ 活动流
- ✅ 用户统计信息

## API 端点总览

### 基础 URL
```
http://localhost:8000/api/users/
```

### 主要端点

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| **关注系统** | | | |
| 关注/取消关注 | `/follow/{username}/` | POST/DELETE | 关注或取消关注指定用户 |
| 获取粉丝列表 | `/{username}/followers/` | GET | 获取指定用户的粉丝列表 |
| 获取关注列表 | `/{username}/following/` | GET | 获取指定用户的关注列表 |
| **文档互动** | | | |
| 点赞文档 | `/like-document/` | POST | 点赞或取消点赞文档 |
| 创建收藏 | `/collections/` | POST | 收藏文档 |
| 获取收藏列表 | `/collections/` | GET | 获取当前用户的收藏列表 |
| 检查收藏状态 | `/collections/by_document/` | GET | 检查特定文档是否被收藏 |
| 删除收藏 | `/collections/{id}/` | DELETE | 取消收藏文档 |
| **评论系统** | | | |
| 创建评论 | `/comments/` | POST | 创建评论或回复 |
| 获取评论列表 | `/comments/` | GET | 获取文档的评论列表 |
| 获取评论回复 | `/comments/{id}/replies/` | GET | 获取评论的回复 |
| 点赞评论 | `/comments/{id}/like/` | POST | 点赞评论 |
| 取消点赞评论 | `/comments/{id}/unlike/` | DELETE | 取消点赞评论 |
| 删除评论 | `/comments/{id}/delete_comment/` | POST | 删除自己的评论 |
| **用户功能** | | | |
| 搜索用户 | `/search/` | GET | 搜索用户 |
| 用户资料 | `/profile/{username}/` | GET | 获取用户资料 |
| 用户统计 | `/social-stats/{username}/` | GET | 获取用户社交统计 |
| 活动流 | `/activities/{username}/` | GET | 获取用户活动流 |

## 前端集成示例

### 1. 用户关注功能

```typescript
// 关注用户
const followUser = async (username: string) => {
  try {
    const response = await fetch(`/api/users/follow/${username}/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '关注失败');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('关注用户错误:', error);
    throw error;
  }
};

// 取消关注用户
const unfollowUser = async (username: string) => {
  try {
    const response = await fetch(`/api/users/follow/${username}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '取消关注失败');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('取消关注错误:', error);
    throw error;
  }
};
```

### 2. React 组件示例 - 关注按钮

```tsx
import React, { useState } from 'react';
import { followUser, unfollowUser } from '../api/user';

interface FollowButtonProps {
  username: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  username,
  isFollowing: initialIsFollowing,
  onFollowChange,
}) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(username);
        setIsFollowing(false);
      } else {
        await followUser(username);
        setIsFollowing(true);
      }
      onFollowChange?.(!isFollowing);
    } catch (error) {
      console.error('操作失败:', error);
      // 显示错误提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-4 py-2 rounded-md text-sm font-medium ${
        isFollowing
          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {loading ? '处理中...' : isFollowing ? '已关注' : '关注'}
    </button>
  );
};

export default FollowButton;
```

### 3. 文档点赞功能

```typescript
// 点赞/取消点赞文档
const toggleDocumentLike = async (documentId: string, action: 'like' | 'unlike') => {
  try {
    const response = await fetch('/api/users/like-document/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
        action,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '操作失败');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('点赞操作错误:', error);
    throw error;
  }
};
```

### 4. React 组件示例 - 点赞按钮

```tsx
import React, { useState, useEffect } from 'react';
import { HeartIcon } from '@heroicons/react/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/solid';
import { toggleDocumentLike } from '../api/document';

interface LikeButtonProps {
  documentId: string;
  initialLikesCount: number;
  initialIsLiked: boolean;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  documentId,
  initialLikesCount,
  initialIsLiked,
}) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const action = isLiked ? 'unlike' : 'like';
      const data = await toggleDocumentLike(documentId, action);

      setIsLiked(data.is_liked);
      setLikesCount(data.likes_count);
    } catch (error) {
      console.error('点赞操作失败:', error);
      // 显示错误提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
    >
      {isLiked ? (
        <HeartSolidIcon className="h-5 w-5 text-red-600" />
      ) : (
        <HeartIcon className="h-5 w-5" />
      )}
      <span>{likesCount}</span>
    </button>
  );
};

export default LikeButton;
```

### 5. 评论系统

```typescript
// 获取文档评论
const getDocumentComments = async (documentId: string) => {
  try {
    const response = await fetch(`/api/users/comments/?document_id=${documentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('获取评论失败');
    }

    const comments = await response.json();
    return comments;
  } catch (error) {
    console.error('获取评论错误:', error);
    throw error;
  }
};

// 创建评论
const createComment = async (content: string, documentId: string, parentId?: string) => {
  try {
    const response = await fetch('/api/users/comments/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        object_id: documentId,
        content_type: 'document',
        parent: parentId || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.content?.[0] || '发布评论失败');
    }

    const comment = await response.json();
    return comment;
  } catch (error) {
    console.error('发布评论错误:', error);
    throw error;
  }
};
```

### 6. React 组件示例 - 评论列表

```tsx
import React, { useState, useEffect } from 'react';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';
import { getDocumentComments } from '../api/comment';

interface CommentListProps {
  documentId: string;
}

const CommentList: React.FC<CommentListProps> = ({ documentId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await getDocumentComments(documentId);
        setComments(data);
      } catch (error) {
        console.error('获取评论失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [documentId]);

  const handleNewComment = (newComment: any) => {
    setComments([newComment, ...comments]);
  };

  if (loading) {
    return <div>加载评论中...</div>;
  }

  return (
    <div className="space-y-4">
      <CommentForm documentId={documentId} onCommentCreated={handleNewComment} />

      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              documentId={documentId}
            />
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">
            还没有评论，快来发表第一条评论吧！
          </p>
        )}
      </div>
    </div>
  );
};

export default CommentList;
```

### 7. 用户搜索

```typescript
// 搜索用户
const searchUsers = async (query: string, options?: {
  isVerified?: boolean;
  orderBy?: string;
  page?: number;
  pageSize?: number;
}) => {
  try {
    const params = new URLSearchParams({
      q: query,
      ...(options?.isVerified !== undefined && { is_verified: String(options.isVerified) }),
      ...(options?.orderBy && { order_by: options.orderBy }),
      page: String(options?.page || 1),
      page_size: String(options?.pageSize || 20),
    });

    const response = await fetch(`/api/users/search/?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('搜索用户失败');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('搜索用户错误:', error);
    throw error;
  }
};
```

### 8. React 组件示例 - 用户搜索

```tsx
import React, { useState, useEffect } from 'react';
import { searchUsers } from '../api/user';
import UserCard from './UserCard';

const UserSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchUsers(query);
      setResults(data.results);
      setHasSearched(true);
    } catch (error) {
      console.error('搜索失败:', error);
      // 显示错误提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索用户名、邮箱或简介..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>
      </form>

      {hasSearched && (
        <div className="space-y-4">
          {results.length > 0 ? (
            results.map((user) => (
              <UserCard key={user.id} user={user} />
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">
              没有找到匹配的用户
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
```

## 状态管理建议

### 1. 使用 Context 管理用户状态

```typescript
// UserContext.tsx
import React, { createContext, useContext, useReducer } from 'react';

interface UserState {
  currentUser: any;
  followedUsers: Set<string>;
  likedDocuments: Set<string>;
  collectedDocuments: Set<string>;
}

type UserAction =
  | { type: 'SET_CURRENT_USER'; payload: any }
  | { type: 'FOLLOW_USER'; payload: string }
  | { type: 'UNFOLLOW_USER'; payload: string }
  | { type: 'LIKE_DOCUMENT'; payload: string }
  | { type: 'UNLIKE_DOCUMENT'; payload: string }
  | { type: 'COLLECT_DOCUMENT'; payload: string }
  | { type: 'UNCOLLECT_DOCUMENT'; payload: string };

const UserContext = createContext<{
  state: UserState;
  dispatch: React.Dispatch<UserAction>;
} | null>(null);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within UserProvider');
  }
  return context;
};

// 在你的应用根组件中使用
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  return (
    <UserContext.Provider value={{ state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
};
```

### 2. 使用 React Query 管理服务器状态

```typescript
// hooks/useUserQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followUser, unfollowUser } from '../api/user';

export const useFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ username, isFollowing }: { username: string; isFollowing: boolean }) =>
      isFollowing ? unfollowUser(username) : followUser(username),
    onSuccess: (data, variables) => {
      // 更新缓存
      queryClient.invalidateQueries(['user', variables.username]);
      queryClient.invalidateQueries(['user-stats']);
    },
  });
};

export const useUserStats = (username: string) => {
  return useQuery({
    queryKey: ['user-stats', username],
    queryFn: () => fetch(`/api/users/social-stats/${username}/`).then(res => res.json()),
    enabled: !!username,
  });
};
```

## UI 组件库建议

以下是一些可以使用的 UI 组件库：

### 1. 头像组件
```tsx
interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  username?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md', username }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <img
      src={src || `https://ui-avatars.com/api/?name=${username}&background=0D8ABC&color=fff&size=128`}
      alt={alt || username}
      className={`${sizeClasses[size]} rounded-full object-cover`}
    />
  );
};
```

### 2. 用户卡片组件
```tsx
import React from 'react';
import Avatar from './Avatar';
import FollowButton from './FollowButton';
import { UserIcon } from '@heroicons/react/outline';

interface UserCardProps {
  user: {
    id: string;
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    is_verified?: boolean;
    is_featured?: boolean;
    followers_count: number;
    public_documents_count: number;
    is_following?: boolean;
  };
  showFollowButton?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, showFollowButton = true }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Avatar src={user.avatar_url} username={user.username} size="md" />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{user.display_name}</h3>
              {user.is_verified && (
                <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
        </div>

        {showFollowButton && (
          <FollowButton
            username={user.username}
            isFollowing={user.is_following || false}
          />
        )}
      </div>

      {user.bio && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{user.bio}</p>
      )}

      <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
        <span>{user.followers_count} 粉丝</span>
        <span>{user.public_documents_count} 文档</span>
      </div>
    </div>
  );
};

export default UserCard;
```

## 错误处理最佳实践

### 1. API 错误处理

```typescript
// api/apiClient.ts
import { toast } from 'react-toastify';

export const handleApiError = (error: any) => {
  if (error.response?.data) {
    const { error: message } = error.response.data;
    toast.error(message || '操作失败');
  } else if (error.message) {
    toast.error(error.message);
  } else {
    toast.error('网络错误，请稍后重试');
  }
};

// 使用示例
const followUser = async (username: string) => {
  try {
    // ... API 调用
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};
```

### 2. 加载状态管理

```tsx
import React, { useState } from 'react';
import { PuffLoader } from 'react-spinners';

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <button
      className={`${className} flex items-center justify-center`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <PuffLoader size={20} color="#fff" className="mr-2" />}
      {children}
    </button>
  );
};

export default LoadingButton;
```

## 性能优化建议

1. **列表虚拟化**: 对于长列表（如活动流、评论列表），使用 react-window 或 react-virtualized
2. **图片懒加载**: 使用 Intersection Observer API 实现头像和封面图的懒加载
3. **防抖搜索**: 用户搜索时使用防抖减少 API 调用
4. **缓存策略**: 合理使用 React Query 的缓存和失效策略
5. **分页加载**: 大列表使用无限滚动或分页加载

## 测试建议

```typescript
// __tests__/components/FollowButton.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FollowButton from '../components/FollowButton';
import { followUser, unfollowUser } from '../api/user';

jest.mock('../api/user');
const mockFollowUser = followUser as jest.MockedFunction<typeof followUser>;
const mockUnfollowUser = unfollowUser as jest.MockedFunction<typeof unfollowUser>;

describe('FollowButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show follow button when not following', () => {
    render(<FollowButton username="testuser" isFollowing={false} />);
    expect(screen.getByText('关注')).toBeInTheDocument();
  });

  it('should show unfollow button when following', () => {
    render(<FollowButton username="testuser" isFollowing={true} />);
    expect(screen.getByText('已关注')).toBeInTheDocument();
  });

  it('should call followUser when clicking follow button', async () => {
    mockFollowUser.mockResolvedValue({
      message: '关注成功',
      is_following: true,
      followers_count: 1,
    });

    render(<FollowButton username="testuser" isFollowing={false} />);

    fireEvent.click(screen.getByText('关注'));

    await waitFor(() => {
      expect(mockFollowUser).toHaveBeenCalledWith('testuser');
    });
  });
});
```

## 部署注意事项

1. **环境变量配置**: 确保 API URL 在生产环境中正确配置
2. **CORS 设置**: 后端需要正确配置 CORS 允许前端域名
3. **认证处理**: 妥善存储和刷新 JWT token
4. **错误监控**: 集成错误监控工具（如 Sentry）
5. **性能监控**: 监控 API 响应时间和错误率

## 总结

本指南提供了集成 ScholarAgent 社交功能的完整前端实现方案。主要包含：

1. **完整的 API 集成方案**
2. **React 组件实现示例**
3. **状态管理最佳实践**
4. **UI 组件库建议**
5. **错误处理和加载状态管理**
6. **性能优化建议**
7. **测试和部署指南**

开发者可以根据项目需求和技术栈选择合适的实现方案，这些示例代码可以直接使用或根据需要进行调整。