'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useUser } from '@/components/user-context'
import toast, { Toaster } from 'react-hot-toast'
import { Plus, Pencil, Trash2, MessageSquare, X, Send, Clock, User, Users } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Task {
  id: string
  title: string
  description: string | null
  assigned_to_email: string
  assigned_to_name: string | null
  assigned_by_email: string
  assigned_by_name: string | null
  priority: string
  status: string
  due_date: string | null
  completed_at: string | null
  attachment_url: string | null
  created_by: string
  created_by_name: string | null
  created_at: string
  updated_at: string
  is_read: boolean
  team_members?: string[] // For team assignment
}

interface TaskComment {
  id: string
  task_id: string
  user_email: string
  user_name: string | null
  comment: string
  created_at: string
}

interface Employee {
  email: string
  name: string
}

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })

export default function AdminTasksPage() {
  const { user: currentUser } = useUser() // ✅ Use user context instead
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // ✅ NEW: Team assignment
  const [isTeamTask, setIsTeamTask] = useState(false)
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to_email: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    attachment_url: ''
  })

  const [editMode, setEditMode] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => {
    if (currentUser?.email) {
      fetchTasks()
      fetchEmployees()
      setupRealtime()
    }
  }, [currentUser])

  const setupRealtime = () => {
    const channel = supabase
      .channel('tasks-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, () => {
        if (selectedTask) fetchComments(selectedTask.id)
      })
      .subscribe()
    
    return () => supabase.removeChannel(channel)
  }

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('email,name')
    if (data) setEmployees(data)
  }

  const fetchComments = async (taskId: string) => {
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    
    if (data) setComments(data)
  }

  // ✅ Toggle team member selection
  const toggleTeamMember = (email: string) => {
    setSelectedTeamMembers(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser?.email) {
      toast.error('User not authenticated')
      return
    }

    // ✅ Validation for team or individual assignment
    if (!formData.title) {
      toast.error('Title is required')
      return
    }

    if (!isTeamTask && !formData.assigned_to_email) {
      toast.error('Please assign to a user')
      return
    }

    if (isTeamTask && selectedTeamMembers.length === 0) {
      toast.error('Please select at least one team member')
      return
    }

    const currentTimestamp = new Date().toISOString()
    const loading = toast.loading(editMode ? 'Updating task...' : 'Creating task...')

    try {
      if (isTeamTask) {
        // ✅ CREATE TEAM TASK - One task per team member
        const teamNames = selectedTeamMembers
          .map(email => employees.find(e => e.email === email)?.name)
          .filter(Boolean)
          .join(', ')

        for (const memberEmail of selectedTeamMembers) {
          const assignedUser = employees.find(emp => emp.email === memberEmail)
          
          const taskData = {
            title: formData.title,
            description: formData.description || null,
            assigned_to_email: memberEmail,
            assigned_to_name: assignedUser?.name || null,
            assigned_by_email: currentUser.email,
            assigned_by_name: currentUser.name || currentUser.email,
            created_by: currentUser.email,
            created_by_name: currentUser.name || currentUser.email,
            priority: formData.priority,
            status: formData.status,
            due_date: formData.due_date || null,
            attachment_url: formData.attachment_url || null,
            updated_at: currentTimestamp,
            is_read: false,
            team_members: selectedTeamMembers // Store team info
          }

          const { data: newTask, error } = await supabase
            .from('tasks')
            .insert([{ ...taskData, created_at: currentTimestamp }])
            .select()
            .single()

          if (error) throw error

          if (newTask) {
            await supabase.from('task_assignments').insert([{
              task_id: newTask.id,
              user_email: memberEmail,
              user_name: assignedUser?.name || null,
              assigned_at: currentTimestamp
            }])

            // ✅ NOTIFY EACH TEAM MEMBER
            await supabase.from('leave_notifications').insert([{
              user_email: memberEmail,
              leave_id: null,
              type: 'task',
              message: `${currentUser.name || currentUser.email} assigned you a team task: "${formData.title}" (Team: ${teamNames})`,
              status: 'pending',
              is_read: false
            }])
          }
        }

        toast.success(`Team task created for ${selectedTeamMembers.length} members`, { id: loading })
      } else {
        // ✅ INDIVIDUAL TASK
        const assignedUser = employees.find(emp => emp.email === formData.assigned_to_email)

        const taskData = {
          title: formData.title,
          description: formData.description || null,
          assigned_to_email: formData.assigned_to_email,
          assigned_to_name: assignedUser?.name || null,
          assigned_by_email: currentUser.email,
          assigned_by_name: currentUser.name || currentUser.email,
          created_by: currentUser.email,
          created_by_name: currentUser.name || currentUser.email,
          priority: formData.priority,
          status: formData.status,
          due_date: formData.due_date || null,
          attachment_url: formData.attachment_url || null,
          updated_at: currentTimestamp,
          is_read: false
        }

        if (editMode && editingTask) {
          const { error } = await supabase
            .from('tasks')
            .update(taskData)
            .eq('id', editingTask.id)

          if (error) throw error

          if (taskData.status !== editingTask.status) {
            await supabase
              .from('task_assignments')
              .update({ 
                status: taskData.status,
                completed_at: taskData.status === 'completed' ? currentTimestamp : null
              })
              .eq('task_id', editingTask.id)
          }

          toast.success('Task updated successfully', { id: loading })
        } else {
          const { data: newTask, error } = await supabase
            .from('tasks')
            .insert([{ ...taskData, created_at: currentTimestamp }])
            .select()
            .single()

          if (error) throw error

          if (newTask) {
            await supabase.from('task_assignments').insert([{
              task_id: newTask.id,
              user_email: formData.assigned_to_email,
              user_name: assignedUser?.name || null,
              assigned_at: currentTimestamp
            }])

            // ✅ NOTIFY USER
            if (formData.assigned_to_email !== currentUser.email) {
              await supabase.from('leave_notifications').insert([{
                user_email: formData.assigned_to_email,
                leave_id: null,
                type: 'task',
                message: `${currentUser.name || currentUser.email} assigned you a task: "${formData.title}"`,
                status: 'pending',
                is_read: false
              }])
            }
          }

          toast.success('Task created successfully', { id: loading })
        }
      }

      setShowModal(false)
      setEditMode(false)
      setEditingTask(null)
      resetForm()
      fetchTasks()
    } catch (error: any) {
      toast.error(error.message, { id: loading })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    const loading = toast.loading('Deleting task...')
    await supabase.from('task_comments').delete().eq('task_id', id)
    await supabase.from('task_assignments').delete().eq('task_id', id)
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      toast.error(error.message, { id: loading })
      return
    }
    toast.success('Task deleted', { id: loading })
    fetchTasks()
    if (showDetailsModal) setShowDetailsModal(false)
  }

  const handleEdit = (task: Task) => {
    setEditMode(true)
    setEditingTask(task)
    setIsTeamTask(false)
    setSelectedTeamMembers([])
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to_email: task.assigned_to_email,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || '',
      attachment_url: task.attachment_url || ''
    })
    setShowModal(true)
  }

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task)
    setShowDetailsModal(true)
    fetchComments(task.id)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedTask || !currentUser?.email) return

    setSubmittingComment(true)

    const { error: commentError } = await supabase.from('task_comments').insert([{
      task_id: selectedTask.id,
      user_email: currentUser.email,
      user_name: currentUser.name || currentUser.email,
      comment: newComment.trim()
    }])

    if (commentError) {
      toast.error(commentError.message)
      setSubmittingComment(false)
      return
    }

    // ✅ SEND NOTIFICATION TO ASSIGNED USER (if admin commented)
    if (selectedTask.assigned_to_email !== currentUser.email) {
      await supabase.from('leave_notifications').insert([{
        user_email: selectedTask.assigned_to_email,
        leave_id: null,
        type: 'task_comment',
        message: `${currentUser.name || currentUser.email} commented on task: "${selectedTask.title}"`,
        is_read: false
      }])
    }

    setNewComment('')
    fetchComments(selectedTask.id)
    toast.success('Comment added')
    setSubmittingComment(false)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assigned_to_email: '',
      priority: 'medium',
      status: 'pending',
      due_date: '',
      attachment_url: ''
    })
    setIsTeamTask(false)
    setSelectedTeamMembers([])
  }

  if (!currentUser) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Tasks Management</h1>
        <button
          onClick={() => {
            setEditMode(false)
            setEditingTask(null)
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition"
        >
          <Plus size={18} /> Add Task
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {['pending', 'in_progress', 'completed'].map(status => (
          <div key={status} className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-bold text-lg text-gray-700 capitalize mb-4 flex justify-between items-center">
              {status.replace('_', ' ')}
              <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                {tasks.filter(t => t.status === status).length}
              </span>
            </h3>
            
            <div className="space-y-3">
              {tasks.filter(t => t.status === status).map(task => (
                <div
                  key={task.id}
                  onClick={() => handleViewDetails(task)}
                  className="border border-gray-200 p-4 rounded-lg hover:border-blue-400 hover:shadow-md transition cursor-pointer bg-white"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{task.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="flex items-center gap-1">
                      👤 {task.assigned_to_name || task.assigned_to_email}
                    </p>
                    <p className="flex items-center gap-1">
                      <User size={12} /> 
                      By: {task.assigned_by_name || task.assigned_by_email}
                    </p>
                    {task.due_date && <p>📅 Due: {new Date(task.due_date).toLocaleDateString()}</p>}
                    {task.team_members && task.team_members.length > 0 && (
                      <p className="flex items-center gap-1 text-blue-600">
                        <Users size={12} /> Team Task ({task.team_members.length} members)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(task); }} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                      <Pencil size={14} /> Edit
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editMode ? 'Edit Task' : 'Create New Task'}</h2>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
              <input required className="w-full p-2 border rounded-lg" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea className="w-full p-2 border rounded-lg" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>

            {/* ✅ TEAM ASSIGNMENT TOGGLE */}
            {!editMode && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                <input
                  type="checkbox"
                  id="teamTask"
                  checked={isTeamTask}
                  onChange={(e) => {
                    setIsTeamTask(e.target.checked)
                    if (e.target.checked) {
                      setFormData({ ...formData, assigned_to_email: '' })
                    }
                    setSelectedTeamMembers([])
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="teamTask" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Users size={16} />
                  Assign to multiple users (Team Task)
                </label>
              </div>
            )}

            {/* ✅ CONDITIONAL: INDIVIDUAL OR TEAM ASSIGNMENT */}
            {isTeamTask ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Team Members * ({selectedTeamMembers.length} selected)
                </label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {employees.map(emp => (
                    <label key={emp.email} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTeamMembers.includes(emp.email)}
                        onChange={() => toggleTeamMember(emp.email)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{emp.name}</span>
                      <span className="text-xs text-gray-500">({emp.email})</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assign To *</label>
                <select required className="w-full p-2 border rounded-lg" value={formData.assigned_to_email} onChange={e => setFormData({ ...formData, assigned_to_email: e.target.value })}>
                  <option value="">Select employee</option>
                  {employees.map(emp => <option key={emp.email} value={emp.email}>{emp.name}</option>)}
                </select>
              </div>
            )}

            {/* ✅ SHOW WHO IS ASSIGNING */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Assigned by:</span> {currentUser?.name || currentUser?.email}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                <select className="w-full p-2 border rounded-lg" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select className="w-full p-2 border rounded-lg" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                <input type="date" className="w-full p-2 border rounded-lg" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                {editMode ? 'Update Task' : isTeamTask ? `Create Team Task (${selectedTeamMembers.length})` : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <p className="flex items-center gap-1">
                    <User size={14} />
                    Assigned to: <span className="font-semibold">{selectedTask.assigned_to_name || selectedTask.assigned_to_email}</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <User size={14} />
                    By: <span className="font-semibold">{selectedTask.assigned_by_name || selectedTask.assigned_by_email}</span>
                  </p>
                </div>
                {selectedTask.team_members && selectedTask.team_members.length > 0 && (
                  <p className="mt-1 text-sm text-blue-600 flex items-center gap-1">
                    <Users size={14} />
                    Team Task ({selectedTask.team_members.length} members)
                  </p>
                )}
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{selectedTask.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white border p-3 rounded-lg">
                  <span className="text-gray-500">Priority:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    selectedTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                    selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{selectedTask.priority}</span>
                </div>
                <div className="bg-white border p-3 rounded-lg">
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 font-semibold capitalize">{selectedTask.status.replace('_', ' ')}</span>
                </div>
                {selectedTask.due_date && (
                  <div className="bg-white border p-3 rounded-lg col-span-2">
                    <span className="text-gray-500">Due Date:</span>
                    <span className="ml-2 font-semibold">{new Date(selectedTask.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="bg-white border p-3 rounded-lg col-span-2">
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-xs">{formatDateTime(selectedTask.created_at)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MessageSquare size={20} /> Comments ({comments.length})</h3>
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold">{comment.user_name || comment.user_email}</span>
                        <span className="text-gray-400">{formatDateTime(comment.created_at)}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{comment.comment}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    disabled={submittingComment}
                    className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
