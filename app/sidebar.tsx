"use client"
import React from 'react'
import { SearchProvider } from "@/components/contexts/SearchContext"  // ← CHANGED THIS
import Sidebar from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useUser } from '@/components/user-context'

function sidebar() {
    const router = useRouter()
      const { logout } = useUser()
       const handlePageChange = (page: string) => {
        const routeMap: Record<string, string> = {
          "Employees": "/employees-page",
          "Projects": "/projects-page",
          "Calendar": "/calendar-page",
          "Activitystream": "/activity-stream-page",
          
          "Finances": "/finances-page",
          "Dashboard": "/dashboard"
        }
        router.push(routeMap[page] || "/dashboard")
      }
  return (
    <div className='w-fit'>
      <Sidebar onLogout={logout} currentPage="Dashboard" onPageChange={handlePageChange} />
    </div>
  )
}

export default sidebar
