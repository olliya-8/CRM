"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"
import { Bell, Check } from "lucide-react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  recipient_email: string
  sender_email: string | null
  sender_name: string | null
  type: string
  title: string
  message: string
  reference_id: string | null
  reference_table: string | null
  is_read: boolean
  action_url: string | null
  created_at: string
}

export default function NotificationBell() {
  const { user } = useUser()
  const router = useRouter()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  const dropdownRef = useRef<HTMLDivElement>(null)

  /* ---------------- CLOSE ON OUTSIDE CLICK ---------------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () =>
      document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  /* ---------------- FETCH NOTIFICATIONS ---------------- */
  const fetchNotifications = async () => {
    if (!user?.email) return

    setLoading(true)

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_email", user.email)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }

    setLoading(false)
  }

  /* ---------------- REALTIME SUBSCRIPTION ---------------- */
  useEffect(() => {
    if (!user?.email) return

    fetchNotifications()

    const channel = supabase
      .channel(`notifications-${user.email}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_email=eq.${user.email}`,
        },
        payload => {
          setNotifications(prev => [
            payload.new as Notification,
            ...prev,
          ])
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_email=eq.${user.email}`,
        },
        payload => {
          setNotifications(prev =>
            prev.map(n =>
              n.id === payload.new.id
                ? (payload.new as Notification)
                : n
            )
          )
          setUnreadCount(prev =>
            prev > 0 ? prev - 1 : 0
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.email])

  /* ---------------- ACTIONS ---------------- */
  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)

    fetchNotifications()
  }

  const markAllAsRead = async () => {
    if (!user?.email) return

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_email", user.email)
      .eq("is_read", false)

    fetchNotifications()
  }

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id)

    if (n.action_url) {
      router.push(n.action_url)
      setShowDropdown(false)
    }
  }

  /* ---------------- HELPERS ---------------- */
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "leave_request":
        return "🏖️"
      case "leave_approved":
        return "✅"
      case "leave_rejected":
        return "❌"
      case "task_assignment":
        return "📋"
      case "task_completed":
        return "✔️"
      default:
        return "🔔"
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diff = Math.floor(
      (now.getTime() - date.getTime()) / 1000
    )

    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString()
  }

  if (!user) return null

  /* ---------------- UI ---------------- */
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell */}
      <button
        onClick={() => setShowDropdown(v => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 z-50 rounded-lg border bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-slate-500">
                Loading notifications...
              </p>
            ) : notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                No notifications yet
              </p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex gap-3 p-4 cursor-pointer ${
                    n.is_read
                      ? "hover:bg-slate-50"
                      : "bg-blue-50 hover:bg-blue-100"
                  }`}
                >
                  <div className="text-xl">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {n.title}
                    </p>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400">
                      {getTimeAgo(n.created_at)}
                    </p>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        markAsRead(n.id)
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t bg-slate-50 p-2">
              <button
                onClick={() => {
                  router.push("/notifications")
                  setShowDropdown(false)
                }}
                className="w-full text-sm font-medium text-blue-600 hover:bg-blue-50 rounded py-2"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
