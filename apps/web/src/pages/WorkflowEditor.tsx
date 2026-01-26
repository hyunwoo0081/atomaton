import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  NodeMouseHandler,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from '../utils/api';
import { ConfigPanel } from '../components/ConfigPanel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkflowStore } from '../store/workflowStore';
import { TriggerNode } from '../components/nodes/TriggerNode';
import { ActionNode } from '../components/nodes/ActionNode';
import { ConditionNode } from '../components/nodes/ConditionNode';
import { NodeSelectionModal } from '../components/NodeSelectionModal';
import { TestRunModal } from '../components/TestRunModal';
import { Sidebar } from '../components/Sidebar';
import { Button } from '@atomaton/ui';

interface WorkflowData {
  id: string;
  name: string;
  trigger?: any;
  actions: any[];
  ui_config?: { nodes: any[]; edges: any[] };
  settings?: any;
}

const WorkflowEditorContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const queryClient = useQueryClient();
  
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
    isValid,
    validateWorkflow,
    isModalOpen,
    modalPosition,
    closeModal,
    addNode,
    globalSettings,
    updateGlobalSettings,
  } = useWorkflowStore();

  const nodeTypes: NodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    'trigger-webhook': TriggerNode,
    action: ActionNode,
    'action-notion': ActionNode,
    condition: ConditionNode,
  }), []);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => api.get<WorkflowData>(`/workflows/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (workflow) {
      // Load ui_config and settings from fetched workflow
      if (workflow.ui_config) {
        setNodes(workflow.ui_config.nodes);
        setEdges(workflow.ui_config.edges);
      } else {
        setNodes([]);
        setEdges([]);
      }
      if (workflow.settings) {
        updateGlobalSettings(workflow.settings);
      }
    }
  }, [workflow, setNodes, setEdges, updateGlobalSettings]);

  // Validate on mount and changes
  useEffect(() => {
    validateWorkflow();
  }, [nodes, validateWorkflow]);

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const isValidConnection = useCallback(
    (connection: Connection) => {
      // Prevent connecting to a source handle that is already connected
      const sourceHasConnection = edges.some(
        (edge) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle
      );
      return !sourceHasConnection;
    },
    [edges]
  );

  const handleConfigSave = (newConfig: any) => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, { config: newConfig });
    }
  };

  const saveWorkflowMutation = useMutation({
    mutationFn: (data: { nodes: any[]; edges: any[]; globalSettings: any }) => {
      return api.put(`/workflows/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      alert('Workflow saved successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to save workflow:', error);
      alert(`Failed to save workflow: ${error.message}`);
    },
  });

  const handleSaveWorkflow = async () => {
    if (!id) return;
    saveWorkflowMutation.mutate({ nodes, edges, globalSettings });
  };

  const handleRunTest = async (inputData: any) => {
    if (!id) throw new Error('Workflow ID is missing for test run.');
    try {
      const response = await api.post(`/workflows/${id}/test`, {
        nodes,
        edges,
        inputData,
      });
      return response;
    } catch (error: any) {
      console.error('Test run failed:', error);
      throw new Error(error.message || 'Test run failed');
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="h-full flex">
      <Sidebar onSave={handleSaveWorkflow} onTest={() => setIsTestModalOpen(true)} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
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
          <Background color="#ffffff" gap={16} size={1} style={{ opacity: 0.1 }} />
          <Controls className="bg-white/10 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden" />
        </ReactFlow>
        
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 text-center pointer-events-auto shadow-2xl">
              <h3 className="text-xl font-bold mb-2 text-white">Start your workflow</h3>
              <p className="text-white/50 mb-6">Drag a trigger from the sidebar or click below.</p>
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
  );
};

export const WorkflowEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  );
};
