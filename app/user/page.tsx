"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"

interface LeaveRequest {
  id: string
  employee_name: string
  email: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  created_at: string
}

export default function UserDashboard() {
  const router = useRouter()
  const { user } = useUser()

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [employeeData, setEmployeeData] = useState<any>(null)

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
    
    // Fetch employee data from employees table
    await fetchEmployeeData()
    await fetchUserLeaveRequests()
  }

  const fetchEmployeeData = async () => {
    if (!user?.email) return
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .single()

      if (error) {
        console.error("Error fetching employee data:", error)
        return
      }
      
      console.log("Employee data found:", data) // Debug
      setEmployeeData(data)
      
      // Pre-fill employee name in form
      setFormData(prev => ({
        ...prev,
        employee_name: data?.name || ""
      }))
    } catch (error) {
      console.error("Error fetching employee data:", error)
    }
  }

  const fetchUserLeaveRequests = async () => {
    if (!user?.email) return
    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false })

      if (error) throw error
      setLeaveRequests(data || [])
    } catch (error) {
      console.error("Error fetching leave requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.email) {
      alert("User email not found. Please try logging in again.")
      return
    }

    if (!formData.employee_name) {
      alert("Please enter your name.")
      return
    }

    setSubmitting(true)
    
    try {
      // Get auth user ID
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      const leaveData = {
        user_id: authUser?.id || null, // Use auth user ID
        employee_name: formData.employee_name,
        email: user.email,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        status: "pending"
      }

      console.log("Submitting leave data:", leaveData) // Debug log

      const { data, error } = await supabase
        .from("leave_requests")
        .insert([leaveData])
        .select()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      console.log("Leave submitted successfully:", data) // Debug log
      
      alert("Leave request submitted successfully! ✅ Admin will be notified.")
      setShowForm(false)
      setFormData({ 
        employee_name: employeeData?.name || "", 
        leave_type: "Sick Leave", 
        start_date: "", 
        end_date: "", 
        reason: "" 
      })
      
      await fetchUserLeaveRequests()
      
    } catch (error: any) {
      console.error("Submit error:", error)
      alert(`Failed to submit leave request ❌\n${error.message || "Unknown error"}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-lg text-gray-700 animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">Leave Dashboard</h1>
            <p className="text-gray-600 mt-1">{employeeData?.name || user?.email} | Role: User</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>

        {/* Form Toggle */}
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

              <InputField 
                label="Employee Name *" 
                value={formData.employee_name} 
                onChange={(v) => setFormData({...formData, employee_name: v})} 
                disabled={submitting} 
              />

              <SelectField 
                label="Leave Type *" 
                value={formData.leave_type} 
                onChange={(v) => setFormData({...formData, leave_type: v})} 
                disabled={submitting} 
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField 
                  label="Start Date *" 
                  type="date" 
                  value={formData.start_date} 
                  onChange={(v) => setFormData({...formData, start_date: v})} 
                  disabled={submitting} 
                />
                <InputField 
                  label="End Date *" 
                  type="date" 
                  value={formData.end_date} 
                  onChange={(v) => setFormData({...formData, end_date: v})} 
                  disabled={submitting} 
                />
              </div>

              <TextareaField 
                label="Reason *" 
                value={formData.reason} 
                onChange={(v) => setFormData({...formData, reason: v})} 
                disabled={submitting} 
              />

              <button 
                type="submit" 
                disabled={submitting} 
                className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>
        )}

        {/* Leave Requests Table */}
        <div className="bg-white p-6 rounded-md shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">My Leave History</h2>
          {leaveRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No leave requests yet. Submit a new leave request above.</p>
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
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Submitted On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-gray-700">{req.employee_name}</td>
                      <td className="px-4 py-2 text-gray-700">{req.leave_type}</td>
                      <td className="px-4 py-2 text-gray-700">{new Date(req.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-gray-700">{new Date(req.end_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-gray-700 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                          req.status === "approved" || req.status === "Approved"
                            ? "bg-green-100 text-green-800"
                            : req.status === "rejected" || req.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
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

// Components
const InputField = ({ label, type = "text", value, onChange, disabled }: any) => (
  <div>
    <label className="block text-gray-700 font-medium mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      required
      disabled={disabled}
    />
  </div>
)

const SelectField = ({ label, value, onChange, disabled }: any) => (
  <div>
    <label className="block text-gray-700 font-medium mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      disabled={disabled}
    >
      <option>Sick Leave</option>
      <option>Casual Leave</option>
      <option>Annual Leave</option>
      <option>Maternity Leave</option>
      <option>Paternity Leave</option>
      <option>Emergency Leave</option>
    </select>
  </div>
)

const TextareaField = ({ label, value, onChange, disabled }: any) => (
  <div>
    <label className="block text-gray-700 font-medium mb-1">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      rows={3}
      required
      disabled={disabled}
    />
  </div>
)