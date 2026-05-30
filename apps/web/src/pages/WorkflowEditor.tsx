import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import ReactFlow, {
  Background,
  Controls,
  type NodeMouseHandler,
  type NodeTypes,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { api } from '../utils/api'
import { ConfigPanel } from '../components/ConfigPanel'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '../store/workflowStore'
import { TriggerNode } from '../components/nodes/TriggerNode'
import { ActionNode } from '../components/nodes/ActionNode'
import { ConditionNode } from '../components/nodes/ConditionNode'
import { NodeSelectionModal } from '../components/NodeSelectionModal'
import { TestRunModal } from '../components/TestRunModal'
import { Sidebar } from '../components/Sidebar'
import { Button } from '@atomaton/ui'
import type {
  WorkflowBackendData,
  CustomNodeData,
  NodeConfig,
  GlobalSettings,
  TestResult,
  TriggerNodeConfig,
  WebhookTriggerNodeConfig,
  DiscordActionConfig,
  NotionActionConfig,
  HttpActionConfig,
  ConditionNodeConfig,
} from '../types/workflow'

const WorkflowEditorContent: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useReactFlow()
  const queryClient = useQueryClient()

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectEnd,
    onDrop,
    onNodesDelete,
    setNodes,
    setEdges,
    selectedNodeId,
    setSelectedNodeId,
    updateNodeData,
    isModalOpen,
    modalPosition,
    closeModal,
    addNode,
    globalSettings,
    updateGlobalSettings,
  } = useWorkflowStore()

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      'trigger-webhook': TriggerNode,
      action: ActionNode,
      'action-notion': ActionNode,
      'action-http': ActionNode,
      condition: ConditionNode,
    }),
    []
  )

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => api.get<WorkflowBackendData>(`/workflows/${id}`),
    enabled: !!id,
  })

  useEffect(() => {
    if (workflow) {
      if (workflow.ui_config) {
        setNodes(workflow.ui_config.nodes)
        setEdges(workflow.ui_config.edges)
      } else {
        setNodes([])
        setEdges([])
      }
      if (workflow.settings) {
        updateGlobalSettings(workflow.settings)
      }
    }
  }, [workflow, setNodes, setEdges, updateGlobalSettings])
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [setSelectedNodeId])

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const sourceHasConnection = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.sourceHandle === connection.sourceHandle
      )
      return !sourceHasConnection
    },
    [edges]
  )

  const handleConfigSave = (newConfig: NodeConfig) => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, { config: newConfig })
    }
  }

  const saveWorkflowMutation = useMutation({
    mutationFn: (data: {
      nodes: Node<CustomNodeData>[]
      edges: Edge[]
      globalSettings: GlobalSettings
    }) => {
      return api.put(`/workflows/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] })
      alert('Workflow saved successfully!')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to save workflow:', error)
      alert(`Failed to save workflow: ${message}`)
    },
  })

  const handleSaveWorkflow = async () => {
    if (!id) return

    const errors: string[] = []
    let firstInvalidNodeId: string | null = null

    nodes.forEach((node) => {
      const config = node.data.config
      const label = node.data.label || node.type || 'Node'
      let isNodeValid = true
      const missingFields: string[] = []

      if (!config) {
        isNodeValid = false
        missingFields.push('Configuration')
      } else {
        switch (node.type) {
          case 'trigger': {
            if (!(config as TriggerNodeConfig).accountId) {
              isNodeValid = false
              missingFields.push('Account')
            }
            break
          }
          case 'trigger-webhook': {
            if (!(config as WebhookTriggerNodeConfig).apiKey) {
              isNodeValid = false
              missingFields.push('API Key')
            }
            break
          }
          case 'action': {
            const discord = config as DiscordActionConfig
            if (!discord.webhookUrl) missingFields.push('Webhook URL')
            if (!discord.content) missingFields.push('Message Content')
            if (missingFields.length > 0) isNodeValid = false
            break
          }
          case 'action-notion': {
            const notion = config as NotionActionConfig
            if (!notion.accountId) missingFields.push('Account')
            if (!notion.databaseId) missingFields.push('Database ID')
            if (missingFields.length > 0) isNodeValid = false
            break
          }
          case 'action-http': {
            const http = config as HttpActionConfig
            if (!http.url) {
              isNodeValid = false
              missingFields.push('URL')
            }
            break
          }
          case 'condition': {
            const cond = config as ConditionNodeConfig
            if (!cond.conditions || cond.conditions.length === 0) {
              isNodeValid = false
              missingFields.push('At least one condition rule')
            } else if (cond.conditions.some((c) => !c.value)) {
              isNodeValid = false
              missingFields.push('All condition values')
            }
            break
          }
          default:
            break
        }
      }

      if (!isNodeValid) {
        if (!firstInvalidNodeId) {
          firstInvalidNodeId = node.id
        }
        const friendlyName =
          node.type === 'trigger'
            ? 'IMAP Email Trigger'
            : node.type === 'trigger-webhook'
              ? 'Incoming Webhook Trigger'
              : node.type === 'action'
                ? 'Discord Webhook Action'
                : node.type === 'action-notion'
                  ? 'Notion Page Action'
                  : node.type === 'action-http'
                    ? 'HTTP Request Action'
                    : node.type === 'condition'
                      ? 'Condition Node'
                      : label
        errors.push(`• [${friendlyName}] Missing: ${missingFields.join(', ')}`)
      }
    })

    if (errors.length > 0) {
      alert(
        `Cannot save workflow. Please resolve the following validation errors:\n\n${errors.join('\n')}`
      )
      if (firstInvalidNodeId) {
        setSelectedNodeId(firstInvalidNodeId)
      }
      return
    }

    saveWorkflowMutation.mutate({ nodes, edges, globalSettings })
  }

  const handleRunTest = async (
    inputData: Record<string, string | number | boolean | null>
  ): Promise<TestResult> => {
    if (!id) throw new Error('Workflow ID is missing for test run.')
    try {
      return api.post<TestResult>(`/workflows/${id}/test`, {
        nodes,
        edges,
        inputData,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Test run failed'
      console.error('Test run failed:', error)
      throw new Error(message)
    }
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="h-full flex">
      <Sidebar
        onSave={handleSaveWorkflow}
        onTest={() => setIsTestModalOpen(true)}
      />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={(_event, connectionState) =>
            onConnectEnd(_event, connectionState)
          }
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodesDelete={onNodesDelete}
          onDrop={(e) => onDrop(e, reactFlowInstance)}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          isValidConnection={isValidConnection}
          fitView
          style={{ background: 'transparent' }}
        >
          <Background
            color="#ffffff"
            gap={16}
            size={1}
            style={{ opacity: 0.1 }}
          />
          <Controls className="bg-white/10 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden" />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 text-center pointer-events-auto shadow-2xl">
              <h3 className="text-xl font-bold mb-2 text-white">
                Start your workflow
              </h3>
              <p className="text-white/50 mb-6">
                Drag a trigger from the sidebar or click below.
              </p>
              <Button onClick={() => addNode('trigger', { x: 250, y: 250 })}>
                Add Trigger
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedNode && (
        <ConfigPanel
          nodeId={selectedNode.id}
          nodeType={selectedNode.type || 'default'}
          initialConfig={selectedNode.data.config}
          onSave={handleConfigSave}
          onClose={() => setSelectedNodeId(null)}
          userId={workflow?.userId}
          triggerId={workflow?.trigger?.id}
        />
      )}

      <NodeSelectionModal
        isOpen={isModalOpen}
        position={modalPosition}
        onClose={closeModal}
        onSelect={(type) => addNode(type)}
      />

      <TestRunModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onRun={handleRunTest}
      />
    </div>
  )
}

export const WorkflowEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  )
}
