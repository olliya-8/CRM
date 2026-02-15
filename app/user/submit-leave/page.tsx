"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"
import { ChevronDown, ChevronUp, Calendar, Plus } from "lucide-react"
import toast, { Toaster } from 'react-hot-toast'

/* ================= TYPES ================= */

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
}

/* ================= DATE HELPERS ================= */

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/* ================= PAGE ================= */

export default function SubmitLeavePage() {
  const router = useRouter()
  const { user } = useUser()

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [companyHolidays, setCompanyHolidays] = useState<CompanyHoliday[]>([])
  const [employeeData, setEmployeeData] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showHolidayDetails, setShowHolidayDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    employee_name: "",
    leave_type: "Sick Leave",
    start_date: "",
    end_date: "",
    reason: ""
  })

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (!user) return router.push("/login")
    fetchAll()
  }, [user])

  const fetchAll = async () => {
    if (!user?.email) return

    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("email", user.email)
      .single()

    if (emp) {
      setEmployeeData(emp)
      setFormData(f => ({ ...f, employee_name: emp.name }))
    }

    const { data: leaves } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("email", user.email)
      .order("created_at", { ascending: false })

    if (leaves) setLeaveRequests(leaves)

    const { data: holidays } = await supabase
      .from("company_holidays")
      .select("*")
      .order("date", { ascending: true })

    if (holidays) setCompanyHolidays(holidays)

    setLoading(false)
  }

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email) return

    setSubmitting(true)
    const loadingToast = toast.loading('Submitting leave request...')

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      const { error } = await supabase.from("leave_requests").insert([{
        user_id: authUser?.id,
        employee_name: formData.employee_name,
        email: user.email,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        status: "pending"
      }])

      if (error) throw error

      toast.success('Leave request submitted!', { id: loadingToast })
      setShowForm(false)
      setFormData({
        employee_name: employeeData?.name,
        leave_type: "Sick Leave",
        start_date: "",
        end_date: "",
        reason: ""
      })
      fetchAll()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit', { id: loadingToast })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const pendingLeaves = leaveRequests.filter(l => l.status === "pending")
  const approvedLeaves = leaveRequests.filter(l => l.status === "approved")
  const rejectedLeaves = leaveRequests.filter(l => l.status === "rejected")

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">My Leaves</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your leave requests</p>
        </div>

        {/* SUBMIT ACCORDION */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full flex justify-between items-center px-4 sm:px-6 py-4 font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-base sm:text-lg">Submit Leave</span>
            </div>
            {showForm ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>

          {showForm && (
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">

                <InputField 
                  label="Employee Name"
                  value={formData.employee_name}
                  onChange={(v:any)=>setFormData({...formData,employee_name:v})}
                  disabled
                />

                <SelectField 
                  label="Leave Type"
                  value={formData.leave_type}
                  onChange={(v:any)=>setFormData({...formData,leave_type:v})}
                />

                <InputField 
                  type="date" 
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(v:any)=>setFormData({...formData,start_date:v})}
                />

                <InputField 
                  type="date" 
                  label="End Date"
                  value={formData.end_date}
                  onChange={(v:any)=>setFormData({...formData,end_date:v})}
                />

                <div className="md:col-span-2">
                  <TextareaField 
                    label="Reason"
                    value={formData.reason}
                    onChange={(v:any)=>setFormData({...formData,reason:v})}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="md:col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Leave Request"}
                </button>

              </form>
            </div>
          )}
        </div>

        {/* HOLIDAYS ACCORDION */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowHolidayDetails(!showHolidayDetails)}
            className="w-full flex justify-between items-center px-4 sm:px-6 py-4 font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-base sm:text-lg">Company Holidays</span>
            </div>
            {showHolidayDetails ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>

          {showHolidayDetails && (
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
              {companyHolidays.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No company holidays scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companyHolidays.map(h => (
                    <div 
                      key={h.id} 
                      className="bg-white p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{h.title}</h4>
                          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                            <Calendar size={14}/> {formatDate(h.date)}
                            {h.end_date && ` - ${formatDate(h.end_date)}`}
                          </p>
                          {h.description && (
                            <p className="text-sm text-slate-600 mt-2">{h.description}</p>
                          )}
                        </div>
                        {h.is_recurring && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                            Recurring
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* LEAVE REQUESTS - DESKTOP TABLE / MOBILE CARDS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* DESKTOP - TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Pending</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Approved</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Rejected</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  {/* PENDING COLUMN */}
                  <td className="px-4 py-4 border-r border-slate-200 align-top">
                    <div className="space-y-3">
                      {pendingLeaves.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No pending requests</p>
                      ) : (
                        pendingLeaves.map(leave => (
                          <div key={leave.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <h4 className="font-semibold text-sm text-slate-800">{leave.leave_type}</h4>
                            <p className="text-xs text-slate-600 mt-1">
                              {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </td>

                  {/* APPROVED COLUMN */}
                  <td className="px-4 py-4 border-r border-slate-200 align-top">
                    <div className="space-y-3">
                      {approvedLeaves.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No approved requests</p>
                      ) : (
                        approvedLeaves.map(leave => (
                          <div key={leave.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <h4 className="font-semibold text-sm text-slate-800">{leave.leave_type}</h4>
                            <p className="text-xs text-slate-600 mt-1">
                              {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </td>

                  {/* REJECTED COLUMN */}
                  <td className="px-4 py-4 align-top">
                    <div className="space-y-3">
                      {rejectedLeaves.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No rejected requests</p>
                      ) : (
                        rejectedLeaves.map(leave => (
                          <div key={leave.id} className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                            <h4 className="font-semibold text-sm text-slate-800">{leave.leave_type}</h4>
                            <p className="text-xs text-slate-600 mt-1">
                              {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* MOBILE - CARD VIEW */}
          <div className="md:hidden p-4 space-y-6">
            {/* PENDING */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Pending</h3>
              <div className="space-y-2">
                {pendingLeaves.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No pending requests</p>
                ) : (
                  pendingLeaves.map(leave => (
                    <div key={leave.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-semibold text-sm text-slate-800">{leave.leave_type}</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* APPROVED */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Approved</h3>
              <div className="space-y-2">
                {approvedLeaves.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No approved requests</p>
                ) : (
                  approvedLeaves.map(leave => (
                    <div key={leave.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <h4 className="font-semibold text-sm text-slate-800">{leave.leave_type}</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* REJECTED */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Rejected</h3>
              <div className="space-y-2">
                {rejectedLeaves.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No rejected requests</p>
                ) : (
                  rejectedLeaves.map(leave => (
                    <div key={leave.id} className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                      <h4 className="font-semibold text-sm text-slate-800">{leave.leave_type}</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ================= INPUT COMPONENTS ================= */

const InputField = ({ label, type="text", value, onChange, disabled=false }:any) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e=>onChange(e.target.value)}
      disabled={disabled}
      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
      required
    />
  </div>
)

const SelectField = ({ label, value, onChange }:any) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
    <select
      value={value}
      onChange={e=>onChange(e.target.value)}
      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
    >
      <option>Sick Leave</option>
      <option>Casual Leave</option>
      <option>Annual Leave</option>
      <option>Emergency Leave</option>
    </select>
  </div>
)

const TextareaField = ({ label, value, onChange }:any) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
    <textarea
      value={value}
      onChange={e=>onChange(e.target.value)}
      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
      rows={3}
      required
    />
  </div>
)