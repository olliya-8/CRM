'use client'

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/components/user-context"
import { supabase } from "@/lib/supabase"
import { Settings, LogOut, ChevronDown, Search, X, Bell } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NotificationItem {
  id: string
  type: 'task' | 'leave' | 'holiday' | 'task_comment'
  title: string
  status?: string
  created_at: string
  is_read: boolean
  link: string
}

interface SearchResult {
  id: string
  title: string
  type: string
  link: string
  subtitle?: string
}

export default function Header() {
  const { user, logout } = useUser()
  const router = useRouter()
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userImageUrl, setUserImageUrl] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.email) return
      const { data } = await supabase
        .from('employees')
        .select('name, image_url')
        .eq('email', user.email)
        .single()
      
      if (data) {
        setUserImageUrl(data.image_url || "")
        setEmployeeName(data.name || "")
      }
    }
    fetchUserData()
  }, [user?.email])

  useEffect(() => {
    if (user?.email) {
      fetchAllNotifications()
      setupRealtime()
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // SEARCH LOGIC
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      const query = searchQuery.toLowerCase()
      const results: SearchResult[] = []

      if (!user?.email) return

      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, description, status')
          .eq('assigned_to_email', user.email)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5)

        tasks?.forEach(task => {
          results.push({
            id: task.id,
            title: task.title,
            type: 'Task',
            link: '/user/tasks',
            subtitle: task.status
          })
        })

        const { data: leaves } = await supabase
          .from('leave_requests')
          .select('id, leave_type, start_date, end_date, status')
          .eq('email', user.email)
          .or(`leave_type.ilike.%${query}%,status.ilike.%${query}%`)
          .limit(5)

        leaves?.forEach(leave => {
          results.push({
            id: leave.id,
            title: leave.leave_type,
            type: 'Leave',
            link: '/user/submit-leave',
            subtitle: `${new Date(leave.start_date).toLocaleDateString()} - ${leave.status}`
          })
        })

        const { data: holidays } = await supabase
          .from('company_holidays')
          .select('id, title, date')
          .or(`title.ilike.%${query}%`)
          .limit(5)

        holidays?.forEach(holiday => {
          results.push({
            id: holiday.id,
            title: holiday.title,
            type: 'Holiday',
            link: '/user/submit-leave',
            subtitle: new Date(holiday.date).toLocaleDateString()
          })
        })

        setSearchResults(results)
        setShowSearchResults(results.length > 0)
      } catch (error) {
        console.error('Search error:', error)
      }
    }

    const debounce = setTimeout(performSearch, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, user?.email])

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
          id: t.id, 
          type: 'task' as const, 
          title: `Task Assigned: ${t.title}`,
          status: t.status, 
          created_at: t.created_at, 
          is_read: t.is_read, 
          link: '/user/tasks'
        })) || []),
        ...(allNotifications?.map(n => ({
          id: n.id,
          type: n.type === 'company_holiday' ? 'holiday' as const : n.type === 'task_comment' ? 'task_comment' as const : 'leave' as const,
          title: n.message, 
          status: n.status, 
          created_at: n.created_at, 
          is_read: n.is_read,
          link: n.type === 'company_holiday' ? '/user/vacations' : n.type === 'task_comment' ? '/user/tasks' : '/user/submit-leave'
        })) || [])
      ]
      setNotifications(combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (err) { 
      console.error(err) 
    }
  }

  const setupRealtime = () => {
    const channel = supabase.channel('user_header_notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks', 
        filter: `assigned_to_email=eq.${user?.email}` 
      }, () => fetchAllNotifications())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'leave_notifications', 
        filter: `user_email=eq.${user?.email}` 
      }, () => fetchAllNotifications())
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

  const markAllAsRead = async () => {
    await supabase.from("tasks").update({ is_read: true }).eq("assigned_to_email", user?.email)
    await supabase.from("leave_notifications").update({ is_read: true }).eq("user_email", user?.email)
    fetchAllNotifications()
  }

  const handleSearchResultClick = (link: string) => {
    router.push(link)
    setSearchQuery("")
    setShowSearchResults(false)
    setIsMobileSearchOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 w-full">
          
          <div className="flex-1 hidden lg:block"></div>

          <div className="hidden lg:flex flex-1 justify-center" ref={searchRef}>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                placeholder="Search tasks, leaves..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSearchResultClick(result.link)}
                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-slate-900 block">{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-slate-500">{result.subtitle}</span>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        {result.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 active:scale-95 lg:hidden"
              aria-label="Open search"
            >
              <Search className="h-5 w-5" />
            </button>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown)
                  setShowUserMenu(false)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 active:scale-95"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-700">Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm text-slate-500">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50"
                        >
                          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                            <p className="mt-0.5 text-xs uppercase text-slate-400">{notif.type}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu)
                  setShowNotifDropdown(false)
                }}
                className="flex items-center gap-2 rounded-lg p-1.5 transition-all hover:bg-slate-100 active:scale-95 sm:gap-2.5 sm:pr-3"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8 ring-2 ring-slate-100">
                  <AvatarImage src={userImageUrl} alt={employeeName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-semibold text-white">
                    {employeeName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                
                {/* FIXED THIS LINE BELOW: Split removed to show full email */}
                <span className="hidden text-sm font-medium text-slate-700 sm:inline-block">
                  {employeeName || user?.email}
                </span>
                
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="truncate font-semibold text-slate-900">{employeeName || "User"}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      User
                    </span>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/user/settings"
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden">
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsMobileSearchOpen(false)
                  setSearchQuery("")
                  setShowSearchResults(false)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 active:scale-95"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, leaves..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
            {searchQuery.trim().length >= 2 && searchResults.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSearchResultClick(result.link)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-slate-900 block">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-slate-500">{result.subtitle}</span>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                      {result.type}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-slate-100 p-3">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-900">
                  {searchQuery.trim().length >= 2 ? "No results found" : "Start typing to search"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}