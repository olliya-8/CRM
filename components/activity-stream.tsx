"use client";

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchContext } from '@/components/contexts/SearchContext'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ActivityStream() {
  const router = useRouter()
  const { updateSearchIndex } = useSearchContext()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_stream')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (data) {
        setActivities(data)
        // CRITICAL: Key must match Header routeMap 'activities'
        updateSearchIndex('activities', data)
      }
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Activity Stream</h2>
      </div>
      
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500 italic">Loading activities...</p>
        ) : activities.length > 0 ? (
          activities.map((activity, i) => (
            <div key={activity.id || i} className="flex flex-col border-l-2 border-blue-500 pl-4 py-1">
              <span className="text-sm font-semibold text-gray-900">{activity.username}</span>
              <span className="text-xs text-gray-600">{activity.action}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No recent activity.</p>
        )}
      </div>

      <button 
        onClick={() => router.push('/activity-stream-page')}
        className="w-full mt-6 text-blue-600 text-sm font-semibold py-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
      >
        View All Activities
      </button>
    </div>
  )
}