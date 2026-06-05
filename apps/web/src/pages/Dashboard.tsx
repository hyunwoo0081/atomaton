import React, { useState, useRef, useEffect } from 'react'
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
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)
  const createDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = createDialogRef.current
    if (isCreateModalOpen) {
      if (dialog && !dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog && dialog.open) {
        dialog.close()
      }
    }
  }, [isCreateModalOpen])

  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null)
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

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

  const handleRenameClick = async (
    e: React.MouseEvent,
    id: string,
    currentName: string
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const newName = prompt('Enter a new name for this workflow:', currentName)
    if (newName === null) return

    const trimmed = newName.trim()
    if (!trimmed) {
      alert('Workflow name cannot be empty.')
      return
    }

    try {
      await api.put(`/workflows/${id}`, { name: trimmed })
      refetchWorkflows()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to rename workflow'
      alert(message)
    }
  }

  const handleDuplicateClick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      await api.post(`/workflows/${id}/duplicate`)
      refetchWorkflows()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to duplicate workflow'
      alert(message)
    }
  }

  const handleDeleteClick = async (
    e: React.MouseEvent,
    id: string,
    name: string
  ) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`Are you sure you want to delete the workflow "${name}"?`)) {
      return
    }

    try {
      await api.delete(`/workflows/${id}`)
      refetchWorkflows()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete workflow'
      alert(message)
    }
  }

  const handleToggleActiveClick = async (
    e: React.MouseEvent,
    id: string,
    currentStatus: boolean
  ) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      await api.put(`/workflows/${id}`, { is_active: !currentStatus })
      refetchWorkflows()
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update workflow status'
      alert(message)
    }
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
            <div key={workflow.id} className="relative group">
              <Link to={`/workflow/${workflow.id}`} className="block">
                <Card className="h-full flex flex-col justify-between transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(138,63,252,0.15)] min-h-[160px]">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 pr-10 truncate">
                      {workflow.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        workflow.is_active
                          ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/30'
                          : 'bg-white/10 text-white/50 border-white/20'
                      }`}
                    >
                      {workflow.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                    <span className="text-xs text-white/30 font-mono">
                      {new Date(workflow.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              </Link>

              {/* Ellipsis Actions Button */}
              <div className="absolute top-6 right-6 z-20">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setActiveDropdownId(
                      activeDropdownId === workflow.id ? null : workflow.id
                    )
                  }}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none"
                  title="Actions"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {activeDropdownId === workflow.id && (
                  <div
                    className="absolute right-0 mt-2 w-40 bg-[#17181F] border border-white/10 rounded-2xl shadow-2xl py-2 z-30 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <button
                      onClick={(e) => {
                        handleToggleActiveClick(
                          e,
                          workflow.id,
                          workflow.is_active
                        )
                        setActiveDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      {workflow.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={(e) => {
                        handleRenameClick(e, workflow.id, workflow.name)
                        setActiveDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        handleDuplicateClick(e, workflow.id)
                        setActiveDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      Duplicate
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      onClick={(e) => {
                        handleDeleteClick(e, workflow.id, workflow.name)
                        setActiveDropdownId(null)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#FF2E63]/10 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
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
      <dialog
        ref={createDialogRef}
        onClose={() => setIsCreateModalOpen(false)}
        onClick={(e) => {
          if (e.target === createDialogRef.current) {
            setIsCreateModalOpen(false)
          }
        }}
        className="border-0 bg-transparent p-0 outline-none backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
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
      </dialog>
    </div>
  )
}
