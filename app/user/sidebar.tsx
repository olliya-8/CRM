'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FaHome, FaTasks, FaFileAlt } from "react-icons/fa"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"

interface SidebarProps {
  isOpen: boolean
  toggle: () => void
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const { user } = useUser()
  const pathname = usePathname()
  
  const [taskCount, setTaskCount] = useState(0)
  const [leaveCount, setLeaveCount] = useState(0)

  // ---------------- Fetch counts ----------------
  const fetchCounts = async () => {
    if (!user?.email) return

    console.log("Fetching counts for user:", user.email) // Debug log

    // Task assignments (new tasks)
    const { count: taskAssignments } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to_email", user.email)
      .eq("is_read", false)

    // Task comments from leave_notifications
    const { count: taskComments } = await supabase
      .from("leave_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_email", user.email)
      .eq("type", "task_comment")
      .eq("is_read", false)

    const totalTaskCount = (taskAssignments ?? 0) + (taskComments ?? 0)
    console.log("Task count:", { taskAssignments, taskComments, total: totalTaskCount }) // Debug log
    setTaskCount(totalTaskCount)

    // Leave notifications (excluding task comments)
    const { count: lCount } = await supabase
      .from("leave_notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_email", user.email)
      .eq("is_read", false)
      .neq("type", "task_comment")

    console.log("Leave count:", lCount) // Debug log
    setLeaveCount(lCount ?? 0)
  }

  useEffect(() => {
    if (!user?.email) return

    // Initial fetch
    fetchCounts()

    // ---------------- Realtime subscriptions ----------------
    const taskChannel = supabase
      .channel('user_sidebar_tasks')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `assigned_to_email=eq.${user.email}`
      }, (payload) => {
        console.log("Sidebar: Task change detected", payload) // Debug log
        fetchCounts()
      })
      .subscribe()

    const notificationChannel = supabase
      .channel('user_sidebar_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_notifications',
        filter: `user_email=eq.${user.email}`
      }, (payload) => {
        console.log("Sidebar: Notification change detected", payload) // Debug log
        fetchCounts()
      })
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(taskChannel)
      supabase.removeChannel(notificationChannel)
    }
  }, [user?.email])

  const menuItems = [
    { label: "Dashboard", icon: <FaHome />, href: "/user" },
    { label: "My Tasks", icon: <FaTasks />, href: "/user/tasks", count: taskCount },
    { label: "My Leaves", icon: <FaFileAlt />, href: "/user/submit-leave", count: leaveCount },
  ]

  return (
    <aside
      className={`bg-white border-r border-gray-200 w-64 md:w-60 transition-transform transform ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 fixed md:relative h-full z-20`}
    >
      <div className="p-4 flex flex-col h-full">
        <h2 className="text-xl font-bold text-gray-800 mb-8 hidden md:block">BlueGrid User</h2>
        <nav className="flex flex-col gap-2">
          {menuItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-4 py-2 rounded transition font-medium ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}