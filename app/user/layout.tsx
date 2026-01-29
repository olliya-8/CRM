'use client'

import { ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/user-context"
import UserHeader from "./header"
import UserSidebar from "./sidebar"

export default function UserLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // wait till user context is loaded
    if (!loading) {
      if (!user) {
        // redirect to login if not logged in
        router.replace("/login")
      } else {
        setAuthChecked(true) // user ok, render children
      }
    }
  }, [user, loading, router])

  // show nothing / loader until auth check is done
  if (!authChecked) return null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <UserSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <UserHeader />

        {/* scrollable content */}
        <main className="p-6 md:p-10 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
