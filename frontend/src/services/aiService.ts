import api from './api';

// 简单的 AI 服务，直接在前端调用 DeepSeek API（用于演示）
// 生产环境应该通过后端调用以保护 API 密钥

export interface ChatRequest {
  message: string;
  context?: {
    currentPage: string;
    pageTitle: string;
    pageType: string;
    availableActions: string[];
    userInfo: {
      name: string;
      email?: string;
    };
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface ChatResponse {
  response: string;
  sources?: Array<{
    type: 'document' | 'note' | 'web';
    title: string;
    url?: string;
    excerpt: string;
  }>;
  suggestedActions?: Array<{
    type: string;
    label: string;
    action: string;
  }>;
}

class AIService {
  private baseUrl = '/ai';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      // 优先尝试后端 API
      const response = await api.post(`${this.baseUrl}/chat/`, request);
      return response.data;
    } catch (error: any) {
      console.log('Backend API not available, trying direct DeepSeek call...');

      // 如果后端不可用，尝试直接调用 DeepSeek API（仅用于演示）
      try {
        return await this.callDeepSeekDirectly(request);
      } catch (deepseekError: any) {
        console.error('DeepSeek API Error:', deepseekError);

        // 如果 DeepSeek 也不可用，返回模拟响应
        return this.getMockResponse(request);
      }
    }
  }

  private async callDeepSeekDirectly(request: ChatRequest): Promise<ChatResponse> {
    // DeepSeek API 配置（生产环境应该在后端配置）
    const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API key not configured');
    }

    // 构建系统提示词
    const systemPrompt = this.buildSystemPrompt(request.context);

    // 调用 DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...request.conversationHistory || [],
          { role: 'user', content: request.message }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '抱歉，我无法处理你的请求。';

