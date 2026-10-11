'use server'

import { sql } from '@/lib/db'
import type { RegistrationStatus } from '@/types'

export async function checkStatus(registerNumber: string) {
  const normalized = registerNumber.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,30}$/.test(normalized)) return { success: false, error: 'Enter a valid Register Number.' }
  try {
    const rows = await sql<RegistrationStatus[]>`
      SELECT r.student_name, d.name as department_name, r.year,
        c.name as club_name, r.status, r.confirmation_id
      FROM vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.registrations r
      LEFT JOIN vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.departments d ON d.id = r.department_id
      LEFT JOIN vercel_load_39ee0b151b2f4831a8de0c6b6cf96902.clubs c ON c.id = r.club_id
      WHERE r.register_number = ${normalized}
      LIMIT 1
    `
    if (!rows[0]) return { success: false, error: 'No registration found for this Register Number.' }
    return { success: true, data: rows[0] }
  } catch (error) {
    console.error('Status lookup failed', error)
    return { success: false, error: 'Unable to check status. Please try again later.' }
  }
}
