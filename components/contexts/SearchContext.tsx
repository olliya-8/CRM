'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface SearchIndex {
  navigation: any[]
  workload: any[]
  events: any[]
  activities: any[]
  projects: any[]
  finances: any[]
  calendar: any[]
  vacations: any[]
  employees: any[]
  infoPortal: any[]
}

interface SearchContextType {
  searchIndex: SearchIndex
  updateSearchIndex: (category: keyof SearchIndex, data: any[]) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchIndex, setSearchIndex] = useState<SearchIndex>({
    navigation: [],
    workload: [],
    events: [],
    activities: [],
    projects: [],
    finances: [],
    calendar: [],
    vacations: [],
    employees: [],
    infoPortal: [],
  })

  const updateSearchIndex = useCallback((category: keyof SearchIndex, data: any[]) => {
    setSearchIndex(prevIndex => {
      // Only update if data has changed (prevents unnecessary re-renders)
      if (JSON.stringify(prevIndex[category]) === JSON.stringify(data)) {
        return prevIndex
      }
      return { ...prevIndex, [category]: data }
    })
  }, [])

  return (
    <SearchContext.Provider value={{ searchIndex, updateSearchIndex }}>
      {children}
    </SearchContext.Provider>
  )
}

export const useSearchContext = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearchContext must be used within SearchProvider')
  }
  return context
}