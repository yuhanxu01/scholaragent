# 前端社交功能集成指南

本文档介绍如何在前端页面中集成已实现的社交功能组件。

## 组件概览

### 1. 点赞组件 - `LikeButton` 或 `SocialActions`
用于文档、笔记、评论的点赞功能。

```tsx
import LikeButton from '@/components/common/LikeButton';
import SocialActions from '@/components/common/SocialActions';

// 单独使用点赞按钮
<LikeButton
  documentId={document.id}
  initialLikesCount={document.likes_count}
  initialIsLiked={document.is_liked}
  type="document"
  size="md"
/>

// 使用综合社交操作组件
<SocialActions
  type="document"
  id={document.id}
  likesCount={document.likes_count}
  commentsCount={document.comments_count}
  collectionsCount={document.collections_count}
  isLiked={document.is_liked}
  isCollected={document.is_collected}
  authorId={document.user.id}
  currentUserId={currentUser.id}
  showLabels={true}
/>
```

### 2. 隐私设置组件 - `PrivacyToggle`
用于设置文档的公开/私有状态。

```tsx
import PrivacyToggle, { PrivacyBadge } from '@/components/common/PrivacyToggle';

// 完整的隐私设置开关
<PrivacyToggle
  documentId={document.id}
  currentPrivacy={document.privacy}
  onPrivacyChange={(privacy) => console.log(privacy)}
/>

// 仅显示隐私标签
<PrivacyBadge privacy={document.privacy} />
```

### 3. 关注按钮 - `FollowButton`
用于关注用户功能。

```tsx
import FollowButton, { FollowUserCard } from '@/components/users/FollowButton';

// 关注按钮
<FollowButton
  username={user.username}
  isFollowing={user.is_following}
  followersCount={user.followers_count}
  onFollowChange={(isFollowing) => console.log(isFollowing)}
  size="md"
  variant="default"
  showCount={true}
/>

// 用户卡片中的关注
<FollowUserCard
  user={user}
  currentUserId={currentUser.id}
  onFollowChange={(username, isFollowing) => console.log(username, isFollowing)}
/>
```

### 4. 用户统计组件 - `UserStats`
显示用户信息和统计数据。

```tsx
import UserStats from '@/components/users/UserStats';

<UserStats
  user={user}
  currentUserId={currentUser.id}
  showActions={true}
/>
```

### 5. 评论系统 - `CommentSection`
完整的评论功能组件。

```tsx
import CommentSection from '@/components/common/CommentSection';

<CommentSection
  targetType="document"  // 或 'note'
  targetId={document.id}
  currentUserId={currentUser.id}
/>
```

## 页面集成示例

### 1. 文档详情页

```tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentActions from '@/components/documents/DocumentActions';
import SocialActions from '@/components/common/SocialActions';
import CommentSection from '@/components/common/CommentSection';
import PrivacyToggle from '@/components/common/PrivacyToggle';
import FollowButton from '@/components/users/FollowButton';

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 文档头部 */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {document?.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>作者：{document?.user?.display_name}</span>
              <span>发布时间：{document?.created_at}</span>
              <PrivacyToggle
                documentId={document?.id}
                currentPrivacy={document?.privacy}
                onPrivacyChange={(privacy) => {
                  setDocument(prev => ({ ...prev, privacy }));
                }}
                disabled={!document?.is_owner}
              />
            </div>
          </div>

          {/* 关注作者按钮 */}
          {document?.user?.id !== currentUser?.id && (
            <FollowButton
              username={document.user.username}
              isFollowing={document.user.is_following}
              onFollowChange={(isFollowing) => {
                // 更新关注状态
              }}
            />
          )}
        </div>

        {/* 文档操作按钮 */}
        <div className="flex items-center gap-4 mt-4">
          <SocialActions
            type="document"
            id={document?.id}
            likesCount={document?.likes_count}
            commentsCount={document?.comments_count}
            collectionsCount={document?.collections_count}
            isLiked={document?.is_liked}
            isCollected={document?.is_collected}
            authorId={document?.user?.id}
            currentUserId={currentUser?.id}
            showLabels={true}
          />
        </div>
      </div>

      {/* 文档内容 */}
      <div className="prose max-w-none mb-8">
        {document?.content}
      </div>

      {/* 评论系统 */}
      <CommentSection
        targetType="document"
        targetId={document?.id}
        currentUserId={currentUser?.id}
      />
    </div>
  );
};
```

