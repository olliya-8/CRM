'use client'

import { ReactNode, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/user-context"
import Header from "./header"
import Sidebar from "./sidebar"

export default function UserLayout({ children }: { children: ReactNode }) {
  const { user, hydrated } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login")
    }
  }, [user, hydrated, router])

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-slate-50 p-6 md:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}