"""
知识图谱服务
提供概念关系网络的分析和可视化支持
"""
from typing import List, Dict, Tuple, Set, Optional
from collections import defaultdict, deque
import networkx as nx
from django.db import transaction
from apps.knowledge.models import Concept, ConceptRelation


class ConceptGraph:
    """概念图分析器"""

    def __init__(self, user=None):
        self.user = user
        self.graph = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        """构建概念关系图"""
        # 获取所有概念
        concepts = Concept.objects.all()
        if self.user:
            concepts = concepts.filter(user=self.user)

        # 添加节点
        for concept in concepts:
            self.graph.add_node(
                concept.id,
                name=concept.name,
                concept_type=concept.concept_type,
                importance=concept.importance,
                is_mastered=concept.is_mastered,
                mastery_level=concept.mastery_level,
                description=concept.description
            )

        # 获取所有关系
        relations = ConceptRelation.objects.all()
        if self.user:
            relations = relations.filter(source_concept__user=self.user)

        # 添加边
        for relation in relations:
            self.graph.add_edge(
                relation.source_concept.id,
                relation.target_concept.id,
                relation_type=relation.relation_type,
                confidence=relation.confidence,
                description=relation.description
            )

    def get_subgraph(self, center_concept_id: str, max_depth: int = 2) -> nx.DiGraph:
        """获取以指定概念为中心的子图"""
        if center_concept_id not in self.graph:
            return nx.DiGraph()

        # 使用BFS获取子图
        nodes = {center_concept_id}
        current_level = {center_concept_id}

        for _ in range(max_depth):
            next_level = set()
            for node in current_level:
                # 获取前驱和后继节点
                next_level.update(self.graph.predecessors(node))
                next_level.update(self.graph.successors(node))

            nodes.update(next_level)
            current_level = next_level

        return self.graph.subgraph(nodes).copy()

    def get_concept_dependencies(self, concept_id: str) -> List[str]:
        """获取概念的前置依赖"""
        if concept_id not in self.graph:
            return []

        # 找到所有前置关系（prerequisite）
        dependencies = []
        for predecessor in self.graph.predecessors(concept_id):
            edge_data = self.graph.get_edge_data(predecessor, concept_id)
            if edge_data.get('relation_type') == 'prerequisite':
                dependencies.append(predecessor)

        return dependencies

    def get_concept_dependents(self, concept_id: str) -> List[str]:
        """获取依赖于当前概念的其他概念"""
        if concept_id not in self.graph:
            return []

        dependents = []
        for successor in self.graph.successors(concept_id):
            edge_data = self.graph.get_edge_data(concept_id, successor)
            if edge_data.get('relation_type') == 'prerequisite':
                dependents.append(successor)

        return dependents

    def find_shortest_path(self, source_id: str, target_id: str) -> Optional[List[str]]:
        """查找两个概念之间的最短路径"""
        try:
            return nx.shortest_path(self.graph, source_id, target_id)
        except nx.NetworkXNoPath:
            return None

    def find_concept_clusters(self, min_cluster_size: int = 3) -> List[Set[str]]:
        """发现概念簇（强连通分量）"""
        clusters = list(nx.strongly_connected_components(self.graph))
        return [cluster for cluster in clusters if len(cluster) >= min_cluster_size]

    def get_centrality_measures(self, concept_id: str) -> Dict[str, float]:
        """获取概念的中心性指标"""
        if concept_id not in self.graph:
            return {}

        # 计算各种中心性
        try:
            betweenness = nx.betweenness_centrality(self.graph)[concept_id]
            closeness = nx.closeness_centrality(self.graph)[concept_id]
            in_degree = self.graph.in_degree(concept_id)
            out_degree = self.graph.out_degree(concept_id)
            degree = self.graph.degree(concept_id)

            return {
                'betweenness': betweenness,
                'closeness': closeness,
                'in_degree': in_degree,
                'out_degree': out_degree,
                'total_degree': degree
            }
        except:
            return {}

    def get_learning_sequence(self, target_concept_id: str) -> List[str]:
        """生成学习序列（基于前置依赖的拓扑排序）"""
        # 获取目标概念的所有依赖子图
        subgraph = self.get_subgraph(target_concept_id, max_depth=5)

        # 只保留前置依赖边
        dependency_edges = []
        for u, v, data in subgraph.edges(data=True):
            if data.get('relation_type') == 'prerequisite':
                dependency_edges.append((u, v))

        dependency_graph = nx.DiGraph()
        dependency_graph.add_edges_from(dependency_edges)

        try:
            # 拓扑排序
            sequence = list(nx.topological_sort(dependency_graph))
            return sequence
        except nx.NetworkXError:
            # 如果有循环依赖，返回空列表
            return []

    def get_related_concepts(
        self,
        concept_id: str,
        relation_types: List[str] = None,
        max_distance: int = 1
    ) -> Dict[str, List[str]]:
        """获取相关概念（按关系类型分组）"""
        if concept_id not in self.graph:
            return {}

        related = defaultdict(list)

        if max_distance == 1:
            # 直接相邻的节点
            for neighbor in self.graph.successors(concept_id):
                edge_data = self.graph.get_edge_data(concept_id, neighbor)
                rel_type = edge_data.get('relation_type', 'related')
                if not relation_types or rel_type in relation_types:
                    related[rel_type].append(neighbor)

            for neighbor in self.graph.predecessors(concept_id):
                edge_data = self.graph.get_edge_data(neighbor, concept_id)
                rel_type = edge_data.get('relation_type', 'related')
                if not relation_types or rel_type in relation_types:
                    related[rel_type].append(neighbor)
        else:
            # 扩展搜索
            visited = set()
            queue = deque([(concept_id, 0)])

            while queue:
                current, distance = queue.popleft()
                if distance >= max_distance:
                    continue

                for neighbor in self.graph.successors(current):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        edge_data = self.graph.get_edge_data(current, neighbor)
                        rel_type = edge_data.get('relation_type', 'related')
                        if not relation_types or rel_type in relation_types:
                            related[rel_type].append(neighbor)
                        queue.append((neighbor, distance + 1))

        return dict(related)

    def export_graph_data(self, format: str = 'd3') -> Dict:
        """导出图数据用于前端可视化"""
        nodes = []
        edges = []

        for node_id, data in self.graph.nodes(data=True):
            node_data = {
                'id': str(node_id),
                'name': data.get('name', ''),
                'concept_type': data.get('concept_type', ''),
                'importance': data.get('importance', 1.0),
                'is_mastered': data.get('is_mastered', False),
                'mastery_level': data.get('mastery_level', 0),
                'description': data.get('description', ''),
            }
            nodes.append(node_data)

        for source, target, data in self.graph.edges(data=True):
            edge_data = {
                'source': str(source),
                'target': str(target),
                'relation_type': data.get('relation_type', 'related'),
                'confidence': data.get('confidence', 1.0),
                'description': data.get('description', ''),
            }
            edges.append(edge_data)

        if format == 'd3':
            return {
                'nodes': nodes,
                'links': edges
            }
        elif format == 'cytoscape':
            return {
                'elements': [
                    {'data': node} for node in nodes
                ] + [
                    {'data': edge} for edge in edges
                ]
            }
        else:
            return {'nodes': nodes, 'edges': edges}

    def calculate_graph_statistics(self) -> Dict:
        """计算图统计信息"""
        if not self.graph:
            return {}

        stats = {
            'total_concepts': self.graph.number_of_nodes(),
            'total_relations': self.graph.number_of_edges(),
            'average_degree': 0,
            'is_connected': nx.is_weakly_connected(self.graph),
            'number_of_components': nx.number_weakly_connected_components(self.graph),
            'density': nx.density(self.graph),
        }

        if self.graph.number_of_nodes() > 0:
            stats['average_degree'] = (2 * self.graph.number_of_edges()) / self.graph.number_of_nodes()

        # 计算度分布
        degree_sequence = [d for n, d in self.graph.degree()]
        if degree_sequence:
            stats['max_degree'] = max(degree_sequence)
            stats['min_degree'] = min(degree_sequence)

        return stats


