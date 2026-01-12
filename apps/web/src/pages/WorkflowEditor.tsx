import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from '../utils/api';
import { Button } from '@atomaton/ui';
import { ConfigPanel } from '../components/ConfigPanel';

interface WorkflowData {
  id: string;
  name: string;
  trigger?: any;
  actions: any[];
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const WorkflowEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ id: string; type: string; config: any } | null>(null);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
  }, [id]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const data = await api.get<WorkflowData>(`/workflows/${workflowId}`);
      setWorkflow(data);
      layoutWorkflow(data);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const layoutWorkflow = (data: WorkflowData) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let yPos = 50;
    const xPos = 250;

    // Trigger Node
    if (data.trigger) {
      newNodes.push({
        id: 'trigger',
        type: 'input',
        data: { label: `Trigger: ${data.trigger.type}`, config: data.trigger.config, originalData: data.trigger },
        position: { x: xPos, y: yPos },
        style: { background: '#fff', border: '1px solid #777', padding: 10, borderRadius: 5, width: 200, cursor: 'pointer' },
      });
      yPos += 150;
    } else {
        newNodes.push({
            id: 'trigger-placeholder',
            type: 'input',
            data: { label: 'Add Trigger' },
            position: { x: xPos, y: yPos },
            style: { background: '#f0f0f0', border: '1px dashed #777', padding: 10, borderRadius: 5, width: 200, cursor: 'pointer' },
        });
        yPos += 150;
    }

    // Action Nodes
    let previousNodeId = data.trigger ? 'trigger' : 'trigger-placeholder';
    
    data.actions.forEach((action, index) => {
      const nodeId = `action-${action.id}`;
      newNodes.push({
        id: nodeId,
        data: { label: `Action: ${action.type}`, config: action.config, originalData: action },
        position: { x: xPos, y: yPos },
        style: { background: '#fff', border: '1px solid #777', padding: 10, borderRadius: 5, width: 200, cursor: 'pointer' },
      });

      newEdges.push({
        id: `e-${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
      });

      previousNodeId = nodeId;
      yPos += 150;
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    if (node.id === 'trigger') {
      setSelectedNode({
        id: node.data.originalData.id,
        type: 'trigger',
        config: node.data.config
      });
    } else if (node.id.startsWith('action-')) {
      setSelectedNode({
        id: node.data.originalData.id,
        type: `action-${node.data.originalData.type}`,
        config: node.data.config
      });
    }
  }, []);

  const handleConfigSave = async (newConfig: any) => {
    if (!selectedNode || !workflow) return;

    // TODO: Implement API call to update trigger or action config
    console.log('Saving config for', selectedNode.id, newConfig);
    
    // Optimistic update for UI
    if (selectedNode.type === 'trigger') {
        // Update trigger config logic here (mock)
    } else {
        // Update action config logic here (mock)
    }

    setSelectedNode(null);
    alert('Config saved (mock)');
  };

  if (!workflow) return <div>Loading...</div>;

  return (
    <div className="h-screen flex flex-col relative">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">{workflow.name}</h1>
        <div className="space-x-2">
            <Button variant="secondary">Save</Button>
            <Button>Run Test</Button>
        </div>
      </div>
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        
        {selectedNode && (
          <ConfigPanel
            nodeId={selectedNode.id}
            nodeType={selectedNode.type}
            initialConfig={selectedNode.config}
            onSave={handleConfigSave}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};
