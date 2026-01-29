"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/user-context"
import { supabase } from "@/lib/supabase"

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
    /* Added overflow-y-auto and min-h-full to ensure it fills the space and scrolls */
    <div className="w-full min-h-full overflow-y-auto bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome, {employeeData?.name || user?.email}!
        </h1>
        <p className="text-gray-600 mb-8">
          Role: User | Email: {user?.email}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded shadow border border-gray-200">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">My Tasks</h2>
            <p className="text-gray-500">Tasks assigned by your manager will appear here.</p>
          </div>
          <div className="bg-white p-6 rounded shadow border border-gray-200">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Leave Requests</h2>
            <p className="text-gray-500">Your submitted leave requests and their status will appear here.</p>
          </div>
          
          {/* Spacer to demonstrate scrolling if content is short */}
          <div className="h-64 bg-gray-100/50 border-dashed border-2 border-gray-200 rounded flex items-center justify-center text-gray-400">
            Future Dashboard Widget
          </div>
          <div className="h-64 bg-gray-100/50 border-dashed border-2 border-gray-200 rounded flex items-center justify-center text-gray-400">
            Recent Activity
          </div>
        </div>
      </div>
    </div>
  )
}