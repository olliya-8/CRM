"use client"

import { useState } from "react"
import { useUser } from "@/components/user-context"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const { user, refreshUser } = useUser()
  const [name, setName] = useState(user?.name || "")
  const [submitting, setSubmitting] = useState(false)

  const handleUpdate = async () => {
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", user?.id)

      if (error) throw error
      alert("Profile updated ✅")
      await refreshUser()
    } catch (err) {
      console.error(err)
      alert("Error updating profile ❌")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow max-w-md">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>

      <div className="flex flex-col gap-3">
        <label className="font-medium">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded"
        />

        {/* Profile pic upload */}
        <label className="font-medium">Profile Picture</label>
        <input type="file" className="border p-2 rounded" />

        <button
          onClick={handleUpdate}
          disabled={submitting}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {submitting ? "Updating..." : "Update Profile"}
        </button>
      </div>
    </div>
  )
}
