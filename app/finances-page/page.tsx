'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'



const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Project {
  id: string
  name: string
  type: 'Monthly' | 'Fixed'
  currency: string
  total_cost: number
  total_cost_pkr?: number | null
  monthly_cost?: number | null
  monthly_cost_pkr?: number | null
  total_months?: number | null
  billing_type?: 'month' | 'week' | 'hour'
  team_size: number
  status: string
}

export default function FinancesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [projectFormData, setProjectFormData] = useState({
    id: '',
    name: '',
    type: 'Monthly' as 'Monthly' | 'Fixed',
    currency: 'PKR',
    total_months: '',
    total_cost: '',
    total_cost_pkr: '',
    monthly_cost: '',
    monthly_cost_pkr: '',
    team_size: '',
    billing_type: 'month' as 'month' | 'week' | 'hour',
  })

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setIsAdmin(user.role?.toLowerCase() === 'admin')
    }
    fetchProjects()
  }, [])

  /* ---------------- CURRENCY ---------------- */
  const getPKRRate = async (currency: string) => {
    if (currency === 'PKR') return 1
    const res = await fetch(
      `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${process.env.NEXT_PUBLIC_CURRENCYFREAKS_API_KEY}&symbols=PKR`
    )
    const data = await res.json()
    return Number(data.rates.PKR)
  }

  /* ---------------- AUTO CALC ---------------- */
  useEffect(() => {
    const calculate = async () => {
      const total = Number(projectFormData.total_cost)
      if (!total) return

      const rate = await getPKRRate(projectFormData.currency)
      const totalPKR = Math.round(total * rate)

      let monthly = 0
      let monthlyPKR = 0

      const periodInput = Number(projectFormData.total_months)
      if (projectFormData.billing_type === 'month' && periodInput) {
        monthly = projectFormData.type === 'Monthly' ? total / periodInput : 0
        monthlyPKR = Math.round(monthly * rate)
      }

      setProjectFormData(prev => ({
        ...prev,
        total_cost_pkr: totalPKR.toString(),
        monthly_cost: monthly ? Math.round(monthly).toString() : '',
        monthly_cost_pkr: monthlyPKR ? monthlyPKR.toString() : '',
      }))
    }

    calculate()
  }, [
    projectFormData.total_cost,
    projectFormData.total_months,
    projectFormData.currency,
    projectFormData.type,
    projectFormData.billing_type,
  ])

  /* ---------------- FETCH ---------------- */
  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setProjects(data)
    else toast.error('Failed to fetch projects')

    setLoading(false)
  }

  /* ---------------- ADD / UPDATE ---------------- */
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return toast.error('Admins only')

    // Validation
    if (!projectFormData.team_size || Number(projectFormData.team_size) <= 0) {
      return toast.error('Team size cannot be zero! Please enter at least 1 team member.')
    }

    const payload = {
      id: projectFormData.id,
      name: projectFormData.name,
      type: projectFormData.type,
      currency: projectFormData.currency,
      total_months: Number(projectFormData.total_months),
      total_cost: Number(projectFormData.total_cost),
      total_cost_pkr: Number(projectFormData.total_cost_pkr),
      monthly_cost: Number(projectFormData.monthly_cost) || null,
      monthly_cost_pkr: Number(projectFormData.monthly_cost_pkr) || null,
      billing_type: projectFormData.billing_type,
      team_size: Number(projectFormData.team_size),
      status: 'Active',
    }

    if (isEdit && editingProject) {
      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', editingProject.id)
      if (!error) {
        toast.success('Project updated successfully! ✅')
        setShowModal(false)
        setIsEdit(false)
        setEditingProject(null)
        resetForm()
        fetchProjects()
      } else {
        toast.error(error.message)
      }
    } else {
      const { error } = await supabase.from('projects').insert([payload])
      if (!error) {
        toast.success('Project added successfully! 🎉')
        setShowModal(false)
        resetForm()
        fetchProjects()
      } else {
        toast.error(error.message)
      }
    }
  }

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id: string) => {
    if (!isAdmin) return
    if (!confirm('Delete project?')) return

    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) {
      toast.success('Project deleted')
      fetchProjects()
    }
  }

  /* ---------------- OPEN EDIT ---------------- */
  const openEditModal = (project: Project) => {
    if (!isAdmin) return toast.error('Admins only')

    setEditingProject(project)
    setIsEdit(true)
    setProjectFormData({
      id: project.id,
      name: project.name,
      type: project.type,
      currency: project.currency,
      total_months: project.total_months?.toString() || '',
      total_cost: project.total_cost.toString(),
      total_cost_pkr: project.total_cost_pkr?.toString() || '',
      monthly_cost: project.monthly_cost?.toString() || '',
      monthly_cost_pkr: project.monthly_cost_pkr?.toString() || '',
      billing_type: project.billing_type || 'month',
      team_size: project.team_size.toString(),
    })
    setShowModal(true)
  }

  /* ---------------- RESET FORM ---------------- */
  const resetForm = () => {
    setProjectFormData({
      id: '',
      name: '',
      type: 'Monthly',
      currency: 'PKR',
      total_months: '',
      total_cost: '',
      total_cost_pkr: '',
      monthly_cost: '',
      monthly_cost_pkr: '',
      team_size: '',
      billing_type: 'month',
    })
  }

  /* ---------------- DISPLAY PERIOD WITH UNITS ---------------- */
  const displayPeriod = (project: Project) => {
    if (!project.total_months) return '-'
    const unit = project.billing_type === 'week' ? 'Weeks' : project.billing_type === 'hour' ? 'Hours' : 'Months'
    return `${project.total_months} ${unit}`
  }

  /* ---------------- BORDER COLORS ---------------- */
  const getCardBorderColor = (billing_type: 'month' | 'week' | 'hour' | undefined) => {
    switch (billing_type) {
      case 'week':
        return 'border-yellow-400'
      case 'hour':
        return 'border-green-400'
      default:
        return 'border-blue-400'
    }
  }

  /* ---------------- DYNAMIC LABEL ---------------- */
  const getPeriodLabel = () => {
    switch (projectFormData.billing_type) {
      case 'week':
        return 'Total Weeks'
      case 'hour':
        return 'Total Hours'
      default:
        return 'Total Months'
    }
  }

  return (
    <div className="flex-1 h-screen bg-gray-50">
      
      <div className="flex-1 flex flex-col">
      
        <main className="flex-1 overflow-auto p-6">
          <Toaster position="top-right" />

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Finances</h1>
              <p className="text-slate-500">Manage project budgets</p>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  resetForm()
                  setIsEdit(false)
                  setEditingProject(null)
                  setShowModal(true)
                }}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
              >
                ➕ Add Project
              </button>
            )}
          </div>

          {/* PROJECT CARDS */}
          {loading ? (
            <p>Loading...</p>
          ) : projects.length === 0 ? (
            <p>No projects found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div
                  key={p.id}
                  className={`bg-white border-l-4 ${getCardBorderColor(p.billing_type)} rounded-2xl p-6 shadow hover:shadow-xl transition-all duration-300 flex flex-col justify-between`}
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{p.name}</h3>
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-semibold">ID:</span> {p.id}
                    </p>
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-semibold">Type:</span>{' '}
                      {p.billing_type === 'month' ? 'Monthly' : p.billing_type === 'week' ? 'Weekly' : 'Hourly'}
                    </p>
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-semibold">Total Period:</span> {displayPeriod(p)}
                    </p>
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-semibold">Team Size:</span> {p.team_size}
                    </p>
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-semibold">Total Cost:</span> {Math.round(p.total_cost).toLocaleString()} {p.currency}
                    </p>
                    <p className="text-sm mb-1">
                      <span className="font-semibold text-slate-600">PKR:</span> <span className="text-green-600 font-bold">{Math.round(p.total_cost_pkr || 0).toLocaleString()}</span>
                    </p>
                    {p.billing_type === 'month' && p.monthly_cost && (
                      <>
                        <p className="text-sm text-slate-600 mb-1">
                          <span className="font-semibold">Monthly Cost:</span> {Math.round(p.monthly_cost).toLocaleString()} {p.currency}
                        </p>
                        <p className="text-sm mb-1">
                          <span className="font-semibold text-slate-600">Monthly PKR:</span> <span className="text-green-600 font-bold">{Math.round(p.monthly_cost_pkr || 0).toLocaleString()}</span>
                        </p>
                      </>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* MODAL */}
          {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <form
                onSubmit={handleSaveProject}
                className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6 overflow-auto max-h-[90vh]"
              >
                <h2 className="text-2xl font-bold mb-6 text-slate-800">
                  {isEdit ? '✏️ Edit Project' : '➕ Add New Project'}
                </h2>

                {/* GRID INPUTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-sm text-slate-600">Project ID</label>
                    <input
                      required
                      disabled={isEdit}
                      className="w-full mt-1 px-3 py-2 border rounded-lg disabled:bg-gray-100"
                      value={projectFormData.id}
                      onChange={e =>
                        setProjectFormData({
                          ...projectFormData,
                          id: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Project Name</label>
                    <input
                      required
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      value={projectFormData.name}
                      onChange={e =>
                        setProjectFormData({
                          ...projectFormData,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* COST & DURATION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-sm text-slate-600">Currency</label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      value={projectFormData.currency}
                      onChange={e =>
                        setProjectFormData({
                          ...projectFormData,
                          currency: e.target.value,
                        })
                      }
                    >
                      <option>PKR</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>AED</option>
                      <option>SAR</option>
                      <option>CAD</option>
                      <option>AUD</option>
                      <option>CNY</option>
                      <option>INR</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">{getPeriodLabel()}</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      value={projectFormData.total_months}
                      onChange={e =>
                        setProjectFormData({
                          ...projectFormData,
                          total_months: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Billing Type</label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      value={projectFormData.billing_type}
                      onChange={e =>
                        setProjectFormData({
                          ...projectFormData,
                          billing_type: e.target.value as 'month' | 'week' | 'hour',
                        })
                      }
                    >
                      <option value="month">Month</option>
                      <option value="week">Week</option>
                      <option value="hour">Hour</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-sm text-slate-600">Total Cost</label>
                    <input
                      type="number"
                      required
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      value={projectFormData.total_cost}
                      onChange={e =>
                        setProjectFormData({
                          ...projectFormData,
                          total_cost: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Team Size</label>
                    <input
                      type="number"
                      required
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      value={projectFormData.team_size}
                      onChange={e =>
                        setProjectFormData({
                          ...projectFormData,
                          team_size: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div></div>
                </div>

                {/* PKR BOX */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl mb-6">
                  <div>
                    <label className="text-sm text-slate-600">
                      Total Cost (PKR)
                    </label>
                    <input
                      readOnly
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-gray-100 text-green-600 font-bold"
                      value={projectFormData.total_cost_pkr}
                    />
                  </div>
                  {projectFormData.billing_type === 'month' && (
                    <>
                      <div>
                        <label className="text-sm text-slate-600">Monthly Cost</label>
                        <input
                          readOnly
                          className="w-full mt-1 px-3 py-2 border rounded-lg bg-gray-100"
                          value={projectFormData.monthly_cost}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Monthly Cost (PKR)</label>
                        <input
                          readOnly
                          className="w-full mt-1 px-3 py-2 border rounded-lg bg-green-50 border-green-300 font-bold text-green-700"
                          value={projectFormData.monthly_cost_pkr}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setIsEdit(false)
                      setEditingProject(null)
                      resetForm()
                    }}
                    className="flex-1 border py-2 rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    {isEdit ? 'Update Project' : 'Save Project'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}