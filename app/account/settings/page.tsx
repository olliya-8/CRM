"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/components/user-context"
import { supabase } from "@/lib/supabase"
import { toast, Toaster } from "react-hot-toast"
import { User, Lock, ChevronLeft, Camera, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  const { user, refreshUser } = useUser()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [uploadingImage, setUploadingImage] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  
  // Logic for toggling visibility
  const [activeView, setActiveView] = useState<"menu" | "profile" | "password">("menu")

  useEffect(() => {
    if (user?.email) loadProfileFromEmployees()
  }, [user?.email])

  const loadProfileFromEmployees = async () => {
    if (!user?.email) return
    setInitialLoading(true)
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("name, email, image_url")
        .eq("email", user.email)
        .single()
      if (error) throw error
      if (data) {
        setName(data.name || "")
        setEmail(data.email || "")
        setImageUrl(data.image_url || "")
        setImagePreview(data.image_url || "")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to load profile")
    } finally {
      setInitialLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error("Image size should be <5MB")
    if (!file.type.startsWith("image/")) return toast.error("Select an image file")
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from("employee-images").upload(fileName, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from("employee-images").getPublicUrl(fileName)
      setUploadingImage(false)
      return data.publicUrl
    } catch (err) {
      console.error(err)
      setUploadingImage(false)
      toast.error("Failed to upload image")
      return null
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.email) return toast.error("User not found")
    const toastId = toast.loading("Updating profile...")
    setLoading(true)
    try {
      let finalImageUrl = imageUrl
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (!uploadedUrl) throw new Error("Image upload failed")
        finalImageUrl = uploadedUrl
      }
      const { error } = await supabase
        .from("employees")
        .update({ name, image_url: finalImageUrl })
        .eq("email", user.email)
      if (error) throw error
      setImageUrl(finalImageUrl)
      setImagePreview(finalImageUrl)
      setImageFile(null)
      toast.success("Profile updated!", { id: toastId })
      await loadProfileFromEmployees()
      await refreshUser()
      setActiveView("menu") // Hide form after success
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Update failed", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleSavePassword = async () => {
    if (!user?.id) return toast.error("User not found")
    if (!newPassword) return toast.error("Enter new password")
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match")
    const toastId = toast.loading("Updating password...")
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password updated!", { id: toastId })
      setActiveView("menu") // Hide form after success
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Password update failed", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  if (!user || initialLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-slate-400 font-medium text-lg">Loading secure settings...</div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
      <Toaster position="top-right" />

      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm">Update your personal details and account security</p>
        <div className="w-12 h-1 bg-blue-500 mx-auto rounded-full" />
      </div>

      {/* VIEW 1: SELECTION MENU (Hidden when form is open) */}
      {activeView === "menu" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setActiveView("profile")}
            className="group relative flex flex-col items-center p-10 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Profile Settings</h3>
            <p className="text-slate-500 text-sm text-center mt-2">Change your name and profile picture</p>
          </button>

          <button 
            onClick={() => setActiveView("password")}
            className="group relative flex flex-col items-center p-10 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-blue-50 group-hover:text-blue-600">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Password & Security</h3>
            <p className="text-slate-500 text-sm text-center mt-2">Keep your account safe and protected</p>
          </button>
        </div>
      )}

      {/* VIEW 2: PROFILE FORM */}
      {activeView === "profile" && (
        <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center bg-white">
            <Button variant="ghost" onClick={() => setActiveView("menu")} className="rounded-full h-10 w-10 p-0 hover:bg-slate-100">
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </Button>
            <span className="ml-2 font-bold text-slate-700">Back to Settings</span>
          </div>
          
          <CardContent className="p-8 md:p-12 space-y-10">
            <div className="flex flex-col items-center sm:flex-row gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-lg ring-1 ring-slate-100">
                  {imagePreview ? (
                    <img src={imagePreview} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-4xl font-bold">
                      {name ? name.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2.5 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 shadow-lg border-2 border-white transition-all">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-slate-800">Personal Details</h2>
                <p className="text-slate-500 text-sm">Manage your profile identification</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold ml-1">Full Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-12 border-slate-200 rounded-xl focus:ring-blue-500" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold ml-1">Email Address</Label>
                <Input value={email} readOnly disabled className="h-12 bg-slate-50 border-slate-200 rounded-xl text-slate-400" />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="p-8 bg-slate-50/50 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setActiveView("menu")} className="h-12 px-8 rounded-xl font-semibold border-slate-200">Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={loading || uploadingImage} className="h-12 px-8 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 transition-all">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* VIEW 3: PASSWORD FORM */}
      {activeView === "password" && (
        <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center bg-white">
            <Button variant="ghost" onClick={() => setActiveView("menu")} className="rounded-full h-10 w-10 p-0 hover:bg-slate-100">
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </Button>
            <span className="ml-2 font-bold text-slate-700">Back to Settings</span>
          </div>

          <CardContent className="p-8 md:p-12 space-y-8">
            <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><ShieldCheck className="w-6 h-6" /></div>
               <div>
                  <h2 className="text-2xl font-bold text-slate-800">Security</h2>
                  <p className="text-slate-500 text-sm">Ensure your account is using a strong password</p>
               </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold ml-1">New Password</Label>
                <Input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="h-12 border-slate-200 rounded-xl"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold ml-1">Confirm New Password</Label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="h-12 border-slate-200 rounded-xl"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-8 bg-slate-50/50 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setActiveView("menu")} className="h-12 px-8 rounded-xl font-semibold border-slate-200">Cancel</Button>
            <Button onClick={handleSavePassword} disabled={loading} className="h-12 px-8 rounded-xl font-semibold bg-slate-900 hover:bg-black transition-all">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}