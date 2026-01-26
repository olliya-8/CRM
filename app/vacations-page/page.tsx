'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useUser } from '@/components/user-context'
import { Bell } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface LeaveRequest {
  id: string
  user_id: string | null
  employee_name: string
  email: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_by?: string | null
  approved_at?: string | null
  is_read?: boolean
}

// Utility Functions
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const calculateDays = (start: string, end: string) =>
  Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1

export default function VacationsPage() {
  const { user } = useUser()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    fetchLeaveRequests()
    setupRealtimeSubscription()
  }, [])

  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setLeaveRequests(data)
      const unreadCount = data.filter((r: LeaveRequest) => !r.is_read).length
      setNewRequestsCount(unreadCount)

      // Mark all as read when opening page
      if (unreadCount > 0) markAllAsRead(data)
    } else if (error) {
      console.error(error)
      toast.error('Failed to fetch leave requests')
    }
    setLoading(false)
  }

  const markAllAsRead = async (requests: LeaveRequest[]) => {
    const unreadIds = requests.filter(r => !r.is_read).map(r => r.id)
    if (unreadIds.length === 0) return
    await supabase.from('leave_requests').update({ is_read: true }).in('id', unreadIds)
    setNewRequestsCount(0)
  }

  // Realtime subscription
  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('leave-requests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success('🏖️ New leave request received!', { duration: 5000, icon: '🔔' })
          }
          if (payload.eventType === 'UPDATE') {
            toast.success('📝 Leave request updated!', { duration: 3000 })
          }
          fetchLeaveRequests()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  const getLeavesByStatus = (status: 'approved' | 'pending' | 'rejected') =>
    leaveRequests.filter(v => v.status === status)

  // Approve / Reject / Delete
  const handleApprove = async (id: string) => {
    const loadingToast = toast.loading('Approving leave...')
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'approved', approved_by: user?.email, approved_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      toast.success('Leave approved ✅', { id: loadingToast })
      fetchLeaveRequests()
      setShowDetailsModal(false)
    } else toast.error('Failed: ' + error.message, { id: loadingToast })
  }

  const handleReject = async (id: string) => {
    const loadingToast = toast.loading('Rejecting leave...')
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'rejected', approved_by: user?.email, approved_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      toast.success('Leave rejected ❌', { id: loadingToast })
      fetchLeaveRequests()
      setShowDetailsModal(false)
    } else toast.error('Failed: ' + error.message, { id: loadingToast })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    const loadingToast = toast.loading('Deleting leave...')
    const { error } = await supabase.from('leave_requests').delete().eq('id', id)
    if (!error) {
      toast.success('Leave deleted 🗑️', { id: loadingToast })
      fetchLeaveRequests()
      setShowDetailsModal(false)
    } else toast.error('Failed: ' + error.message, { id: loadingToast })
  }

  const openDetailsModal = (leave: LeaveRequest) => {
    setSelectedLeave(leave)
    setShowDetailsModal(true)
  }

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-lg text-slate-600 animate-pulse">Loading leave requests...</div>
      </div>
    )

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50">
      <Toaster position="top-right" />
      <main className="p-4 sm:p-6 md:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Leave Requests
            </h1>
            {newRequestsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full animate-pulse">
                <Bell className="w-4 h-4" />
                <span className="text-sm font-semibold">{newRequestsCount} new</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="flex flex-wrap gap-4 mb-6">
          <StatusCard title="Pending" color="yellow" leaves={getLeavesByStatus('pending')} onLeaveClick={openDetailsModal} showBadge={newRequestsCount > 0} />
          <StatusCard title="Approved" color="green" leaves={getLeavesByStatus('approved')} onLeaveClick={openDetailsModal} />
          <StatusCard title="Rejected" color="red" leaves={getLeavesByStatus('rejected')} onLeaveClick={openDetailsModal} />
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedLeave && (
          <LeaveDetailsModal leave={selectedLeave} onClose={() => setShowDetailsModal(false)} onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />
        )}
      </main>
    </div>
  )
}

