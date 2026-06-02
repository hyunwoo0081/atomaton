import React, { useMemo } from 'react'
import type { Node, Edge } from 'reactflow'
import type {
  NodeConfig,
  WebhookTriggerNodeConfig,
  RegexReplaceActionConfig,
  UrlDecodeActionConfig,
  HttpActionConfig,
} from '../types/workflow'

// Recursively extract all paths from a JSON object (used for Webhook payloads)
export function extractJsonPaths(obj: unknown, prefix = ''): string[] {
  let paths: string[] = []
  if (obj === null || obj === undefined) return paths

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      paths.push(`${prefix}[]`)
    } else {
      const firstItem = obj[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        paths = [...paths, ...extractJsonPaths(firstItem, `${prefix}[0]`)]
      } else {
        paths.push(`${prefix}[0]`)
      }
    }
  } else if (typeof obj === 'object') {
    const typedObj = obj as Record<string, unknown>
    for (const key in typedObj) {
      if (Object.prototype.hasOwnProperty.call(typedObj, key)) {
        const value = typedObj[key]
        const currentPath = prefix ? `${prefix}.${key}` : key
        if (typeof value === 'object' && value !== null) {
          paths = [...paths, ...extractJsonPaths(value, currentPath)]
        } else {
          paths.push(currentPath)
        }
      }
    }
  } else {
    paths.push(prefix)
  }

  return paths
}

// Find all upstream nodes in the DAG starting from currentNodeId
function findUpstreamNodes(
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const visited = new Set<string>()
  const upstreamNodes: Node[] = []

  function traverse(nodeId: string) {
    const incomingEdges = edges.filter((edge) => edge.target === nodeId)
    for (const edge of incomingEdges) {
      const sourceNodeId = edge.source
      if (!visited.has(sourceNodeId)) {
        visited.add(sourceNodeId)
        const sourceNode = nodes.find((n) => n.id === sourceNodeId)
        if (sourceNode) {
          upstreamNodes.push(sourceNode)
          traverse(sourceNodeId)
        }
      }
    }
  }

  traverse(currentNodeId)
  return upstreamNodes
}

// Extract human-readable label and variable list from a single Node
function getVariablesForNode(node: Node): {
  label: string
  variables: string[]
} {
  const type = node.type
  const config = node.data?.config as NodeConfig
  const label = node.data?.label || node.id

  if (type === 'trigger') {
    return {
      label: `Email Trigger (${label})`,
      variables: [
        'trigger.subject',
        'trigger.from',
        'trigger.date',
        'trigger.body',
      ],
    }
  }

  if (type === 'trigger-webhook') {
    const webhookConfig = config as WebhookTriggerNodeConfig
    const payloadStr = webhookConfig?.samplePayload
    if (payloadStr) {
      try {
        const parsed = JSON.parse(payloadStr)
        const paths = extractJsonPaths(parsed)
        return {
          label: `Webhook Trigger (${label})`,
          variables: paths.map((p) => `trigger.${p}`),
        }
      } catch {
        // Fallback if parsing fails
      }
    }
    return {
      label: `Webhook Trigger (${label})`,
      variables: ['trigger.subject', 'trigger.amount', 'trigger.status'],
    }
  }

  if (type === 'action-regex-replace') {
    const regexConfig = config as RegexReplaceActionConfig
    const outVar = regexConfig?.outputVariable || 'replaced_text'
    return {
      label: `Regex Replace (${label})`,
      variables: [outVar],
    }
  }

  if (type === 'action-url-decode') {
    const urlConfig = config as UrlDecodeActionConfig
    const outVar = urlConfig?.outputVariable || 'decoded_text'
    return {
      label: `URL Decode (${label})`,
      variables: [outVar],
    }
  }

  if (type === 'action-http') {
    const httpConfig = config as HttpActionConfig
    const mapping = httpConfig?.responseMapping
    if (mapping && mapping.length > 0) {
      return {
        label: `HTTP Request (${label})`,
        variables: mapping.map((m) => m.targetVariable),
      }
    }
    return {
      label: `HTTP Request (${label})`,
      variables: ['http_response'],
    }
  }

  return {
    label: label,
    variables: [],
  }
}

interface VariablePickerProps {
  currentNodeId: string
  nodes: Node[]
  edges: Edge[]
  onSelect: (variable: string) => void
}

export const VariablePicker: React.FC<VariablePickerProps> = ({
  currentNodeId,
  nodes,
  edges,
  onSelect,
}) => {
  const groupedVariables = useMemo(() => {
    // 1. Find directly and indirectly connected upstream nodes
    const upstream = findUpstreamNodes(currentNodeId, nodes, edges)

    if (upstream.length > 0) {
      return upstream
        .map((node) => {
          const res = getVariablesForNode(node)
          return {
            ...res,
            isConnected: true,
          }
        })
        .filter((group) => group.variables.length > 0)
    }

    // 2. If no upstream connections, scan all other nodes on the canvas
    const otherNodes = nodes.filter((n) => n.id !== currentNodeId)
    if (otherNodes.length > 0) {
      return otherNodes
        .map((node) => {
          const res = getVariablesForNode(node)
          return {
            label: `Unconnected: ${res.label}`,
            variables: res.variables,
            isConnected: false,
          }
        })
        .filter((group) => group.variables.length > 0)
    }

    // 3. Absolute fallback: generic system parameters
    return [
      {
        label: 'System Defaults (No Nodes Found)',
        variables: [
          'trigger.subject',
          'trigger.body',
          'trigger.from',
          'result',
        ],
        isConnected: false,
      },
    ]
  }, [currentNodeId, nodes, edges])

  const totalVars = groupedVariables.reduce(
    (sum, g) => sum + g.variables.length,
    0
  )
  if (totalVars === 0) return null

  return (
    <div className="flex flex-col gap-3 mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
      <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
        Suggested Variables:
      </span>
      <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
        {groupedVariables.map((group, gIdx) => (
          <div key={gIdx} className="flex flex-col gap-1.5">
            <span
              className={`text-[9px] font-medium leading-none ${
                group.isConnected
                  ? 'text-[#00F5A0]/80'
                  : 'text-amber-400/80 italic'
              }`}
            >
              {group.label}
              {!group.isConnected && ' (연결되지 않음)'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.variables.map((v) => {
                const templateFormat = `{{${v}}}`
                return (
                  <button
                    key={v}
                    type="button"
                    className="px-2.5 py-1 text-[10px] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-lg text-white/90 hover:text-white transition-all font-mono"
                    onClick={() => onSelect(templateFormat)}
                  >
                    {templateFormat}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
