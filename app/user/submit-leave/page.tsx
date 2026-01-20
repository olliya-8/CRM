"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/user-context"

export default function SubmitLeavePage() {
  const { user } = useUser()
  const [form, setForm] = useState({
    leave_type: "Sick Leave",
    start_date: "",
    end_date: "",
    reason: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { error } = await supabase.from("leave_requests").insert([
        {
          email: user?.email,
          employee_name: user?.name,
          status: "Pending",
          ...form,
        },
      ])
      if (error) throw error
      alert("Leave submitted successfully ✅")
      setForm({ leave_type: "Sick Leave", start_date: "", end_date: "", reason: "" })
    } catch (err) {
      console.error(err)
      alert("Error submitting leave ❌")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow max-w-lg">
      <h2 className="text-xl font-semibold mb-4">Submit Leave</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={form.leave_type}
          onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
          className="border p-2 rounded"
        >
          <option>Sick Leave</option>
          <option>Casual Leave</option>
          <option>Annual Leave</option>
          <option>Maternity Leave</option>
          <option>Paternity Leave</option>
          <option>Emergency Leave</option>
        </select>
        <input
          type="date"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          required
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={form.end_date}
          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          required
          className="border p-2 rounded"
        />
        <textarea
          placeholder="Reason"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="border p-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {submitting ? "Submitting..." : "Submit Leave"}
        </button>
      </form>
    </div>
  )
}