class GraphBuilder:
    """图构建器"""

    @staticmethod
    @transaction.atomic
    def create_relation(
        source_concept: Concept,
        target_concept: Concept,
        relation_type: str,
        confidence: float = 1.0,
        description: str = '',
        source: str = 'user'
    ) -> ConceptRelation:
        """创建概念关系"""
        # 检查是否已存在相同关系
        existing = ConceptRelation.objects.filter(
            source_concept=source_concept,
            target_concept=target_concept,
            relation_type=relation_type
        ).first()

        if existing:
            # 更新现有关系的置信度
            existing.confidence = max(existing.confidence, confidence)
            existing.description = description or existing.description
            existing.save()
            return existing

        return ConceptRelation.objects.create(
            source_concept=source_concept,
            target_concept=target_concept,
            relation_type=relation_type,
            confidence=confidence,
            description=description,
            source=source
        )

    @staticmethod
    def batch_create_relations(relations_data: List[Dict]) -> List[ConceptRelation]:
        """批量创建概念关系"""
        created_relations = []

        for relation_data in relations_data:
            try:
                relation = GraphBuilder.create_relation(**relation_data)
                created_relations.append(relation)
            except Exception as e:
                print(f"Failed to create relation: {e}")

        return created_relations

    @staticmethod
    def extract_concept_relationships_from_text(
        text: str,
        known_concepts: List[str]
    ) -> List[Tuple[str, str, str]]:
        """从文本中提取概念关系（简单启发式方法）"""
        relationships = []
        concepts_lower = [c.lower() for c in known_concepts]

        # 简单的启发式规则
        sentences = text.split('.')

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            # 查找句中出现的概念
            found_concepts = []
            for i, concept in enumerate(known_concepts):
                if concept.lower() in sentence.lower():
                    found_concepts.append(concept)

            # 根据句式模式推断关系
            if '因为' in sentence or '由于' in sentence:
                # 因果关系
                if len(found_concepts) >= 2:
                    relationships.append((found_concepts[0], found_concepts[1], 'causal'))

            elif '是' in sentence and ('定义' in sentence or '定义了' in sentence):
                # 定义关系
                if len(found_concepts) >= 2:
                    relationships.append((found_concepts[0], found_concepts[1], 'definition'))

            elif '例如' in sentence or '比如' in sentence:
                # 示例关系
                if len(found_concepts) >= 2:
                    relationships.append((found_concepts[0], found_concepts[1], 'example_of'))

        return relationships


