'use server'

import { sql } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import type { Department, Club, Capacity, AdminRegistration } from '@/types'


export async function getAdminData(accessToken: string) {
  try {
    if (!accessToken) return { success: false, error: 'Admin authentication required.' }
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    if (error || !user || user.app_metadata?.role !== 'admin') {
      return { success: false, error: 'Admin access required.' }
    }
    const departments = await sql<Department[]>`SELECT * FROM public.departments ORDER BY name`
    const clubs = await sql<Club[]>`SELECT * FROM public.clubs ORDER BY name`
    const capacities = await sql<Capacity[]>`SELECT * FROM public.club_department_capacities`
    
    // For registrations, we need to join with departments and clubs to get their names
    const registrations = await sql<AdminRegistration[]>`
      SELECT r.*, 
             json_build_object('name', d.name, 'short_name', d.short_name) as departments,
             json_build_object('name', c.name) as clubs
      FROM public.registrations r
      LEFT JOIN public.departments d ON r.department_id = d.id
      LEFT JOIN public.clubs c ON r.club_id = c.id
      ORDER BY r.created_at DESC
    `

    return {
      success: true,
      data: {
        departments: Array.from(departments),
        clubs: Array.from(clubs),
        capacities: Array.from(capacities),
        registrations: Array.from(registrations)
      }
    }
  } catch (error) {
    console.error("Admin fetch error:", error)
    return { success: false, error: "Unable to load admin data. Please try again." }
  }
}
