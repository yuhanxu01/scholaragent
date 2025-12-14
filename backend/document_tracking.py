import json
import time
from datetime import datetime
from typing import Dict, List, Optional, AsyncGenerator
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
import logging

logger = logging.getLogger(__name__)


class ProcessingStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class ProcessingStep:
    id: str
    name: str
    status: ProcessingStatus
    progress: float = 0.0
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    details: Optional[str] = None
    substeps: List['ProcessingStep'] = None
    metadata: Dict = None

    def __post_init__(self):
        if self.substeps is None:
            self.substeps = []
        if self.metadata is None:
            self.metadata = {}

    @property
    def duration(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    def to_dict(self) -> Dict:
        data = asdict(self)
        data['status'] = self.status.value
        data['duration'] = self.duration
        return data


class DocumentProcessingTracker:
    """文档处理进度跟踪器"""

    def __init__(self, document_id: str):
        self.document_id = document_id
        self.steps = self._initialize_steps()
        self.current_step_index = 0
        self.start_time = time.time()
        self._listeners: List[AsyncWebsocketConsumer] = []

    def _initialize_steps(self) -> List[ProcessingStep]:
        """初始化处理步骤"""
        return [
            ProcessingStep(
                id="upload",
                name="文件上传",
                status=ProcessingStatus.PENDING,
                substeps=[
                    ProcessingStep(id="validate", name="验证文件格式"),
                    ProcessingStep(id="transfer", name="传输文件"),
                    ProcessingStep(id="store", name="存储文件")
                ],
                metadata={"icon": "upload"}
            ),
            ProcessingStep(
                id="parse",
                name="解析文档结构",
                status=ProcessingStatus.PENDING,
                substeps=[
                    ProcessingStep(id="read", name="读取文件内容"),
                    ProcessingStep(id="extract", name="提取结构化元素"),
                    ProcessingStep(id="chunking", name="智能分块处理"),
                    ProcessingStep(id="extract_formulas", name="提取数学公式"),
                    ProcessingStep(id="extract_media", name="提取媒体文件")
                ],
                metadata={"icon": "file-code"}
            ),
            ProcessingStep(
                id="analyze",
                name="AI智能分析",
                status=ProcessingStatus.PENDING,
                substeps=[
                    ProcessingStep(id="summary", name="生成文档摘要"),
                    ProcessingStep(id="concepts", name="提取核心概念"),
                    ProcessingStep(id="keywords", name="识别关键词"),
                    ProcessingStep(id="difficulty", name="评估难度等级"),
                    ProcessingStep(id="reading_time", name="估算阅读时间")
                ],
                metadata={"icon": "brain"}
            ),
            ProcessingStep(
                id="index",
                name="建立索引",
                status=ProcessingStatus.PENDING,
                substeps=[
                    ProcessingStep(id="sections", name="索引章节结构"),
                    ProcessingStep(id="formulas", name="索引数学公式"),
                    ProcessingStep(id="vectors", name="生成向量索引"),
                    ProcessingStep(id="semantic", name="语义索引")
                ],
                metadata={"icon": "database"}
            ),
            ProcessingStep(
                id="complete",
                name="处理完成",
                status=ProcessingStatus.PENDING,
                metadata={"icon": "check-circle"}
            )
        ]

    def get_step_by_id(self, step_id: str) -> Optional[ProcessingStep]:
        """根据ID获取步骤"""
        for step in self.steps:
            if step.id == step_id:
                return step
            # 检查子步骤
            for substep in step.substeps:
                if substep.id == step_id:
                    return substep
        return None

    async def update_step(
        self,
        step_id: str,
        status: ProcessingStatus,
        progress: float = None,
        details: str = None
    ):
        """更新步骤状态"""
        step = self.get_step_by_id(step_id)
        if not step:
            return

        # 更新状态
        step.status = status

        if status == ProcessingStatus.RUNNING and not step.start_time:
            step.start_time = time.time()
        elif status in [ProcessingStatus.COMPLETED, ProcessingStatus.ERROR] and not step.end_time:
            step.end_time = time.time()

        if progress is not None:
            step.progress = min(100.0, max(0.0, progress))

        if details:
            step.details = details

        # 如果是主步骤开始，更新当前步骤索引
        if step_id in [s.id for s in self.steps] and status == ProcessingStatus.RUNNING:
            self.current_step_index = [s.id for s in self.steps].index(step_id)

        # 通知监听器
        await self._notify_listeners()

    async def update_progress(self, step_id: str, progress: float):
        """更新步骤进度"""
        step = self.get_step_by_id(step_id)
        if step:
            step.progress = min(100.0, max(0.0, progress))
            await self._notify_listeners()

    async def add_listener(self, consumer: AsyncWebsocketConsumer):
        """添加监听器"""
        if consumer not in self._listeners:
            self._listeners.append(consumer)

    async def remove_listener(self, consumer: AsyncWebsocketConsumer):
        """移除监听器"""
        if consumer in self._listeners:
            self._listeners.remove(consumer)

    async def _notify_listeners(self):
        """通知所有监听器"""
        message = {
            "type": "progress_update",
            "document_id": self.document_id,
            "overall_progress": self.overall_progress,
            "current_step": self.current_step_id,
            "elapsed_time": self.elapsed_time,
            "steps": [step.to_dict() for step in self.steps]
        }

        # 发送给所有监听器
        for consumer in self._listeners:
            try:
                await consumer.send(text_data=json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending update to consumer: {e}")

    @property
    def overall_progress(self) -> float:
        """计算总体进度"""
        total_steps = len(self.steps)
        if total_steps == 0:
            return 0.0

        completed_steps = sum(1 for step in self.steps if step.status == ProcessingStatus.COMPLETED)
        current_step_progress = 0.0

        for step in self.steps:
            if step.status == ProcessingStatus.RUNNING:
                current_step_progress = step.progress / 100.0
                break

        return ((completed_steps + current_step_progress) / total_steps) * 100.0

    @property
    def current_step_id(self) -> Optional[str]:
        """获取当前步骤ID"""
        if self.current_step_index < len(self.steps):
            return self.steps[self.current_step_index].id
        return None

    @property
    def elapsed_time(self) -> float:
        """获取已用时间（秒）"""
        return time.time() - self.start_time

    def get_summary(self) -> Dict:
        """获取处理摘要"""
        return {
            "document_id": self.document_id,
            "overall_progress": self.overall_progress,
            "current_step": self.current_step_id,
            "elapsed_time": self.elapsed_time,
            "total_steps": len(self.steps),
            "completed_steps": sum(1 for step in self.steps if step.status == ProcessingStatus.COMPLETED),
            "current_step_index": self.current_step_index
        }


# 全局跟踪器存储
_active_trackers: Dict[str, DocumentProcessingTracker] = {}


def get_tracker(document_id: str) -> DocumentProcessingTracker:
    """获取或创建文档跟踪器"""
    if document_id not in _active_trackers:
        _active_trackers[document_id] = DocumentProcessingTracker(document_id)
    return _active_trackers[document_id]


def remove_tracker(document_id: str):
    """移除文档跟踪器"""
    if document_id in _active_trackers:
        del _active_trackers[document_id]


class DocumentTrackingConsumer(AsyncWebsocketConsumer):
    """文档跟踪WebSocket消费者"""

    async def connect(self):
        self.document_id = self.scope['url_route']['kwargs']['document_id']
        self.tracker = get_tracker(self.document_id)

        # 加入跟踪器监听器
        await self.tracker.add_listener(self)

        # 接受连接
        await self.accept()

        # 发送当前状态
        await self.send_current_status()

    async def disconnect(self, close_code):
        # 移除监听器
        await self.tracker.remove_listener(self)

        # 如果没有其他监听器，清理跟踪器
        if not self.tracker._listeners:
            remove_tracker(self.document_id)

    async def send_current_status(self):
        """发送当前状态"""
        message = {
            "type": "status_update",
            "document_id": self.document_id,
            "summary": self.tracker.get_summary(),
            "steps": [step.to_dict() for step in self.tracker.steps]
        }
        await self.send(text_data=json.dumps(message))


# 装饰器：自动跟踪处理步骤
def track_processing_step(step_id: str, status_callback=None):
    """装饰器：自动跟踪处理步骤"""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            tracker = get_tracker(kwargs.get('document_id', ''))
            try:
                # 开始步骤
                await tracker.update_step(step_id, ProcessingStatus.RUNNING, 0)

                # 执行函数
                result = await func(*args, **kwargs)

                # 完成步骤
                await tracker.update_step(step_id, ProcessingStatus.COMPLETED, 100)

                return result
            except Exception as e:
                # 错误处理
                await tracker.update_step(
                    step_id,
                    ProcessingStatus.ERROR,
                    details=str(e)
                )
                raise

        def sync_wrapper(*args, **kwargs):
            # 同步函数的包装器
            import asyncio
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(async_wrapper(*args, **kwargs))

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# 使用示例的上下文管理器
class ProcessingStepContext:
    """处理步骤上下文管理器"""

    def __init__(self, document_id: str, step_id: str, total_steps: int = 100):
        self.document_id = document_id
        self.step_id = step_id
        self.total_steps = total_steps
        self.tracker = get_tracker(document_id)
        self.current_step = 0

    async def __aenter__(self):
        await self.tracker.update_step(self.step_id, ProcessingStatus.RUNNING, 0)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            await self.tracker.update_step(
                self.step_id,
                ProcessingStatus.ERROR,
                details=str(exc_val)
            )
        else:
            await self.tracker.update_step(self.step_id, ProcessingStatus.COMPLETED, 100)

    async def update_progress(self, current: int, message: str = None):
        """更新进度"""
        progress = (current / self.total_steps) * 100
        await self.tracker.update_progress(self.step_id, progress)

        if message:
            step = self.tracker.get_step_by_id(self.step_id)
            if step:
                step.details = message
                await self.tracker._notify_listeners()