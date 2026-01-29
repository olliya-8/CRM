"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Layers,
  Wallet,
  Calendar,
  Plane,
  Users,
  Folder,
  LogOut,
  Menu,
  X,
  ClipboardList
} from "lucide-react"
import Image from "next/image"
import BGV from "@/assets/bgv.png"
import { supabase } from "@/lib/supabase"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Layers, label: "Projects", path: "/projects-page" },
  { icon: Wallet, label: "Finances", path: "/finances-page" },
  { icon: Calendar, label: "Calendar", path: "/calendar-page" },
  { icon: Plane, label: "Vacations", path: "/vacations-page" },
  { icon: Users, label: "Employees", path: "/employees-page" },
  { icon: ClipboardList, label: "Tasks", path: "/tasks-page" },
  { icon: Folder, label: "Info Portal", path: "/info-portal-page" },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadLeavesCount, setUnreadLeavesCount] = useState(0)
  const [unreadTasksCount, setUnreadTasksCount] = useState(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) return
    const user = JSON.parse(userStr)
    setUserEmail(user.email)

    fetchUnreadLeaves(user.email)
    fetchUnreadTaskComments(user.email)

    // ✅ Realtime updates for leaves and task comments
    const channel = supabase.channel("sidebar-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, () => fetchUnreadLeaves(user.email))
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchUnreadTaskComments(user.email))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // ---------- Fetch unread Vacation notifications ----------
  const fetchUnreadLeaves = async (email: string) => {
    const lastViewed = localStorage.getItem("vacations_last_viewed")
    let query = supabase
      .from("leave_requests")
      .select("id, created_at", { count: "exact" })
      .eq("status", "pending")

    if (lastViewed) query = query.gt("created_at", lastViewed)
    const { data } = await query
    if (data) setUnreadLeavesCount(data.length)
  }

  // ---------- Fetch unread Task Comment notifications ----------
  const fetchUnreadTaskComments = async (email: string) => {
    if (!email) return
    const { data } = await supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("recipient_email", email)
      .eq("type", "task_comment")
      .eq("is_read", false)
    
    if (data) setUnreadTasksCount(data.length)
  }

  // ---------- Reset badges when pages visited ----------
  useEffect(() => {
    if (pathname.replace(/\/$/, "") === "/vacations-page") {
      localStorage.setItem("vacations_last_viewed", new Date().toISOString())
      setUnreadLeavesCount(0)
    }
    if (pathname.replace(/\/$/, "") === "/tasks-page") {
      setUnreadTasksCount(0)
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
      {/* Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-5 z-[45] lg:hidden p-2 bg-white shadow-xl rounded-full border border-slate-100 active:scale-90 transition-all"
      >
        {isOpen ? <X className="w-3 h-3" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          w-64 h-[calc(100vh-16px)] bg-white flex flex-col shadow-2xl rounded-2xl
          fixed top-2 left-2 bottom-2 z-[50]
          transition-transform duration-500
          ${isOpen ? "translate-x-0" : "-translate-x-[110%] lg:translate-x-0"}
          lg:static lg:sticky lg:top-2
        `}
      >
        {/* Logo */}
        <div className="pt-20 lg:pt-6 px-4 flex justify-start">
          <button
            onClick={() => handleNavigation("/dashboard")}
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
            if (item.label === "Vacations") badgeCount = unreadLeavesCount
            if (item.label === "Tasks") badgeCount = unreadTasksCount

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