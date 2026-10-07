'use server'

import { supabase } from "@/lib/supabase"

export async function checkStatus(registerNumber: string) {
  // Using public client because checking status is allowed publicly by our RLS policy
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      student_name,
      department_id,
      year,
      club_id,
      status,
      confirmation_id,
      departments(name),
      clubs(name)
    `)
    .eq('register_number', registerNumber)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'No registration found for this Register Number.' }
    }
    return { success: false, error: error.message }
  }

  return { 
    success: true, 
    data: {
      student_name: data.student_name,
      department_name: (data.departments as any)?.name,
      year: data.year,
      club_name: (data.clubs as any)?.name,
      status: data.status,
      confirmation_id: data.confirmation_id
    } 
  }
}
