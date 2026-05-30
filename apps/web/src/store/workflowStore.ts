import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
} from 'reactflow'
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  OnNodesDelete,
  XYPosition,
  ReactFlowInstance,
  OnConnectEnd,
  OnConnectStartParams,
} from 'reactflow'
import { v4 as uuidv4 } from 'uuid'
import {
  GlobalSettings,
  CustomNodeData,
  NodeConfig,
  ConditionNodeConfig,
  DiscordActionConfig,
  TriggerNodeConfig,
  WebhookTriggerNodeConfig,
  NotionActionConfig,
  HttpActionConfig,
} from '../types/workflow'

interface WorkflowState {
  nodes: Node<CustomNodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  isDirty: boolean
  isValid: boolean
  globalSettings: GlobalSettings

  isModalOpen: boolean
  modalPosition: XYPosition
  sourceNodeId: string | null
  sourceHandleId: string | null

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onConnectEnd: OnConnectEnd
  onDrop: (event: React.DragEvent, reactFlowInstance: ReactFlowInstance) => void
  onNodesDelete: OnNodesDelete
  deleteNode: (id: string) => void

  setSelectedNodeId: (id: string | null) => void
  updateNodeData: (id: string, data: Partial<CustomNodeData>) => void
  setNodes: (nodes: Node<CustomNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  validateWorkflow: () => void
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void

  openModal: (
    position: XYPosition,
    sourceNodeId?: string,
    sourceHandleId?: string
  ) => void
  closeModal: () => void
  addNode: (type: string, position?: XYPosition) => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,
  isValid: false,
  globalSettings: {
    enableFailureAlert: false,
    failureWebhookUrl: '',
  },

  isModalOpen: false,
  modalPosition: { x: 0, y: 0 },
  sourceNodeId: null,
  sourceHandleId: null,

  onNodesChange: (changes: NodeChange[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes), isDirty: true })
    get().validateWorkflow()
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges), isDirty: true })
  },

  onConnect: (connection: Connection) => {
    let label = ''
    let stroke = '#8A3FFC'
    if (connection.sourceHandle === 'true') {
      label = 'Yes'
      stroke = '#00F5A0'
    } else if (connection.sourceHandle === 'false') {
      label = 'No'
      stroke = '#FF2E63'
    }

    const newEdge: Edge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}`,
      type: 'smoothstep',
      label,
      style: { stroke, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
    } as Edge
    set({ edges: addEdge(newEdge, get().edges), isDirty: true })
  },

  onConnectEnd: (event: unknown, connectionState: OnConnectStartParams) => {
    if (connectionState && connectionState.nodeId) {
      let clientX = 0,
        clientY = 0
      if (event instanceof MouseEvent) {
        clientX = event.clientX
        clientY = event.clientY
      } else if (event && typeof event === 'object' && 'touches' in event) {
        // Use type guard to safely access touches
        const te = event as TouchEvent
        if (te.touches && te.touches.length > 0) {
          clientX = te.touches[0].clientX
          clientY = te.touches[0].clientY
        }
      }

      const sourceNodeId = connectionState.nodeId
      const sourceHandleId = connectionState.handleId || null
      if (sourceNodeId)
        get().openModal(
          { x: clientX, y: clientY },
          sourceNodeId,
          sourceHandleId
        )
    }
  },

  onDrop: (event, reactFlowInstance) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow')
    if (!type) return
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    get().addNode(type, position)
  },

  onNodesDelete: (nodesToDelete) => {
    if (nodesToDelete.some((node) => node.id === get().selectedNodeId))
      set({ selectedNodeId: null })
  },

  deleteNode: (id) => {
    const { nodes, edges, selectedNodeId } = get()
    set({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: selectedNodeId === id ? null : selectedNodeId,
      isDirty: true,
    })
    get().validateWorkflow()
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeData: (id, newData) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
      ),
      isDirty: true,
    })
    get().validateWorkflow()
  },

  setNodes: (nodes) => {
    set({ nodes })
    get().validateWorkflow()
  },
  setEdges: (edges) => set({ edges }),

  validateWorkflow: () => {
    const { nodes } = get()
    let allValid = true
    let hasChanges = false
    const updatedNodes = nodes.map((node) => {
      const config = node.data.config
      let nodeValid: boolean

      if (!config) {
        nodeValid = false
      } else {
        switch (node.type) {
          case 'trigger': {
            const trig = config as TriggerNodeConfig
            nodeValid = !!trig.accountId
            break
          }
          case 'trigger-webhook': {
            const trig = config as WebhookTriggerNodeConfig
            nodeValid = !!trig.apiKey
            break
          }
          case 'action': {
            const discord = config as DiscordActionConfig
            nodeValid = !!discord.webhookUrl && !!discord.content
            break
          }
          case 'action-notion': {
            const notion = config as NotionActionConfig
            nodeValid = !!notion.accountId && !!notion.databaseId
            break
          }
          case 'action-http': {
            const http = config as HttpActionConfig
            nodeValid = !!http.url
            break
          }
          case 'condition': {
            const cond = config as ConditionNodeConfig
            nodeValid =
              !!cond.conditions &&
              cond.conditions.length > 0 &&
              cond.conditions.every((c) => !!c.value)
            break
          }
          default:
            nodeValid = true
            break
        }
      }

      if (!nodeValid) {
        allValid = false
      }

      if (node.data.isValid !== nodeValid) {
        hasChanges = true
        return {
          ...node,
          data: {
            ...node.data,
            isValid: nodeValid,
          },
        }
      }
      return node
    })

    const currentIsValid = get().isValid
    if (hasChanges || currentIsValid !== allValid) {
      set({
        nodes: hasChanges ? updatedNodes : nodes,
        isValid: allValid,
      })
    }
  },

  updateGlobalSettings: (settings) =>
    set((state) => ({
      globalSettings: { ...state.globalSettings, ...settings },
      isDirty: true,
    })),
  openModal: (position, sourceNodeId, sourceHandleId) =>
    set({
      isModalOpen: true,
      modalPosition: position,
      sourceNodeId: sourceNodeId || null,
      sourceHandleId: sourceHandleId || null,
    }),
  closeModal: () =>
    set({ isModalOpen: false, sourceNodeId: null, sourceHandleId: null }),

  addNode: (type, positionOverride) => {
    const { nodes, sourceNodeId, sourceHandleId, onConnect } = get()
    const newNodeId = uuidv4()
    let position = positionOverride || { x: 250, y: 250 }
    if (!positionOverride && sourceNodeId) {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId)
      if (sourceNode) {
        position = { x: sourceNode.position.x, y: sourceNode.position.y + 150 }
        if (sourceHandleId === 'true') position.x -= 100
        if (sourceHandleId === 'false') position.x += 100
      }
    }
    const config = {} as NodeConfig
    if (type === 'trigger-webhook') {
      ;(config as WebhookTriggerNodeConfig).apiKey =
        'at_' + uuidv4().replace(/-/g, '')
    }
    const newNode: Node<CustomNodeData> = {
      id: newNodeId,
      type,
      position,
      data: { label: type, config, isValid: type === 'trigger-webhook' },
    }
    set({ nodes: [...nodes, newNode], isModalOpen: false })
    if (sourceNodeId)
      onConnect({
        source: sourceNodeId,
        sourceHandle: sourceHandleId,
        target: newNodeId,
        targetHandle: null,
      })
    set({ sourceNodeId: null, sourceHandleId: null })
    get().validateWorkflow()
  },
}))
