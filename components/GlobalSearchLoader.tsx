'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { useSearchContext } from '@/components/contexts/SearchContext'

export default function GlobalSearchLoader() {
  const { updateSearchIndex, searchIndex } = useSearchContext()

  useEffect(() => {
    loadAllSearchData()
  }, [updateSearchIndex])

  const loadAllSearchData = async () => {
    try {
      // 1️⃣ Navigation items
      const navigationItems = [
        { name: 'Dashboard', path: '/dashboard', title: 'Dashboard' },
        { name: 'Projects', path: '/projects-page', title: 'Projects' },
        { name: 'Finances', path: '/finances-page', title: 'Finances' },
        { name: 'Calendar', path: '/calendar-page', title: 'Calendar' },
        { name: 'Vacations', path: '/vacations-page', title: 'Vacations' },
        { name: 'Employees', path: '/employees-page', title: 'Employees' },
        { name: 'Info Portal', path: '/info-portal-page', title: 'Info Portal' },
        { name: 'Tasks Management', path: '/tasks-page', title: 'Tasks Management' }, // ✅ Added
      ]
      updateSearchIndex('navigation', navigationItems)

      // 2️⃣ Load activity_stream
      const { data: activities } = await supabase
        .from('activity_stream')
        .select('*')
        .order('created_at', { ascending: false })

      if (activities) {
        updateSearchIndex(
          'activities',
          activities.map(a => ({
            id: a.id,
            name: a.username,
            username: a.username,
            role: a.role,
            action: a.action,
            type: a.type,
            created_at: a.created_at,
            title: a.username,
            subtitle: `${a.action} - ${new Date(a.created_at).toLocaleDateString()}`,
          }))
        )
      }

      // 3️⃣ Load employees
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true })

      if (employees) {
        updateSearchIndex(
          'employees',
          employees.map(e => ({
            id: e.id,
            name: e.name,
            role: e.role,
            department: e.department,
            email: e.email,
            status: e.status,
            title: e.name,
            subtitle: `${e.role} • ${e.department}`,
          }))
        )
      }

      // 4️⃣ Load projects & map as finances
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projects) {
        updateSearchIndex(
          'projects',
          projects.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            currency: p.currency,
            total_cost: p.total_cost,
            total_cost_pkr: p.total_cost_pkr,
            monthly_cost: p.monthly_cost,
            monthly_cost_pkr: p.monthly_cost_pkr,
            total_months: p.total_months,
            billing_type: p.billing_type,
            team_size: p.team_size,
            status: p.status,
            title: p.name,
            subtitle: `Team: ${p.team_size} • Cost: ${p.total_cost} ${p.currency}`,
          }))
        )

        // Map projects as finances for search
        updateSearchIndex(
          'finances',
          projects.map(p => ({
            id: p.id,
            name: p.name,
            total_cost: p.total_cost,
            total_cost_pkr: p.total_cost_pkr,
            monthly_cost: p.monthly_cost,
            monthly_cost_pkr: p.monthly_cost_pkr,
            title: p.name,
            subtitle: `Total: ${p.total_cost} ${p.currency}`,
          }))
        )
      }

      // 5️⃣ Load vacations - ✅ UPDATED
      const { data: vacations } = await supabase
        .from('vacations')
        .select('*')
        .order('start_date', { ascending: true })

      if (vacations) {
        updateSearchIndex(
          'vacations',
          vacations.map(v => ({
            id: v.id,
            name: v.user_id,
            start_date: v.start_date,
            end_date: v.end_date,
            reason: v.reason,
            status: v.status,
            title: v.user_id,
            subtitle: `${v.reason} • ${v.start_date} to ${v.end_date}`,
            path: '/vacations-page'
          }))
        )
      }

      // 5️⃣b Load leave_requests - ✅ NEW
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (leaveRequests) {
        updateSearchIndex(
          'leaveRequests',
          leaveRequests.map(lr => ({
            id: lr.id,
            employee_name: lr.employee_name,
            email: lr.email,
            leave_type: lr.leave_type,
            start_date: lr.start_date,
            end_date: lr.end_date,
            status: lr.status,
            reason: lr.reason,
            title: `${lr.employee_name} - ${lr.leave_type}`,
            subtitle: `${lr.status} • ${lr.start_date} to ${lr.end_date}`,
            path: '/vacations-page'
          }))
        )
      }

      // 5️⃣c Load company_holidays - ✅ NEW
      const { data: companyHolidays } = await supabase
        .from('company_holidays')
        .select('*')
        .order('date', { ascending: true })

      if (companyHolidays) {
        updateSearchIndex(
          'companyHolidays',
          companyHolidays.map(ch => ({
            id: ch.id,
            title: ch.title,
            date: ch.date,
            end_date: ch.end_date,
            holiday_type: ch.holiday_type,
            description: ch.description,
            is_recurring: ch.is_recurring,
            subtitle: `${ch.holiday_type} • ${ch.date}${ch.end_date ? ` to ${ch.end_date}` : ''}`,
            path: '/vacations-page'
          }))
        )
      }

      // 6️⃣ Load info_portal
      const { data: infoPortal } = await supabase
        .from('info_portal')
        .select('*')
        .order('created_at', { ascending: false })

      if (infoPortal) {
        updateSearchIndex(
          'infoPortal',
          infoPortal.map(i => ({
            id: i.id,
            name: i.title,
            title: i.title,
            description: i.description,
            category: i.category,
            content: i.content,
            subtitle: i.description || i.category,
          }))
        )
      }

      // 7️⃣ Load documents
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (documents) {
        updateSearchIndex(
          'documents',
          documents.map(d => ({
            id: d.id,
            title: d.title,
            category: d.category,
            date: d.date,
            views: d.views,
            subtitle: d.category,
          }))
        )
      }

      // 8️⃣ Load announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false })

      if (announcements) {
        updateSearchIndex(
          'announcements',
          announcements.map(a => ({
            id: a.id,
            title: a.title,
            date: a.date,
            priority: a.priority,
            subtitle: `${a.priority} • ${a.date}`,
          }))
        )
      }

      // 9️⃣ Load conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })

      if (conversations) {
        updateSearchIndex(
          'conversations',
          conversations.map(c => ({
            id: c.id,
            name: c.name,
            last_message: c.last_message,
            time: c.time,
            unread: c.unread,
            subtitle: `${c.last_message} • ${c.time}`,
          }))
        )
      }

      // 🔟 Load tasks - ✅ NEW
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (tasks) {
        updateSearchIndex(
          'tasks',
          tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            assigned_to_email: t.assigned_to_email,
            assigned_to_name: t.assigned_to_name,
            assigned_by_name: t.assigned_by_name,
            priority: t.priority,
            status: t.status,
            due_date: t.due_date,
            subtitle: `${t.status} • Priority: ${t.priority} • Assigned to: ${t.assigned_to_name || t.assigned_to_email}`,
            path: '/tasks-page'
          }))
        )
      }

      console.log('✅ Full Search Index after loading:', searchIndex)
    } catch (error) {
      console.error('❌ Error loading search data:', error)
    }
  }

  return null
}
