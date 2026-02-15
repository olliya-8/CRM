'use client'

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import Image from "next/image"
import BGV from "@/assets/bgv.png"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/user" },
  { icon: ClipboardList, label: "My Tasks", path: "/user/tasks" },
  { icon: FileText, label: "My Leaves", path: "/user/submit-leave" },
]

export default function Sidebar() {
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [taskCount, setTaskCount] = useState(0)
  const [leaveCount, setLeaveCount] = useState(0)

  // ---------------- Mark notifications as read when page is visited ----------------
  useEffect(() => {
    if (!user?.email) return

    const markAsRead = async () => {
      // Mark tasks as read when visiting /user/tasks
      if (pathname === "/user/tasks") {
        // Mark task assignments as read
        await supabase
          .from("tasks")
          .update({ is_read: true })
          .eq("assigned_to_email", user.email)
          .eq("is_read", false)

        // Mark task comment notifications as read
        await supabase
          .from("leave_notifications")
          .update({ is_read: true })
          .eq("user_email", user.email)
          .eq("type", "task_comment")
          .eq("is_read", false)

        console.log("✅ Marked tasks as read")
      }

      // Mark leave notifications as read when visiting /user/submit-leave
      if (pathname === "/user/submit-leave") {
        await supabase
          .from("leave_notifications")
          .update({ is_read: true })
          .eq("user_email", user.email)
          .eq("is_read", false)
          .neq("type", "task_comment")

        console.log("✅ Marked leave notifications as read")
      }

      // Refresh counts after marking as read
      fetchCounts()
    }

    markAsRead()
  }, [pathname, user?.email])

  // ---------------- Fetch counts ----------------
  const fetchCounts = async () => {
    if (!user?.email) return

    console.log("Fetching counts for user:", user.email)

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
    console.log("Task count:", { taskAssignments, taskComments, total: totalTaskCount })
    setTaskCount(totalTaskCount)

    // Leave notifications (excluding task comments)
    const { count: lCount } = await supabase
      .from("leave_notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_email", user.email)
      .eq("is_read", false)
      .neq("type", "task_comment")

    console.log("Leave count:", lCount)
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
        console.log("Sidebar: Task change detected", payload)
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
        console.log("Sidebar: Notification change detected", payload)
        fetchCounts()
      })
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(taskChannel)
      supabase.removeChannel(notificationChannel)
    }
  }, [user?.email])

  // ---------- Reset badges when pages visited ----------
  useEffect(() => {
    if (pathname.replace(/\/$/, "") === "/user/tasks") {
      setTaskCount(0)
    }
    if (pathname.replace(/\/$/, "") === "/user/submit-leave") {
      setLeaveCount(0)
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  return (
    <>
      {/* Hamburger - HIGHER Z-INDEX */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-2 bg-white shadow-xl rounded-full border border-slate-100 active:scale-90 transition-all"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop - MUST BE VISIBLE */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - PROPER Z-INDEX */}
      <div
        className={`
          w-64 h-screen bg-white flex flex-col shadow-2xl
          fixed top-0 left-0 bottom-0 z-[56]
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:h-[calc(100vh-16px)] lg:rounded-2xl lg:top-2 lg:left-2 lg:bottom-2 lg:sticky
        `}
      >
        {/* Logo */}
        <div className="pt-20 lg:pt-6 px-4 flex justify-start">
          <button
            onClick={() => handleNavigation("/user")}
            className="w-14 h-14 rounded-full bg-[#EEF4FF] flex items-center justify-center shadow-lg hover:scale-105 transition-all"
          >
            <Image src={BGV} alt="BGV Logo" className="w-8 h-8" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.replace(/\/$/, "") === item.path.replace(/\/$/, "")

            let badgeCount = 0
            if (item.label === "My Tasks") badgeCount = taskCount
            if (item.label === "My Leaves") badgeCount = leaveCount

            return (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
                  ${isActive ? "bg-[#EEF4FF] text-[#3F8CFF]" : "text-[#7D8592] hover:bg-[#F5F8FF]"}
                  text-sm sm:text-base lg:text-lg`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>

                {/* Badge */}
                {badgeCount > 0 && (
                  <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-2">
                    {badgeCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all text-[#7D8592] hover:bg-[#F5F8FF] text-sm sm:text-base lg:text-lg"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}