class RecommendationEngine:
    """推荐引擎"""

    def __init__(self, user):
        self.user = user
        self.graph = ConceptGraph(user)

    def recommend_next_concepts(self, current_concept_id: str, limit: int = 5) -> List[str]:
        """推荐下一个学习概念"""
        # 优先推荐前置依赖未掌握的概念
        dependencies = self.graph.get_concept_dependencies(current_concept_id)

        unmastered_deps = []
        for dep_id in dependencies:
            concept = Concept.objects.filter(id=dep_id).first()
            if concept and not concept.is_mastered:
                unmastered_deps.append(dep_id)

        if len(unmastered_deps) >= limit:
            return unmastered_deps[:limit]

        # 如果前置依赖都掌握了，推荐相关概念
        related = self.graph.get_related_concepts(
            current_concept_id,
            relation_types=['related', 'extends'],
            max_distance=2
        )

        recommendations = []
        for relation_type, concepts in related.items():
            for concept_id in concepts:
                concept = Concept.objects.filter(id=concept_id).first()
                if concept and not concept.is_mastered and concept_id != current_concept_id:
                    recommendations.append(concept_id)

        return recommendations[:limit]

    def recommend_concept_clusters(self, min_size: int = 3) -> List[List[str]]:
        """推荐概念簇用于集中学习"""
        clusters = self.graph.find_concept_clusters(min_size)

        # 按簇的大小排序
        sorted_clusters = sorted(clusters, key=len, reverse=True)

        return [list(cluster) for cluster in sorted_clusters[:5]]

    def analyze_learning_gaps(self) -> Dict[str, List[str]]:
        """分析学习缺口"""
        # 找出重要但未掌握的概念
        unmastered_important = Concept.objects.filter(
            user=self.user,
            is_mastered=False,
            importance__gte=3.0
        ).values_list('id', flat=True)

        # 分析这些概念的前置依赖
        gaps = defaultdict(list)
        for concept_id in unmastered_important:
            dependencies = self.graph.get_concept_dependencies(concept_id)
            unmastered_deps = []

            for dep_id in dependencies:
                dep_concept = Concept.objects.filter(id=dep_id).first()
                if dep_concept and not dep_concept.is_mastered:
                    unmastered_deps.append(dep_id)

            if unmastered_deps:
                gaps[str(concept_id)] = unmastered_deps

        return dict(gaps)