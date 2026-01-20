'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { ChevronRight, Users, DollarSign, Calendar } from 'lucide-react'
import { useSearchContext } from '@/components/contexts/SearchContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Project {
  id: string
  name: string
  type: 'Monthly' | 'Fixed'
  total_cost: number
  team_size: number
  monthly_cost?: number
  status: string
  created_at?: string
}

export default function ProjectsPagePreview() {
  const router = useRouter()
  const { updateSearchIndex } = useSearchContext() // ADDED
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const DISPLAY_COUNT = 3

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        const adminStatus = user.role === 'admin' || user.role === 'Admin'
        setIsAdmin(adminStatus)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setProjects(data)
      // REGISTER DATA FOR SEARCH
      // We send all projects to the index, not just the top 3
      updateSearchIndex('projects', data) 
    } else if (error) {
      toast.error('Error fetching projects: ' + error.message)
    }
    setLoading(false)
  }

  const handleViewAll = () => {
    router.push('/projects-page')
  }

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Planning': return 'bg-yellow-100 text-yellow-800'
      case 'Completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-base text-slate-600">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="pr-4 sm:pr-6 md:pr-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8 bg-gray-50 min-h-screen text-sm">
      <Toaster position="top-right" />
      
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 pl-0 sm:pl-0 md:pl-0">
        <div className="mb-6 flex justify-between items-center pr-4 sm:pr-6 md:pr-8 pl-4 sm:pl-6 md:pl-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Projects</h1>
          </div>
          <button onClick={handleViewAll} className="flex items-center text-blue-600 hover:text-blue-800 font-semibold group text-sm">
              View All 
              <ChevronRight className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-4 sm:px-6 md:px-8">
          {projects.slice(0, DISPLAY_COUNT).map((project) => (
            <div key={project.id} className="bg-gray-50 rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="py-3 px-4"> 
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(project.status)}`}>
                    {project.status}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      project.type === 'Monthly' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {project.type}
                  </span>
                </div>
                
                <h3 className="text-base font-bold text-gray-900 mb-2 truncate">{project.name}</h3>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center text-black">
                    <Users className="w-3 h-3 mr-2 text-blue-500" />
                    <span className="font-medium">Team Size:</span> {project.team_size}
                  </div>
                  <div className="flex items-center text-black">
                    <DollarSign className="w-3 h-3 mr-2 text-green-500" />
                    <span className="font-medium">Total Cost:</span> ${project.total_cost.toLocaleString()}
                  </div>
                  {project.created_at && (
                      <div className="flex items-center text-black">
                          <Calendar className="w-3 h-3 mr-2 text-gray-500" />
                          <span className="font-medium">Created:</span> {new Date(project.created_at).toLocaleDateString()}
                      </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}