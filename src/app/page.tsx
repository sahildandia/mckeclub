'use client'

import { useState, useEffect } from 'react'
import { getFormData, getClubAvailability, submitRegistration } from './register/actions'
import { Department, Club } from '@/types'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type Availability = Record<string, { capacity: number, registered: number, remaining: number }>

export default function Home() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [availability, setAvailability] = useState<Availability>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [successData, setSuccessData] = useState<{
    student_name: string;
    register_number: string;
    departmentName?: string;
    clubName?: string;
    confirmation_id?: string;
    registration_date?: string;
  } | null>(null)

  const [formData, setFormData] = useState({
    student_name: '',
    register_number: '',
    college_email: '',
    phone_number: '',
    department_id: '',
    year: '',
    is_japanese_student: false,
    is_aws_interested: false,
    club_id: ''
  })

  useEffect(() => {
    getFormData().then(data => {
      setDepartments(data.departments)
      setClubs(data.clubs)
    }).catch(() => {
      setError('Registration is temporarily unavailable. Please try again later.')
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let active = true;
    if (formData.department_id) {
      getClubAvailability(formData.department_id).then(data => {
        if (active) setAvailability(data)
      }).catch(() => {
        if (active) setError('Unable to load club availability. Please try again.')
      })
    } else {
      Promise.resolve().then(() => {
        if (active) setAvailability({})
      })
    }
    return () => { active = false }
  }, [formData.department_id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    
    if (name === 'is_japanese_student') {
       const isTrue = value === 'true'
       setFormData(prev => ({ ...prev, [name]: isTrue, club_id: '' }))
    } else if (name === 'year') {
       setFormData(prev => ({ 
         ...prev, 
         year: value,
         club_id: ''
       }))
    } else if (name === 'department_id') {
       setFormData(prev => ({ ...prev, [name]: value, club_id: '' }))
    } else {
       setFormData(prev => ({ ...prev, [name]: val } as unknown as typeof formData))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setUnconfirmed(false)
    
    if (!formData.college_email.endsWith('@mkce.ac.in')) {
      setError('Please use your official college email ID ending with @mkce.ac.in')
      return
    }

    setSubmitting(true)

    try {
      const res = await submitRegistration(formData)
      if (res.success) {
        setSuccessData({
          ...formData,
          confirmation_id: res.confirmation_id,
          departmentName: departments.find(d => d.id === formData.department_id)?.name,
          clubName: clubs.find(c => c.id === formData.club_id)?.name === 'Communication Club' ? 'LEXORA (COMMUNICATION CLUB)' : clubs.find(c => c.id === formData.club_id)?.name,
          registration_date: new Date().toLocaleString()
        })
      } else {
        setUnconfirmed('unconfirmed' in res && res.unconfirmed === true)
        setError(res.error || 'Registration failed')
      }
    } catch {
      setUnconfirmed(true)
      setError('We could not confirm your registration. Check your registration status before trying again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] w-full">
        <div className="text-xl font-medium text-gray-900 animate-pulse">Loading Registration Form...</div>
      </div>
    )
  }

  if (departments.length === 0) {
    return <div role="alert" className="p-8 text-center text-red-700">{error || 'Registration is temporarily unavailable.'}</div>
  }

  if (successData) {
    return (
      <section aria-labelledby="confirmation-heading" className="w-full max-w-xl mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 my-4 sm:my-10">
        <div className="px-6 pt-8 pb-7 sm:px-9 sm:pt-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Registration confirmed</p>
          <h2 id="confirmation-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Registration successful!</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Your club registration is complete. Here are your details.</p>
        </div>

        <div className="px-6 pb-6 sm:px-9 sm:pb-8">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4">
            <p className="text-xs font-semibold text-emerald-700">Your selected club</p>
            <p className="mt-1 text-lg font-bold leading-snug text-emerald-950 break-words">{successData.clubName}</p>
          </div>
          <dl className="mt-5 divide-y divide-slate-100">
            <div className="py-4 grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">Student name</dt>
              <dd className="text-sm font-semibold text-slate-900 break-words">{successData.student_name}</dd>
            </div>
            <div className="py-4 grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">Register number</dt>
              <dd className="text-sm font-medium font-mono text-slate-900 break-all">{successData.register_number}</dd>
            </div>
            <div className="py-4 grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">Department</dt>
              <dd className="text-sm font-medium leading-6 text-slate-900 break-words">{successData.departmentName}</dd>
            </div>
          </dl>
        </div>
      </section>
    )
  }

  const availableClubs = clubs.filter(c => {
    if (formData.is_japanese_student) return c.is_japanese_only;
    if (formData.is_aws_interested) return c.is_aws_only;
    return !c.is_japanese_only && !c.is_aws_only;
  })

  return (
    <div className="w-full mx-auto max-w-full bg-white p-5 sm:p-8 md:p-10 shadow-lg shadow-slate-200/50 rounded-2xl border border-slate-200 relative">
      <div className="text-center mb-8 sm:mb-10 w-full break-words">
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight leading-tight">Club Registration Form</h1>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base leading-6 text-slate-500">Please fill out the details carefully. You can only register for ONE club.</p>
      </div>
      
      {error && (
        <div className="mb-8 bg-red-100 border-l-4 border-red-600 p-4 sm:p-5 rounded-r-md flex flex-col sm:flex-row sm:items-center shadow-sm w-full">
          <AlertCircle className="h-6 w-6 text-red-700 mb-2 sm:mb-0 sm:mr-3 flex-shrink-0" />
          <div className="text-sm sm:text-base font-bold text-red-900 break-words">
            <p>{error}</p>
            {unconfirmed && <Link href="/status" prefetch={false} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 underline underline-offset-4">Check registration status (opens in a new tab)</Link>}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10 w-full overflow-hidden">
        {/* Step 1: Personal Info */}
        <div className="w-full">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-5 flex items-center break-words w-full">
            <span className="bg-indigo-50 text-indigo-700 rounded-full w-8 h-8 ring-1 ring-indigo-100 flex items-center justify-center mr-3 text-sm flex-shrink-0">1</span>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 gap-y-5 sm:gap-y-6 gap-x-6 sm:grid-cols-2 w-full">
            <div className="w-full min-w-0">
              <label htmlFor="student_name" className="block text-sm font-semibold text-slate-700 mb-2 truncate">Full Student Name</label>
              <input type="text" name="student_name" id="student_name" required placeholder="John Doe"
                className="block w-full min-w-0 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base placeholder-slate-400"
                value={formData.student_name} onChange={handleInputChange} />
            </div>
            <div className="w-full min-w-0">
              <label htmlFor="register_number" className="block text-sm font-semibold text-slate-700 mb-2 truncate">Register Number</label>
              <input type="text" name="register_number" id="register_number" required placeholder="e.g. 927624BCS001"
                className="block w-full min-w-0 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base font-mono uppercase placeholder-slate-400"
                value={formData.register_number} onChange={handleInputChange} />
            </div>
            <div className="w-full min-w-0">
              <label htmlFor="college_email" className="block text-sm font-semibold text-slate-700 mb-2 truncate">Official college mail id</label>
              <input type="email" name="college_email" id="college_email" required placeholder="student@mkce.ac.in" pattern=".*@mkce\.ac\.in$"
                className={`block w-full min-w-0 bg-white text-slate-900 border rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 text-sm sm:text-base placeholder-slate-400
                  ${formData.college_email && !formData.college_email.endsWith('@mkce.ac.in') ? 'border-red-500 focus:ring-red-600 focus:border-red-500' : 'border-slate-300 focus:ring-indigo-600 focus:border-indigo-600'}`}
                value={formData.college_email} onChange={handleInputChange} />
              {formData.college_email && !formData.college_email.endsWith('@mkce.ac.in') && (
                <p className="mt-2 text-sm text-red-600 font-medium">Please use your official @mkce.ac.in mail id.</p>
              )}
            </div>
            <div className="w-full min-w-0">
              <label htmlFor="phone_number" className="block text-sm font-semibold text-slate-700 mb-2 truncate">Phone Number</label>
              <input type="tel" name="phone_number" id="phone_number" required placeholder="9876543210"
                inputMode="numeric" autoComplete="tel-national" pattern="[0-9]{10}" minLength={10} maxLength={10}
                title="Please enter a 10-digit phone number."
                aria-describedby={formData.phone_number && !/^[0-9]{10}$/.test(formData.phone_number) ? 'phone-number-help' : undefined}
                aria-invalid={Boolean(formData.phone_number && !/^[0-9]{10}$/.test(formData.phone_number))}
                onInvalid={e => e.currentTarget.setCustomValidity('Please enter a 10-digit phone number.')}
                className="block w-full min-w-0 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base placeholder-slate-400"
                value={formData.phone_number} onChange={e => {
                  e.currentTarget.setCustomValidity('')
                  handleInputChange(e)
                }} />
              {formData.phone_number && !/^[0-9]{10}$/.test(formData.phone_number) && (
                <p id="phone-number-help" className="mt-2 text-sm text-red-600 font-medium">
                  Please enter a 10-digit phone number.
                </p>
              )}
            </div>
          </div>
        </div>

        <hr className="border-slate-200 w-full" />

        {/* Step 2: Academic Info */}
        <div className="w-full">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-5 flex items-center break-words w-full">
            <span className="bg-indigo-50 text-indigo-700 rounded-full w-8 h-8 ring-1 ring-indigo-100 flex items-center justify-center mr-3 text-sm flex-shrink-0">2</span>
            Academic Information
          </h3>
          <div className="grid grid-cols-1 gap-y-5 sm:gap-y-6 gap-x-6 sm:grid-cols-2 w-full">
            <div className="w-full min-w-0">
              <label htmlFor="department_id" className="block text-sm font-semibold text-slate-700 mb-2 truncate">Select Your Department</label>
              <select name="department_id" id="department_id" required
                className="block w-full min-w-0 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-sm py-3 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base cursor-pointer"
                value={formData.department_id} onChange={handleInputChange}>
                <option value="" disabled className="text-gray-900">-- Choose Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="text-black bg-white">{d.name} ({d.short_name})</option>
                ))}
              </select>
            </div>
            
            <div className="w-full min-w-0">
              <label htmlFor="year" className="block text-sm font-semibold text-slate-700 mb-2 truncate">Select Your Year</label>
              <select name="year" id="year" required
                className="block w-full min-w-0 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-sm py-3 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base cursor-pointer"
                value={formData.year} onChange={handleInputChange}>
                <option value="" disabled className="text-gray-900">-- Choose Year --</option>
                <option value="1st Year" className="text-black bg-white">1st Year</option>
                <option value="2nd Year" className="text-black bg-white">2nd Year</option>
                <option value="3rd Year" className="text-black bg-white">3rd Year</option>
              </select>
            </div>

              <div className="sm:col-span-2 w-full min-w-0 bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-200 mt-2">
                <span className="block text-sm sm:text-base font-semibold text-slate-900 mb-4 truncate">Are you a Japanese student?</span>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-10 w-full">
                  <label className="flex items-center cursor-pointer min-w-0">
                    <input type="radio" name="is_japanese_student" value="true" required
                      checked={formData.is_japanese_student === true} onChange={handleInputChange}
                      className="focus:ring-indigo-600 h-5 w-5 text-indigo-700 border-slate-300 cursor-pointer flex-shrink-0" />
                    <span className="ml-3 text-sm sm:text-base font-medium text-slate-700 truncate">Yes, I am</span>
                  </label>
                  <label className="flex items-center cursor-pointer min-w-0">
                    <input type="radio" name="is_japanese_student" value="false" required
                      checked={formData.is_japanese_student === false} onChange={handleInputChange}
                      className="focus:ring-indigo-600 h-5 w-5 text-indigo-700 border-slate-300 cursor-pointer flex-shrink-0" />
                    <span className="ml-3 text-sm sm:text-base font-medium text-slate-700 truncate">No, I am not</span>
                  </label>
                </div>
              </div>

          </div>
        </div>

        {/* Step 3: Club Selection */}
        {formData.department_id && (
          <>
            <hr className="border-slate-200 w-full" />
            <div className="w-full">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-5 flex items-center break-words w-full">
                <span className="bg-indigo-50 text-indigo-700 rounded-full w-8 h-8 ring-1 ring-indigo-100 flex items-center justify-center mr-3 text-sm flex-shrink-0">3</span>
                Select Your Club
              </h3>
              <p className="text-sm leading-6 text-indigo-800 mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100 break-words w-full">
                You can select exactly ONE club. Availability is strictly based on seats allocated to your department.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full">
                {availableClubs.map(club => {
                  const avail = availability[club.id]
                  const isFull = avail ? avail.remaining <= 0 : false
                  const isSelected = formData.club_id === club.id

                  return (
                    <label key={club.id} 
                      className={`relative w-full min-w-0 rounded-xl border p-4 sm:p-5 flex flex-col cursor-pointer transition-all duration-200 shadow-sm
                        ${isSelected ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600' : 'bg-white border-slate-300 hover:border-indigo-300 hover:bg-slate-50'}
                        ${isFull && !isSelected ? 'opacity-60 bg-gray-200 border-gray-300 cursor-not-allowed hover:border-gray-300 hover:shadow-none transform-none' : ''}
                      `}>
                      <div className="flex items-start justify-between w-full min-w-0">
                        <div className="flex items-center w-full min-w-0">
                          <input type="radio" name="club_id" value={club.id} required
                            disabled={isFull}
                            checked={isSelected} onChange={handleInputChange}
                            className="mt-1 h-5 w-5 text-indigo-700 border-slate-300 focus:ring-indigo-600 disabled:opacity-50 cursor-pointer flex-shrink-0" />
                          <span className="ml-3 sm:ml-4 block text-sm sm:text-base font-semibold text-slate-900 break-words min-w-0">
                            {club.name === 'Communication Club' ? 'LEXORA (COMMUNICATION CLUB)' : club.name}
                          </span>
                        </div>
                      </div>
                      {avail && (
                        <div className="mt-4 ml-8 sm:ml-9 flex flex-col xl:flex-row xl:justify-between xl:items-center bg-white/80 rounded-md p-2 border border-gray-200 gap-2 w-[calc(100%-2rem)]">
                          <span className="text-xs sm:text-sm font-medium text-slate-500 truncate">Capacity: {avail.registered} / {avail.capacity}</span>
                          {isFull ? (
                            <span className="inline-flex self-start items-center px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wide bg-red-200 text-red-900 border border-red-300 flex-shrink-0">
                              CLOSED
                            </span>
                          ) : (
                            <span className={`inline-flex self-start items-center px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wide border flex-shrink-0 ${avail.remaining <= 5 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-green-100 text-green-900 border-green-300'}`}>
                              {avail.remaining} LEFT
                            </span>
                          )}
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <div className="pt-6 sm:pt-8 w-full">
          <button type="submit" disabled={submitting || !formData.club_id}
            className="w-full flex justify-center py-3 sm:py-4 px-4 sm:px-8 border border-transparent shadow-sm text-base font-semibold rounded-xl text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors break-words whitespace-normal">
            {submitting ? 'Processing Registration...' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </div>
  )
}
