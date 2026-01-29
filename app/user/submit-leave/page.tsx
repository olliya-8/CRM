'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"
import { ChevronDown, ChevronUp, Calendar } from "lucide-react"

interface LeaveRequest {
  id: string
  user_id: string | null
  employee_name: string
  email: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  created_at: string
  updated_at: string
  leave_request_id: string | null
}

interface CompanyHoliday {
  id: string
  title: string
  description: string | null
  date: string
  end_date: string | null
  holiday_type: string
  is_recurring: boolean
  created_at: string
  updated_at: string
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function SubmitLeavePage() {
  const router = useRouter()
  const { user } = useUser()

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [employeeData, setEmployeeData] = useState<any>(null)

  const [companyHolidays, setCompanyHolidays] = useState<CompanyHoliday[]>([])
  const [unreadHolidays, setUnreadHolidays] = useState(0)
 
  const [showHolidayDetails, setShowHolidayDetails] = useState(false)

  const [formData, setFormData] = useState({
    employee_name: "",
    leave_type: "Sick Leave",
    start_date: "",
    end_date: "",
    reason: ""
  })

  useEffect(() => {
    checkUserAndFetchData()
  }, [user])

  const checkUserAndFetchData = async () => {
    if (!user) return router.push("/login")
    if (user.role !== "user") return router.push("/")

    await fetchEmployeeData()
    await fetchUserLeaveRequests()
    await fetchCompanyHolidays()
  }

  const fetchEmployeeData = async () => {
    if (!user?.email) return
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("email", user.email)
      .single()

    if (!error && data) {
      setEmployeeData(data)
      setFormData(prev => ({ ...prev, employee_name: data.name }))
    }
  }

  const fetchUserLeaveRequests = async () => {
    if (!user?.email) return
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("email", user.email)
      .order("created_at", { ascending: false })

    if (data) setLeaveRequests(data)
    setLoading(false)
  }

  const fetchCompanyHolidays = async () => {
    const { data } = await supabase
      .from("company_holidays")
      .select("*")
      .order("date", { ascending: true })

    if (!data) return

    setCompanyHolidays(data)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    setUnreadHolidays(
      data.filter(h => new Date(h.created_at) > sevenDaysAgo).length
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email) return alert("User not found")

    setSubmitting(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()

    // Get current timestamp
    const currentTimestamp = new Date().toISOString()

    const leaveData = {
      user_id: authUser?.id || null,
      employee_name: formData.employee_name,
      email: user.email,
      leave_type: formData.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason,
      status: "pending",
      created_at: currentTimestamp,
      updated_at: currentTimestamp
    }

    const { error } = await supabase.from("leave_requests").insert([leaveData])
    if (!error) {
      alert("Leave request submitted successfully ✅")
      setShowForm(false)
      setFormData({
        employee_name: employeeData?.name || "",
        leave_type: "Sick Leave",
        start_date: "",
        end_date: "",
        reason: ""
      })
      fetchUserLeaveRequests()
    } else {
      alert("Error submitting leave request: " + error.message)
    }

    setSubmitting(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-700 animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">Leave Requests</h1>
            <p className="text-gray-600 mt-1">
              {employeeData?.name || user?.email} | Role: User
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>

        {/* HOLIDAY NOTIFICATION WITH END_DATE SUPPORT */}
        {unreadHolidays > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowHolidayDetails(!showHolidayDetails)}
              className="w-full text-left bg-blue-50 border-l-4 border-blue-500 p-4 hover:bg-blue-100 transition flex justify-between items-center"
            >
              <span>
                <strong>{unreadHolidays}</strong> new company holiday announcements
              </span>
              {showHolidayDetails ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
            </button>
           
            {showHolidayDetails && (
              <div className="bg-white border border-t-0 border-blue-200 rounded-b-md p-4 space-y-3 shadow-sm">
                {companyHolidays
                  .filter(h => new Date(h.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                  .map(h => (
                    <div key={h.id} className="border-b last:border-0 pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-blue-800">{h.title}</h4>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{h.holiday_type}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 gap-2 mb-1">
                        <Calendar size={14}/> 
                        {formatDate(h.date)}
                        {h.end_date && <> - {formatDate(h.end_date)}</>}
                      </div>
                      {h.is_recurring && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded inline-block mb-2">
                          🔁 Recurring
                        </span>
                      )}
                      {h.description && <p className="text-sm text-gray-700 mt-2">{h.description}</p>}
                    </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit Leave Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition"
          >
            {showForm ? "Cancel" : "Submit New Leave"}
          </button>
        </div>

        {/* Leave Request Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-md shadow border border-gray-200 mb-8">
            <h2 className="text-xl font-semibold mb-5 text-gray-800">New Leave Request</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField label="Employee Name *" value={formData.employee_name}
                onChange={(v:any)=>setFormData({...formData,employee_name:v})} disabled={submitting} />

              <SelectField label="Leave Type *" value={formData.leave_type}
                onChange={(v:any)=>setFormData({...formData,leave_type:v})} disabled={submitting} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField type="date" label="Start Date *"
                  value={formData.start_date}
                  onChange={(v:any)=>setFormData({...formData,start_date:v})}
                  disabled={submitting} />

                <InputField type="date" label="End Date *"
                  value={formData.end_date}
                  onChange={(v:any)=>setFormData({...formData,end_date:v})}
                  disabled={submitting} />
              </div>

              <TextareaField label="Reason *" value={formData.reason}
                onChange={(v:any)=>setFormData({...formData,reason:v})}
                disabled={submitting} />

              <button type="submit" disabled={submitting}
                className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>
        )}

        {/* Leave History Table - WITH UPDATED_AT COLUMN */}
        <div className="bg-white p-6 rounded-md shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">My Leave History</h2>

          {leaveRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-6">
              No leave requests yet. Submit a new leave request above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Start</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">End</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Reason</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Submitted</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaveRequests.map(req => (
                    <tr key={req.id} className={
                      req.status === 'approved' ? 'bg-green-50' :
                      req.status === 'rejected' ? 'bg-red-50' :
                      'bg-yellow-50'
                    }>
                      <td className="px-4 py-2">{req.employee_name}</td>
                      <td className="px-4 py-2">{req.leave_type}</td>
                      <td className="px-4 py-2">{formatDate(req.start_date)}</td>
                      <td className="px-4 py-2">{formatDate(req.end_date)}</td>
                      <td className="px-4 py-2 truncate max-w-[150px]" title={req.reason}>{req.reason}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          req.status === 'approved' ? 'bg-green-200 text-green-800' :
                          req.status === 'rejected' ? 'bg-red-200 text-red-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{formatDateTime(req.created_at)}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-green-600">
                        {formatDateTime(req.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* ---------- UI COMPONENTS ---------- */

const InputField = ({ label, type="text", value, onChange, disabled }:any) => (
  <div>
    <label className="block text-gray-700 font-medium mb-1">{label}</label>
    <input type={type} value={value}
      onChange={e=>onChange(e.target.value)}
      className="w-full border rounded-md p-2"
      required disabled={disabled} />
  </div>
)

const SelectField = ({ label, value, onChange, disabled }:any) => (
  <div>
    <label className="block text-gray-700 font-medium mb-1">{label}</label>
    <select value={value}
      onChange={e=>onChange(e.target.value)}
      className="w-full border rounded-md p-2"
      disabled={disabled}>
      <option>Sick Leave</option>
      <option>Casual Leave</option>
      <option>Annual Leave</option>
      <option>Maternity Leave</option>
      <option>Paternity Leave</option>
      <option>Emergency Leave</option>
    </select>
  </div>
)

const TextareaField = ({ label, value, onChange, disabled }:any) => (
  <div>
    <label className="block text-gray-700 font-medium mb-1">{label}</label>
    <textarea value={value}
      onChange={e=>onChange(e.target.value)}
      className="w-full border rounded-md p-2"
      rows={3} required disabled={disabled} />
  </div>
)