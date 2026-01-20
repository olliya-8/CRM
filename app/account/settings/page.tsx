'use client'

import { useState, useEffect } from "react"
import { useUser } from "@/components/user-context"
import { supabase } from "@/lib/supabase"
import { toast, Toaster } from "react-hot-toast"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function SettingsPage() {
  const { user, refreshUser } = useUser()

  // Profile
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [imageUrl, setImageUrl] = useState("")

  // Security
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Recreate account
  const [currentName, setCurrentName] = useState("")
  const [currentEmail, setCurrentEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newAccName, setNewAccName] = useState("")
  const [newAccEmail, setNewAccEmail] = useState("")
  const [newAccPassword, setNewAccPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"profile" | "security" | "recreate">("profile")

  // Load user profile
  useEffect(() => {
    if (!user?.id) return
    setName(user.name ?? "")
    setEmail(user.email ?? "")
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from("employees")
      .select("name,email,image_url")
      .eq("user_id", user.id)
      .maybeSingle()
    if (error) return toast.error(error.message)
    if (!data) return
    setName(data.name ?? "")
    setEmail(data.email ?? "")
    setImageUrl(data.image_url ?? "")
  }

  // Update profile image
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    try {
      setLoading(true)
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}.${ext}`
      const filePath = `employees/${fileName}`

      // Upload to storage (overwrite existing)
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('profile-images').getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      // **Update existing row only**
      const { error: updateError } = await supabase
        .from("employees")
        .update({ image_url: publicUrl })
        .eq("user_id", user.id)
      if (updateError) throw updateError

      setImageUrl(publicUrl)
      toast.success("Profile image updated!")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to update image")
    } finally {
      setLoading(false)
    }
  }

  // Update profile info
  const handleSaveProfile = async () => {
    if (!user?.id) return toast.error("User not found")
    setLoading(true)
    try {
      const { error } = await supabase
        .from("employees")
        .update({ name, email })
        .eq("user_id", user.id)
      if (error) throw error

      await refreshUser()
      toast.success("Profile updated!")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Update failed")
    } finally {
      setLoading(false)
    }
  }

  // Update password
  const handleSaveSecurity = async () => {
    if (!user?.id) return toast.error("User not found")
    if (!newPassword) return toast.error("Enter new password")
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match")
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password updated!")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Password update failed")
    } finally {
      setLoading(false)
    }
  }

  // Recreate account
  const handleRecreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return toast.error("User not found")
    if (!currentName || !currentEmail || !currentPassword) return toast.error("Enter current credentials")
    if (!newAccName || !newAccEmail || !newAccPassword) return toast.error("Enter new account details")

    setLoading(true)
    try {
      // Sign in current user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword
      })
      if (signInError) throw signInError
      if (!signInData.user) throw new Error("Current credentials not matched")

      // Update existing row instead of inserting
      const { error: updateError } = await supabase
        .from("employees")
        .update({ name: newAccName, email: newAccEmail })
        .eq("user_id", user.id)
      if (updateError) throw updateError

      // Update auth user email and password
      const { error: authError } = await supabase.auth.updateUser({
        email: newAccEmail,
        password: newAccPassword,
        data: { name: newAccName }
      })
      if (authError) throw authError

      toast.success("Account updated successfully!")
      // Reset form
      setCurrentName(""); setCurrentEmail(""); setCurrentPassword("")
      setNewAccName(""); setNewAccEmail(""); setNewAccPassword("")
      await refreshUser()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to recreate account")
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <div className="p-10 text-center text-slate-600">Loading...</div>

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-5xl mx-auto">
      <Toaster position="top-right" />
      <h2 className="text-3xl font-bold">Settings</h2>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "profile" | "security" | "recreate")} className="flex flex-col md:flex-row gap-8">
        <aside className="md:w-64">
          <TabsList className="flex md:flex-col gap-1 bg-transparent">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="recreate">Recreate Account</TabsTrigger>
          </TabsList>
        </aside>

        <div className="flex-1 space-y-6">
          {/* Profile */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Info</CardTitle>
                <CardDescription>Update your photo, name, and email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    {imageUrl ? <AvatarImage src={imageUrl} /> : <AvatarFallback>{(name || "U")[0]}</AvatarFallback>}
                  </Avatar>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="cursor-pointer" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleSaveSecurity} disabled={loading}>{loading ? "Updating..." : "Update"}</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Recreate */}
          <TabsContent value="recreate">
            <Card className="max-h-[70vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Recreate Account</CardTitle>
                <CardDescription>Update your current account credentials</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleRecreateAccount}>
                  <Label>Current Name</Label>
                  <Input value={currentName} onChange={(e) => setCurrentName(e.target.value)} />
                  <Label>Current Email</Label>
                  <Input type="email" value={currentEmail} onChange={(e) => setCurrentEmail(e.target.value)} />
                  <Label>Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />

                  <hr className="my-2" />

                  <Label>New Name</Label>
                  <Input value={newAccName} onChange={(e) => setNewAccName(e.target.value)} />
                  <Label>New Email</Label>
                  <Input type="email" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} />
                  <Label>New Password</Label>
                  <Input type="password" value={newAccPassword} onChange={(e) => setNewAccPassword(e.target.value)} />

                  <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={loading}>{loading ? "Processing..." : "Update Account"}</Button>
                  </CardFooter>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
