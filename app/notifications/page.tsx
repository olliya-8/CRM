"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"
import { useRouter } from "next/navigation"
import { Bell, Check, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Toaster } from "react-hot-toast"

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

export default function NotificationsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    if (!user?.email) {
      router.push("/login")
      return
    }
    fetchNotifications()
  }, [user])

  const fetchNotifications = async () => {
    if (!user?.email) return

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_email", user.email)
      .order("created_at", { ascending: false })

    if (data) setNotifications(data)
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)

    if (
      notification.action_url &&
      notification.action_url.includes("/admin")
    ) {
      router.replace("/notifications")
      return
    }

    if (notification.action_url) {
      router.replace(notification.action_url)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const visible =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications

  const getCardColors = (index: number) => {
    const colors = [
      { border: "border-emerald-400", bg: "bg-emerald-50", hover: "hover:bg-emerald-100" },
      { border: "border-amber-400", bg: "bg-amber-50", hover: "hover:bg-amber-100" },
      { border: "border-cyan-400", bg: "bg-cyan-50", hover: "hover:bg-cyan-100" },
      { border: "border-rose-400", bg: "bg-rose-50", hover: "hover:bg-rose-100" },
      { border: "border-indigo-400", bg: "bg-indigo-50", hover: "hover:bg-indigo-100" },
      { border: "border-lime-400", bg: "bg-lime-50", hover: "hover:bg-lime-100" },
      { border: "border-fuchsia-400", bg: "bg-fuchsia-50", hover: "hover:bg-fuchsia-100" },
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-start p-8">
        <div className="text-slate-600 animate-pulse">Loading notifications...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-[#FAFAFA] min-h-screen">
      <Toaster position="top-right" />

      {/* Container removed 'mx-auto' and 'max-w-4xl' to allow left alignment */}
      <div className="w-full">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-500 mb-6 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2">Notifications</h1>
            <p className="text-slate-500 font-medium">{unreadCount} unread items waiting for you</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-6 py-2.5 rounded-full font-bold transition-all ${
                filter === "all" ? "bg-slate-900 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-6 py-2.5 rounded-full font-bold transition-all ${
                filter === "unread" ? "bg-slate-900 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Unread
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="py-20 text-left text-slate-400 font-medium">
            No notifications found in this category.
          </div>
        ) : (
          /* Grid: 1 col on mobile, 2 on tablet, 3 on lg, 4 on xl screens */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visible.map((n, index) => {
              const colors = getCardColors(index)
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[180px] shadow-sm hover:shadow-md
                    ${n.is_read 
                      ? "border-slate-100 bg-white opacity-75" 
                      : `${colors.border} ${colors.bg} ${colors.hover}`
                    }
                  `}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className={`p-2 rounded-xl ${n.is_read ? 'bg-slate-100' : 'bg-white/60 text-slate-900'}`}>
                        <Bell size={18} />
                      </div>
                      <div className="flex gap-1">
                        {!n.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(n.id)
                            }}
                            className="p-2 bg-white/80 hover:bg-white text-emerald-600 rounded-lg shadow-sm"
                            title="Mark as read"
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(n.id)
                          }}
                          className="p-2 bg-white/80 hover:bg-rose-50 text-rose-500 rounded-lg shadow-sm"
                          title="Delete"
                        >
                          <Trash2 size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight mb-2">
                      {n.title}
                    </h3>
                    <p className="text-sm text-slate-700 font-medium line-clamp-3">
                      {n.message}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-black/5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      {new Date(n.created_at).toLocaleDateString()} • {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}