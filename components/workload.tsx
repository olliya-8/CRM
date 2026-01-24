'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useSearchContext } from '@/components/contexts/SearchContext'

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
  level?: 'Senior' | 'Mid-Level' | 'Junior' // ← Add this field (optional for backward compatibility)
  image_url?: string
}

interface WorkloadProps {
  onViewAll?: () => void
}

export default function Workload({ onViewAll }: WorkloadProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const { updateSearchIndex } = useSearchContext()
  
  // Show only 4 employees on dashboard
  const displayedEmployees = employees.slice(0, 4)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'Active') // Only show active employees
        .order('name')
      
      if (!error && data) {
        setEmployees(data)
        updateSearchIndex('workload', data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 sm:p-6 mb-8 border border-gray-200 w-full">
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-600">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 mb-8 border border-gray-200 w-full max-w-full overflow-x-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Workload</h2>
        <button
          onClick={onViewAll}
          className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center transition-colors"
        >
          View all
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-600">No active employees found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 sm:space-y-4">
            {displayedEmployees.map((employee) => (
              <div 
                key={employee.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2 sm:gap-0"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border-2 border-gray-300">
                    {employee.image_url ? (
                      <Image
                        src={employee.image_url}
                        alt={employee.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold text-lg">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{employee.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{employee.role}</p>
                  </div>
                </div>
                
                {/* Only show level badge if level is set in database */}
                {employee.level && (
                  <span className={`mt-2 sm:mt-0 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                    employee.level === "Senior" 
                      ? "bg-blue-100 text-blue-700" 
                      : employee.level === "Junior"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                  }`}>
                    {employee.level}
                  </span>
                )}
              </div>
            ))}
          </div>
        
          {/* Show count of remaining employees */}
          {employees.length > 4 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Showing 4 of {employees.length} employees
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}