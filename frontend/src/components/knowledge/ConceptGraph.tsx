import React, { useState, useEffect, useRef } from 'react';
import { Network, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';
import { knowledgeService } from '../../services/knowledgeService';
import type { ConceptGraphData } from '../../types/knowledge';
import { cn } from '../../utils/cn';

interface ConceptGraphProps {
  conceptId: string;
  depth?: number;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description: string;
  score: number;
  group: number;
  level: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relation_type: string;
  weight: number;
  description: string;
}

export const ConceptGraph: React.FC<ConceptGraphProps> = ({
  conceptId,
  depth = 2,
}) => {
  const [graphData, setGraphData] = useState<ConceptGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // 加载概念关系图数据
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        setLoading(true);
                        const response = await knowledgeService.concepts.getGraph(conceptId, depth);
        setGraphData(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to load concept graph:', err);
        setError('加载概念关系图失败');
      } finally {
        setLoading(false);
      }
    };

    loadGraphData();
  }, [conceptId, depth]);

  // 计算节点位置（简单的径向布局）
  const calculateNodePositions = (nodes: GraphNode[], edges: GraphEdge[]) => {
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));

    // 找到中心节点
    const centerNode = nodes.find(n => n.id === conceptId);
    if (!centerNode) return nodes;

    const centerX = 400;
    const centerY = 300;
    const levelRadius = 120;

    // 设置中心节点位置
    centerNode.x = centerX;
    centerNode.y = centerY;

    // 按层级排列其他节点
    const nodesByLevel = new Map<number, GraphNode[]>();
    nodes.forEach(node => {
      if (node.id !== conceptId) {
        if (!nodesByLevel.has(node.level)) {
          nodesByLevel.set(node.level, []);
        }
        nodesByLevel.get(node.level)!.push(node);
      }
    });

    nodesByLevel.forEach((levelNodes, level) => {
      const radius = levelRadius * level;
      const angleStep = (2 * Math.PI) / levelNodes.length;

      levelNodes.forEach((node, index) => {
        const angle = angleStep * index;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
      });
    });

    return nodes;
  };

  // 处理鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prevZoom => Math.max(0.1, Math.min(3, prevZoom * delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // 获取节点颜色
  const getNodeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      definition: '#3B82F6',
      theorem: '#10B981',
      lemma: '#F59E0B',
      method: '#8B5CF6',
      formula: '#EF4444',
      other: '#6B7280',
    };
    return colorMap[type] || colorMap.other;
  };

  // 获取关系类型颜色
  const getRelationColor = (type: string) => {
    const colorMap: Record<string, string> = {
      prerequisite: '#10B981',
      related: '#3B82F6',
      extends: '#8B5CF6',
      example_of: '#F59E0B',
      part_of: '#EF4444',
      contrast: '#6B7280',
    };
    return colorMap[type] || '#6B7280';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-600">正在加载概念关系图...</p>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Network className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-600">{error || '无法加载概念关系图'}</p>
      </div>
    );
  }

  const nodes = calculateNodePositions([...graphData.nodes], graphData.edges);
  const centerNode = nodes.find(n => n.id === conceptId);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      {/* 工具栏 */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {centerNode?.name} - 概念关系图
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
            深度: {graphData.depth} | 节点: {graphData.total_nodes} | 关系: {graphData.total_edges}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(prevZoom => Math.min(3, prevZoom * 1.2))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(prevZoom => Math.max(0.1, prevZoom * 0.8))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* 导出功能 */}}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 图形容器 */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* 绘制边 */}
            {graphData.edges.map((edge, index) => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);

              if (!sourceNode?.x || !sourceNode?.y || !targetNode?.x || !targetNode?.y) {
                return null;
              }

              return (
                <g key={index}>
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={getRelationColor(edge.relation_type)}
                    strokeWidth={Math.max(1, edge.weight * 2)}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2}
                    fill="currentColor"
                    fontSize="12"
                    textAnchor="middle"
                    className="pointer-events-none text-gray-500 dark:text-gray-500"
                  >
                    {edge.relation_type}
                  </text>
                </g>
              );
            })}

            {/* 绘制节点 */}
            {nodes.map((node) => {
              const isCenter = node.id === conceptId;
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(node.id)}
                  className="cursor-pointer"
                >
                  <circle
                    r={isCenter ? 20 : 15}
                    fill={getNodeColor(node.type)}
                    stroke={isSelected ? '#1F2937' : isHovered ? '#374151' : '#9CA3AF'}
                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                    className="transition-all"
                  />
                  <text
                    y={isCenter ? 35 : 28}
                    fill="currentColor"
                    fontSize="14"
                    fontWeight={isCenter ? 'bold' : 'normal'}
                    textAnchor="middle"
                    className="pointer-events-none text-gray-900 dark:text-gray-100"
                  >
                    {node.name}
                  </text>
                  {isHovered && node.description && (
                    <g transform={`translate(0, ${isCenter ? 45 : 38})`}>
                      <rect
                        x="-100"
                        y="-20"
                        width="200"
                        height="40"
                        fill="white"
                        stroke="#E5E7EB"
                        strokeWidth="1"
                        rx="4"
                        className="dark:fill-gray-800 dark:stroke-gray-600"
                      />
                      <text
                        x="0"
                        y="0"
                        fill="currentColor"
                        fontSize="12"
                        textAnchor="middle"
                        className="text-gray-600 dark:text-gray-400 dark:text-gray-600"
                      >
                        {node.description.slice(0, 50)}...
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* 图例 */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">图例</h4>
          <div className="space-y-1">
            {[
              { type: 'definition', label: '定义' },
              { type: 'theorem', label: '定理' },
              { type: 'lemma', label: '引理' },
              { type: 'method', label: '方法' },
              { type: 'formula', label: '公式' },
            ].map((item) => (
              <div key={item.type} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getNodeColor(item.type) }}
                />
                <span className="text-gray-700 dark:text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 选中节点详情 */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">节点详情</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            {(() => {
              const node = nodes.find(n => n.id === selectedNode);
              if (!node) return null;

              return (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-600">名称:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{node.name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-600">类型:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{node.type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-600">置信度:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{(node.score * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-600">层级:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{node.level}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};