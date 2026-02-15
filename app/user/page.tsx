"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/user-context"
import { supabase } from "@/lib/supabase"
import { ClipboardList, FileText } from "lucide-react"

export default function UserDashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchEmployeeData = async () => {
    if (!user?.email) return
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("email", user.email)
      .single()

    if (error) {
      console.error("Error fetching employee data:", error)
      setEmployeeData(null)
    } else {
      setEmployeeData(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    fetchEmployeeData()
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-lg text-gray-700 animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Message */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Welcome, {employeeData?.name || user?.email}!
          </h1>
          
        </div>

        {/* Two Cards - My Tasks and Leave Requests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* My Tasks Card */}
          <button
            onClick={() => router.push("/user/tasks")}
            className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">My Tasks</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-500">
              Tasks assigned by your manager will appear here.
            </p>
          </button>

          {/* Leave Requests Card */}
          <button
            onClick={() => router.push("/user/submit-leave")}
            className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Leave Requests</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-500">
              Your submitted leave requests and their status will appear here.
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}