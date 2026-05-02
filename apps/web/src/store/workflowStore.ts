import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
} from 'reactflow';
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
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { 
    GlobalSettings, 
    CustomNodeData, 
    NodeConfig, 
    ConditionNodeConfig, 
    DiscordActionConfig, 
    TriggerNodeConfig 
} from '../types/workflow';

interface WorkflowState {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  isValid: boolean;
  globalSettings: GlobalSettings;
  
  isModalOpen: boolean;
  modalPosition: XYPosition;
  sourceNodeId: string | null;
  sourceHandleId: string | null;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onConnectEnd: OnConnectEnd;
  onDrop: (event: React.DragEvent, reactFlowInstance: ReactFlowInstance) => void;
  onNodesDelete: OnNodesDelete;
  deleteNode: (id: string) => void;
  
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (id: string, data: Partial<CustomNodeData>) => void;
  setNodes: (nodes: Node<CustomNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  validateWorkflow: () => void;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  
  openModal: (position: XYPosition, sourceNodeId?: string, sourceHandleId?: string) => void;
  closeModal: () => void;
  addNode: (type: string, position?: XYPosition) => void;
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
    set({ nodes: applyNodeChanges(changes, get().nodes), isDirty: true });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges), isDirty: true });
  },

  onConnect: (connection: Connection) => {
    let label = '';
    let stroke = '#8A3FFC';
    if (connection.sourceHandle === 'true') { label = 'Yes'; stroke = '#00F5A0'; } 
    else if (connection.sourceHandle === 'false') { label = 'No'; stroke = '#FF2E63'; }

    const newEdge: Edge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}`,
      type: 'smoothstep',
      label,
      style: { stroke, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
    } as Edge;
    set({ edges: addEdge(newEdge, get().edges), isDirty: true });
  },

  onConnectEnd: (event: unknown, connectionState: OnConnectStartParams) => { 
    // connectionState contains node and handle info where the connection attempt started/ended
    if (connectionState && connectionState.nodeId) {
      let clientX = 0, clientY = 0;
      if (event instanceof MouseEvent) { 
          clientX = event.clientX; clientY = event.clientY; 
      } else if (event && typeof event === 'object' && 'touches' in event) {
          const te = event as unknown as TouchEvent;
          if (te.touches && te.touches.length > 0) {
              clientX = te.touches[0].clientX; clientY = te.touches[0].clientY;
          }
      }

      const sourceNodeId = connectionState.nodeId;
      const sourceHandleId = connectionState.handleId || null;
      if (sourceNodeId) get().openModal({ x: clientX, y: clientY }, sourceNodeId, sourceHandleId);
    }
  },

  onDrop: (event, reactFlowInstance) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    get().addNode(type, position);
  },

  onNodesDelete: (nodesToDelete) => {
    if (nodesToDelete.some(node => node.id === get().selectedNodeId)) set({ selectedNodeId: null });
  },

  deleteNode: (id) => {
    const { nodes, edges, selectedNodeId } = get();
    set({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: selectedNodeId === id ? null : selectedNodeId,
      isDirty: true,
    });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeData: (id, newData) => {
    set({
      nodes: get().nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, ...newData } } : node),
      isDirty: true,
    });
    get().validateWorkflow();
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  validateWorkflow: () => {
    const allValid = get().nodes.every((node) => {
      const config = node.data.config;
      if (!config) return true;
      
      switch (node.type) {
        case 'trigger': {
            const trig = config as TriggerNodeConfig;
            return !!trig.accountId;
        }
        case 'action': {
          const discord = config as DiscordActionConfig;
          return !!discord.webhookUrl && !!discord.content;
        }
        case 'condition': {
          const cond = config as ConditionNodeConfig;
          return !!cond.conditions && cond.conditions.every((c) => !!c.value);
        }
        default: return true;
      }
    });
    set({ isValid: allValid });
  },

  updateGlobalSettings: (settings) => set((state) => ({ globalSettings: { ...state.globalSettings, ...settings }, isDirty: true })),
  openModal: (position, sourceNodeId, sourceHandleId) => set({ isModalOpen: true, modalPosition: position, sourceNodeId: sourceNodeId || null, sourceHandleId: sourceHandleId || null }),
  closeModal: () => set({ isModalOpen: false, sourceNodeId: null, sourceHandleId: null }),

  addNode: (type, positionOverride) => {
    const { nodes, sourceNodeId, sourceHandleId, onConnect } = get();
    const newNodeId = uuidv4();
    let position = positionOverride || { x: 250, y: 250 };
    if (!positionOverride && sourceNodeId) {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      if (sourceNode) {
        position = { x: sourceNode.position.x, y: sourceNode.position.y + 150 };
        if (sourceHandleId === 'true') position.x -= 100;
        if (sourceHandleId === 'false') position.x += 100;
      }
    }
    const newNode: Node<CustomNodeData> = { id: newNodeId, type, position, data: { label: type, config: {} as NodeConfig, isValid: false } };
    set({ nodes: [...nodes, newNode], isModalOpen: false });
    if (sourceNodeId) onConnect({ source: sourceNodeId, sourceHandle: sourceHandleId, target: newNodeId, targetHandle: null });
    set({ sourceNodeId: null, sourceHandleId: null });
  },
}));
