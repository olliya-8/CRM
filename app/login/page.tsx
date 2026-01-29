'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { FaEye, FaEyeSlash } from "react-icons/fa"
import BGV from "@/assets/bgv.png"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"

export default function LoginPage() {
  const router = useRouter()
  const { refreshUser } = useUser()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !data.user) {
        setError(authError?.message || "Invalid credentials")
        return
      }

      const authUser = data.user

      let { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("email", authUser.email)
        .single()

      // If user profile not found, create a new one
      if (profileError || !profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from("users")
          .insert({
            id: authUser.id,
            name: authUser.user_metadata?.full_name || "No Name",
            email: authUser.email,
            role: "user",
          })
          .select()
          .single()

        if (insertError || !newProfile) {
          setError("Failed to create user profile")
          return
        }

        profile = newProfile
      }

      await refreshUser() // update user context

      // Redirect based on role
      if (profile.role === "admin") {
        router.push("/dashboard")
      } else {
        router.push("/user")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F9FD] lg:px-10 lg:py-5">
      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 rounded-l-2xl bg-linear-to-br from-blue-500 to-blue-600 px-[94px] py-[60px]">
        <div className="w-full max-w-xl text-white flex flex-col gap-[50px] justify-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Image src={BGV} alt="Logo" className="w-8 h-8" />
            </div>
            <span className="text-2xl font-bold">BlueGrid Ventures</span>
          </div>

          <div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Your place to work
              <br />
              Plan. Create. Control.
            </h1>
          </div>

          <div className="w-full flex justify-center">
            <div className="relative w-full max-w-md">
              <Image
                src="/illustration.png"
                alt="Illustration"
                width={420}
                height={320}
                className="w-full h-auto"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 lg:w-1/2 bg-white lg:rounded-r-2xl flex items-center justify-center p-4 md:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-3 mb-8 pt-10">
            <div className="w-12 h-12 bg-white shadow-md rounded-xl flex items-center justify-center border border-gray-50">
              <Image src={BGV} alt="Logo" className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold text-gray-800">
              BlueGrid Ventures
            </span>
          </div>

          <div className="p-2 sm:p-8">
            <h2 className="hidden sm:block text-2xl text-center font-bold text-gray-900 mb-8">
              Sign In to BlueGrid Ventures
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg pr-12 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  Remember me
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-500 font-semibold hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-blue-100"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-blue-500 font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
