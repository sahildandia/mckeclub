'use server'

import postgres from 'postgres'
import { DEPARTMENTS, CLUBS } from "@/lib/data"

const connectionString = "postgresql://postgres.kwzuhysldgendoswrfzd:927624Bcs%40139@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
const sql = postgres(connectionString)

export async function getFormData() {
  try {
    const departments = await sql`SELECT * FROM public.departments ORDER BY name`
    const clubs = await sql`SELECT * FROM public.clubs ORDER BY name`

    if (departments.length > 0 && clubs.length > 0) {
      return { 
        departments: departments as any, 
        clubs: clubs as any 
      }
    }
  } catch (err) {
    console.error("Database connection failed", err)
  }
  
  return { departments: DEPARTMENTS, clubs: CLUBS }
}

export async function getClubAvailability(departmentId: string) {
  try {
    const capacities = await sql`
      SELECT c.club_id, c.capacity, cl.is_japanese_only 
      FROM public.club_department_capacities c
      JOIN public.clubs cl ON c.club_id = cl.id
      WHERE c.department_id = ${departmentId}
    `
    const registrations = await sql`SELECT club_id FROM public.registrations WHERE department_id = ${departmentId} AND status = 'ACCEPTED'`
    
    const registeredCount: Record<string, number> = {}
    registrations.forEach(r => {
      registeredCount[r.club_id] = (registeredCount[r.club_id] || 0) + 1
    })

    const availability: Record<string, { capacity: number, registered: number, remaining: number }> = {}
    
    capacities.forEach(c => {
      const registered = registeredCount[c.club_id] || 0
      
      if (c.is_japanese_only) {
        availability[c.club_id] = {
          capacity: 9999,
          registered: registered,
          remaining: 9999
        }
      } else {
        availability[c.club_id] = {
          capacity: c.capacity,
          registered: registered,
          remaining: c.capacity - registered
        }
      }
    })

    return availability
  } catch (err) {
    console.error("Failed to fetch availability", err)
    return {}
  }
}

export async function submitRegistration(formData: any) {
  try {
    // Check if the student is already registered
    const existing = await sql`SELECT 1 FROM public.registrations WHERE register_number = ${formData.register_number}`
    if (existing.length > 0) {
      return { success: false, error: 'You have already registered for a club.' }
    }

    // Call the RPC equivalent or run it directly in a transaction
    // Supabase RPCs are just Postgres functions! We can call it directly:
    const result = await sql`
      SELECT * FROM register_student(
        ${formData.student_name},
        ${formData.register_number},
        ${formData.college_email},
        ${formData.phone_number},
        ${formData.department_id},
        ${formData.year},
        ${formData.is_japanese_student},
        ${formData.club_id}
      )
    `
    
    // The RPC returns a JSON object as a single column in the first row
    const resObj = result[0].register_student
    
    if (resObj.success) {
      return { success: true, confirmation_id: resObj.confirmation_id }
    } else {
      return { success: false, error: resObj.error }
    }
  } catch (err: any) {
    console.error("Registration error:", err)
    return { success: false, error: 'Registration failed due to a server error. Please try again.' }
  }
}
