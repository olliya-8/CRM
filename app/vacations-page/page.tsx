'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useUser } from '@/components/user-context'
import { Bell, Calendar, Plus, Edit2, Trash2, X } from 'lucide-react'

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
  updated_at: string
  leave_request_id: string | null
  approved_by?: string | null
  approved_at?: string | null
}

interface CompanyHoliday {
  id: string
  title: string
  description: string | null
  date: string
  end_date?: string | null
  holiday_type: string
  is_recurring: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function VacationsPage() {
  const { user } = useUser()

  const [activeTab, setActiveTab] = useState<'leaves' | 'holidays'>('leaves')
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [companyHolidays, setCompanyHolidays] = useState<CompanyHoliday[]>([])
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [loadingLeaves, setLoadingLeaves] = useState(true)
  const [loadingHolidays, setLoadingHolidays] = useState(true)

  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [showLeaveDetailsModal, setShowLeaveDetailsModal] = useState(false)

  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState<CompanyHoliday | null>(null)
  const [showHolidayDetailsModal, setShowHolidayDetailsModal] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    end_date: '',
    holiday_type: '',
    is_recurring: false,
  })
  const [submitting, setSubmitting] = useState(false)

  const [editHoliday, setEditHoliday] = useState({
    title: '',
    date: '',
    end_date: '',
    description: '',
    holiday_type: '',
    is_recurring: false
  })

  useEffect(() => {
    fetchLeaveRequests()
    fetchCompanyHolidays()
    fetchNewNotificationsCount()
    setupRealtime()
  }, [])

  const fetchLeaveRequests = async () => {
    setLoadingLeaves(true)
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setLeaveRequests(data)
    setLoadingLeaves(false)
  }

  const fetchCompanyHolidays = async () => {
    setLoadingHolidays(true)
    const { data } = await supabase
      .from('company_holidays')
      .select('*')
      .order('date', { ascending: true })
    if (data) setCompanyHolidays(data)
    setLoadingHolidays(false)
  }

  const fetchNewNotificationsCount = async () => {
    const { count } = await supabase
      .from('leave_notifications')
      .select('*', { count: 'exact' })
      .eq('user_email', user?.email)
      .eq('is_read', false)
    setNewRequestsCount(count || 0)
  }

  const handleUpdateLeave = async (leave: LeaveRequest, status: 'approved' | 'rejected') => {
    const currentTimestamp = new Date().toISOString()
    
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        approved_by: user?.email,
        approved_at: currentTimestamp,
        updated_at: currentTimestamp,
      })
      .eq('id', leave.id)
    
    if (error) return toast.error(error.message)

    await supabase.from('leave_notifications').insert([{
      user_email: leave.email,
      leave_id: leave.id,
      type: 'admin_action',
      message: `Your leave request has been ${status}`,
      is_read: false
    }])

    toast.success(`Leave ${status} ✅`)
    fetchLeaveRequests()
    fetchNewNotificationsCount()
    setShowLeaveDetailsModal(false)
  }

  const handleDeleteLeave = async (id: string) => {
    if (!confirm('Are you sure?')) return
    await supabase.from('leave_requests').delete().eq('id', id)
    toast.success('Deleted 🗑️')
    fetchLeaveRequests()
    setShowLeaveDetailsModal(false)
  }

  const handleSubmitHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const currentTimestamp = new Date().toISOString()

    const holidayPayload = {
      ...formData,
      end_date: formData.end_date || null,
      created_by: user?.email || null,
      created_at: currentTimestamp,
      updated_at: currentTimestamp
    }

    const { data: holidayData, error } = await supabase
      .from('company_holidays')
      .insert([holidayPayload])
      .select()
    
    if (error) {
      setSubmitting(false)
      return toast.error(error.message)
    }
    if (!holidayData || !holidayData.length) {
      setSubmitting(false)
      return
    }

    const { data: users } = await supabase.from('employees').select('email')
    if (users) {
      const dateRange = formData.end_date 
        ? `${formData.date} to ${formData.end_date}` 
        : formData.date
      const notifications = users.map(u => ({
        user_email: u.email,
        leave_id: null,
        type: 'company_holiday',
        message: `New company holiday: ${formData.title} on ${dateRange}`,
        is_read: false
      }))
      await supabase.from('leave_notifications').insert(notifications)
    }

    toast.success('Holiday added and notifications sent! 🎉')
    fetchCompanyHolidays()
    setShowAddHolidayModal(false)
    setFormData({ title: '', description: '', date: '', end_date: '', holiday_type: '', is_recurring: false })
    setSubmitting(false)
  }

  const handleUpdateHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHoliday) return
    
    const currentTimestamp = new Date().toISOString()
    
    const { error } = await supabase
      .from('company_holidays')
      .update({
        title: editHoliday.title,
        date: editHoliday.date,
        end_date: editHoliday.end_date || null,
        description: editHoliday.description,
        holiday_type: editHoliday.holiday_type,
        is_recurring: editHoliday.is_recurring,
        updated_at: currentTimestamp
      })
      .eq('id', selectedHoliday.id)

    if (error) return toast.error(error.message)
    
    toast.success('Holiday updated! 🎉')
    fetchCompanyHolidays()
    setShowHolidayDetailsModal(false)
  }

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return
    const { error } = await supabase.from('company_holidays').delete().eq('id', id)
    if (error) return toast.error(error.message)
    
    toast.success('Holiday deleted 🗑️')
    fetchCompanyHolidays()
    setShowHolidayDetailsModal(false)
  }

  const setupRealtime = () => {
    const channel = supabase
      .channel('vacations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        fetchLeaveRequests()
        fetchNewNotificationsCount()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_holidays' }, () => {
        fetchCompanyHolidays()
        fetchNewNotificationsCount()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_notifications' }, () => {
        fetchNewNotificationsCount()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 p-6">
      <Toaster position="top-right" />
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Vacations & Holidays</h1>
        {newRequestsCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full animate-pulse">
            <Bell className="w-4 h-4" /> {newRequestsCount} New Notifications
          </div>
        )}
      </div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-6 py-3 font-semibold transition-all ${activeTab === 'leaves' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📋 Leave Requests
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-6 py-3 font-semibold transition-all ${activeTab === 'holidays' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          🎉 Company Holidays
        </button>
      </div>
      {/* Content */}
      {activeTab === 'leaves' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['pending','approved','rejected'].map(status => (
            <div key={status} className="bg-white rounded-xl border border-slate-200 border-t-4 shadow-sm p-5">
              <h3 className="font-bold text-slate-700 capitalize mb-4 flex justify-between items-center">
                {status} <span className="text-xs bg-slate-200 px-2 py-1 rounded-full">{leaveRequests.filter(l=>l.status===status).length}</span>
              </h3>
              {leaveRequests.filter(l=>l.status===status).map(l => (
                <div key={l.id} onClick={()=>{setSelectedLeave(l); setShowLeaveDetailsModal(true)}} className="bg-white p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer mb-2">
                  <div className="font-semibold text-slate-800">{l.employee_name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3"/> {formatDate(l.start_date)} - {formatDate(l.end_date)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">{l.leave_type}</div>
                </div>
              ))}
              {leaveRequests.filter(l=>l.status===status).length===0 && <div className="text-sm text-slate-400 italic">No requests</div>}
            </div>
          ))}
        </div>
      )}
      {activeTab==='holidays' && (
        <div>
          <button onClick={()=>setShowAddHolidayModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-4 flex items-center gap-2"><Plus className="w-5 h-5"/> Add Holiday</button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companyHolidays.map(h=>(
              <div key={h.id} onClick={()=>{
                setSelectedHoliday(h); 
                setEditHoliday({
                  title: h.title,
                  date: h.date,
                  end_date: h.end_date || '',
                  description: h.description || '',
                  holiday_type: h.holiday_type,
                  is_recurring: h.is_recurring
                });
                setShowHolidayDetailsModal(true)
              }} className="bg-white p-5 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{h.title}</h3>
                  <Edit2 className="w-4 h-4 text-slate-300 group-hover:text-blue-400"/>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4"/> 
                  {formatDate(h.date)}
                  {h.end_date && <> - {formatDate(h.end_date)}</>}
                </div>
                <div className="flex gap-2 mb-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{h.holiday_type}</span>
                  {h.is_recurring && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">🔁 Recurring</span>}
                </div>
                {h.description && <p className="text-xs text-slate-400 mt-3 line-clamp-2">{h.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Modals === */}
      {showLeaveDetailsModal && selectedLeave && (
        <LeaveDetailsModal leave={selectedLeave} onClose={()=>setShowLeaveDetailsModal(false)} onUpdate={handleUpdateLeave} onDelete={handleDeleteLeave}/>
      )}
      {showAddHolidayModal && (
        <AddHolidayModal 
          formData={formData} setFormData={setFormData} onClose={()=>setShowAddHolidayModal(false)} onSubmit={handleSubmitHoliday} submitting={submitting}
        />
      )}
      {showHolidayDetailsModal && selectedHoliday && (
        <HolidayDetailsModal 
          holiday={selectedHoliday} 
          editData={editHoliday}
          setEditData={setEditHoliday}
          onClose={()=>setShowHolidayDetailsModal(false)} 
          onUpdate={handleUpdateHoliday}
          onDelete={handleDeleteHoliday}
        />
      )}
    </div>
  )
}

// === Leave Details Modal ===
const LeaveDetailsModal = ({ leave, onClose, onUpdate, onDelete }: any) => {
  const [editData, setEditData] = useState({ 
    start_date: leave.start_date, 
    end_date: leave.end_date, 
    leave_type: leave.leave_type,
    reason: leave.reason,
    employee_name: leave.employee_name,
    email: leave.email
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X/></button>
        
        <h2 className="text-2xl font-bold mb-2">{leave.employee_name}</h2>
        <div className="text-blue-600 font-medium mb-4">{leave.email}</div>
        
        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            leave.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            leave.status === 'approved' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {leave.status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Employee Name</label>
              <input 
                type="text" 
                value={editData.employee_name} 
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                onChange={e=>setEditData({...editData,employee_name:e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
              <input 
                type="email" 
                value={editData.email} 
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                onChange={e=>setEditData({...editData,email:e.target.value})}
              />
            </div>
          </div>

          {/* Leave Type */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Leave Type</label>
            <input 
              type="text" 
              value={editData.leave_type} 
              className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              onChange={e=>setEditData({...editData,leave_type:e.target.value})}
              placeholder="e.g., Annual Leave, Sick Leave"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
              <input 
                type="date" 
                value={editData.start_date} 
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                onChange={e=>setEditData({...editData,start_date:e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
              <input 
                type="date" 
                value={editData.end_date} 
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                onChange={e=>setEditData({...editData,end_date:e.target.value})}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Reason for Leave</label>
            <textarea 
              value={editData.reason}
              className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
              onChange={e=>setEditData({...editData,reason:e.target.value})}
            />
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Submitted At</label>
              <p className="text-xs text-slate-600 mt-1">{formatDateTime(leave.created_at)}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Last Updated</label>
              <p className="text-xs text-slate-600 mt-1 font-semibold text-green-600">{formatDateTime(leave.updated_at)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {leave.status==='pending' ? (
            <>
              <button onClick={()=>onUpdate(leave,'approved')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold shadow-md">Approve</button>
              <button onClick={()=>onUpdate(leave,'rejected')} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold shadow-md">Reject</button>
            </>
          ) : (
            <button onClick={()=>onDelete(leave.id)} className="flex-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2"><Trash2 className="w-4 h-4"/> Delete Record</button>
          )}
        </div>
      </div>
    </div>
  )
}

// === Add Holiday Modal ===
const AddHolidayModal = ({ formData, setFormData, onClose, onSubmit, submitting }: any) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">Add Company Holiday</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Title *</label>
          <input 
            type="text" 
            placeholder="e.g., Christmas Holiday" 
            required 
            value={formData.title}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            onChange={e=>setFormData({...formData,title:e.target.value})}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Start Date *</label>
            <input 
              type="date" 
              required 
              value={formData.date}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              onChange={e=>setFormData({...formData,date:e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">End Date</label>
            <input 
              type="date" 
              value={formData.end_date}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              onChange={e=>setFormData({...formData,end_date:e.target.value})}
            />
            <p className="text-xs text-slate-500 mt-1">Optional: for multi-day holidays</p>
          </div>
        </div>

        {/* Holiday Type */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Holiday Type</label>
          <input 
            type="text" 
            placeholder="e.g., National Holiday, Company Event" 
            value={formData.holiday_type}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={e=>setFormData({...formData,holiday_type:e.target.value})}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Description</label>
          <textarea 
            placeholder="Add any additional details..." 
            value={formData.description}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            onChange={e=>setFormData({...formData,description:e.target.value})}
          />
        </div>

        {/* Is Recurring */}
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            id="is_recurring"
            checked={formData.is_recurring}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            onChange={e=>setFormData({...formData,is_recurring:e.target.checked})}
          />
          <label htmlFor="is_recurring" className="text-sm font-medium text-slate-700">
            🔁 Recurring Holiday (repeats annually)
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 border py-2 rounded-lg hover:bg-gray-50 font-semibold"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={submitting} 
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 shadow-md font-semibold disabled:opacity-50"
          >
            {submitting?'Adding...':'Add Holiday'}
          </button>
        </div>
      </form>
    </div>
  </div>
)

// === Holiday Details Modal ===
const HolidayDetailsModal = ({ holiday, editData, setEditData, onClose, onUpdate, onDelete }: any) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X/></button>
      
      <h2 className="text-2xl font-bold mb-6">Edit Company Holiday</h2>
      
      <form onSubmit={onUpdate} className="space-y-4">
        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Title *</label>
            <input 
              type="text" 
              value={editData.title} 
              required
              className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              onChange={e=>setEditData({...editData,title:e.target.value})}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Start Date *</label>
              <input 
                type="date" 
                value={editData.date} 
                required
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                onChange={e=>setEditData({...editData,date:e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
              <input 
                type="date" 
                value={editData.end_date} 
                className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                onChange={e=>setEditData({...editData,end_date:e.target.value})}
              />
              <p className="text-xs text-slate-400 mt-1">Optional: for multi-day holidays</p>
            </div>
          </div>

          {/* Holiday Type */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Holiday Type</label>
            <input 
              type="text" 
              placeholder="e.g., National Holiday, Company Event" 
              value={editData.holiday_type}
              className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={e=>setEditData({...editData,holiday_type:e.target.value})}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
            <textarea 
              value={editData.description}
              rows={3}
              className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={e=>setEditData({...editData,description:e.target.value})}
            />
          </div>

          {/* Is Recurring */}
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="edit_is_recurring"
              checked={editData.is_recurring}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              onChange={e=>setEditData({...editData,is_recurring:e.target.checked})}
            />
            <label htmlFor="edit_is_recurring" className="text-sm font-medium text-slate-700">
              🔁 Recurring Holiday (repeats annually)
            </label>
          </div>

          {/* System Info */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Created By</label>
                <p className="text-sm text-slate-600 mt-1">{holiday.created_by || 'System'}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Created At</label>
                <p className="text-xs text-slate-600 mt-1">{formatDateTime(holiday.created_at)}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Last Updated</label>
              <p className="text-xs text-slate-600 mt-1 font-semibold text-green-600">{formatDateTime(holiday.updated_at)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            type="button"
            onClick={()=>onDelete(holiday.id)} 
            className="px-6 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4"/> Delete
          </button>
          <button 
            type="submit" 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold shadow-md"
          >
            💾 Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)