import { create } from 'zustand';
import {
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  type OnNodesDelete,
} from 'reactflow'
import { v4 as uuidv4 } from 'uuid';

interface GlobalSettings {
  enableFailureAlert: boolean;
  failureWebhookUrl: string;
}

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  isValid: boolean;
  globalSettings: GlobalSettings; // Added globalSettings
  
  // Modal State
  isModalOpen: boolean;
  modalPosition: { x: number; y: number };
  sourceNodeId: string | null;
  sourceHandleId: string | null;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onConnectEnd: (event: any, connectionState: any) => void;
  onDrop: (event: React.DragEvent, reactFlowInstance: any) => void;
  onNodesDelete: OnNodesDelete;
  deleteNode: (id: string) => void;
  
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (id: string, data: any) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  validateWorkflow: () => void;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void; // Added updateGlobalSettings
  
  // Modal Actions
  openModal: (position: { x: number; y: number }, sourceNodeId?: string, sourceHandleId?: string) => void;
  closeModal: () => void;
  addNode: (type: string, position?: { x: number; y: number }) => void;
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
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection: Connection) => {
    let label = '';
    let stroke = '#b1b1b7';

    // Add label for Condition Node
    if (connection.sourceHandle === 'true') {
      label = 'Yes';
      stroke = '#22c55e'; // Green
    } else if (connection.sourceHandle === 'false') {
      label = 'No';
      stroke = '#ef4444'; // Red
    }

    const newEdge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}`,
      type: 'smoothstep',
      label,
      style: { stroke, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
    };

    set({
      edges: addEdge(newEdge, get().edges),
      isDirty: true,
    });
  },

  onConnectEnd: (event, connectionState) => {
    // Only open modal if dropped on pane (not on another node) AND it's a valid start
    if (!connectionState.isValid && connectionState.fromNode) {
      const { clientX, clientY } = event instanceof TouchEvent ? event.touches[0] : event;
      const sourceNodeId = connectionState.fromNode.id;
      const sourceHandleId = connectionState.fromHandle?.id;

      if (sourceNodeId) {
        get().openModal({ x: clientX, y: clientY }, sourceNodeId, sourceHandleId);
      }
    }
  },

  onDrop: (event, reactFlowInstance) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow');
    if (typeof type === 'undefined' || !type) {
      return;
    }

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    get().addNode(type, position);
  },

  onNodesDelete: (nodesToDelete) => {
    const { selectedNodeId } = get();
    if (nodesToDelete.some(node => node.id === selectedNodeId)) {
      set({ selectedNodeId: null });
    }
  },

  deleteNode: (id) => {
    const { nodes, edges, selectedNodeId } = get();
    const newNodes = nodes.filter((n) => n.id !== id);
    const newEdges = edges.filter((e) => e.source !== id && e.target !== id);
    
    set({
      nodes: newNodes,
      edges: newEdges,
      selectedNodeId: selectedNodeId === id ? null : selectedNodeId,
      isDirty: true,
    });
  },

  setSelectedNodeId: (id) => {
    set({ selectedNodeId: id });
  },

  updateNodeData: (id, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      }),
      isDirty: true,
    });
    get().validateWorkflow();
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  validateWorkflow: () => {
    const { nodes } = get();
    const allValid = nodes.every((node) => {
      const config = node.data.config || {};
      switch (node.type) {
        case 'trigger':
          return !!config.accountId;
        case 'action':
          return !!config.webhookUrl && !!config.content;
        case 'condition':
          return config.conditions?.every((c: any) => c.value);
        default:
          return true;
      }
    });
    set({ isValid: allValid });
  },

  updateGlobalSettings: (settings) => {
    set((state) => ({
      globalSettings: { ...state.globalSettings, ...settings },
      isDirty: true,
    }));
  },

  openModal: (position, sourceNodeId, sourceHandleId) => {
    set({ isModalOpen: true, modalPosition: position, sourceNodeId, sourceHandleId });
  },

  closeModal: () => {
    set({ isModalOpen: false, sourceNodeId: null, sourceHandleId: null });
  },

  addNode: (type, positionOverride) => {
    const { nodes, sourceNodeId, sourceHandleId, onConnect } = get();
    const newNodeId = uuidv4();
    
    let position = positionOverride || { x: 250, y: 250 };
    
    if (!positionOverride && sourceNodeId) {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      if (sourceNode) {
        position = {
          x: sourceNode.position.x,
          y: sourceNode.position.y + 150,
        };
        if (sourceHandleId === 'true') position.x -= 100;
        if (sourceHandleId === 'false') position.x += 100;
      }
    }

    const newNode: Node = {
      id: newNodeId,
      type,
      position,
      data: { label: type, config: {}, isValid: false },
    };

    set({ nodes: [...nodes, newNode], isModalOpen: false });

    if (sourceNodeId) {
      onConnect({
        source: sourceNodeId,
        sourceHandle: sourceHandleId,
        target: newNodeId,
        targetHandle: null,
      });
    }
    
    set({ sourceNodeId: null, sourceHandleId: null });
  },
}));
