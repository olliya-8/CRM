"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

import { UserProvider, useUser } from "@/components/user-context"
import { SearchProvider } from "@/components/contexts/SearchContext"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import GlobalSearchLoader from "@/components/GlobalSearchLoader"

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user } = useUser()

  // Automatically close sidebar on mobile when the route changes
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  // Hide layout if on login/signup pages
  const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/sign-up")

  // Hide layout if role is "user"
  const hideLayoutForUser = user?.role === "user"

  const showLayout = !isAuthRoute && !hideLayoutForUser

  return (
    <>
      {!showLayout ? (
        // Plain layout for login / sign-up OR normal user
        <main className="h-full w-full">{children}</main>
      ) : (
        // Main App Layout (With Sidebar & Header)
        <div className="flex h-full relative">
          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <Sidebar isOpen={isSidebarOpen} />

          <div className="flex-1 flex flex-col overflow-hidden w-full">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />

            <main className="flex-1 overflow-auto bg-slate-50">
              {children}
            </main>
          </div>
        </div>
      )}
    </>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="font-sans antialiased h-full overflow-hidden">
        <UserProvider>
          <SearchProvider>
            <GlobalSearchLoader />
            <LayoutWrapper>{children}</LayoutWrapper>
          </SearchProvider>
        </UserProvider>
        <Analytics />
      </body>
    </html>
  )
}
