# 用户社交功能 API 文档

本文档描述了 ScholarAgent 应用中的用户社交功能，包括关注系统、点赞、收藏和评论系统。

## 目录

1. [用户关注系统](#用户关注系统)
2. [文档点赞功能](#文档点赞功能)
3. [文档收藏功能](#文档收藏功能)
4. [评论系统](#评论系统)
5. [用户搜索](#用户搜索)
6. [活动流](#活动流)
7. [用户统计信息](#用户统计信息)

---

## 用户关注系统

### 关注/取消关注用户

**端点**: `POST/DELETE /api/users/follow/{username}/`

**认证**: 需要认证

**响应示例**:
```json
{
  "message": "关注成功",
  "follow": {
    "id": 1,
    "follower": {
      "id": 1,
      "username": "current_user",
      "avatar": "path/to/avatar.jpg",
      "display_name": "Current User"
    },
    "following": {
      "id": 2,
      "username": "target_user",
      "avatar": "path/to/avatar.jpg",
      "display_name": "Target User"
    },
    "created_at": "2024-01-01T00:00:00Z"
  },
  "is_following": true,
  "followers_count": 10
}
```

### 获取用户粉丝列表

**端点**: `GET /api/users/{username}/followers/`

**认证**: 需要认证

**响应示例**:
```json
[
  {
    "id": 1,
    "username": "follower1",
    "avatar": "path/to/avatar.jpg",
    "display_name": "Follower One",
    "bio": "This is follower 1",
    "is_verified": true,
    "is_featured": false,
    "followers_count": 50,
    "public_documents_count": 5,
    "is_following": false
  }
]
```

### 获取用户关注列表

**端点**: `GET /api/users/{username}/following/`

**认证**: 需要认证

**响应示例**:
```json
[
  {
    "id": 2,
    "username": "following1",
    "avatar": "path/to/avatar.jpg",
    "display_name": "Following One",
    "bio": "This is following 1",
    "is_verified": false,
    "is_featured": true,
    "followers_count": 100,
    "public_documents_count": 10,
    "is_following": true
  }
]
```

---

## 文档点赞功能

### 点赞/取消点赞文档

**端点**: `POST /api/users/like-document/`

**认证**: 需要认证

**请求体**:
```json
{
  "document_id": "uuid-string",
  "action": "like"  // 或 "unlike"
}
```

**响应示例**:
```json
{
  "message": "点赞成功",
  "is_liked": true,
  "likes_count": 15
}
```

---

## 文档收藏功能

### 创建文档收藏

**端点**: `POST /api/users/collections/`

**认证**: 需要认证

**请求体**:
```json
{
  "document": "uuid-string",
  "collection_name": "默认收藏夹",
  "notes": "这篇文档很有用"
}
```

**响应示例**:
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "username": "collector",
    "avatar_url": "https://example.com/avatar.jpg",
    "display_name": "Collector",
    "is_verified": true,
    "followers_count": 25,
    "following_count": 30,
    "public_documents_count": 8,
    "likes_count": 45
  },
  "document_title": "数学分析基础",
  "document_user": {
    "id": 2,
    "username": "author",
    "display_name": "Author"
  },
  "collection_name": "默认收藏夹",
  "notes": "这篇文档很有用",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 获取收藏列表

**端点**: `GET /api/users/collections/`

**认证**: 需要认证

**查询参数**:
- `document_id`: 检查特定文档是否被收藏

**响应示例**:
```json
[
  {
    "id": 1,
    "user": { ... },
    "document_title": "数学分析基础",
    "document_user": { ... },
    "collection_name": "默认收藏夹",
    "notes": "这篇文档很有用",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 检查文档收藏状态

**端点**: `GET /api/users/collections/by_document/?document_id={uuid}`

**认证**: 需要认证

**响应示例**:
```json
{
  "is_collected": true,
  "collection": {
    "id": 1,
    "collection_name": "默认收藏夹",
    "notes": "这篇文档很有用",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 删除文档收藏

**端点**: `DELETE /api/users/collections/{id}/`

**认证**: 需要认证

---

## 评论系统

### 创建评论

**端点**: `POST /api/users/comments/`

**认证**: 需要认证

**请求体**:
```json
{
  "content": "这篇文档写得很好！",
  "parent": null,  // 如果是回复评论，提供父评论ID
  "object_id": "uuid-string",  // 文档ID
  "content_type": "document"  // 评论类型
}
```

**响应示例**:
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "username": "commenter",
    "avatar": "path/to/avatar.jpg",
    "display_name": "Commenter"
  },
  "content": "这篇文档写得很好！",
  "parent": null,
  "is_reply": false,
  "replies_count": 0,
  "likes_count": 0,
  "is_liked": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 获取文档评论列表

**端点**: `GET /api/users/comments/?document_id={uuid}`

**认证**: 需要认证

**响应示例**:
```json
[
  {
    "id": 1,
    "user": { ... },
    "content": "这篇文档写得很好！",
    "parent": null,
    "is_reply": false,
    "replies_count": 2,
    "likes_count": 3,
    "is_liked": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### 获取评论回复

**端点**: `GET /api/users/comments/{id}/replies/`

**认证**: 需要认证

### 点赞评论

**端点**: `POST /api/users/comments/{id}/like/`

**认证**: 需要认证

**响应示例**:
```json
{
  "is_liked": true,
  "likes_count": 4
}
```

### 取消点赞评论

**端点**: `DELETE /api/users/comments/{id}/unlike/`

**认证**: 需要认证

### 删除评论

**端点**: `POST /api/users/comments/{id}/delete_comment/`

**认证**: 需要认证（仅评论作者）

---

## 用户搜索

### 搜索用户

**端点**: `GET /api/users/search/`

**认证**: 需要认证

**查询参数**:
- `q`: 搜索关键词
- `is_verified`: 是否只搜索验证用户（可选）
- `order_by`: 排序方式（可选）
  - `followers_count`: 粉丝数
  - `public_documents_count`: 文档数
  - `date_joined`: 注册时间
  - `-followers_count`: 粉丝数(降序)
  - `-public_documents_count`: 文档数(降序)
  - `-date_joined`: 注册时间(降序)
- `page`: 页码（默认1）
- `page_size`: 每页数量（默认20）

**响应示例**:
```json
{
  "results": [
    {
      "id": 1,
      "username": "searched_user",
      "avatar": "path/to/avatar.jpg",
      "display_name": "Searched User",
      "bio": "这是用户简介",
      "is_verified": true,
      "is_featured": false,
      "followers_count": 150,
      "public_documents_count": 25,
      "is_following": false
    }
  ],
  "count": 1,
  "page": 1,
  "page_size": 20
}
```

---

## 活动流

### 获取用户活动流

**端点**: `GET /api/users/activities/{username}/` 或 `GET /api/users/activities/me/`

**认证**: 需要认证

**响应示例**:
```json
[
  {
    "id": 1,
    "user": {
      "id": 1,
      "username": "user",
      "avatar": "path/to/avatar.jpg",
      "display_name": "User"
    },
    "action": "follow",
    "action_display": "关注",
    "target_user": {
      "id": 2,
      "username": "target",
      "display_name": "Target"
    },
    "content_type": null,
    "object_id": null,
    "description": "关注了 Target",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "user": { ... },
    "action": "like",
    "action_display": "点赞",
    "target_user": null,
    "content_type": "document",
    "object_id": "uuid-string",
    "description": "赞了 文档标题",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

## 用户统计信息

### 获取用户社交统计

**端点**: `GET /api/users/social-stats/{username}/` 或 `GET /api/users/social-stats/`

**认证**: 需要认证

**响应示例**:
```json
{
  "id": 1,
  "username": "user",
  "avatar": "path/to/avatar.jpg",
  "avatar_url": "https://example.com/avatar.jpg",
  "display_name": "User",
  "is_verified": true,
  "is_featured": false,
  "followers_count": 100,
  "following_count": 50,
  "public_documents_count": 25,
  "likes_count": 150,
  "date_joined": "2023-01-01T00:00:00Z",
  "recent_followers": [
    {
      "id": 2,
      "username": "follower1",
      "avatar": "path/to/avatar.jpg",
      "display_name": "Follower One",
      "is_following": false
    }
  ],
  "recent_activities": [
    {
      "id": 1,
      "user": { ... },
      "action": "like",
      "action_display": "点赞",
      "description": "赞了 文档标题",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 用户资料

### 获取用户资料

**端点**: `GET /api/users/profile/{username}/`

**认证**: 需要认证

**响应示例**:
```json
{
  "id": 1,
  "username": "user",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "avatar": "path/to/avatar.jpg",
  "avatar_url": "https://example.com/avatar.jpg",
  "display_name": "John Doe",
  "profile_url": "/users/user/",
  "bio": "这是用户简介",
  "location": "北京",
  "website": "https://example.com",
  "github_username": "john",
  "is_verified": true,
  "is_featured": false,
  "followers_count": 100,
  "following_count": 50,
  "public_documents_count": 25,
  "likes_count": 150,
  "date_joined": "2023-01-01T00:00:00Z",
  "last_login": "2024-01-01T00:00:00Z",
  "is_following": false,
  "is_collected": false
}
```

---

## 数据模型

### User (CustomUser) 模型

主要字段：
- `followers_count`: 粉丝数
- `following_count`: 关注数
- `public_documents_count`: 公开文档数
- `likes_count`: 获得点赞数
- `is_verified`: 是否验证用户
- `is_featured`: 是否推荐用户

### Follow 模型

字段：
- `follower`: 关注者
- `following`: 被关注者
- `created_at`: 关注时间

### Like 模型

字段：
- `user`: 点赞用户
- `content_type`: 点赞内容类型
- `object_id`: 点赞对象ID
- `created_at`: 点赞时间

### DocumentCollection 模型

字段：
- `user`: 收藏用户
- `document`: 收藏的文档
- `collection_name`: 收藏夹名称
- `notes`: 收藏备注
- `created_at`: 收藏时间

### Comment 模型

字段：
- `user`: 评论用户
- `content_type`: 评论内容类型
- `object_id`: 评论对象ID
- `parent`: 父评论（用于回复）
- `content`: 评论内容
- `is_deleted`: 是否已删除
- `likes_count`: 点赞数
- `replies_count`: 回复数
- `created_at`: 创建时间
- `updated_at`: 更新时间

### Activity 模型

字段：
- `user`: 操作用户
- `action`: 操作类型
- `content_type`: 相关内容类型
- `object_id`: 相关对象ID
- `target_user`: 目标用户
- `description`: 操作描述
- `is_private`: 是否为私密活动
- `created_at`: 创建时间

---

## 权限控制

1. **关注系统**: 任何认证用户都可以关注其他用户（除了自己）
2. **文档点赞**: 只能点赞公开的、已处理的文档
3. **文档收藏**: 只能收藏公开的、已处理的文档，不能收藏自己的文档
4. **评论系统**: 可以评论公开的、已处理的文档
5. **用户资料**:
   - 验证用户或推荐用户的资料所有人可见
   - 有公开文档的用户的资料所有人可见
   - 其他用户的资料需要登录才能查看
6. **活动流**: 只能查看公开活动，私密活动只有自己可见

---

## 错误处理

常见错误响应：
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 需要认证
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在

错误响应格式：
```json
{
  "error": "错误信息"
}
```

或表单验证错误：
```json
{
  "field_name": ["错误信息1", "错误信息2"]
}
```