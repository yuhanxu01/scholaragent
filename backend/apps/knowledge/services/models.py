from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime


@dataclass
class SearchResult:
    """搜索结果数据类"""
    id: str
    title: str
    content: str
    source_type: str  # 'concept', 'document', 'chunk', 'note'
    source_id: str
    score: float  # 相关性评分
    context: Dict[str, Any]  # 额外上下文信息
    highlights: List[str]  # 高亮片段
    document_id: Optional[str] = None
    document_title: Optional[str] = None
    section: Optional[str] = None
    line_number: Optional[int] = None
    tags: List[str] = None
    created_at: Optional[datetime] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []


@dataclass
class ConceptSearchResult:
    """概念搜索结果"""
    id: str
    name: str
    concept_type: str
    description: str
    document_id: Optional[str]
    document_title: Optional[str]
    score: float
    prerequisites: List[str]
    related_concepts: List[str]
    location_section: Optional[str] = None
    location_line: Optional[int] = None
    confidence: Optional[float] = None

    def __post_init__(self):
        if self.prerequisites is None:
            self.prerequisites = []
        if self.related_concepts is None:
            self.related_concepts = []


@dataclass
class GraphNode:
    """概念图节点"""
    id: str
    name: str
    type: str
    description: str
    score: float = 1.0
    group: int = 0  # 用于力导向图的分组
    level: int = 0  # 概念层级


@dataclass
class GraphEdge:
    """概念图边"""
    source: str
    target: str
    relation_type: str
    weight: float = 1.0
    description: str = ""


@dataclass
class ConceptGraph:
    """概念关系图"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    center_concept_id: str
    depth: int = 2
    total_nodes: int = 0
    total_edges: int = 0

    def __post_init__(self):
        self.total_nodes = len(self.nodes)
        self.total_edges = len(self.edges)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式，便于前端使用"""
        return {
            'nodes': [
                {
                    'id': node.id,
                    'name': node.name,
                    'type': node.type,
                    'description': node.description,
                    'score': node.score,
                    'group': node.group,
                    'level': node.level
                }
                for node in self.nodes
            ],
            'edges': [
                {
                    'source': edge.source,
                    'target': edge.target,
                    'relation_type': edge.relation_type,
                    'weight': edge.weight,
                    'description': edge.description
                }
                for edge in self.edges
            ],
            'center_concept_id': self.center_concept_id,
            'depth': self.depth,
            'total_nodes': self.total_nodes,
            'total_edges': self.total_edges
        }