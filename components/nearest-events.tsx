"use client"

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSearchContext } from '@/components/contexts/SearchContext'

interface NearestEventsProps {
  onViewAll?: () => void
}

const events = [
  { id: 1, title: "Presentation of the new department", time: "Today | 5:00 PM", priority: "up", duration: "4h" },
  { id: 2, title: "Anna's Birthday", time: "Today | 6:00 PM", priority: "down", duration: "4h" },
  { id: 3, title: "Ray's Birthday", time: "Tomorrow | 2:00 PM", priority: "down", duration: "4h" },
]

export default function NearestEvents({ onViewAll }: NearestEventsProps) {
  const router = useRouter()
  const { updateSearchIndex } = useSearchContext()

  // Register events data for search
  useEffect(() => {
    updateSearchIndex('events', events)
    console.log('✅ Registered events data:', events)
  }, [])

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900">Nearest Events</h2>

        <button
          onClick={() => router.push('/calendar-page')}
          className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
        >
          View all
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            />
          </svg>
        </button>
      </div>

      {/* Events */}
      <div className="space-y-3">
        {events.map((event, idx) => (
          <button
            key={idx}
            className={`w-full text-left border-l-4 rounded p-3 transition-all hover:shadow-md cursor-pointer
              ${
                idx === 0
                  ? "border-yellow-400 bg-yellow-50 hover:bg-yellow-100"
                  : idx === 1
                  ? "border-purple-400 bg-purple-50 hover:bg-purple-100"
                  : "border-green-400 bg-green-50 hover:bg-green-100"
              }
            `}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              
              {/* Title + Time */}
              <div className="flex-1 min-w-[200px]">
                <h3 className="font-semibold text-gray-900 text-sm">{event.title}</h3>
                <p className="text-gray-600 text-xs mt-1">{event.time}</p>
              </div>

              {/* Right Icons */}
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 ${
                    event.priority === "up"
                      ? "text-yellow-500 rotate-180"
                      : "text-green-500"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 110-2h.01a1 1 0 110 2H12zm-2 2a1 1 0 100 2H10a1 1 0 100-2H10zm6-6a1 1 0 11-2 0 1 1 0 012 0zM7 9a1 1 0 100-2 1 1 0 000 2z"
                  />
                </svg>

                <span className="text-gray-600 text-xs flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                    />
                  </svg>
                  {event.duration}
                </span>
              </div>

            </div>
          </button>
        ))}
      </div>
    </div>
  )
}