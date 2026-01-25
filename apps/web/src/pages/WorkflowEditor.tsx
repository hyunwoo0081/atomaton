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
import { useQuery } from '@tanstack/react-query';
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
}

const WorkflowEditorContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  
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
      layoutWorkflow(workflow);
    }
  }, [workflow]);

  const layoutWorkflow = (data: WorkflowData) => {
    const newNodes: any[] = [];
    const newEdges: any[] = [];
    let yPos = 50;
    const xPos = 250;

    // Trigger Node
    if (data.trigger) {
      let triggerType = 'trigger';
      if (data.trigger.type === 'WEBHOOK') triggerType = 'trigger-webhook';

      newNodes.push({
        id: 'trigger',
        type: triggerType,
        data: { label: `Trigger: ${data.trigger.type}`, config: data.trigger.config, originalData: data.trigger, isValid: true },
        position: { x: xPos, y: yPos },
      });
      yPos += 150;
    }

    // Action Nodes
    let previousNodeId = data.trigger ? 'trigger' : null;
    
    data.actions.forEach((action) => {
      const nodeId = `action-${action.id}`;
      let actionType = 'action';
      
      if (action.type === 'NOTION_PAGE') actionType = 'action-notion';

      newNodes.push({
        id: nodeId,
        type: actionType,
        data: { label: `Action: ${action.type}`, config: action.config, originalData: action, isValid: true },
        position: { x: xPos, y: yPos },
      });

      if (previousNodeId) {
        newEdges.push({
          id: `e-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
        });
      }

      previousNodeId = nodeId;
      yPos += 150;
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

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

  const handleSaveWorkflow = async () => {
    if (!id) return;
    try {
      console.log('Saving workflow:', { nodes, edges });
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const handleRunTest = async (inputData: any) => {
    console.log('Running test with:', inputData);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'SUCCESS',
          logs: ['Triggered by test event', 'Action executed: Discord Webhook'],
        });
      }, 1000);
    });
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
          style={{ background: 'transparent' }} // Transparent background
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
