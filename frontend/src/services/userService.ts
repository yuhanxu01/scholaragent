import { api, type PaginatedResponse } from '../utils/api';

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  avatar_url: string;
  display_name: string;
  profile_url: string;
  bio?: string;
  location?: string;
  website?: string;
  github_username?: string;
  is_verified: boolean;
  is_featured: boolean;
  followers_count: number;
  following_count: number;
  public_documents_count: number;
  likes_count: number;
  date_joined: string;
  last_login?: string;
  is_following: boolean;
}

export interface Follow {
  id: string;
  follower: User;
  following: User;
  created_at: string;
}

export interface DocumentCollection {
  id: string;
  user: User;
  document: any; // Document type
  document_title: string;
  document_user: User;
  collection_name: string;
  notes?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user: User;
  content: string;
  parent?: string;
  is_reply: boolean;
  replies_count: number;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  user: User;
  content_type: string;
  object_id: number;
  created_at: string;
}

export interface Activity {
  id: string;
  user: User;
  action: string;
  action_display: string;
  target_user?: User;
  content_type?: string;
  object_id?: number;
  description: string;
  created_at: string;
}

export interface UserStats {
  id: string;
  username: string;
  avatar: string;
  avatar_url: string;
  display_name: string;
  is_verified: boolean;
  is_featured: boolean;
  followers_count: number;
  following_count: number;
  public_documents_count: number;
  likes_count: number;
  date_joined: string;
  recent_followers: User[];
  recent_activities: Activity[];
}

// 用户API服务
export const userService = {
  // 获取用户资料
  getProfile: (username: string) =>
    api.get<User>(`/users/profile/${username}/`),

  // 获取当前用户资料
  getMe: () =>
    api.get<User>('/users/me/'),

  // 更新当前用户资料
  updateMe: (data: Partial<User>) =>
    api.patch<User>('/users/me/', data),

  // 关注用户
  follow: (username: string) =>
    api.post<{message: string, is_following: boolean, followers_count: number}>(
      `/users/follow/${username}/`
    ),

  // 取消关注
  unfollow: (username: string) =>
    api.delete<{message: string, is_following: boolean, followers_count: number}>(
      `/users/follow/${username}/`
    ),

  // 获取用户粉丝列表
  getFollowers: (username: string, params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<User>>(`/users/${username}/followers/`, params),

  // 获取用户关注列表
  getFollowing: (username: string, params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<User>>(`/users/${username}/following/`, params),

  // 搜索用户
  search: (params: {
    q: string;
    page?: number;
    page_size?: number;
    is_verified?: boolean;
    order_by?: string;
  }) =>
    api.get<{results: User[], count: number, page: number, page_size: number}>(
      '/users/search/',
      params
    ),

  // 获取用户社交统计
  getSocialStats: (username?: string) => {
    const url = username ? `/users/social-stats/${username}/` : '/users/social-stats/';
    return api.get<UserStats>(url);
  },

  // 获取文档收藏列表
  getCollections: (params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<DocumentCollection>>('/users/collections/', params),

  // 收藏文档
  collectDocument: (data: {
    document: string;
    collection_name?: string;
    notes?: string;
  }) =>
    api.post<DocumentCollection>('/users/collections/', data),

  // 取消收藏文档
  uncollectDocument: (id: string) =>
    api.delete(`/users/collections/${id}/`),

  // 检查文档是否被收藏
  checkDocumentCollection: (documentId: string) =>
    api.get<{is_collected: boolean, collection?: DocumentCollection}>(
      `/users/collections/by_document/?document_id=${documentId}`
    ),

  // 获取评论列表
  getComments: (params?: {
    document_id?: string;
    page?: number;
    page_size?: number;
  }) =>
    api.get<PaginatedResponse<Comment>>('/users/comments/', params),

  // 创建评论
  createComment: (data: {
    content: string;
    parent?: string;
    object_id: number;
    content_type: string;
  }) =>
    api.post<Comment>('/users/comments/', data),

  // 点赞评论
  likeComment: (commentId: string) =>
    api.post<{is_liked: boolean, likes_count: number}>(`/users/comments/${commentId}/like/`),

  // 取消点赞评论
  unlikeComment: (commentId: string) =>
    api.delete<{is_liked: boolean, likes_count: number}>(`/users/comments/${commentId}/unlike/`),

  // 删除评论
  deleteComment: (commentId: string) =>
    api.post<{message: string}>(`/users/comments/${commentId}/delete_comment/`),

  // 获取评论回复
  getCommentReplies: (commentId: string) =>
    api.get<Comment[]>(`/users/comments/${commentId}/replies/`),

  // 点赞文档
  likeDocument: (documentId: string, action: 'like' | 'unlike') =>
    api.post<{
      message: string;
      is_liked: boolean;
      likes_count: number;
    }>('/users/like-document/', {
      document_id: documentId,
      action
    }),

  // 获取活动流
  getActivities: (username?: string, params?: { page?: number; page_size?: number }) => {
    const url = username ? `/users/activities/${username}/` : '/users/activities/me/';
    return api.get<PaginatedResponse<Activity>>(url, params);
  }
};