    return {
      response: aiResponse,
      suggestedActions: this.generateSuggestedActions(request.message, request.context)
    };
  }

  private buildSystemPrompt(context?: any): string {
    let prompt = `你是一个专业的学术 AI 助手，名字叫 ScholarMind。你的主要职责是：

1. 帮助用户处理学术文档和资料
2. 协助创建和管理学习笔记
3. 提供学术建议和学习指导
4. 回答学术相关的问题

当前上下文信息：`;

    if (context) {
      prompt += `
- 当前页面：${context.pageTitle || '未知页面'}
- 页面类型：${context.pageType || '通用'}
- 用户信息：${context.userInfo?.name || '未知用户'}
- 可用操作：${context.availableActions?.join(', ') || '无特定操作'}`;

      if (context.pageType === 'dashboard') {
        prompt += `

用户目前在仪表板页面，可以：
- 上传和管理文档
- 创建学习笔记
- 使用 AI 助手功能
- 查看学习统计信息`;
      } else if (context.pageType === 'documents') {
        prompt += `

用户目前在文档页面，可以：
- 上传新文档
- 搜索和查看现有文档
- 阅读和标注文档`;
      } else if (context.pageType === 'knowledge') {
        prompt += `

用户目前在知识库页面，可以：
- 创建和管理笔记
- 管理学习概念
- 使用学习卡片
- 搜索知识内容`;
      }
    }

    prompt += `

请根据用户的当前页面和问题，提供有针对性的学术帮助。回答要简洁明了，避免过于冗长。如果用户问的是非学术问题，礼貌地引导回到学术话题。`;

    return prompt;
  }

  private generateSuggestedActions(message: string, context?: any): Array<{
    type: string;
    label: string;
    action: string;
  }> {
    const actions = [];
    const lowerMessage = message.toLowerCase();

    if (context?.pageType === 'dashboard') {
      if (lowerMessage.includes('upload') || lowerMessage.includes('文档')) {
        actions.push({
          type: 'navigate',
          label: '前往文档页面',
          action: '/documents'
        });
      }
      if (lowerMessage.includes('note') || lowerMessage.includes('笔记')) {
        actions.push({
          type: 'navigate',
          label: '打开知识库',
          action: '/knowledge'
        });
      }
    }

    return actions;
  }

  private getMockResponse(request: ChatRequest): ChatResponse {
    const { message, context } = request;
    const lowerMessage = message.toLowerCase();

    // 基于页面类型和消息内容的智能响应
    if (context?.pageType === 'dashboard') {
      if (lowerMessage.includes('upload') || lowerMessage.includes('文档')) {
        return {
          response: '我可以帮你上传文档！请点击"上传文档"按钮，或者告诉我你想要上传什么类型的文档？支持的格式包括 PDF、Word、PowerPoint 等。',
          suggestedActions: [
            {
              type: 'navigate',
              label: '前往文档页面',
              action: '/documents'
            }
          ]
        };
      }

      if (lowerMessage.includes('note') || lowerMessage.includes('笔记') || lowerMessage.includes('create')) {
        return {
          response: '我可以帮你创建笔记！点击"创建笔记"按钮，或者直接告诉我你想要记录什么内容？我可以帮你整理格式、添加标签等。',
          suggestedActions: [
            {
              type: 'navigate',
              label: '打开知识库',
              action: '/knowledge?tab=notes'
            }
          ]
        };
      }
    }

    if (context?.pageType === 'documents') {
      if (lowerMessage.includes('search') || lowerMessage.includes('查找') || lowerMessage.includes('搜索')) {
        return {
          response: '我可以帮你搜索文档！请告诉我你想要搜索的关键词或者文档类型。',
        };
      }

      if (lowerMessage.includes('help') || lowerMessage.includes('如何')) {
        return {
          response: '在文档页面，你可以：\n• 📄 上传新文档\n• 🔍 搜索现有文档\n• 📖 阅读文档\n• 🗑️ 删除不需要的文档\n\n有什么具体需要帮助的吗？',
        };
      }
    }

    if (context?.pageType === 'knowledge') {
      if (lowerMessage.includes('concept') || lowerMessage.includes('概念')) {
        return {
          response: '我可以帮你管理知识概念！你可以创建新的概念、建立概念之间的关联，或者查看概念图谱。',
          suggestedActions: [
            {
              type: 'action',
              label: '创建新概念',
              action: 'create_concept'
            }
          ]
        };
      }

      if (lowerMessage.includes('flashcard') || lowerMessage.includes('卡片')) {
        return {
          response: '学习卡片是很好的记忆工具！我可以帮你创建学习卡片，或者开始一个学习会话来复习现有卡片。',
          suggestedActions: [
            {
              type: 'action',
              label: '开始学习',
              action: 'start_study_session'
            }
          ]
        };
      }
    }

    // 默认响应
    const responses = [
      '我理解你的问题。基于当前页面，我建议你可以尝试相关的功能。有什么具体需要帮助的吗？',
      '作为你的学术助手，我可以帮你处理文档、管理知识、创建笔记等。请告诉我你想要做什么？',
      '我注意到你在当前页面可能需要一些帮助。我可以提供页面相关的指导，或者回答你的问题。',
      '有什么学术相关的问题我可以帮助你解决吗？无论是文档处理、知识管理还是学习建议。'
    ];

    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      suggestedActions: [
        {
          type: 'general',
          label: '了解更多功能',
          action: 'show_help'
        }
      ]
    };
  }

  // 获取文档摘要
  async getDocumentSummary(documentId: string): Promise<{ summary: string; keyPoints: string[] }> {
    try {
      const response = await api.get(`${this.baseUrl}/documents/${documentId}/summary`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get document summary');
    }
  }

  // 生成学习建议
  async getStudyRecommendations(userId: string): Promise<{
    recommendations: string[];
    suggestedTopics: string[];
    studyPlan: string;
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/study/recommendations/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get study recommendations');
    }
  }

  // 分析学习进度
  async analyzeProgress(userId: string): Promise<{
    overallProgress: number;
    strengths: string[];
    improvementAreas: string[];
    nextSteps: string[];
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/progress/analyze/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to analyze progress');
    }
  }
}

export const aiService = new AIService();