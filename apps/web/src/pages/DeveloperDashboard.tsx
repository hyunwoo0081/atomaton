import React, { useState, useRef, useEffect } from 'react'
import { Card, Button, Input } from '@atomaton/ui'
import { api } from '../utils/api'
import { useQuery } from '@tanstack/react-query'

interface SystemStats {
  overview: {
    totalUsers: number
    totalWorkflows: number
    activeWorkflows: number
    successRate: string
  }
  problematicWorkflows: {
    id: string
    name: string
    failureCount: number
  }[]
}

interface UserListItem {
  id: string
  email: string
  is_developer: boolean
  created_at: string
}

export const DeveloperDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats')

  // Modal states for creating user
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newIsDeveloper, setNewIsDeveloper] = useState(false)
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (isModalOpen) {
      if (dialog && !dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog && dialog.open) {
        dialog.close()
      }
    }
  }, [isModalOpen])

  // Fetch stats (always enabled)
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<SystemStats>({
    queryKey: ['systemStats'],
    queryFn: () => api.get<SystemStats>('/admin/stats'),
  })

  // Fetch users (enabled only when users tab is active or pre-loaded)
  const {
    data: users = [],
    refetch: refetchUsers,
    isLoading: usersLoading,
  } = useQuery<UserListItem[]>({
    queryKey: ['adminUsers'],
    queryFn: () => api.get<UserListItem[]>('/admin/users'),
    enabled: activeTab === 'users',
  })

  // Fetch current user details to prevent self-deletion
  const { data: me } = useQuery<{ id: string }>({
    queryKey: ['me'],
    queryFn: () => api.get<{ id: string }>('/auth/me'),
  })

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')

    if (newPassword.length < 8) {
      setModalError('Password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/admin/users', {
        email: newEmail,
        password: newPassword,
        is_developer: newIsDeveloper,
      })

      // Clear states & close modal
      setNewEmail('')
      setNewPassword('')
      setNewIsDeveloper(false)
      setIsModalOpen(false)

      // Refresh list
      refetchUsers()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create user'
      setModalError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (me?.id === userId) {
      alert('You cannot delete your own account.')
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete user ${email}?`
    )
    if (!confirmDelete) return

    try {
      await api.delete(`/admin/users/${userId}`)
      refetchUsers()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete user'
      alert(message)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
          Developer Dashboard
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Monitor system metrics and manage user accounts.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/10 space-x-8 mb-6">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-4 text-sm font-semibold transition-colors border-b-2 relative ${
            activeTab === 'stats'
              ? 'border-[#8A3FFC] text-white'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          System Statistics
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-semibold transition-colors border-b-2 relative ${
            activeTab === 'users'
              ? 'border-[#8A3FFC] text-white'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          User Management
        </button>
      </div>

      {/* TAB 1: SYSTEM STATISTICS */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          {statsLoading ? (
            <>
              {/* Stat Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card
                    key={i}
                    className="p-6 border border-white/5 bg-white/[0.02] backdrop-blur-md animate-pulse"
                  >
                    <div className="h-4 w-24 bg-white/10 rounded" />
                    <div className="mt-3 h-8 w-12 bg-white/10 rounded" />
                  </Card>
                ))}
              </div>

              {/* Problematic Workflows Skeleton */}
              <section>
                <div className="h-7 w-48 bg-white/10 rounded-lg mb-4 animate-pulse" />
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-pulse">
                  <div className="divide-y divide-white/5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="px-6 py-5 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div className="h-5 w-48 bg-white/10 rounded" />
                          <div className="h-5 w-20 bg-white/10 rounded-full" />
                        </div>
                        <div className="h-4 w-64 bg-white/10 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : statsError || !stats ? (
            <div className="text-red-500 py-8">
              Failed to load system statistics.
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border border-white/5 bg-white/[0.02] backdrop-blur-md">
                  <div className="text-sm font-medium text-white/50">
                    Total Users
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {stats.overview.totalUsers}
                  </div>
                </Card>
                <Card className="p-6 border border-white/5 bg-white/[0.02] backdrop-blur-md">
                  <div className="text-sm font-medium text-white/50">
                    Total Workflows
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {stats.overview.totalWorkflows}
                  </div>
                </Card>
                <Card className="p-6 border border-white/5 bg-white/[0.02] backdrop-blur-md">
                  <div className="text-sm font-medium text-white/50">
                    Active Workflows
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {stats.overview.activeWorkflows}
                  </div>
                </Card>
                <Card className="p-6 border border-white/5 bg-white/[0.02] backdrop-blur-md">
                  <div className="text-sm font-medium text-white/50">
                    Success Rate
                  </div>
                  <div className="mt-2 text-3xl font-bold text-[#00F5A0]">
                    {stats.overview.successRate}
                  </div>
                </Card>
              </div>

              {/* Problematic Workflows */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">
                  Top Failing Workflows
                </h2>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <ul className="divide-y divide-white/5">
                    {stats.problematicWorkflows.map((workflow) => (
                      <li
                        key={workflow.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-[#8A3FFC] truncate">
                              {workflow.name}
                            </p>
                            <div className="ml-2 flex-shrink-0 flex">
                              <p className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-[#FF2E63]/20 text-[#FF2E63] border border-[#FF2E63]/30">
                                {workflow.failureCount} Failures
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-white/30 font-mono">
                              ID: {workflow.id}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                    {stats.problematicWorkflows.length === 0 && (
                      <li className="px-6 py-8 text-center text-white/30 italic text-sm">
                        No problematic workflows found.
                      </li>
                    )}
                  </ul>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">User Accounts</h2>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF] text-white hover:shadow-[#8A3FFC]/20 transition-all duration-300"
            >
              + Add User
            </Button>
          </div>

          {usersLoading ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-pulse">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <div className="h-4 w-12 bg-white/10 rounded" />
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="h-4 w-10 bg-white/10 rounded" />
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="h-4 w-20 bg-white/10 rounded" />
                      </th>
                      <th className="px-6 py-4 text-right">
                        <div className="h-4 w-16 bg-white/10 rounded ml-auto" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[1, 2, 3, 4].map((i) => (
                      <tr key={i}>
                        <td className="px-6 py-5">
                          <div className="h-4 w-48 bg-white/10 rounded" />
                        </td>
                        <td className="px-6 py-5">
                          <div className="h-5 w-14 bg-white/10 rounded-full" />
                        </td>
                        <td className="px-6 py-5">
                          <div className="h-4 w-24 bg-white/10 rounded" />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="h-7 w-16 bg-white/10 rounded ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {users.map((u) => {
                      const isSelf = me?.id === u.id
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-white/[0.01] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                            {u.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                                u.is_developer
                                  ? 'bg-[#8A3FFC]/10 text-[#8A3FFC] border-[#8A3FFC]/20'
                                  : 'bg-white/10 text-white/60 border-white/25'
                              }`}
                            >
                              {u.is_developer ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white/60 font-mono text-xs">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {isSelf ? (
                              <span className="text-xs text-white/30 italic mr-2">
                                Current Session
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="text-[#FF2E63] hover:text-white hover:bg-[#FF2E63] px-2.5 py-1 rounded-md text-xs font-semibold border border-[#FF2E63]/20 hover:border-transparent transition-all duration-200"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      <dialog
        ref={dialogRef}
        onClose={() => setIsModalOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            setIsModalOpen(false)
          }
        }}
        className="border-0 bg-transparent p-0 outline-none backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <Card className="max-w-md w-full p-6 border border-white/10 bg-[#0D0E12]/95 shadow-2xl relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Create New User</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-white/40 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>

          {modalError && (
            <div className="p-3 mb-4 rounded-lg bg-[#FF2E63]/10 border border-[#FF2E63]/25 text-[#FF2E63] text-sm font-medium flex items-center space-x-2">
              <span>⚠️</span>
              <span>{modalError}</span>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={submitting}
            />

            <Input
              label="Password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              helperText="Must be at least 8 characters long."
            />

            <div className="flex items-center space-x-3 pt-2">
              <input
                id="is-dev-toggle"
                type="checkbox"
                checked={newIsDeveloper}
                onChange={(e) => setNewIsDeveloper(e.target.checked)}
                disabled={submitting}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#8A3FFC] focus:ring-[#8A3FFC]/50 focus:ring-2 focus:ring-offset-0"
              />
              <label
                htmlFor="is-dev-toggle"
                className="text-sm font-medium text-white/70 cursor-pointer select-none"
              >
                Grant Administrator / Developer privileges
              </label>
            </div>

            <div className="flex space-x-3 pt-4 justify-end">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF] text-white px-4 py-2"
              >
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </Card>
      </dialog>
    </div>
  )
}
