import React, { useState, useCallback, useMemo, useRef } from 'react'
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'

import TriggerNode from '../components/flow/TriggerNode'
import ActionNode from '../components/flow/ActionNode'
import ConditionNode from '../components/flow/ConditionNode'

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'Start Trigger', type: 'imap' },
  },
]

const initialEdges: Edge[] = []

const AutomationEditorContent = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null)

  const nodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      action: ActionNode,
      condition: ConditionNode,
    }),
    []
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')

      if (typeof type === 'undefined' || !type) {
        return
      }

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: position || { x: 0, y: 0 },
        data: { label: `New ${type}` },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  const updateNodeData = (id: string, newData: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // Deep merge data
          return { ...node, data: { ...node.data, ...newData } }
        }
        return node
      })
    )
  }

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== id))
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== id && edge.target !== id)
      )
      setSelectedNodeId(null)
    },
    [setNodes, setEdges]
  )

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <header className="h-14 border-b flex items-center px-4 justify-between bg-white z-10">
        <h1 className="font-bold text-lg">Automation Editor</h1>
        <div className="space-x-2">
          <button
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
            onClick={() => console.log({ nodes, edges })}
          >
            Save
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            Deploy
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Toolbar */}
        <aside className="w-16 border-r bg-gray-50 flex flex-col items-center py-4 space-y-4 z-10">
          <div
            className="w-10 h-10 rounded bg-white border shadow-sm flex items-center justify-center hover:bg-blue-50 cursor-grab"
            title="Drag Trigger"
            onDragStart={(event) => onDragStart(event, 'trigger')}
            draggable
          >
            ⚡
          </div>
          <div
            className="w-10 h-10 rounded bg-white border shadow-sm flex items-center justify-center hover:bg-orange-50 cursor-grab"
            title="Drag Condition"
            onDragStart={(event) => onDragStart(event, 'condition')}
            draggable
          >
            ❓
          </div>
          <div
            className="w-10 h-10 rounded bg-white border shadow-sm flex items-center justify-center hover:bg-green-50 cursor-grab"
            title="Drag Action"
            onDragStart={(event) => onDragStart(event, 'action')}
            draggable
          >
            🚀
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel
              position="top-right"
              className="bg-white p-2 rounded shadow text-xs text-gray-500"
            >
              {nodes.length} nodes • {edges.length} edges
            </Panel>
          </ReactFlow>
        </div>

        {/* Property Panel */}
        {selectedNode && (
          <aside className="w-80 border-l bg-white p-4 overflow-y-auto z-10 shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="font-bold text-lg">Configuration</h2>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={selectedNode.data.label || ''}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, { label: e.target.value })
                  }
                />
              </div>

              {selectedNode.type === 'trigger' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={selectedNode.data.type || ''}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, { type: e.target.value })
                    }
                  >
                    <option value="">Select Type</option>
                    <option value="imap">IMAP Email</option>
                    <option value="webhook">Webhook</option>
                  </select>

                  {selectedNode.data.type === 'imap' && (
                    <div className="mt-2 space-y-2 p-2 bg-gray-50 rounded">
                      <p className="text-xs font-bold text-gray-500">
                        IMAP Settings
                      </p>
                      <input
                        type="text"
                        placeholder="Host"
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={selectedNode.data.host || ''}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            host: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        placeholder="User"
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={selectedNode.data.user || ''}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            user: e.target.value,
                          })
                        }
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={selectedNode.data.password || ''}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            password: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  {selectedNode.data.type === 'webhook' && (
                    <div className="mt-2 space-y-2 p-2 bg-gray-50 rounded">
                      <p className="text-xs font-bold text-gray-500">
                        Webhook URL
                      </p>
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          readOnly
                          value={`https://api.atomaton.com/webhook/${selectedNode.id}`}
                          className="w-full border rounded px-2 py-1 text-xs bg-gray-100 text-gray-500"
                        />
                        <button className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rule
                  </label>
                  <div className="space-y-2">
                    <select
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={selectedNode.data.field || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          field: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Field</option>
                      <option value="subject">Subject</option>
                      <option value="sender">Sender</option>
                      <option value="body">Body</option>
                    </select>
                    <select
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={selectedNode.data.operator || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          operator: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Operator</option>
                      <option value="contains">Contains</option>
                      <option value="equals">Equals</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Value"
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={selectedNode.data.value || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          value: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === 'action' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service
                  </label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={selectedNode.data.service || ''}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        service: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Service</option>
                    <option value="discord">Discord</option>
                    <option value="notion">Notion</option>
                  </select>

                  {selectedNode.data.service === 'discord' && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        placeholder="Webhook URL"
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={selectedNode.data.webhookUrl || ''}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            webhookUrl: e.target.value,
                          })
                        }
                      />
                      <textarea
                        placeholder="Message Content"
                        className="w-full border rounded px-2 py-1 text-xs h-20"
                        value={selectedNode.data.message || ''}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            message: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  {selectedNode.data.service === 'notion' && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        placeholder="API Key"
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={selectedNode.data.apiKey || ''}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            apiKey: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        placeholder="Database ID"
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={selectedNode.data.databaseId || ''}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            databaseId: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <button
                className="w-full py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                onClick={() => deleteNode(selectedNode.id)}
              >
                Delete Node
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default function AutomationEditor() {
  return (
    <ReactFlowProvider>
      <AutomationEditorContent />
    </ReactFlowProvider>
  )
}
