'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { useSearchContext } from '@/components/contexts/SearchContext'
import { Calendar as CalendarIcon, Clock, Users, Link as LinkIcon, Pencil, Trash2, Plus } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Event {
  id: string
  date: string
  title: string
  time: string
  attendees: number
  type: 'meeting' | 'presentation' | 'planning' | 'review' | 'kickoff'
  link?: string
}

export default function CalendarPage() {
  const router = useRouter()
  const { updateSearchIndex } = useSearchContext()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [formData, setFormData] = useState({
    date: '',
    title: '',
    time: '',
    attendees: 0,
    type: 'meeting' as 'meeting' | 'presentation' | 'planning' | 'review' | 'kickoff',
    link: ''
  })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.replace('/login')
      return
    }

    try {
      const user = JSON.parse(userStr)
      const adminStatus = user.role === 'admin' || user.role === 'Admin'
      setIsAdmin(adminStatus)
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.replace('/login')
      return
    }

    fetchEvents()
  }, [router])

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
    
    if (error) {
      toast.error('Failed to load events')
      setLoading(false)
      return
    }

    if (data) {
      setEvents(data)

      // ✅ REGISTER EVENTS FOR SEARCH
      updateSearchIndex('events', data.map(event => ({
        id: event.id,
        name: event.title,
        title: event.title,
        type: event.type,
        date: event.date,
        time: event.time,
        attendees: event.attendees,
        link: event.link,
        // For search display
        subtitle: `${formatDate(event.date)} at ${event.time} • ${event.attendees} attendees`,
        start_date: event.date
      })))
    }

    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) {
      toast.error('Only admins can add events!')
      return
    }
    const loadingToast = toast.loading('Adding event...')
    const { error } = await supabase.from('events').insert([formData])
    if (!error) {
      toast.success('Event added successfully! 🎉', { id: loadingToast })
      setShowAddModal(false)
      setFormData({ date: '', title: '', time: '', attendees: 0, type: 'meeting', link: '' })
      fetchEvents()
    } else {
      toast.error('Error: ' + error.message, { id: loadingToast })
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) {
      toast.error('Only admins can edit events!')
      return
    }
    if (!editingEvent) return
    const loadingToast = toast.loading('Updating event...')
    const { error } = await supabase.from('events').update(formData).eq('id', editingEvent.id)
    if (!error) {
      toast.success('Event updated successfully! ✅', { id: loadingToast })
      setShowEditModal(false)
      setEditingEvent(null)
      setFormData({ date: '', title: '', time: '', attendees: 0, type: 'meeting', link: '' })
      fetchEvents()
    } else {
      toast.error('Error: ' + error.message, { id: loadingToast })
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete events!')
      return
    }
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return
    const loadingToast = toast.loading('Deleting event...')
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) {
      toast.success('Event deleted successfully! 🗑️', { id: loadingToast })
      fetchEvents()
    } else {
      toast.error('Error: ' + error.message, { id: loadingToast })
    }
  }

  const openEditModal = (event: Event) => {
    if (!isAdmin) {
      toast.error('Only admins can edit events!')
      return
    }
    setEditingEvent(event)
    setFormData({
      date: event.date,
      title: event.title,
      time: event.time,
      attendees: event.attendees,
      type: event.type,
      link: event.link || ''
    })
    setShowEditModal(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'meeting': return 'border-blue-200 hover:border-blue-500 bg-blue-50/30'
      case 'presentation': return 'border-purple-200 hover:border-purple-500 bg-purple-50/30'
      case 'planning': return 'border-emerald-200 hover:border-emerald-500 bg-emerald-50/30'
      case 'review': return 'border-orange-200 hover:border-orange-500 bg-orange-50/30'
      default: return 'border-pink-200 hover:border-pink-500 bg-pink-50/30'
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600">Loading events...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#FDFDFD] min-h-full">
      <Toaster position="top-right" />

      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Calendar</h1>
            <p className="text-slate-500">Upcoming company activities</p>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Plus size={18} /> Add Event
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 font-medium">Schedule is currently empty.</p>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
              >
                Add your first event
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className={`group rounded-[28px] p-6 border-2 transition-all duration-300 relative flex flex-col hover:shadow-2xl hover:-translate-y-1 ${getTypeStyles(event.type)}`}
              >
                <div className="mb-4 flex justify-between items-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    event.type === 'meeting' ? 'bg-blue-500' : 
                    event.type === 'presentation' ? 'bg-purple-500' :
                    event.type === 'planning' ? 'bg-emerald-500' : 
                    event.type === 'review' ? 'bg-orange-500' : 'bg-pink-500'
                  }`} />
                  
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(event)} 
                        className="p-2 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                        title="Edit event"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(event.id, event.title)} 
                        className="p-2 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-800 mb-4 leading-tight">
                  {event.title}
                </h3>

                <div className="mt-auto space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-100 rounded-full text-[12px] font-bold text-slate-600 shadow-sm">
                      <CalendarIcon size={12} /> {formatDate(event.date)}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-100 rounded-full text-[12px] font-bold text-slate-600 shadow-sm">
                      <Clock size={12} /> {event.time}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                      <Users size={14} /> {event.attendees} Attending
                    </div>
                    
                    {event.link && (
                      <a 
                        href={event.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="h-10 w-10 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-700 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                        title="Join meeting"
                      >
                        <LinkIcon size={16} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">New Activity</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input 
                  type="text" 
                  required 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                  placeholder="Event Name" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="date" 
                    required 
                    value={formData.date} 
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                  />
                  <input 
                    type="time" 
                    required 
                    value={formData.time} 
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                  />
                </div>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  value={formData.attendees || ''} 
                  onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 0 })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                  placeholder="Number of Attendees" 
                />
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
                >
                  <option value="meeting">Meeting</option>
                  <option value="presentation">Presentation</option>
                  <option value="planning">Planning</option>
                  <option value="review">Review</option>
                  <option value="kickoff">Kickoff</option>
                </select>
                <input 
                  type="url" 
                  value={formData.link} 
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                  placeholder="Meeting Link (optional)" 
                />
                <div className="flex gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAddModal(false)
                      setFormData({ date: '', title: '', time: '', attendees: 0, type: 'meeting', link: '' })
                    }} 
                    className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-colors"
                  >
                    Create Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Edit Activity</h2>
              <form onSubmit={handleEdit} className="space-y-4">
                <input 
                  type="text" 
                  required 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="date" 
                    required 
                    value={formData.date} 
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                  />
                  <input 
                    type="time" 
                    required 
                    value={formData.time} 
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })} 
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                  />
                </div>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  value={formData.attendees || ''} 
                  onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 0 })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                />
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
                >
                  <option value="meeting">Meeting</option>
                  <option value="presentation">Presentation</option>
                  <option value="planning">Planning</option>
                  <option value="review">Review</option>
                  <option value="kickoff">Kickoff</option>
                </select>
                <input 
                  type="url" 
                  value={formData.link} 
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all" 
                  placeholder="Meeting Link (optional)" 
                />
                <div className="flex gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingEvent(null)
                      setFormData({ date: '', title: '', time: '', attendees: 0, type: 'meeting', link: '' })
                    }} 
                    className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-colors"
                  >
                    Update Activity
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}