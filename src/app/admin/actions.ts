'use server'

import postgres from 'postgres'

const connectionString = "postgresql://postgres.kwzuhysldgendoswrfzd:927624Bcs%40139@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
const sql = postgres(connectionString)

export async function getAdminData() {
  try {
    const departments = await sql`SELECT * FROM public.departments ORDER BY name`
    const clubs = await sql`SELECT * FROM public.clubs ORDER BY name`
    const capacities = await sql`SELECT * FROM public.club_department_capacities`
    
    // For registrations, we need to join with departments and clubs to get their names
    const registrations = await sql`
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
  } catch (error: any) {
    console.error("Admin fetch error:", error)
    return { success: false, error: error.message }
  }
}