// ---------------- Status Card ----------------
interface StatusCardProps {
  title: string
  color: 'green' | 'yellow' | 'red'
  leaves: LeaveRequest[]
  onLeaveClick: (leave: LeaveRequest) => void
  showBadge?: boolean
}

const StatusCard = ({ title, color, leaves, onLeaveClick, showBadge = false }: StatusCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const colors = {
    green: { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700', borderAccent: 'border-green-400' },
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700', borderAccent: 'border-yellow-400' },
    red: { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700', borderAccent: 'border-red-400' },
  }
  const c = colors[color]

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex-1 min-w-[220px] bg-white rounded-lg border-2 ${c.border} p-5 cursor-pointer hover:shadow-lg transition-all relative`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className={`text-lg font-bold ${c.text}`}>{title}</h3>
          {showBadge && title === 'Pending' && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
        </div>
        <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center`}>
          <span className="text-xl font-bold">{leaves.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        {leaves.slice(0, 3).map((leave) => (
          <div
            key={leave.id}
            onClick={(e) => {
              e.stopPropagation()
              onLeaveClick(leave)
            }}
            className={`text-sm text-slate-600 border-l-2 pl-2 ${c.borderAccent} hover:bg-slate-50 rounded p-2 transition-colors cursor-pointer`}
          >
            <div className="font-medium">{leave.employee_name}</div>
            <div className="text-xs text-slate-500">{leave.email}</div>
            <div className="text-xs">
              {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
            </div>
            <div className="text-xs text-slate-500 truncate">{leave.reason}</div>
          </div>
        ))}
        {leaves.length > 3 && <div className={`text-xs font-medium ${c.text}`}>+{leaves.length - 3} more</div>}
      </div>
    </div>
  )
}

// ---------------- Leave Details Modal ----------------
interface LeaveDetailsModalProps {
  leave: LeaveRequest
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onDelete: (id: string) => void
}

const LeaveDetailsModal = ({ leave, onClose, onApprove, onReject, onDelete }: LeaveDetailsModalProps) => {
  const statusColors = {
    approved: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
  }
  const colors = statusColors[leave.status]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Leave Request Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee Name</label>
            <p className="text-lg font-bold text-slate-900 mt-1">{leave.employee_name}</p>
            <p className="text-sm text-slate-600 mt-1">{leave.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
            <span className={`${colors.bg} ${colors.text} px-4 py-2 rounded-full text-sm font-semibold border ${colors.border}`}>
              {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
            </span>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2 block">Leave Type</label>
            <p className="text-base font-semibold text-slate-900">{leave.leave_type}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 block">Leave Period</label>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Start Date</p>
                <p className="text-base font-semibold text-slate-900">{formatDate(leave.start_date)}</p>
              </div>
              <div className="text-slate-400">→</div>
              <div>
                <p className="text-xs text-slate-500">End Date</p>
                <p className="text-base font-semibold text-slate-900">{formatDate(leave.end_date)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-slate-600">
                Total Duration: <span className="font-bold text-blue-600">{calculateDays(leave.start_date, leave.end_date)} days</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</label>
            <p className="text-base text-slate-900 mt-1 leading-relaxed">{leave.reason}</p>
          </div>

          {leave.approved_by && (
            <div className="bg-slate-50 rounded-lg p-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Approved/Rejected By</label>
              <p className="text-sm text-slate-900 mt-1">{leave.approved_by}</p>
              {leave.approved_at && <p className="text-xs text-slate-500 mt-1">{formatDate(leave.approved_at)}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t">
          {leave.status === 'pending' ? (
            <>
              <button onClick={() => onApprove(leave.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2">
                ✅ Approve
              </button>
              <button onClick={() => onReject(leave.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2">
                ❌ Reject
              </button>
            </>
          ) : (
            <button onClick={() => onDelete(leave.id)} className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2">
              🗑️ Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
