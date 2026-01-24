'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Employee {
  id: string
  name: string
  role: string
  department: string
  email: string
  status: 'Active' | 'On Leave' | 'Inactive'
  level?: 'Senior' | 'Mid-Level' | 'Junior'
  image_url?: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    level: '' as '' | 'Senior' | 'Mid-Level' | 'Junior',
    image_url: ''
  })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setIsAdmin(user.role === 'admin' || user.role === 'Admin')
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from('employees').select('*').order('name')
    if (!error && data) setEmployees(data)
    setLoading(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('Image size should be less than 5MB')
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file')

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage.from('employee-images').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('employee-images').getPublicUrl(filePath)
      setUploadingImage(false)
      return data.publicUrl
    } catch (error) {
      setUploadingImage(false)
      toast.error('Failed to upload image')
      return null
    }
  } 

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return toast.error('Only admins can add employees!')
    const loadingToast = toast.loading('Adding employee...')

    try {
      let imageUrl = ''
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) imageUrl = uploadedUrl
      }

      const { error } = await supabase.from('employees').insert([{ 
        ...formData, 
        level: formData.level || null,
        image_url: imageUrl 
      }])
      if (!error) {
        toast.success('Employee added successfully! 🎉', { id: loadingToast })
        setShowAddModal(false)
        setFormData({ name: '', role: '', department: '', email: '', status: 'Active', level: '', image_url: '' })
        setImageFile(null)
        setImagePreview('')
        fetchEmployees()
      } else toast.error('Error: ' + error.message, { id: loadingToast })
    } catch {
      toast.error('Something went wrong!', { id: loadingToast })
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin || !editingEmployee) return toast.error('Only admins can edit employees!')
    const loadingToast = toast.loading('Updating employee...')

    try {
      let imageUrl = formData.image_url
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) imageUrl = uploadedUrl
      }

      const { error } = await supabase.from('employees').update({ 
        ...formData, 
        level: formData.level || null,
        image_url: imageUrl 
      }).eq('id', editingEmployee.id)
      if (!error) {
        toast.success('Employee updated successfully! ✅', { id: loadingToast })
        setShowEditModal(false)
        setEditingEmployee(null)
        setFormData({ name: '', role: '', department: '', email: '', status: 'Active', level: '', image_url: '' })
        setImageFile(null)
        setImagePreview('')
        fetchEmployees()
      } else toast.error('Error: ' + error.message, { id: loadingToast })
    } catch {
      toast.error('Something went wrong!', { id: loadingToast })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) return toast.error('Only admins can delete employees!')
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    const loadingToast = toast.loading('Deleting employee...')

    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (!error) {
      toast.success('Employee deleted successfully! 🗑️', { id: loadingToast })
      fetchEmployees()
    } else toast.error('Error: ' + error.message, { id: loadingToast })
  }

  const openEditModal = (emp: Employee) => {
    if (!isAdmin) return toast.error('Only admins can edit employees!')
    setEditingEmployee(emp)
    setFormData({ 
      name: emp.name, 
      role: emp.role, 
      department: emp.department, 
      email: emp.email, 
      status: emp.status, 
      level: emp.level || '',
      image_url: emp.image_url || '' 
    })
    setImagePreview(emp.image_url || '')
    setShowEditModal(true)
  }

  if (loading) return <div className="p-8 flex items-center justify-center"><p className="text-lg text-slate-600">Loading employees...</p></div>

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50">
      <div className="flex-1 flex flex-col">
        <main className="p-4 sm:p-6 md:p-8 overflow-auto bg-gray-50">
          <Toaster position="top-right" />
          
          {/* Page Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                Employees
              </h1>
              <p className="text-sm sm:text-base text-slate-600">Manage team members and their information</p>
            </div>
            {isAdmin ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Employee
              </button>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                <p className="text-sm font-medium text-yellow-700">👀 View Only Mode</p>
                <p className="text-xs text-yellow-600">You can view but not edit</p>
              </div>
            )}
          </div>

          {/* Mobile View */}
          <div className="block lg:hidden space-y-4">
            {employees.map(emp => (
              <div key={emp.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0">
                    {emp.image_url ? (
                      <img src={emp.image_url} alt={emp.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold text-xl">{emp.name.charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-900 mb-1">{emp.name}</h3>
                    <p className="text-sm text-slate-600">{emp.role}</p>
                    <p className="text-sm text-slate-500 mt-1">{emp.department}</p>
                    <p className="text-sm text-slate-500">{emp.email}</p>
                    {emp.level && (
                      <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-full ${
                        emp.level === "Senior" ? "bg-blue-100 text-blue-700" : 
                        emp.level === "Junior" ? "bg-green-100 text-green-700" : 
                        "bg-purple-100 text-purple-700"
                      }`}>
                        {emp.level}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                    emp.status === "Active" ? "bg-green-100 text-green-700" : 
                    emp.status === "On Leave" ? "bg-orange-100 text-orange-700" : 
                    "bg-red-100 text-red-700"
                  }`}>
                    {emp.status}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button onClick={() => openEditModal(emp)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded text-sm font-medium transition-colors">✏️ Edit</button>
                    <button onClick={() => handleDelete(emp.id, emp.name)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm font-medium transition-colors">🗑️ Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg overflow-y-auto border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-slate-900">Photo</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-slate-900">Role</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-slate-900">Department</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-slate-900">Level</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    {isAdmin && <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 xl:px-6 py-4">
                        {emp.image_url ? (
                          <img src={emp.image_url} alt={emp.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold">{emp.name.charAt(0).toUpperCase()}</div>
                        )}
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm font-medium text-slate-900">{emp.name}</td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-slate-600">{emp.role}</td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-slate-600">{emp.department}</td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-slate-600">{emp.email}</td>
                      <td className="px-4 xl:px-6 py-4">
                        {emp.level ? (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            emp.level === "Senior" ? "bg-blue-100 text-blue-700" : 
                            emp.level === "Junior" ? "bg-green-100 text-green-700" : 
                            "bg-purple-100 text-purple-700"
                          }`}>
                            {emp.level}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 xl:px-6 py-4">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          emp.status === "Active" ? "bg-green-100 text-green-700" : 
                          emp.status === "On Leave" ? "bg-orange-100 text-orange-700" : 
                          "bg-red-100 text-red-700"
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 xl:px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEditModal(emp)} className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors" title="Edit">✏️</button>
                            <button onClick={() => handleDelete(emp.id, emp.name)} className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors" title="Delete">🗑️</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black-50 bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Add New Employee</h2>
                    <button
                      onClick={() => {
                        setShowAddModal(false)
                        setFormData({ name: '', role: '', department: '', email: '', status: 'Active', level: '', image_url: '' })
                        setImageFile(null)
                        setImagePreview('')
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                      <div className="flex items-center gap-4">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-2xl font-semibold">
                            {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Level (Optional)</label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value as '' | 'Senior' | 'Mid-Level' | 'Junior' })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Not Set</option>
                        <option value="Senior">Senior</option>
                        <option value="Mid-Level">Mid-Level</option>
                        <option value="Junior">Junior</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'On Leave' | 'Inactive' })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false)
                          setFormData({ name: '', role: '', department: '', email: '', status: 'Active', level: '', image_url: '' })
                          setImageFile(null)
                          setImagePreview('')
                        }}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploadingImage}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                      >
                        {uploadingImage ? 'Uploading...' : 'Add Employee'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {showEditModal && editingEmployee && (
            <div className="fixed inset-0 bg-black-50 bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Edit Employee</h2>
                    <button
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingEmployee(null)
                        setFormData({ name: '', role: '', department: '', email: '', status: 'Active', level: '', image_url: '' })
                        setImageFile(null)
                        setImagePreview('')
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleEdit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                      <div className="flex items-center gap-4">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-2xl font-semibold">
                            {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Level (Optional)</label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value as '' | 'Senior' | 'Mid-Level' | 'Junior' })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Not Set</option>
                        <option value="Senior">Senior</option>
                        <option value="Mid-Level">Mid-Level</option>
                        <option value="Junior">Junior</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'On Leave' | 'Inactive' })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false)
                          setEditingEmployee(null)
                          setFormData({ name: '', role: '', department: '', email: '', status: 'Active', level: '', image_url: '' })
                          setImageFile(null)
                          setImagePreview('')
                        }}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploadingImage}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                      >
                        {uploadingImage ? 'Uploading...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}