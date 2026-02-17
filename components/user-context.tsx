"use client"

import React, { createContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

interface UserContextType {
  user: User | null
  isAdmin: boolean
  logout: () => void
  refreshUser: () => Promise<void>
  hydrated: boolean
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const userId = session.user.id
        const email = session.user.email || "No Email"

        // ✅ Always use full email as display name
        const name = email

        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single()

        const role = profileData?.role || "user"

        const u: User = {
          id: userId,
          name,
          email,
          role,
        }

        setUser(u)

        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(u))
        }
      } else {
        if (typeof window !== "undefined") {
          const savedUser = localStorage.getItem("user")
          if (savedUser) {
            setUser(JSON.parse(savedUser))
          } else {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      }
    } catch (err) {
      console.error("Error refreshing user:", err)
      setUser(null)
    } finally {
      setHydrated(true)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)

    if (typeof window !== "undefined") {
      localStorage.removeItem("user")
    }
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin" || false,
        logout,
        refreshUser,
        hydrated,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = React.useContext(UserContext)
  if (!context) throw new Error("useUser must be used within a UserProvider")
  return context
}
