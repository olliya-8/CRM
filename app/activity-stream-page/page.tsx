'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useSearchContext } from '@/components/contexts/SearchContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Activity {
  id: string
  username: string
  role: string
  action: string
  type: 'update' | 'attach' | 'comment' | 'complete'
  created_at: string
}

export default function ActivityStreamPage() {
  const router = useRouter()
  const { updateSearchIndex } = useSearchContext()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  const [formData, setFormData] = useState({
    username: '',
    role: '',
    action: '',
    type: 'update' as Activity['type']
  })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.replace('/login')
      return
    }

    const user = JSON.parse(userStr)
    setIsAdmin(user.role === 'admin' || user.role === 'Admin')
    fetchActivities()
  }, [router])

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('activity_stream')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setActivities(data || [])
    
    // ✅ REGISTER ACTIVITIES FOR SEARCH
    if (data && data.length > 0) {
      updateSearchIndex('activities', data.map(activity => ({
        id: activity.id,
        name: activity.username,
        username: activity.username,
        role: activity.role,
        action: activity.action,
        type: activity.type,
        created_at: activity.created_at,
        // For search display
        title: activity.username,
        subtitle: `${activity.action} - ${new Date(activity.created_at).toLocaleDateString()}`
      })))
    }

    setLoading(false)
  }

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return toast.error('Admin only')

    const payload = {
      username: formData.username.trim(),
      role: formData.role.trim(),
      action: formData.action.trim(),
      type: formData.type
    }

    if (!payload.username || !payload.role || !payload.action)
      return toast.error('All fields required')

    const loadingToast = toast.loading('Saving...')

    if (editingActivity) {
      const { error } = await supabase
        .from('activity_stream')
        .update(payload)
        .eq('id', editingActivity.id)

      if (error) toast.error(error.message, { id: loadingToast })
      else toast.success('Updated', { id: loadingToast })
    } else {
      const { error } = await supabase
        .from('activity_stream')
        .insert([payload])

      if (error) toast.error(error.message, { id: loadingToast })
      else toast.success('Added', { id: loadingToast })
    }

    setShowModal(false)
    setEditingActivity(null)
    setFormData({ username: '', role: '', action: '', type: 'update' })
    fetchActivities()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete activity?')) return
    const { error } = await supabase.from('activity_stream').delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Activity deleted')
      fetchActivities()
    }
  }

  const avatarColor = (t: string) =>
    t === 'update' ? 'bg-blue-500' :
    t === 'attach' ? 'bg-purple-500' :
    t === 'comment' ? 'bg-green-500' :
    'bg-rose-500'

  const icon = (t: string) =>
    t === 'update' ? '🔄' :
    t === 'attach' ? '📎' :
    t === 'comment' ? '💬' :
    '✅'

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600">Loading activities...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Activity Stream
          </h1>
          <p className="text-gray-600">
            View all team activities and updates
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
          >
            + Add Activity
          </button>
        )}
      </div>

      {/* CONTENT */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No activities yet</p>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
            >
              Add your first activity
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activities.map(a => (
            <div
              key={a.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                <div
                  className={`w-12 h-12 ${avatarColor(a.type)} rounded-full flex items-center justify-center text-white text-xl flex-shrink-0`}
                >
                  {icon(a.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg text-gray-900">{a.username}</p>
                      <p className="text-sm text-gray-500">{a.role}</p>
                    </div>

                    {isAdmin && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          onClick={() => {
                            setEditingActivity(a)
                            setFormData(a)
                            setShowModal(true)
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDelete(a.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-gray-700">{a.action}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              {editingActivity ? 'Edit Activity' : 'Add Activity'}
            </h2>

            <form onSubmit={handleAddOrEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter role"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <textarea 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Describe the activity"
                  rows={3}
                  value={formData.action}
                  onChange={e => setFormData({ ...formData, action: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as Activity['type'] })}
                >
                  <option value="update">Update</option>
                  <option value="attach">Attach</option>
                  <option value="comment">Comment</option>
                  <option value="complete">Complete</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false)
                    setEditingActivity(null)
                    setFormData({ username: '', role: '', action: '', type: 'update' })
                  }}
                  className="flex-1 border border-gray-300 rounded-lg p-2.5 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2.5 font-semibold transition-colors"
                >
                  {editingActivity ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}