"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Workload from "@/components/workload"
import NearestEvents from "@/components/nearest-events"
import ActivityStream from "@/components/activity-stream"
import Projects from "@/components/projects"
import { useUser } from "@/components/user-context"
import { useSearchContext } from '@/components/contexts/SearchContext'

export default function DashboardPage() {
  const router = useRouter()
  const { logout } = useUser()
  const { updateSearchIndex } = useSearchContext() 

  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) { 
      router.replace("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(userStr)
      if (parsedUser.role.toLowerCase() !== "admin") { 
        router.replace("/user")
        return
      }
      setUser(parsedUser)

      // ✅ REGISTER ALL SIDEBAR PAGES FOR SEARCH
      const sidebarItems = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Projects', path: '/projects-page' },
        { name: 'Finances', path: '/finances-page' },
        { name: 'Calendar', path: '/calendar-page' },
        { name: 'Vacations', path: '/vacations-page' },
        { name: 'Employees', path: '/employees-page' },
        { name: 'Info Portal', path: '/info-portal-page' },
      ]
      updateSearchIndex('navigation', sidebarItems)
    } catch (e) { 
      router.replace("/login") 
    } finally { 
      setIsLoading(false) 
    }
  }, [router, updateSearchIndex])

  const handlePageChange = (page: string) => {
    const routeMap: Record<string, string> = {
      "Employees": "/employees-page",
      "Projects": "/projects-page",
      "Calendar": "/calendar-page",
      "Activitystream": "/activity-stream-page",
      "Vacations": "/vacations-page",
      "Finances": "/finances-page",
      "Dashboard": "/dashboard"
    }
    router.push(routeMap[page] || "/dashboard")
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm">
            <Workload onViewAll={() => handlePageChange("Employees")} />
          </div>
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm">
            <Projects />
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm">
            <NearestEvents onViewAll={() => handlePageChange("Calendar")} />
          </div>
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm">
            <ActivityStream />
          </div>
        </div>
      </div>
    </div>
  )
}