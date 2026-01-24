'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Pencil, Trash2, Plus, FileText, ExternalLink, Megaphone, FolderOpen } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Document {
  id: string
  title: string
  category: string
  date: string
  views: number
  details?: string[]
  file_url?: string
}

interface Announcement {
  id: string
  title: string
  date: string
  priority: 'High' | 'Medium' | 'Low'
}

export default function InfoPortalPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddDocModal, setShowAddDocModal] = useState(false)
  const [showAddAnnModal, setShowAddAnnModal] = useState(false)
  const [showEditDocModal, setShowEditDocModal] = useState(false)
  const [showEditAnnModal, setShowEditAnnModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [docFormData, setDocFormData] = useState({
    title: '', category: '', date: '', views: 0, details: [] as string[], file: null as File | null
  })

  const [annFormData, setAnnFormData] = useState({
    title: '', date: '', priority: 'Medium' as 'High' | 'Medium' | 'Low'
  })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setIsAdmin(user.role === 'admin' || user.role === 'Admin')
      } catch (error) { console.error('Error parsing user:', error) }
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [docsResult, annsResult] = await Promise.all([
        supabase.from('documents').select('*').order('date', { ascending: false }),
        supabase.from('announcements').select('*').order('date', { ascending: false })
      ])
      if (docsResult.data) setDocuments(docsResult.data)
      if (annsResult.data) setAnnouncements(annsResult.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally { setLoading(false) }
  }

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) { toast.error('Only admins can add documents!'); return }
    const loadingToast = toast.loading('Adding document...')
    try {
      let file_url = ''
      if (docFormData.file) {
        const { data, error } = await supabase.storage.from('documents').upload(`files/${Date.now()}_${docFormData.file.name}`, docFormData.file, { upsert: true })
        if (error) { toast.error(error.message, { id: loadingToast }); return }
        file_url = data.path
      }
      const { error } = await supabase.from('documents').insert([{
        title: docFormData.title, category: docFormData.category, date: docFormData.date,
        views: docFormData.views, details: docFormData.details, file_url
      }])
      if (error) { toast.error(error.message, { id: loadingToast }) } else {
        toast.success('Document added successfully!', { id: loadingToast })
        setShowAddDocModal(false)
        setDocFormData({ title: '', category: '', date: '', views: 0, details: [], file: null })
        fetchData()
      }
    } catch (error) { toast.error('Failed to add document', { id: loadingToast }) }
  }

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) { toast.error('Only admins can add announcements!'); return }
    const loadingToast = toast.loading('Adding announcement...')
    try {
      const { error } = await supabase.from('announcements').insert([{
        title: annFormData.title, date: annFormData.date, priority: annFormData.priority
      }])
      if (error) { toast.error(error.message, { id: loadingToast }) } else {
        toast.success('Announcement added successfully!', { id: loadingToast })
        setShowAddAnnModal(false)
        setAnnFormData({ title: '', date: '', priority: 'Medium' })
        fetchData()
      }
    } catch (error) { toast.error('Failed to add announcement', { id: loadingToast }) }
  }

  const handleEditDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToast = toast.loading('Updating document...')
    try {
      let file_url = documents.find(d => d.id === editingId)?.file_url || ''
      if (docFormData.file) {
        const { data, error } = await supabase.storage.from('documents').upload(`files/${Date.now()}_${docFormData.file.name}`, docFormData.file, { upsert: true })
        if (error) throw error
        file_url = data.path
      }
      const { error } = await supabase.from('documents').update({
        title: docFormData.title, category: docFormData.category, date: docFormData.date,
        views: docFormData.views, details: docFormData.details, file_url
      }).eq('id', editingId)
      if (error) throw error
      toast.success('Document updated!', { id: loadingToast })
      setShowEditDocModal(false)
      fetchData()
    } catch (error: any) { toast.error(error.message, { id: loadingToast }) }
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    const loadingToast = toast.loading('Deleting...')
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) throw error
      toast.success('Deleted', { id: loadingToast })
      fetchData()
    } catch (error: any) { toast.error(error.message, { id: loadingToast }) }
  }

  const handleEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToast = toast.loading('Updating...')
    try {
      const { error } = await supabase.from('announcements').update({
        title: annFormData.title, date: annFormData.date, priority: annFormData.priority
      }).eq('id', editingId)
      if (error) throw error
      toast.success('Updated!', { id: loadingToast })
      setShowEditAnnModal(false)
      fetchData()
    } catch (error: any) { toast.error(error.message, { id: loadingToast }) }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure?')) return
    const loadingToast = toast.loading('Deleting...')
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      toast.success('Deleted', { id: loadingToast })
      fetchData()
    } catch (error: any) { toast.error(error.message, { id: loadingToast }) }
  }

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch (e) { return dateString }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-base sm:text-lg font-medium text-slate-600">Loading Portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-screen bg-[#FDFDFD]">
      <div className="flex-1 flex flex-col overflow-auto">
        <Toaster position="top-right" />
        <div className="p-3 sm:p-4 md:p-6 w-full">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Info Portal</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Company board and resource library</p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Announcements */}
            <div className="bg-blue-50 border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 bg-blue-100 text-blue-600 rounded-lg"><Megaphone className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /></div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">Announcements</h2>
                </div>
                {isAdmin && (
                  <button onClick={() => setShowAddAnnModal(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:py-1.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5">
                    <Plus size={14} /> Add
                  </button>
                )}
              </div>
              {announcements.length === 0 ? (
                <div className="text-center py-8"><p className="text-sm text-slate-500">No announcements</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="bg-white border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${ann.priority === 'High' ? 'bg-red-50 text-red-600' : ann.priority === 'Medium' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'}`}>
                          {ann.priority}
                        </span>
                        {isAdmin && (
                          <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingId(ann.id); setAnnFormData({ title: ann.title, date: ann.date, priority: ann.priority }); setShowEditAnnModal(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1 line-clamp-2">{ann.title}</h3>
                      <p className="text-[11px] sm:text-[12px] text-slate-400 font-medium">{formatDate(ann.date)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FolderOpen className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /></div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">Documents</h2>
                </div>
                {isAdmin && (
                  <button onClick={() => setShowAddDocModal(true)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 sm:py-1.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5">
                    <Plus size={14} /> Upload
                  </button>
                )}
              </div>
              {documents.length === 0 ? (
                <div className="text-center py-8"><p className="text-sm text-slate-500">No documents</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex gap-3 sm:gap-4 items-start group">
                      <div className="bg-slate-50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0">
                        <FileText className="w-5 h-5 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-slate-800 line-clamp-2 flex-1">{doc.title}</h3>
                          {isAdmin && (
                            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => { setEditingId(doc.id); setDocFormData({ title: doc.title, category: doc.category, date: doc.date, views: doc.views, details: doc.details || [], file: null }); setShowEditDocModal(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                              <button onClick={() => handleDeleteDocument(doc.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-1">
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{doc.category}</span>
                          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">{formatDate(doc.date)}</span>
                          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">{doc.views} views</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {doc.file_url && (
                            <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${doc.file_url}`} target="_blank" className="text-[11px] sm:text-[12px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                              <ExternalLink size={10} /> View File
                            </a>
                          )}
                          {doc.details?.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] sm:text-[12px] font-bold text-blue-500 hover:underline truncate max-w-[120px] sm:max-w-[150px]">{url.replace(/(^\w+:|^)\/\//, '')}</a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SEE NEXT PART FOR MODALS */}
          {/* Document Modal */}
          {(showAddDocModal || showEditDocModal) && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl sm:text-2xl font-bold mb-4">{showEditDocModal ? 'Edit Document' : 'Add New Document'}</h2>
                <form onSubmit={showEditDocModal ? handleEditDocument : handleAddDocument} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Document Title *</label>
                    <input type="text" required value={docFormData.title} onChange={(e) => setDocFormData({ ...docFormData, title: e.target.value })} className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" placeholder="Enter document title" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Category *</label>
                    <input type="text" required value={docFormData.category} onChange={(e) => setDocFormData({ ...docFormData, category: e.target.value })} className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" placeholder="e.g., Policy, Guide" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
                      <input type="date" required value={docFormData.date} onChange={(e) => setDocFormData({ ...docFormData, date: e.target.value })} className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Views</label>
                      <input type="number" min={0} value={docFormData.views || ''} onChange={(e) => setDocFormData({ ...docFormData, views: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Details Links</label>
                    <input type="text" placeholder="Enter link and press Enter" className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val) { setDocFormData((prev) => ({ ...prev, details: [...prev.details, val] })); (e.target as HTMLInputElement).value = '' } } }} />
                    {docFormData.details.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {docFormData.details.map((link, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                            <span className="truncate max-w-[120px] sm:max-w-[150px]">{link}</span>
                            <button type="button" onClick={() => setDocFormData(prev => ({ ...prev, details: prev.details.filter((_, i) => i !== idx) }))} className="text-blue-900 font-bold flex-shrink-0">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Choose from device</label>
                    <input type="file" onChange={(e) => setDocFormData({ ...docFormData, file: e.target.files?.[0] || null })} className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg outline-none text-xs sm:text-sm bg-slate-50 cursor-pointer hover:bg-slate-100" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                    <button type="button" onClick={() => { setShowAddDocModal(false); setShowEditDocModal(false); }} className="w-full sm:flex-1 px-4 py-2 sm:py-2.5 border-2 border-slate-300 rounded-lg hover:bg-slate-50 font-semibold text-sm sm:text-base">Cancel</button>
                    <button type="submit" className="w-full sm:flex-1 px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm sm:text-base">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Announcement Modal */}
          {(showAddAnnModal || showEditAnnModal) && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl sm:rounded-lg p-4 sm:p-6 max-w-md w-full shadow-2xl">
                <h2 className="text-xl sm:text-2xl font-bold mb-4">{showEditAnnModal ? 'Edit Announcement' : 'Add New Announcement'}</h2>
                <form onSubmit={showEditAnnModal ? handleEditAnnouncement : handleAddAnnouncement} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Title *</label>
                    <input type="text" required value={annFormData.title} onChange={(e) => setAnnFormData({ ...annFormData, title: e.target.value })} className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" placeholder="Enter announcement title" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
                    <input type="date" required value={annFormData.date} onChange={(e) => setAnnFormData({ ...annFormData, date: e.target.value })} className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Priority *</label>
                    <select required value={annFormData.priority} onChange={(e) => setAnnFormData({ ...annFormData, priority: e.target.value as any })} className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                    <button type="button" onClick={() => { setShowAddAnnModal(false); setShowEditAnnModal(false); }} className="w-full sm:flex-1 px-4 py-2 sm:py-2.5 border-2 border-slate-300 rounded-lg hover:bg-slate-50 font-semibold text-sm sm:text-base">Cancel</button>
                    <button type="submit" className="w-full sm:flex-1 px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm sm:text-base">Confirm</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}