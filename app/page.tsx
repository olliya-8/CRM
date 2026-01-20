"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const userStr = localStorage.getItem("user")

    if (!userStr) {
      router.replace("/login")
      return
    }

    const user = JSON.parse(userStr)

    if (user.role === "admin") {
      router.replace("/dashboard")
    } else {
      router.replace("/user")
    }
  }, [router])

  return null
}
