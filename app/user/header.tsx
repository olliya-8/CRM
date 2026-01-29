'use client'

import { useState, useEffect, useRef } from "react"
import { FaBell, FaBars, FaTasks, FaCalendarAlt, FaCircle, FaCheckDouble, FaCommentDots, FaCog, FaSignOutAlt, FaChevronDown } from "react-icons/fa"
import { useUser } from "@/components/user-context"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface HeaderProps {
  toggleSidebar: () => void
}

interface NotificationItem {
  id: string
  type: 'task' | 'leave' | 'holiday' | 'task_comment'
  title: string
  status?: string
  created_at: string
  is_read: boolean
  link: string
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const { user, logout } = useUser()
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.email) {
      fetchAllNotifications()
      setupRealtime()
    }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false)
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [user])

  const fetchAllNotifications = async () => {
    if (!user?.email) return
    try {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status, created_at, is_read")
        .eq("assigned_to_email", user.email)
        .eq("is_read", false)

      const { data: allNotifications } = await supabase
        .from("leave_notifications")
        .select("*")
        .eq("user_email", user.email)
        .eq("is_read", false)

      const combined: NotificationItem[] = [
        ...(tasks?.map(t => ({
          id: t.id, type: 'task' as const, title: `Task Assigned: ${t.title}`,
          status: t.status, created_at: t.created_at, is_read: t.is_read, link: '/user/tasks'
        })) || []),
        ...(allNotifications?.map(n => ({
          id: n.id,
          type: n.type === 'company_holiday' ? 'holiday' as const : n.type === 'task_comment' ? 'task_comment' as const : 'leave' as const,
          title: n.message, status: n.status, created_at: n.created_at, is_read: n.is_read,
          link: n.type === 'company_holiday' ? '/user/vacations' : n.type === 'task_comment' ? '/user/tasks' : '/user/submit-leave'
        })) || [])
      ]
      setNotifications(combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (err) { console.error(err) }
  }

  const setupRealtime = () => {
    const channel = supabase.channel('user_header_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assigned_to_email=eq.${user?.email}` }, () => fetchAllNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_notifications', filter: `user_email=eq.${user?.email}` }, () => fetchAllNotifications())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  const handleNotificationClick = async (notif: NotificationItem) => {
    const table = notif.type === 'task' ? 'tasks' : 'leave_notifications'
    await supabase.from(table).update({ is_read: true }).eq('id', notif.id)
    setShowNotifDropdown(false)
    fetchAllNotifications()
    router.push(notif.link)
  }

  return (
    <header className="flex items-center justify-between bg-white shadow-sm px-4 md:px-6 py-3 relative z-50 border-b border-gray-100">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="text-gray-500 md:hidden">
          <FaBars size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-800 hidden md:block">Dashboard</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowUserDropdown(false); }} 
            className="p-2 rounded-full relative hover:bg-gray-50"
          >
            <FaBell size={20} className={notifications.length > 0 ? "text-blue-600" : "text-gray-400"} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold">
                {notifications.length}
              </span>
            )}
          </button>
          
          {showNotifDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-white border rounded-xl shadow-xl overflow-hidden ring-1 ring-black ring-opacity-5">
               <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-semibold text-gray-700 text-sm">Notifications</span>
                  {notifications.length > 0 && (
                    <button 
                      onClick={async () => {
                        await supabase.from("tasks").update({ is_read: true }).eq("assigned_to_email", user?.email)
                        await supabase.from("leave_notifications").update({ is_read: true }).eq("user_email", user?.email)
                        fetchAllNotifications()
                      }} 
                      className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1"
                    >
                      <FaCheckDouble size={10}/> Mark all as read
                    </button>
                  )}
               </div>
               <div className="max-h-[350px] overflow-y-auto">
                 {notifications.length === 0 ? (
                   <div className="p-8 text-center text-gray-400 text-sm italic">No new notifications</div>
                 ) : (
                   notifications.map(notif => (
                     <div 
                       key={notif.id} 
                       onClick={() => handleNotificationClick(notif)}
                       className="p-4 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors flex gap-3"
                     >
                       <div className="text-blue-500 mt-1"><FaCircle size={8} /></div>
                       <div>
                         <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                         <p className="text-[10px] text-gray-400 mt-1 uppercase">{notif.type}</p>
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          )}
        </div>

        {/* USER PROFILE DROPDOWN */}
        <div className="relative border-l pl-2 md:pl-4 border-gray-200" ref={userRef}>
          <button 
            onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false); }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            {/* PROFILE IMAGE FETCHED FROM EMPLOYEES TABLE COLUMN: image_url */}
            <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm ring-1 ring-gray-100">
              {user?.image_url ? (
                <img 
                  key={user.image_url} // Forces re-render if URL updates
                  src={user.image_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span>{user?.email?.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-gray-800 truncate max-w-[100px]">
                {user?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-gray-500 capitalize leading-tight">{user?.role || 'User'}</p>
            </div>
            <FaChevronDown size={10} className={`text-gray-400 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-3 w-52 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 truncate">
                {user?.email}
              </div>
              <div className="py-1">
                <button 
                  onClick={() => { setShowUserDropdown(false); router.push("/user/settings"); }} 
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FaCog className="text-gray-400" /> Settings
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button 
                  onClick={logout} 
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}