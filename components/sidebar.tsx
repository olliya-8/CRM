"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { LayoutDashboard, Layers, Wallet, Calendar, Plane, Users, Folder, LogOut } from "lucide-react"
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
  const pathname = usePathname() // <- get current route automatically
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = () => {
    setIsLoggingOut(true)
    localStorage.removeItem("user")
    setTimeout(() => {
      router.push("/login")
    }, 300)
  }

  const handleNavigation = (path: string) => {
    setIsOpen(false)
    router.push(path) // <-- Next.js client navigation, no page reload
  }

  return (
    <>
      {/* Hamburger */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 bg-gray-200 text-gray-800 p-2 rounded-md shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`w-60 h-[calc(100vh-16px)] bg-white flex flex-col shadow-2xl rounded-2xl fixed top-2 left-2 bottom-2 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 lg:translate-x-0 lg:static lg:sticky lg:top-2`}
      >
        {/* Logo */}
        <div className="p-6 flex justify-start">
          <button
            onClick={() => handleNavigation("/dashboard")}
            className="w-16 h-16 rounded-2xl bg-[#EEF4FF] flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <Image src={BGV} alt="BGV Logo" className="w-10 h-10" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            return (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[16px] font-medium transition-all duration-200 ${
                  isActive ? "bg-[#EEF4FF] text-[#3F8CFF]" : "text-[#7D8592] hover:bg-[#F5F8FF]"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[16px] font-medium transition-all duration-200 ${
              isLoggingOut ? "bg-[#3F8CFF] text-white" : "text-[#7D8592] hover:bg-[#F5F8FF]"
            }`}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}
