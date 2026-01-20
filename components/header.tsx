"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useUser } from "@/components/user-context"
import { useSearchContext } from "@/components/contexts/SearchContext"
import { supabase } from "@/lib/supabase"

import { Settings, LogOut, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Header({
  onLogout,
  onMenuClick,
}: {
  onLogout?: () => void
  onMenuClick?: () => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userImageUrl, setUserImageUrl] = useState<string>("")

  const searchRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const { searchIndex } = useSearchContext()
  const { logout, user } = useUser()

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fetch user image from employees table
  useEffect(() => {
    const fetchUserImage = async () => {
      if (!user?.email) return

      try {
        const { data, error } = await supabase
          .from('employees')
          .select('image_url')
          .eq('email', user.email)
          .single()

        if (data && !error) {
          setUserImageUrl(data.image_url || "")
        }
      } catch (err) {
        console.error("Error fetching user image:", err)
      }
    }

    fetchUserImage()
  }, [user?.email])

  // Search logic
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const q = searchQuery.toLowerCase()
    const results: any[] = []

    Object.entries(searchIndex).forEach(([category, items]) => {
      if (!Array.isArray(items)) return

      items.forEach((item: any) => {
        const text = Object.values(item).join(" ").toLowerCase()
        if (text.includes(q)) {
          results.push({
            ...item,
            category,
            title: item.name || item.title || "Result",
            subtitle: item.subtitle || item.role || item.description || "",
          })
        }
      })
    })

    setSearchResults(results.slice(0, 10))
    setShowSearchResults(results.length > 0)
  }, [searchQuery, searchIndex])

  // Navigate to result
  const handleResultClick = (result: any) => {
    setShowSearchResults(false)
    setSearchQuery("")

    // Navigate based on category
    const categoryRoutes: Record<string, string> = {
      navigation: result.path || "/dashboard",
      employees: "/employees-page",
      projects: "/projects-page",
      finances: "/finances-page",
      vacations: "/vacations-page",
      calendar: "/calendar-page",
      infoPortal: "/info-portal-page",
      activities: "/dashboard",
      workload: "/dashboard",
      events: "/calendar-page",
    }

    const route = categoryRoutes[result.category] || "/dashboard"
    router.push(route)
  }

  // Format category name for display
  const formatCategory = (category: string) => {
    const categoryLabels: Record<string, string> = {
      navigation: "Navigation",
      employees: "Employees",
      projects: "Projects",
      finances: "Finances",
      vacations: "Vacations",
      calendar: "Calendar",
      infoPortal: "Info Portal",
      activities: "Activities",
      workload: "Workload",
      events: "Events",
    }
    return categoryLabels[category] || category
  }

  const handleLogout = () => {
    setShowUserMenu(false)
    if (onLogout) onLogout()
    else {
      logout()
      router.push("/login")
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
      {/* SEARCH */}
      <div className="flex-1 max-w-md relative" ref={searchRef}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full px-4 py-2 rounded-lg border bg-slate-50"
        />

        {showSearchResults && (
          <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
            {searchResults.map((r, i) => (
              <div
                key={i}
                onClick={() => handleResultClick(r)}
                className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-slate-500 truncate">{r.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                    {formatCategory(r.category)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* USER MENU */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu((v) => !v)}
          className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-slate-50 transition-colors"
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={userImageUrl} />
            <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          
          <span className="text-sm font-medium text-slate-700 max-w-[200px] truncate">
            {user?.name || "User"}
          </span>

          <ChevronDown
            className={`h-4 w-4 transition flex-shrink-0 ${showUserMenu ? "rotate-180" : ""}`}
          />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 mt-3 min-w-[280px] max-w-sm bg-white border rounded-xl shadow-xl z-50">
            <div className="p-4 border-b">
              <p className="text-sm font-bold break-words">{user?.name || "User"}</p>
              <p className="text-xs text-slate-500 break-words mt-1">{user?.email}</p>
            </div>

            <Link
              href="/account/settings"
              onClick={() => setShowUserMenu(false)}
              className="flex gap-3 px-4 py-3 hover:bg-slate-50 items-center"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Settings</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex gap-3 px-4 py-3 text-red-600 hover:bg-red-50 items-center"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}