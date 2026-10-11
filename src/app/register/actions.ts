'use server'

import { sql } from '@/lib/db'
import type { Department, Club } from "@/types"
import { registrationSchema } from "@/lib/registration-schema"
import { z } from "zod"


export async function getFormData() {
  try {
    const [departments, clubs] = await Promise.all([
      sql<Department[]>`SELECT * FROM public.departments ORDER BY name`,
      sql<Club[]>`SELECT * FROM public.clubs WHERE is_aws_only = false ORDER BY name`,
    ])

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
      SELECT c.club_id, c.capacity, cl.is_japanese_only,
        COALESCE(r.registered, 0)::int AS registered
      FROM public.club_department_capacities c
      JOIN public.clubs cl ON c.club_id = cl.id
      LEFT JOIN (
        SELECT club_id, COUNT(*)::int AS registered
        FROM public.registrations
        WHERE department_id = ${departmentId} AND status = 'ACCEPTED'
        GROUP BY club_id
      ) r ON r.club_id = c.club_id
      WHERE c.department_id = ${departmentId} AND cl.is_aws_only = false
    `

    const availability: Record<string, { capacity: number, registered: number, remaining: number }> = {}
    
    capacities.forEach(c => {
      const registered = c.registered
      
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

export async function submitRegistration(input: unknown) {
  const parsed = registrationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const formData = parsed.data
  try {
    // The database function validates club eligibility, duplicates, and seat limits atomically.
    const result = await sql`
      SELECT * FROM public.register_student(
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
    return {
      success: false,
      unconfirmed: true,
      error: 'We could not confirm your registration. Check your registration status before trying again.',
    }
  }
}
