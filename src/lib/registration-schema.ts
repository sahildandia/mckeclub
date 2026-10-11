import { z } from 'zod'

export const registrationSchema = z.object({
  student_name: z.string().trim().min(1).max(120),
  register_number: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5,30}$/),
  college_email: z.string().trim().toLowerCase().email().endsWith('@mkce.ac.in'),
  phone_number: z.string().trim().regex(/^[0-9]{10}$/),
  department_id: z.string().uuid(),
  year: z.enum(['1st Year', '2nd Year', '3rd Year']),
  is_japanese_student: z.boolean(),
  is_aws_interested: z.literal(false).default(false),
  club_id: z.string().uuid(),
})
