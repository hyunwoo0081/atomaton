import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Input } from '@atomaton/ui'
import { api } from '../utils/api'
import { LogTable } from '../components/LogTable'
import { useQuery } from '@tanstack/react-query'
import { LogEntry } from '../types/workflow'

interface WorkflowShort {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export const Dashboard: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const {
    data: workflows = [],
    isLoading: isLoadingWorkflows,
    refetch: refetchWorkflows,
  } = useQuery<WorkflowShort[]>({
    queryKey: ['workflows'],
    queryFn: () => api.get<WorkflowShort[]>('/workflows'),
  })

  const { data: logsData, isLoading: isLoadingLogs } = useQuery<{
    logs: LogEntry[]
  }>({
    queryKey: ['logs'],
    queryFn: () => api.get<{ logs: LogEntry[] }>('/logs?limit=10'),
  })

  const logs = logsData?.logs || []
  const isLoading = isLoadingWorkflows || isLoadingLogs

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (!newWorkflowName.trim()) {
      setCreateError('Workflow name is required.')
      return
    }

    setCreating(true)
    try {
      await api.post('/workflows', { name: newWorkflowName })

      // Reset state and close modal
      setNewWorkflowName('')
      setIsCreateModalOpen(false)

      // Refresh list without reloading page
      refetchWorkflows()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create workflow'
      setCreateError(message)
    } finally {
      setCreating(false)
    }
  }

  const openCreateModal = () => {
    setNewWorkflowName('')
    setCreateError('')
    setIsCreateModalOpen(true)
  }

  if (isLoading) {
    return <div className="p-8 text-white">Loading...</div>
  }

  return (
    <div className="space-y-12 relative z-10">
      <section>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Workflows</h1>
          <Button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF] text-white hover:shadow-[#8A3FFC]/20 transition-all duration-300"
          >
            + New Workflow
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Link
              key={workflow.id}
              to={`/workflow/${workflow.id}`}
              className="block group"
            >
              <Card className="h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(138,63,252,0.2)]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {workflow.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        workflow.is_active
                          ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/30'
                          : 'bg-white/10 text-white/50 border-white/20'
                      }`}
                    >
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-sm text-white/40 font-mono">
                    {new Date(workflow.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </Link>
          ))}

          {workflows.length === 0 && (
            <div className="col-span-full text-center py-12 text-white/50 border border-dashed border-white/10 rounded-3xl">
              No workflows found. Create your first one!
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        <LogTable logs={logs} />
      </section>

      {/* Create Workflow Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="max-w-md w-full p-6 border border-white/10 bg-[#0D0E12]/95 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Create New Workflow
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 mb-4 rounded-lg bg-[#FF2E63]/10 border border-[#FF2E63]/25 text-[#FF2E63] text-sm font-medium flex items-center space-x-2">
                <span>⚠️</span>
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWorkflow} className="space-y-5">
              <Input
                label="Workflow Name"
                type="text"
                required
                autoFocus
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="My Awesome Workflow"
                disabled={creating}
              />

              <div className="flex space-x-3 pt-4 justify-end">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF] text-white px-4 py-2"
                >
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
