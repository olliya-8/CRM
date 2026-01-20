"use client"

import { createClient } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"



const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Project {
  id: string
  name: string
  type: "Monthly" | "Fixed"
  total_cost: number
  monthly_cost?: number | null
  team_size: number
  status: string
  created_at?: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    type: "Monthly" as "Monthly" | "Fixed",
    team_size: 1,
    total_cost: 0,
    monthly_cost: 0,
    status: "Planning",
  })

  /* ================= INIT ================= */

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setIsAdmin(user.role === "admin" || user.role === "Admin")
      } catch {}
    }
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) setProjects(data)
    setLoading(false)
  }

  /* ================= ADD ================= */

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return toast.error("Only admins can add projects!")

    const t = toast.loading("Adding project...")

    const { error } = await supabase.from("projects").insert([
      {
        ...formData,
        monthly_cost: formData.type === "Monthly" ? formData.monthly_cost : null,
      },
    ])

    if (!error) {
      toast.success("Project added successfully! 🎉", { id: t })
      setShowAddModal(false)
      resetForm()
      fetchProjects()
    } else toast.error(error.message, { id: t })
  }

  /* ================= EDIT ================= */

  const openEditModal = (project: Project) => {
    if (!isAdmin) return toast.error("Only admins can edit projects!")

    setEditingProject(project)
    setFormData({
      id: project.id,
      name: project.name,
      type: project.type,
      team_size: project.team_size,
      total_cost: project.total_cost,
      monthly_cost: project.monthly_cost || 0,
      status: project.status,
    })
    setShowEditModal(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    const t = toast.loading("Updating project...")

    const { error } = await supabase
      .from("projects")
      .update({
        ...formData,
        monthly_cost: formData.type === "Monthly" ? formData.monthly_cost : null,
      })
      .eq("id", editingProject.id)

    if (!error) {
      toast.success("Project updated successfully! ✅", { id: t })
      setShowEditModal(false)
      setEditingProject(null)
      resetForm()
      fetchProjects()
    } else toast.error(error.message, { id: t })
  }

  /* ================= DELETE ================= */

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) return toast.error("Only admins can delete projects!")
    if (!confirm(`Delete "${name}"?`)) return

    const t = toast.loading("Deleting project...")

    const { error } = await supabase.from("projects").delete().eq("id", id)

    if (!error) {
      toast.success("Project deleted! 🗑️", { id: t })
      fetchProjects()
    } else toast.error(error.message, { id: t })
  }

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      type: "Monthly",
      team_size: 1,
      total_cost: 0,
      monthly_cost: 0,
      status: "Planning",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Planning":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "On Hold":
        return "bg-rose-50 text-rose-700 border-rose-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  /* ================= UI ================= */

  return (
    <div className="flex-1 h-screen bg-gray-50">
    
      <div className="flex-1 flex flex-col overflow-hidden">
        

        <main className="flex-1 overflow-auto p-6">
          <Toaster position="top-right" />

          {/* HEADER */}
           <div className="sticky top-0 z-10 bg-gray-50 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 shadow">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-black mb-2">
                Projects
              </h1>
              <p className="text-slate-600 text-lg">
                Manage all company projects and costs
              </p>
            </div>

            {isAdmin ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
              >
                ➕ Add Project
              </button>
            ) : (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl px-5 py-3 shadow-md">
                <p className="text-sm font-semibold text-yellow-700">
                  👀 View Only Mode
                </p>
              </div>
            )}
          </div>

          {/* PROJECT CARDS */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                <p className="text-lg font-medium text-slate-600">Loading projects...</p>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
                <span className="text-4xl">📁</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No projects yet</h3>
              <p className="text-slate-500">Create your first project to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group bg-white rounded-xl p-4 border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all relative overflow-hidden"
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-0.5 group-hover:text-blue-700 transition-colors">{p.name}</h3>
                        <p className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded inline-block">ID: {p.id}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 ${
                          p.type === "Monthly" 
                            ? "bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-300"
                            : "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-300"
                        } shadow-sm`}>
                          {p.type}
                        </span>

                        {isAdmin && (
                          <div className="flex gap-2 ml-2">
                            <button
                              onClick={() => openEditModal(p)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-400 text-blue-600 hover:scale-110 transition-all duration-200"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 border-2 border-red-200 hover:bg-red-100 hover:border-red-400 text-red-600 hover:scale-110 transition-all duration-200"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Team Size</p>
                        <p className="text-xl font-bold text-slate-800">{p.team_size}</p>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Total Cost</p>
                        <p className="text-xl font-bold text-slate-800">${p.total_cost.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-3">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border ${getStatusColor(p.status)}`}>
                        <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
                        {p.status}
                      </span>
                    </div>

                    {p.monthly_cost && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-700">Monthly Cost:</span>{" "}
                          <span className="font-bold text-indigo-600">${p.monthly_cost.toLocaleString()}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MODALS */}
          {showAddModal && renderModal("Add Project", handleAdd)}
          {showEditModal && renderModal("Edit Project", handleEdit)}
        </main>
      </div>
    </div>
  )

  /* ================= MODAL ================= */

  function renderModal(title: string, onSubmit: any) {
    return (
      <div className="fixed inset-0 bg-black-50 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              required
              placeholder="Project ID"
              value={formData.id}
              disabled={title === "Edit Project"}
              onChange={(e) =>
                setFormData({ ...formData, id: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />

            <input
              required
              placeholder="Project Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />

            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as any })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="Monthly">Monthly</option>
              <option value="Fixed">Fixed</option>
            </select>

            <input
              type="number"
              min="1"
              placeholder="Team Size"
              value={formData.team_size}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  team_size: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />

            <input
              type="number"
              placeholder="Total Cost"
              value={formData.total_cost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  total_cost: parseFloat(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />

            {formData.type === "Monthly" && (
              <input
                type="number"
                placeholder="Monthly Cost"
                value={formData.monthly_cost}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthly_cost: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            )}

            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option>Planning</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>On Hold</option>
            </select>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                className="flex-1 border rounded-lg py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white rounded-lg py-2"
              >
                {title}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }
}