### 2. 笔记列表页

```tsx
import React from 'react';
import NoteCard from '@/components/knowledge/NoteCard';
import SocialActions from '@/components/common/SocialActions';

const NotesListPage: React.FC = () => {
  const [notes, setNotes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div className="space-y-4">
      {notes.map(note => (
        <NoteCard
          key={note.id}
          note={note}
          currentUserId={currentUser?.id}
          onEdit={(note) => {
            // 处理编辑
          }}
          onDelete={(noteId) => {
            // 处理删除
          }}
        />
      ))}
    </div>
  );
};
```

### 3. 用户个人资料页

```tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import UserStats from '@/components/users/UserStats';
import FollowButton from '@/components/users/FollowButton';
import FollowUserCard from '@/components/users/FollowButton';

const UserProfilePage: React.FC = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [recentFollowers, setRecentFollowers] = useState([]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 用户统计信息 */}
      <UserStats
        user={user}
        currentUserId={currentUser?.id}
        showActions={true}
      />

      {/* 最近粉丝 */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">最近粉丝</h2>
        <div className="space-y-2">
          {recentFollowers.map(follower => (
            <FollowUserCard
              key={follower.id}
              user={follower}
              currentUserId={currentUser?.id}
              onFollowChange={(username, isFollowing) => {
                // 更新关注状态
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

## API 服务配置

确保在 API 服务中添加相应的端点：

```typescript
// src/services/api.ts

// 点赞文档
export const likeDocument = (documentId: string, action: 'like' | 'unlike') => {
  return this.client.post('/users/like-document/', {
    document_id: documentId,
    action
  });
};

// 收藏文档
export const collectDocument = (documentId: string, collectionName?: string) => {
  return this.client.post('/users/collections/', {
    document: documentId,
    collection_name: collectionName || '默认收藏夹',
    notes: ''
  });
};

// 取消收藏
export const uncollectDocument = (documentId: string) => {
  return this.client.delete(`/users/collections/?document_id=${documentId}`);
};

// 关注用户
export const followUser = (username: string) => {
  return this.client.post(`/users/follow/${username}/`);
};

// 取消关注
export const unfollowUser = (username: string) => {
  return this.client.delete(`/users/follow/${username}/`);
};
```

## 样式定制

所有组件都支持通过 `className` prop 进行样式定制。推荐使用 Tailwind CSS 类：

```tsx
// 自定义点赞按钮样式
<LikeButton
  className="custom-like-button"
  // 其他props
/>

// CSS 文件中
.custom-like-button {
  @apply bg-gradient-to-r from-pink-500 to-red-500 text-white;
}
```

## 注意事项

1. **认证状态**：所有需要认证的功能都需要确保用户已登录，并且正确传递 `currentUserId`。

2. **错误处理**：组件内部已包含基本的错误处理，使用 `react-hot-toast` 显示提示信息。

3. **加载状态**：组件会处理加载状态，显示相应的加载指示器。

4. **响应式设计**：所有组件都支持响应式布局，但在小屏幕上可能需要额外的样式调整。

5. **权限控制**：组件会根据用户权限自动显示/隐藏相应功能（如文档作者不能收藏自己的文档）。

## 测试建议

1. 测试点赞/取消点赞功能
2. 测试关注/取消关注功能
3. 测试收藏/取消收藏功能
4. 测试评论发布和回复
5. 测试隐私设置切换
6. 测试不同用户角色的权限控制

## 扩展功能

这些组件设计为可扩展的，可以轻松添加新功能：

1. **分享功能**：在 `SocialActions` 中添加分享按钮
2. **举报功能**：在评论中添加举报按钮
3. **编辑功能**：在评论中添加编辑功能
4. **表情支持**：在评论输入框中添加表情选择器
5. **通知系统**：集成实时通知功能