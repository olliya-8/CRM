"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { usePathname } from "next/navigation"
import "./globals.css"

import { UserProvider } from "@/components/user-context"
import { SearchProvider } from "@/components/contexts/SearchContext"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import GlobalSearchLoader from "@/components/GlobalSearchLoader"

const geist = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Automatically close sidebar on mobile when the route changes
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  // Updated check: Hide header/sidebar if on login OR sign-up pages
  const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/sign-up")

  return (
    <html lang="en" className="h-full">
      <body className="font-sans antialiased h-full overflow-hidden">
        <UserProvider>
          <SearchProvider>
            <GlobalSearchLoader />

            {!isAuthRoute ? (
              // ✅ MAIN APP LAYOUT (With Sidebar & Header)
              <div className="flex h-full relative">
                {/* Mobile Sidebar Overlay: Click anywhere to close */}
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
            ) : (
              // ✅ LOGIN / SIGN-UP PAGES (Plain Layout)
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