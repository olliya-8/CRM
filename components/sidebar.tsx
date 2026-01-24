"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { LayoutDashboard, Layers, Wallet, Calendar, Plane, Users, Folder, LogOut, Menu, X } from "lucide-react"
import Image from "next/image"
import BGV from "@/assets/bgv.png"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Layers, label: "Projects", path: "/projects-page" },
  { icon: Wallet, label: "Finances", path: "/finances-page" },
  { icon: Calendar, label: "Calendar", path: "/calendar-page" },
  { icon: Plane, label: "Vacations", path: "/vacations-page" },
  { icon: Users, label: "Employees", path: "/employees-page" },
  { icon: Folder, label: "Info Portal", path: "/info-portal-page" },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

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
      {/* 1. THE HAMBURGER BUTTON - High Z-Index to stay on top */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-5 z-[45] lg:hidden p-2 bg-white shadow-xl rounded-2xl text-black border rounded-full border-slate-100 active:scale-90 transition-all"
      >
        {isOpen ? <X className="w-3 h-3" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* 2. BACKDROP - Dim the background when menu is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. SIDEBAR CONTAINER */}
      <div className={`
        w-64 h-[calc(100vh-16px)] bg-white flex flex-col shadow-2xl rounded-2xl fixed top-2 left-2 bottom-2 z-[50] 
        transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${isOpen ? "translate-x-0" : "-translate-x-[110%] lg:translate-x-0"} 
        lg:static lg:sticky lg:top-2
      `}>
        
        {/* Logo Section - Adjusted padding for mobile to avoid hamburger overlap */}
        <div className="pt-20 lg:pt-6 px-4 flex justify-start">
          <button
            onClick={() => handleNavigation("/dashboard")}
            className="w-14 h-14 rounded-full bg-[#EEF4FF] flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <Image
              src={BGV}
              alt="BGV Logo"
              className="w-8 h-8"
            />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.replace(/\/$/, "") === item.path.replace(/\/$/, "")
            return (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                  ${isActive ? "bg-[#EEF4FF] text-[#3F8CFF]" : "text-[#7D8592] hover:bg-[#F5F8FF]"}
                  text-sm sm:text-base lg:text-lg
`} 
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 text-[#7D8592] hover:bg-[#F5F8FF] text-sm sm:text-base lg:text-lg
"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}