"""
简单的 AI 聊天 API 服务
用于连接 DeepSeek API 并提供学术助手功能
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import httpx
import json

app = FastAPI(title="ScholarMind AI API", version="1.0.0")

# CORS 设置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5176", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 数据模型
class Message(BaseModel):
    role: str
    content: str

class Context(BaseModel):
    currentPage: Optional[str] = None
    pageTitle: Optional[str] = None
    pageType: Optional[str] = None
    availableActions: Optional[List[str]] = None
    userInfo: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    message: str
    context: Optional[Context] = None
    conversationHistory: Optional[List[Message]] = None

class SuggestedAction(BaseModel):
    type: str
    label: str
    action: str

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[Dict[str, Any]]] = None
    suggestedActions: Optional[List[SuggestedAction]] = None

def build_system_prompt(context: Optional[Context]) -> str:
    """构建系统提示词"""
    prompt = """你是一个专业的学术 AI 助手，名字叫 ScholarMind。你的主要职责是：

1. 帮助用户处理学术文档和资料
2. 协助创建和管理学习笔记
3. 提供学术建议和学习指导
4. 回答学术相关的问题

当前上下文信息："""

    if context:
        prompt += f"""
- 当前页面：{context.pageTitle or '未知页面'}
- 页面类型：{context.pageType or '通用'}
- 用户信息：{context.userInfo.get('name', '未知用户') if context.userInfo else '未知用户'}
- 可用操作：{', '.join(context.availableActions) if context.availableActions else '无特定操作'}"""

        if context.pageType == 'dashboard':
            prompt += """

用户目前在仪表板页面，可以：
- 上传和管理文档
- 创建学习笔记
- 使用 AI 助手功能
- 查看学习统计信息"""
        elif context.pageType == 'documents':
            prompt += """

用户目前在文档页面，可以：
- 上传新文档
- 搜索和查看现有文档
- 阅读和标注文档"""
        elif context.pageType == 'knowledge':
            prompt += """

用户目前在知识库页面，可以：
- 创建和管理笔记
- 管理学习概念
- 使用学习卡片
- 搜索知识内容"""

    prompt += """

请根据用户的当前页面和问题，提供有针对性的学术帮助。回答要简洁明了，避免过于冗长。如果用户问的是非学术问题，礼貌地引导回到学术话题。"""

    return prompt

def generate_suggested_actions(message: str, context: Optional[Context]) -> List[SuggestedAction]:
    """生成建议操作"""
    actions = []
    lower_message = message.lower()

    if context and context.pageType == 'dashboard':
        if any(keyword in lower_message for keyword in ['upload', '文档', '上传']):
            actions.append(SuggestedAction(
                type='navigate',
                label='前往文档页面',
                action='/documents'
            ))
        if any(keyword in lower_message for keyword in ['note', '笔记', '创建']):
            actions.append(SuggestedAction(
                type='navigate',
                label='打开知识库',
                action='/knowledge'
            ))

    return actions

@app.post("/api/ai/chat")
async def chat(request: ChatRequest):
    """处理聊天请求"""
    try:
        if not DEEPSEEK_API_KEY:
            # 如果没有配置 API 密钥，返回模拟响应
            return ChatResponse(
                response="AI 服务暂未配置。请联系管理员设置 DeepSeek API 密钥。现在可以使用的功能包括：上传文档、创建笔记、管理知识等。",
                suggestedActions=generate_suggested_actions(request.message, request.context)
            )

        # 构建消息
        messages = [{"role": "system", "content": build_system_prompt(request.context)}]

        if request.conversationHistory:
            messages.extend([{"role": msg.role, "content": msg.content} for msg in request.conversationHistory])

        messages.append({"role": "user", "content": request.message})

        # 调用 DeepSeek API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2000,
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"DeepSeek API error: {response.status_code} {response.text}"
                )

            data = response.json()
            ai_response = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            if not ai_response:
                raise HTTPException(status_code=500, detail="No response from DeepSeek API")

            return ChatResponse(
                response=ai_response,
                suggestedActions=generate_suggested_actions(request.message, request.context)
            )

    except httpx.TimeoutException:
        raise HTTPException(status_code=500, detail="AI service timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/")
async def root():
    """健康检查"""
    return {"status": "healthy", "service": "ScholarMind AI API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)