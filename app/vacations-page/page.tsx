'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'



const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ---------------- Types ----------------
interface Vacation {
  id: string
  user_id: string
  start_date: string
  end_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
}

// ---------------- Utility Functions ----------------
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const calculateDays = (start: string, end: string) =>
  Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1

// ---------------- Main Component ----------------
export default function VacationsPage() {
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<'approved' | 'pending' | 'rejected' | null>(null)
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const [formData, setFormData] = useState({
    user_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected'
  })

  useEffect(() => {
    fetchVacations()
  }, [])

  const fetchVacations = async () => {
    const { data, error } = await supabase
      .from('vacations')
      .select('*')
      .order('start_date', { ascending: false })
    if (!error && data) setVacations(data)
    setLoading(false)
  }

  const getVacationsByStatus = (status: 'approved' | 'pending' | 'rejected') =>
    vacations.filter(v => v.status === status)

  // -------- CRUD Operations --------
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToast = toast.loading('Adding vacation request...')
    const { error } = await supabase.from('vacations').insert([formData])
    if (!error) {
      toast.success('Vacation request added!', { id: loadingToast })
      setShowAddModal(false)
      setFormData({ user_id: '', start_date: '', end_date: '', reason: '', status: 'pending' })
      fetchVacations()
    } else toast.error(error.message, { id: loadingToast })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVacation) return
    const loadingToast = toast.loading('Updating vacation...')
    const { error } = await supabase.from('vacations').update(formData).eq('id', editingVacation.id)
    if (!error) {
      toast.success('Vacation updated!', { id: loadingToast })
      setShowEditModal(false)
      setEditingVacation(null)
      setFormData({ user_id: '', start_date: '', end_date: '', reason: '', status: 'pending' })
      fetchVacations()
    } else toast.error(error.message, { id: loadingToast })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vacation request?')) return
    const loadingToast = toast.loading('Deleting vacation...')
    const { error } = await supabase.from('vacations').delete().eq('id', id)
    if (!error) {
      toast.success('Vacation deleted!', { id: loadingToast })
      fetchVacations()
    } else toast.error(error.message, { id: loadingToast })
  }

  const openEditModal = (vacation: Vacation) => {
    setEditingVacation(vacation)
    setFormData({
      user_id: vacation.user_id,
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      reason: vacation.reason,
      status: vacation.status
    })
    setShowEditModal(true)
  }

  const openDetailsModal = (vacation: Vacation) => {
    setSelectedVacation(vacation)
    setShowDetailsModal(true)
  }

  if (loading) return <div className="p-8 flex justify-center text-slate-600">Loading vacations...</div>

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50">
     
      <div className="flex-1 flex flex-col">
       
        <main className="p-4 sm:p-6 md:p-8 overflow-auto">
          <Toaster position="top-right" />
          {/* Page Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                Vacations
              </h1>
              <p className="text-sm sm:text-base text-slate-600">Manage team vacation schedules</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              ➕ Add Vacation
            </button>
          </div>

          {/* Status Cards */}
          <div className="flex flex-wrap gap-4 mb-6">
            <StatusCard title="Approved" color="green" vacations={getVacationsByStatus('approved')} onClick={() => setSelectedStatus('approved')} onVacationClick={openDetailsModal} />
            <StatusCard title="Pending" color="yellow" vacations={getVacationsByStatus('pending')} onClick={() => setSelectedStatus('pending')} onVacationClick={openDetailsModal} />
            <StatusCard title="Rejected" color="red" vacations={getVacationsByStatus('rejected')} onClick={() => setSelectedStatus('rejected')} onVacationClick={openDetailsModal} />
          </div>

          {/* Mobile Cards */}
          <div className="block lg:hidden space-y-4">
            {vacations.map(v => (
              <div key={v.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                <h3 className="text-base font-semibold text-slate-900 mb-1">{v.user_id}</h3>
                <p className="text-sm text-slate-600 mb-1">{v.reason}</p>
                <p className="text-sm text-slate-500 mb-1">{formatDate(v.start_date)} - {formatDate(v.end_date)}</p>
                <p className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                  v.status === 'approved' ? 'bg-green-100 text-green-700' :
                  v.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{v.status.charAt(0).toUpperCase() + v.status.slice(1)}</p>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <button onClick={() => openEditModal(v)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded text-sm font-medium">✏️ Edit</button>
                  <button onClick={() => handleDelete(v.id)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm font-medium">🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Employee ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Start Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">End Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Days</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {vacations.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-sm text-slate-900">{v.user_id}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{v.reason}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(v.start_date)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(v.end_date)}</td>
                      <td className="px-4 py-4 text-sm text-blue-600 font-bold">{calculateDays(v.start_date, v.end_date)}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          v.status === 'approved' ? 'bg-green-100 text-green-700' :
                          v.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{v.status.charAt(0).toUpperCase() + v.status.slice(1)}</span>
                      </td>
                      <td className="px-4 py-4 flex gap-2">
                        <button onClick={() => openEditModal(v)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">✏️</button>
                        <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Edit Modals */}
          {showAddModal && <VacationFormModal title="Add Vacation" onClose={() => setShowAddModal(false)} onSubmit={handleAdd} formData={formData} setFormData={setFormData} />}
          {showEditModal && editingVacation && <VacationFormModal title="Edit Vacation" onClose={() => setShowEditModal(false)} onSubmit={handleEdit} formData={formData} setFormData={setFormData} />}
          
          {/* Details Modal */}
          {showDetailsModal && selectedVacation && (
            <VacationDetailsModal 
              vacation={selectedVacation} 
              onClose={() => {
                setShowDetailsModal(false)
                setSelectedVacation(null)
              }}
              onEdit={(v) => {
                setShowDetailsModal(false)
                openEditModal(v)
              }}
              onDelete={(id) => {
                setShowDetailsModal(false)
                handleDelete(id)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ---------------- Status Card Component ----------------
interface StatusCardProps {
  title: string
  color: 'green' | 'yellow' | 'red'
  vacations: Vacation[]
  onClick: () => void
  onVacationClick: (vacation: Vacation) => void
}

const StatusCard = ({ title, color, vacations, onClick, onVacationClick }: StatusCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const colors = {
    green: { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700', borderAccent: 'border-green-400' },
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700', borderAccent: 'border-yellow-400' },
    red: { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700', borderAccent: 'border-red-400' },
  }
  const c = colors[color]

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex-1 min-w-[220px] bg-white rounded-lg border-2 ${c.border} p-5 cursor-pointer hover:shadow-lg transition-all relative`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${c.text}`}>{title}</h3>
        <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center`}>
          <span className="text-xl font-bold">{vacations.length}</span>
        </div>
      </div>
      
      {/* Preview items - always visible */}
      <div className="space-y-2">
        {vacations.slice(0, 3).map(v => (
          <div 
            key={v.id} 
            onClick={(e) => {
              e.stopPropagation()
              onVacationClick(v)
            }}
            className={`text-sm text-slate-600 border-l-2 pl-2 ${c.borderAccent} hover:bg-slate-50 rounded p-2 transition-colors cursor-pointer`}
          >
            <div className="font-medium">{v.user_id}</div>
            <div className="text-xs">{formatDate(v.start_date)} - {formatDate(v.end_date)}</div>
            <div className="text-xs text-slate-500 truncate">{v.reason}</div>
          </div>
        ))}
        {vacations.length > 3 && <div className={`text-xs font-medium ${c.text}`}>+{vacations.length - 3} more</div>}
      </div>

      {/* Expanded view on hover - shows all items */}
      {isHovered && vacations.length > 3 && (
        <div className={`absolute left-0 right-0 top-full mt-2 bg-white rounded-lg border-2 ${c.border} p-4 shadow-xl z-50 max-h-96`}>
          <h4 className={`font-bold ${c.text} mb-3`}>All {title} Vacations</h4>
          <div className="space-y-2">
            {vacations.map(v => (
              <div 
                key={v.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onVacationClick(v)
                }}
                className={`text-sm text-slate-600 border-l-2 pl-2 ${c.borderAccent} hover:bg-slate-50 rounded p-2 transition-colors cursor-pointer`}
              >
                <div className="font-medium">{v.user_id}</div>
                <div className="text-xs">{formatDate(v.start_date)} - {formatDate(v.end_date)}</div>
                <div className="text-xs text-slate-500">{v.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- Vacation Form Modal ----------------
interface VacationFormModalProps {
  title: string
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  formData: any
  setFormData: any
}

const VacationFormModal = ({ title, onClose, onSubmit, formData, setFormData }: VacationFormModalProps) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">{title}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="text" placeholder="Employee ID" value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
        <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
        <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
        <input type="text" placeholder="Reason" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">{title.includes('Add') ? 'Add' : 'Update'}</button>
        </div>
      </form>
    </div>
  </div>
)

// ---------------- Vacation Details Modal ----------------
interface VacationDetailsModalProps {
  vacation: Vacation
  onClose: () => void
  onEdit: (vacation: Vacation) => void
  onDelete: (id: string) => void
}

const VacationDetailsModal = ({ vacation, onClose, onEdit, onDelete }: VacationDetailsModalProps) => {
  const statusColors = {
    approved: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
  }
  const colors = statusColors[vacation.status]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Vacation Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Employee ID */}
          <div className="bg-slate-50 rounded-lg p-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee ID</label>
            <p className="text-lg font-bold text-slate-900 mt-1">{vacation.user_id}</p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
            <span className={`${colors.bg} ${colors.text} px-4 py-2 rounded-full text-sm font-semibold border ${colors.border}`}>
              {vacation.status.charAt(0).toUpperCase() + vacation.status.slice(1)}
            </span>
          </div>

          {/* Date Range */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 block">Vacation Period</label>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Start Date</p>
                <p className="text-base font-semibold text-slate-900">{formatDate(vacation.start_date)}</p>
              </div>
              <div className="text-slate-400">→</div>
              <div>
                <p className="text-xs text-red">End Date</p>
                <p className="text-base font-semibold text-slate-900">{formatDate(vacation.end_date)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-slate-600">
                Total Duration: <span className="font-bold text-blue-600">{calculateDays(vacation.start_date, vacation.end_date)} days</span>
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-slate-50 rounded-lg p-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</label>
            <p className="text-base text-slate-900 mt-1 leading-relaxed">{vacation.reason}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t">
          <button 
            onClick={() => onEdit(vacation)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            ✏️ Edit
          </button>
          <button 
            onClick={() => onDelete(vacation.id)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  )
}