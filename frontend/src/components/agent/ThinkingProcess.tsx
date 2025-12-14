/**
 * 思考过程组件 / Thinking Process Component
 *
 * 显示Agent的执行计划、思考过程和工具调用状态
 * Displays Agent's execution plan, thinking process, and tool call status
 */

import { Brain, Wrench, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { ThinkingProcessProps } from '../../types';

export function ThinkingProcess({
  plan,
  thought,
  toolCall,
  className = ''
}: ThinkingProcessProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 执行计划 / Execution Plan */}
      {plan.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-blue-900">执行计划</h3>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            {plan.map((step, index) => (
              <li key={index} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 当前思考 / Current Thought */}
      {thought && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
            <h3 className="text-sm font-medium text-purple-900">正在思考</h3>
          </div>
          <p className="text-sm text-purple-800 leading-relaxed">
            {thought}
          </p>
        </div>
      )}

      {/* 工具调用 / Tool Call */}
      {toolCall && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-medium text-orange-900">
              工具调用: {toolCall.tool_name}
            </h3>
            <div className="ml-auto flex items-center gap-1">
              {toolCall.status === 'running' && (
                <>
                  <Clock className="w-4 h-4 text-orange-600 animate-spin" />
                  <span className="text-xs text-orange-700">执行中</span>
                </>
              )}
              {toolCall.status === 'success' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700">成功</span>
                </>
              )}
              {toolCall.status === 'failed' && (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-700">失败</span>
                </>
              )}
            </div>
          </div>

          {/* 工具输入 / Tool Input */}
          {toolCall.tool_input && Object.keys(toolCall.tool_input).length > 0 && (
            <div className="mb-2">
              <h4 className="text-xs font-medium text-orange-800 mb-1">输入参数:</h4>
              <pre className="text-xs bg-orange-100 p-2 rounded text-orange-900 overflow-x-auto">
                {JSON.stringify(toolCall.tool_input, null, 2)}
              </pre>
            </div>
          )}

          {/* 工具输出 / Tool Output */}
          {toolCall.output && (
            <div>
              <h4 className="text-xs font-medium text-orange-800 mb-1">执行结果:</h4>
              <div className="text-xs bg-orange-100 p-2 rounded text-orange-900 max-h-32 overflow-y-auto">
                {toolCall.output}
              </div>
            </div>
          )}

          {/* 执行时间 / Execution Time */}
          {toolCall.execution_time && (
            <div className="mt-2 text-xs text-orange-700">
              执行时间: {(toolCall.execution_time * 1000).toFixed(0)}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
}