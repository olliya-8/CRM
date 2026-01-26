"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/components/user-context"
import { useSearchContext } from "@/components/contexts/SearchContext"
import { supabase } from "@/lib/supabase"
import { Settings, LogOut, ChevronDown, Search, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import NotificationBell from "@/components/notification-bell"

export default function Header({ onLogout }: { onLogout?: () => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userImageUrl, setUserImageUrl] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  
  const searchRef = useRef(null)
  const userMenuRef = useRef(null)
  const router = useRouter()
  const { searchIndex } = useSearchContext()
  const { logout, user } = useUser()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSearchResults(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.email) return
      const { data } = await supabase.from('employees').select('name, image_url').eq('email', user.email).single()
      if (data) {
        setUserImageUrl(data.image_url || "")
        setEmployeeName(data.name || "")
      }
    }
    fetchUserData()
  }, [user?.email])

  // Search Logic
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
          let path = item.path || item.href
          
          if (!path) {
            const categoryPageMap: { [key: string]: string } = {
              'navigation': '/dashboard',
              'employees': '/employees-page',
              'projects': '/projects-page',
              'finances': '/finances-page',
              'vacations': '/vacations-page',
              'infoPortal': '/info-portal-page',
              'activities': '/dashboard',
              'documents': '/info-portal-page',
              'announcements': '/info-portal-page',
              'conversations': '/dashboard'
            }
            path = categoryPageMap[category] || '/dashboard'
          }
          
          results.push({
            ...item,
            category,
            title: item.title || item.name || "Result",
            path
          })
        }
      })
    })

    setSearchResults(results.slice(0, 10))
    setShowSearchResults(results.length > 0)
  }, [searchQuery, searchIndex])

  const handleSearchResultClick = (path: string) => {
    if (path && path !== '#' && path !== '') {
      router.push(path)
      setSearchQuery("")
      setShowSearchResults(false)
      setIsMobileSearchOpen(false)
    }
  }

  return (
    <>
      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          
          {/* Center Section - Search Bar - LG SCREENS ONLY */}
          <div className="hidden flex-1 justify-center lg:flex" ref={searchRef}>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />

              {/* Search Results Dropdown - LG SCREENS */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearchResultClick(r.path)}
                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <span className="truncate font-medium text-slate-900">{r.title}</span>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        {r.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Search Icon (SM/MD) + Notification Bell + User Menu */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            {/* Search Icon - SM/MD SCREENS ONLY */}
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 active:scale-95 lg:hidden"
              aria-label="Open search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* 🔔 Notification Bell */}
            <NotificationBell />

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg p-1.5 transition-all hover:bg-slate-100 active:scale-95 sm:gap-2.5 sm:pr-3"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8 ring-2 ring-slate-100">
                  <AvatarImage src={userImageUrl} alt={employeeName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-semibold text-white">
                    {employeeName?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-slate-700 sm:inline-block">
                  {employeeName || "User"}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="truncate font-semibold text-slate-900">{employeeName}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Account
                    </span>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/account/settings"
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        onLogout?.()
                      }}
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

      {/* Mobile Search Overlay - SM/MD SCREENS ONLY */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden">
          {/* Mobile Search Header */}
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
                  placeholder="Search anything..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Mobile Search Results */}
          <div className="overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
            {searchQuery.trim().length >= 2 && searchResults.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearchResultClick(r.path)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50"
                  >
                    <span className="truncate font-medium text-slate-900">{r.title}</span>
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                      {r.category}
                    </span>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-slate-100 p-3">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-900">No results found</p>
                <p className="mt-1 text-sm text-slate-500">Try a different search term</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-slate-100 p-3">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-900">Start typing to search</p>
                <p className="mt-1 text-sm text-slate-500">Search employees, projects, and more</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}