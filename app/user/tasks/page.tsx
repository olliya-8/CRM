"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"
import { MessageSquare, Clock, X, Send, CheckCircle, PlayCircle, AlertCircle, Users } from "lucide-react"
import toast, { Toaster } from 'react-hot-toast'

interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  assigned_to_email: string
  assigned_to_name: string | null
  assigned_by_name: string | null
  assigned_by_email: string
  created_by: string
  created_by_name: string | null
  attachment_url: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  is_read: boolean
  team_members: string[] | null
}

interface TaskComment {
  id: string
  task_id: string
  user_email: string
  user_name: string | null
  comment: string
  created_at: string
}

interface TaskAssignment {
  id: string
  task_id: string
  user_email: string
  user_name: string | null
  is_read: boolean
  status: string
  started_at: string | null
  completed_at: string | null
  assigned_at: string
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

export default function UserDashboard() {
  const router = useRouter()
  const { user } = useUser()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [assignment, setAssignment] = useState<TaskAssignment | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    if (!user) return router.push("/login")
    if (user.role !== "user") return router.push("/")
    fetchUserTasks()
    fetchEmployees()
    setupRealtime()
  }, [user])

  const setupRealtime = () => {
    const channel = supabase
      .channel('tasks-user')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `assigned_to_email=eq.${user?.email}`
      }, () => { fetchUserTasks() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_comments'
      }, () => {
        if (selectedTask) fetchComments(selectedTask.id)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  const fetchUserTasks = async () => {
    if (!user?.email) return
    setLoading(true)
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to_email", user.email)
      .order("created_at", { ascending: false })
    if (error) {
      toast.error("Failed to load tasks")
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('email, name')
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

  const fetchAssignment = async (taskId: string) => {
    if (!user?.email) return
    const { data } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_email', user.email)
      .single()
    if (data) setAssignment(data)
  }

  const getEmployeeName = (email: string) => {
    const emp = employees.find(e => e.email === email)
    return emp?.name || email
  }

  const handleViewTask = async (task: Task) => {
    setSelectedTask(task)
    setShowDetailsModal(true)
    fetchComments(task.id)
    fetchAssignment(task.id)
    if (!task.is_read) {
      await supabase.from('tasks').update({ is_read: true }).eq('id', task.id)
      await supabase
        .from('task_assignments')
        .update({ is_read: true })
        .eq('task_id', task.id)
        .eq('user_email', user?.email)
      fetchUserTasks()
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTask || !user?.email) return
    const currentTimestamp = new Date().toISOString()
    const loadingToast = toast.loading('Updating status...')

    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? currentTimestamp : null,
        updated_at: currentTimestamp
      })
      .eq('id', selectedTask.id)

    if (taskError) {
      toast.error(taskError.message, { id: loadingToast })
      return
    }

    const assignmentUpdate: any = {
      status: newStatus,
      completed_at: newStatus === 'completed' ? currentTimestamp : null
    }

    if (newStatus === 'in_progress' && !assignment?.started_at) {
      assignmentUpdate.started_at = currentTimestamp
    }

    const { error: assignmentError } = await supabase
      .from('task_assignments')
      .update(assignmentUpdate)
      .eq('task_id', selectedTask.id)
      .eq('user_email', user.email)

    if (assignmentError) {
      toast.error(assignmentError.message, { id: loadingToast })
      return
    }

    toast.success('Status updated!', { id: loadingToast })
    fetchUserTasks()
    fetchAssignment(selectedTask.id)
    setSelectedTask({ ...selectedTask, status: newStatus, updated_at: currentTimestamp })
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedTask || !user) return
    setSubmittingComment(true)
    const { error } = await supabase.from('task_comments').insert([{
      task_id: selectedTask.id,
      user_email: user.email,
      user_name: user.name || user.email,
      comment: newComment.trim()
    }])
    if (error) {
      toast.error(error.message)
    } else {
      setNewComment('')
      fetchComments(selectedTask.id)
      toast.success('Comment added')
    }
    setSubmittingComment(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-lg animate-pulse text-gray-700">Loading tasks...</p>
      </div>
    )
  }

  const unreadCount = tasks.filter(t => !t.is_read).length

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-10">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Tasks</h1>
          {unreadCount > 0 && (
            <span className="mt-2 inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
              {unreadCount} New
            </span>
          )}
        </div>

        {/* TASKS BY STATUS */}
        {tasks.length === 0 ? (
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-base sm:text-lg">No tasks assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {['pending', 'in_progress', 'completed'].map(status => (
              <div key={status} className="bg-white rounded-xl border shadow-sm p-4 sm:p-5">
                <h3 className="font-bold text-base sm:text-lg text-gray-700 capitalize mb-4 flex justify-between items-center">
                  <span className="truncate">{status === 'in_progress' ? 'In Progress' : status}</span>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </h3>
                <div className="space-y-3">
                  {tasks.filter(t => t.status === status).map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleViewTask(task)}
                      className={`border p-3 sm:p-4 rounded-lg hover:border-blue-400 hover:shadow-md transition cursor-pointer ${
                        !task.is_read ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-800 flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate">{task.title}</span>
                          {!task.is_read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                          )}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                        {task.description || 'No description'}
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p className="truncate">👤 By: {task.assigned_by_name || task.assigned_by_email}</p>
                        {task.due_date && (
                          <p className={`flex items-center gap-1 ${
                            new Date(task.due_date) < new Date() && task.status !== 'completed'
                              ? 'text-red-600 font-semibold' : ''
                          }`}>
                            📅 Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                        {task.team_members && task.team_members.length > 1 && (
                          <p className="flex items-center gap-1 text-blue-600 font-medium">
                            <Users size={11} /> Team Task · {task.team_members.length} members
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === status).length === 0 && (
                    <p className="text-sm text-gray-400 italic text-center py-4">No tasks</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TASK DETAILS MODAL */}
        {showDetailsModal && selectedTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-none sm:rounded-xl w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] overflow-hidden flex flex-col">

              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b">
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 break-words">
                      {selectedTask.title}
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded ${
                        selectedTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                        selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {selectedTask.priority} priority
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        selectedTask.status === 'completed' ? 'bg-green-100 text-green-700' :
                        selectedTask.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedTask.status.replace('_', ' ')}
                      </span>
                      {selectedTask.team_members && selectedTask.team_members.length > 1 && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
                          <Users size={11} /> Team Task
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Status Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  {selectedTask.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus('in_progress')}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm w-full sm:w-auto"
                    >
                      <PlayCircle size={16} /> Start Task
                    </button>
                  )}
                  {selectedTask.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm w-full sm:w-auto"
                    >
                      <CheckCircle size={16} /> Mark as Completed
                    </button>
                  )}
                  {selectedTask.status === 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus('in_progress')}
                      className="flex items-center justify-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm w-full sm:w-auto"
                    >
                      Reopen Task
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="space-y-4 bg-gray-50 p-3 sm:p-4 rounded-lg">

                  {/* Description */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <p className="text-sm sm:text-base text-gray-700 mt-1 break-words">
                      {selectedTask.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Team Members */}
                  {selectedTask.team_members && selectedTask.team_members.length > 1 && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Users size={12} /> Your Team
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedTask.team_members.map(email => (
                          <span
                            key={email}
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              email === user?.email
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {email === user?.email ? '👤 You' : getEmployeeName(email)}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        This task is shared with {selectedTask.team_members.length} team members
                      </p>
                    </div>
                  )}

                  {/* Assigned By / Created By */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Assigned By</label>
                      <p className="text-sm sm:text-base text-gray-700 mt-1 truncate">
                        {selectedTask.assigned_by_name || selectedTask.assigned_by_email}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Created By</label>
                      <p className="text-sm sm:text-base text-gray-700 mt-1 truncate">
                        {selectedTask.created_by_name || selectedTask.created_by}
                      </p>
                    </div>
                  </div>

                  {/* Due Date / Completed At */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Due Date</label>
                      <p className={`text-sm sm:text-base mt-1 ${
                        selectedTask.due_date &&
                        new Date(selectedTask.due_date) < new Date() &&
                        selectedTask.status !== 'completed'
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-700'
                      }`}>
                        {selectedTask.due_date
                          ? new Date(selectedTask.due_date).toLocaleDateString()
                          : 'Not set'}
                      </p>
                    </div>
                    {selectedTask.completed_at && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Completed At</label>
                        <p className="text-sm sm:text-base text-green-600 font-semibold mt-1">
                          {formatDateTime(selectedTask.completed_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Assignment Timestamps */}
                  {assignment && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {assignment.started_at && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Started At</label>
                          <p className="text-sm sm:text-base text-gray-700 mt-1">
                            {formatDateTime(assignment.started_at)}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Assigned At</label>
                        <p className="text-sm sm:text-base text-gray-700 mt-1">
                          {formatDateTime(assignment.assigned_at)}
                        </p>
                      </div>
                    </div>
                  )}

                                   {/* Attachment */}
                  {selectedTask.attachment_url && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Attachment
                      </label>

                      <a
                        href={selectedTask.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm sm:text-base text-blue-600 hover:underline mt-1 block break-all"
                      >
                        📎 View Attachment →
                      </a>
                    </div>
                  )}

                  {/* Created / Updated */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Created At</label>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDateTime(selectedTask.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Last Updated</label>
                      <p className="text-xs text-green-600 font-semibold mt-1">
                        {formatDateTime(selectedTask.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="border-t pt-4">
                  <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                    <MessageSquare size={20} /> Comments ({comments.length})
                  </h3>
                  <div className="space-y-3 mb-4 max-h-48 sm:max-h-60 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-gray-400 text-xs sm:text-sm italic text-center py-4">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1">
                            <span className="font-semibold text-sm text-gray-700 truncate">
                              {comment.user_email === user?.email
                                ? '👤 You'
                                : comment.user_name || comment.user_email}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                              <Clock size={12} />
                              {formatDateTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-600 text-xs sm:text-sm break-words">
                            {comment.comment}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  <form onSubmit={handleAddComment} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      disabled={submittingComment}
                      className="flex-1 p-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Send size={16} />
                      {submittingComment ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}