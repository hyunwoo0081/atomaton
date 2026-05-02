import { create } from 'zustand';
import { addEdge, applyEdgeChanges, applyNodeChanges, MarkerType, } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
export const useWorkflowStore = create((set, get) => ({
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
    onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes), isDirty: true });
    },
    onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges), isDirty: true });
    },
    onConnect: (connection) => {
        let label = '';
        let stroke = '#8A3FFC';
        if (connection.sourceHandle === 'true') {
            label = 'Yes';
            stroke = '#00F5A0';
        }
        else if (connection.sourceHandle === 'false') {
            label = 'No';
            stroke = '#FF2E63';
        }
        const newEdge = {
            ...connection,
            id: `e-${connection.source}-${connection.target}`,
            type: 'smoothstep',
            label,
            style: { stroke, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
        };
        set({ edges: addEdge(newEdge, get().edges), isDirty: true });
    },
    onConnectEnd: (event, connectionState) => {
        if (connectionState && !connectionState.isValid && connectionState.fromNode) {
            let clientX = 0, clientY = 0;
            if (event instanceof MouseEvent) {
                clientX = event.clientX;
                clientY = event.clientY;
            }
            else if (event.touches?.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            }
            const sourceNodeId = connectionState.fromNode.id;
            const sourceHandleId = connectionState.fromHandle?.id || null;
            if (sourceNodeId)
                get().openModal({ x: clientX, y: clientY }, sourceNodeId, sourceHandleId);
        }
    },
    onDrop: (event, reactFlowInstance) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type)
            return;
        const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        get().addNode(type, position);
    },
    onNodesDelete: (nodesToDelete) => {
        if (nodesToDelete.some(node => node.id === get().selectedNodeId))
            set({ selectedNodeId: null });
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
            if (!config)
                return true;
            switch (node.type) {
                case 'trigger': return !!config.accountId;
                case 'action': return !!config.webhookUrl && !!config.content;
                case 'condition': return config.conditions?.every((c) => c.value);
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
                if (sourceHandleId === 'true')
                    position.x -= 100;
                if (sourceHandleId === 'false')
                    position.x += 100;
            }
        }
        const newNode = { id: newNodeId, type, position, data: { label: type, config: {}, isValid: false } };
        set({ nodes: [...nodes, newNode], isModalOpen: false });
        if (sourceNodeId)
            onConnect({ source: sourceNodeId, sourceHandle: sourceHandleId, target: newNodeId, targetHandle: null });
        set({ sourceNodeId: null, sourceHandleId: null });
    },
}));
