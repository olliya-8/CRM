"use client"

import type React from "react"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { usePathname } from "next/navigation"
import "./globals.css"
import { UserProvider } from "@/components/user-context"
import { SearchProvider } from "@/components/contexts/SearchContext"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import GlobalSearchLoader from "@/components/GlobalSearchLoader"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Define routes that should NOT show header and sidebar
  const authRoutes = ["/login", "/sign-up", "/signup"]
  
  // Define routes that SHOULD show header and sidebar
  const dashboardRoutes = [
    "/dashboard",
    "/activity-stream",
    "/nearest-events",
    "/projects",
    "/finances",
    "/calendar",
    "/vacations",
    "/employees",
    "/info-portal"
  ]

  // Check if current route is an auth route
  const isAuthRoute = authRoutes.some(route => pathname?.startsWith(route))
  
  // Check if current route is a dashboard route
  const isDashboardRoute = dashboardRoutes.some(route => pathname?.startsWith(route))
  
  // Show layout if it's a dashboard route and NOT an auth route
  const showLayout = isDashboardRoute && !isAuthRoute

  return (
    <html lang="en" className="h-full">
      <body className="font-sans antialiased h-full overflow-hidden">
        <UserProvider>
          <SearchProvider>
            <GlobalSearchLoader />
            
            {showLayout ? (
              // Dashboard Layout with Sidebar and Header
              <div className="flex h-full">
                <Sidebar />
                
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header />
                  
                  <main className="flex-1 overflow-auto bg-slate-50">
                    {children}
                  </main>
                </div>
              </div>
            ) : (
              // Auth Layout without Sidebar and Header
              <main className="h-full w-full">
                {children}
              </main>
            )}
          </SearchProvider>
        </UserProvider>

        <Analytics />
      </body>
    </html>
  )
}