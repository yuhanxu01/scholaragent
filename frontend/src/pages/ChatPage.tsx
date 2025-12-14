import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Users, Plus, Send, Search, UserPlus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface ChatConversation {
  id: string;
  type: 'private' | 'group' | 'channel';
  name?: string;
  description?: string;
  participants: any[];
  other_participant?: any;
  group_channel?: any;
  last_message?: any;
  message_count: number;
  unread_count: number;
  created_at: string;
}

interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  privacy: 'public' | 'private';
  subject?: string;
  member_count: number;
  channel_count: number;
  is_member: boolean;
  member_role?: string;
  can_manage: boolean;
  created_at: string;
}

interface GroupChannel {
  id: string;
  name: string;
  description?: string;
  channel_type: 'text' | 'voice';
  is_private: boolean;
  message_count: number;
  last_message_at?: string;
  can_access: boolean;
  last_message_preview?: any;
}

interface ChatMessage {
  id: string;
  conversation: string;
  sender: any;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'system';
  content: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to?: string;
  reply_to_message?: any;
  is_edited: boolean;
  is_deleted: boolean;
  is_read: boolean;
  created_at: string;
}

const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<any[]>([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupSubject, setGroupSubject] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState<'public' | 'private'>('private');

  // 获取聊天会话列表
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const response = await api.get('/auth/chat/conversations/');
      return response.data || [];
    },
  });

  // 获取学习小组列表
  const { data: studyGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['study-groups'],
    queryFn: async () => {
      const response = await api.get('/auth/groups/');
      return response.data || [];
    },
  });

  // 获取小组频道
  const { data: groupChannels, isLoading: channelsLoading } = useQuery({
    queryKey: ['group-channels', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const response = await api.get(`/auth/groups/${selectedGroup.id}/channels/`);
      return response.data;
    },
    enabled: !!selectedGroup,
  });

  // 获取聊天消息
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];

      if (selectedConversation.type === 'channel') {
        // 频道消息需要从频道conversation获取
        const channelId = selectedConversation.id.replace('channel-', '');
        // 这里需要实现频道消息API，暂时返回空数组
        return [];
      } else {
        // 普通聊天会话消息
        const conversationId = selectedConversation.id;
        const response = await api.get(`/auth/chat/conversations/${conversationId}/messages/`);
        return response.data;
      }
    },
    enabled: !!selectedConversation,
  });

  // 发送消息
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversation: string; content: string; message_type: string }) => {
      const response = await api.post('/auth/chat/messages/', data);
      return response.data;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  // 发送好友请求
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (userIdentifier: string) => {
      const response = await api.post('/auth/friends/request/', { user_identifier: userIdentifier });
      return response.data;
    },
    onSuccess: () => {
      setFriendSearchTerm('');
      setFriendSearchResults([]);
      setShowAddFriendModal(false);
      // 可以添加成功提示
    },
  });

  // 创建学习小组
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; description: string; subject: string; privacy: string }) => {
      const response = await api.post('/auth/groups/create/', groupData);
      return response.data;
    },
    onSuccess: () => {
      setGroupName('');
      setGroupDescription('');
      setGroupSubject('');
      setGroupPrivacy('private');
      setShowCreateGroupModal(false);
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      // 可以添加成功提示
    },
  });

  // 加入学习小组
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await api.post(`/auth/groups/${groupId}/join/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      // 可以添加成功提示
    },
  });

  // 搜索用户
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setFriendSearchResults([]);
      return;
    }

    try {
      const response = await api.rawClient.get(`/auth/search/?q=${encodeURIComponent(query)}&page_size=10`);
      setFriendSearchResults(response.data.results || []);
    } catch (error: any) {
      console.error('搜索用户失败:', error);
      setFriendSearchResults([]);
    }
  };

  // 处理好友搜索输入变化
  React.useEffect(() => {
    const trimmedTerm = friendSearchTerm.trim();
    if (trimmedTerm && !trimmedTerm.includes('没有找到用户')) {
      const timeoutId = setTimeout(() => {
        searchUsers(trimmedTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setFriendSearchResults([]);
    }
  }, [friendSearchTerm]);

  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;

    sendMessageMutation.mutate({
      conversation: selectedConversation.id,
      content: newMessage.trim(),
      message_type: 'text',
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) return;

    createGroupMutation.mutate({
      name: groupName.trim(),
      description: groupDescription.trim(),
      subject: groupSubject.trim(),
      privacy: groupPrivacy,
    });
  };

  const handleJoinGroup = (group: StudyGroup) => {
    joinGroupMutation.mutate(group.id);
  };

  const handleSelectGroup = (group: StudyGroup) => {
    setSelectedGroup(group);
    setSelectedConversation(null); // 清除选中的对话
  };

  const handleSelectChannel = (channel: GroupChannel) => {
    // 这里需要根据频道找到对应的conversation
    // 暂时先设置一个空的conversation，后面再完善
    setSelectedConversation({
      id: `channel-${channel.id}`,
      type: 'channel',
      name: `${selectedGroup?.name}#${channel.name}`,
      participants: [],
      message_count: channel.message_count,
      unread_count: 0,
      created_at: new Date().toISOString(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations?.filter((conv: ChatConversation) => {
    if (!searchTerm) return true;
    const otherParticipant = conv.other_participant;
    const name = conv.type === 'private' && otherParticipant
      ? otherParticipant.display_name || otherParticipant.username
      : conv.name || '未命名群聊';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* 聊天会话列表 */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              聊天
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddFriendModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="添加好友"
              >
                <UserPlus className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="创建学习小组"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索聊天..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 学习小组列表 */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2 px-4">学习小组</h3>
          {groupsLoading ? (
            <div className="flex items-center justify-center h-16">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          ) : studyGroups?.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-500 text-sm">
              暂无学习小组
            </div>
          ) : (
            <div className="space-y-1">
              {studyGroups?.map((group: StudyGroup) => (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={`p-3 mx-2 cursor-pointer rounded-lg border transition-colors ${
                    selectedGroup?.id === group.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-xs">
                          {group.name[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {group.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {group.member_count} 成员
                        </p>
                      </div>
                    </div>
                    {!group.is_member && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(group);
                        }}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        加入
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 小组频道列表 */}
        {selectedGroup && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2 px-4">
              #{selectedGroup.name} 频道
            </h3>
            {channelsLoading ? (
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : groupChannels?.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-500 text-sm">
                暂无频道
              </div>
            ) : (
              <div className="space-y-1">
                {groupChannels?.map((channel: GroupChannel) => (
                  <div
                    key={channel.id}
                    onClick={() => handleSelectChannel(channel)}
                    className={`p-3 mx-2 cursor-pointer rounded-lg border transition-colors ${
                      selectedConversation?.id === `channel-${channel.id}`
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">#</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {channel.name}
                        </p>
                        {channel.last_message_preview && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                            {channel.last_message_preview.sender}: {channel.last_message_preview.content}
                          </p>
                        )}
                      </div>
                      {channel.message_count > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {channel.message_count}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 私聊会话列表 */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2 px-4">私聊</h3>
          {conversationsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-500">
              <MessageCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">暂无私聊</p>
            </div>
          ) : (
            filteredConversations.map((conversation: ChatConversation) => {
              const isSelected = selectedConversation?.id === conversation.id;
              const displayName = conversation.type === 'private' && conversation.other_participant
                ? conversation.other_participant.display_name || conversation.other_participant.username
                : conversation.name || '未命名群聊';

              return (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {conversation.type === 'private' ? (
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {conversation.other_participant?.display_name?.[0] || conversation.other_participant?.username?.[0] || '?'}
                              </span>
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {displayName}
                          </p>
                          {conversation.last_message && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">
                              {conversation.last_message.sender.display_name}: {conversation.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                          {conversation.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* 聊天头部 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                {selectedConversation.type === 'channel' ? (
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">#</span>
                  </div>
                ) : selectedConversation.type === 'private' ? (
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {selectedConversation.other_participant?.display_name?.[0] || selectedConversation.other_participant?.username?.[0] || '?'}
                    </span>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {selectedConversation.type === 'channel'
                      ? selectedConversation.name
                      : selectedConversation.type === 'private' && selectedConversation.other_participant
                      ? selectedConversation.other_participant.display_name || selectedConversation.other_participant.username
                      : selectedConversation.name || '未命名群聊'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {selectedConversation.type === 'channel'
                      ? `${selectedGroup?.name} 频道`
                      : `${selectedConversation.participants.length} 位成员`}
                  </p>
                </div>
              </div>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-500">
                  <MessageCircle className="h-8 w-8 mb-2" />
                  <p className="text-sm">暂无消息</p>
                </div>
              ) : (
                messages?.map((message: ChatMessage) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-600">
                          {message.sender.display_name?.[0] || message.sender.username?.[0] || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {message.sender.display_name || message.sender.username}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1">
                        {message.is_deleted ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                            [该消息已删除]
                          </p>
                        ) : (
                          <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 inline-block">
                            {message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 消息输入框 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedConversation.type === 'channel' ? `在 #${selectedConversation.name?.split('#')[1]} 中发送消息...` : "输入消息..."}
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                选择一个聊天开始对话
              </h3>
              <p className="text-sm">
                从左侧列表中选择一个聊天会话，或创建一个新的聊天。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 添加好友模态框 */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  添加好友
                </h3>
                <button
                  onClick={() => setShowAddFriendModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                    搜索用户（ID、用户名或邮箱）
                  </label>
                  <input
                    type="text"
                    value={friendSearchTerm}
                    onChange={(e) => setFriendSearchTerm(e.target.value)}
                    placeholder="输入用户ID、用户名或邮箱..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 搜索结果 */}
                {friendSearchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {friendSearchResults.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.display_name?.[0] || user.username?.[0] || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.display_name || user.username}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendFriendRequestMutation.mutate(user.username)}
                          disabled={sendFriendRequestMutation.isPending}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendFriendRequestMutation.isPending ? '发送中...' : '添加'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 直接输入ID/邮箱添加 */}
                {friendSearchTerm && friendSearchResults.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                      没有找到用户 "{friendSearchTerm}"
                    </p>
                    <button
                      onClick={() => sendFriendRequestMutation.mutate(friendSearchTerm)}
                      disabled={sendFriendRequestMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendFriendRequestMutation.isPending ? '发送中...' : '直接发送好友请求'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建学习小组模态框 */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  创建学习小组
                </h3>
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                    小组名称 *
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="输入小组名称..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                    学习主题
                  </label>
                  <input
                    type="text"
                    value={groupSubject}
                    onChange={(e) => setGroupSubject(e.target.value)}
                    placeholder="如：数学、编程、论文写作..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                    小组描述
                  </label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="描述小组的目的和内容..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                    隐私设置
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="private"
                        checked={groupPrivacy === 'private'}
                        onChange={(e) => setGroupPrivacy(e.target.value as 'public' | 'private')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-600">
                        私有小组（需要邀请才能加入）
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="public"
                        checked={groupPrivacy === 'public'}
                        onChange={(e) => setGroupPrivacy(e.target.value as 'public' | 'private')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-600">
                        公开小组（任何人可以申请加入）
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateGroupModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || createGroupMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createGroupMutation.isPending ? '创建中...' : '创建小组'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
