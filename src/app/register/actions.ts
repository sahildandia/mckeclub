'use server'

import { sql } from '@/lib/db'
import type { Department, Club } from "@/types"
import { registrationSchema } from "@/lib/registration-schema"
import { z } from "zod"


export async function getFormData() {
  try {
    const departments = await sql<Department[]>`SELECT * FROM vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.departments ORDER BY name`
    const clubs = await sql<Club[]>`SELECT * FROM vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.clubs WHERE is_aws_only = false ORDER BY name`

    if (departments.length > 0 && clubs.length > 0) {
      return { 
        departments: Array.from(departments),
        clubs: Array.from(clubs)
      }
    }
  } catch (err) {
    console.error("Database connection failed", err)
  }
  
  throw new Error("Registration is temporarily unavailable. Please try again later.")
}

export async function getClubAvailability(departmentId: string) {
  if (!z.string().uuid().safeParse(departmentId).success) return {}
  try {
    const capacities = await sql`
      SELECT c.club_id, c.capacity, cl.is_japanese_only, cl.is_aws_only 
      FROM vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.club_department_capacities c
      JOIN vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.clubs cl ON c.club_id = cl.id
      WHERE c.department_id = ${departmentId}
    `
    const registrations = await sql`SELECT club_id FROM vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.registrations WHERE department_id = ${departmentId} AND status = 'ACCEPTED'`
    
    const registeredCount: Record<string, number> = {}
    registrations.forEach(r => {
      registeredCount[r.club_id] = (registeredCount[r.club_id] || 0) + 1
    })

    const availability: Record<string, { capacity: number, registered: number, remaining: number }> = {}
    
    capacities.forEach(c => {
      const registered = registeredCount[c.club_id] || 0
      
      if (c.is_japanese_only || c.is_aws_only) {
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

export async function submitRegistration(input: unknown) {
  const parsed = registrationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const formData = parsed.data
  try {
    const clubs = await sql<Club[]>`SELECT * FROM vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.clubs WHERE id = ${formData.club_id}`
    if (!clubs[0] || clubs[0].is_aws_only) return { success: false, error: 'This club is not available for registration.' }
    // Check if the student is already registered
    const existing = await sql`SELECT 1 FROM vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.registrations WHERE register_number = ${formData.register_number}`
    if (existing.length > 0) {
      return { success: false, error: 'You have already registered for a club.' }
    }

    // Call the RPC equivalent or run it directly in a transaction
    // Supabase RPCs are just Postgres functions! We can call it directly:
    const result = await sql`
      SELECT * FROM vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.register_student(
        ${formData.student_name},
        ${formData.register_number},
        ${formData.college_email},
        ${formData.phone_number},
        ${formData.department_id},
        ${formData.year},
        ${formData.is_japanese_student},
        ${formData.is_aws_interested},
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
  } catch (err) {
    console.error("Registration error:", err)
    return { success: false, error: 'Registration failed due to a server error. Please try again.' }
  }
}
