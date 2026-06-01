import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Input, Button } from '@atomaton/ui'
import { api } from '../utils/api'

interface UserProfile {
  id: string
  email: string
  is_developer: boolean
}

export const Settings: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await api.get<UserProfile>('/auth/me')
        setProfile(user)
      } catch (err: unknown) {
        console.error('Failed to load profile:', err)
        setError('Failed to load user profile. Please sign in again.')
      } finally {
        setProfileLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      })

      setSuccess('Password changed successfully! Signing you out...')

      // Clear inputs
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // Sign out after 2 seconds
      setTimeout(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('is_developer')
        navigate('/login')
      }, 2000)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to change password'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const isPasswordMatch =
    newPassword && confirmPassword ? newPassword === confirmPassword : null

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4 relative z-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Manage your credentials and view profile information.
        </p>
      </div>

      {/* User Profile Card */}
      <Card className="p-6 border border-white/5 bg-white/[0.02] backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white mb-4">
          Profile Information
        </h2>
        {profileLoading ? (
          <div className="flex items-center space-x-2 text-white/50 py-2">
            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            <span>Loading profile...</span>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div>
              <span className="text-xs text-white/40 block mb-1">
                Email Address
              </span>
              <span className="text-white font-medium text-base">
                {profile.email}
              </span>
            </div>
            <div>
              <span className="text-xs text-white/40 block mb-1">
                Account Role
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#8A3FFC]/20 text-[#8A3FFC] border border-[#8A3FFC]/30">
                {profile.is_developer ? 'Developer User' : 'Regular User'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[#FF2E63] text-sm font-medium">
            Profile could not be loaded.
          </div>
        )}
      </Card>

      {/* Change Password Card */}
      <Card className="p-6 border border-white/5 bg-white/[0.02] backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white mb-4">
          Security settings
        </h2>

        {error && (
          <div className="p-4 mb-4 rounded-lg bg-[#FF2E63]/10 border border-[#FF2E63]/25 text-[#FF2E63] text-sm font-medium flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 mb-4 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-sm font-medium flex items-center space-x-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-5">
          <Input
            label="Current Password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />

          <Input
            label="New Password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            helperText="Must be at least 8 characters long."
          />

          <div className="space-y-1">
            <Input
              label="Confirm New Password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
            {isPasswordMatch !== null && (
              <div
                className={`text-xs font-semibold ${isPasswordMatch ? 'text-green-400' : 'text-[#FF2E63]'}`}
              >
                {isPasswordMatch
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={loading || profileLoading}
              className="w-full sm:w-auto bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF] text-white font-semibold shadow-lg hover:shadow-[#8A3FFC]/20 transition-all duration-300"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
