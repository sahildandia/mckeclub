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
  const [successData, setSuccessData] = useState<any>(null)

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
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (formData.department_id) {
      getClubAvailability(formData.department_id).then(setAvailability)
      setFormData(prev => ({ ...prev, club_id: '' }))
    } else {
      setAvailability({})
    }
  }, [formData.department_id])

  useEffect(() => {
      setFormData(prev => ({ ...prev, club_id: '' }))
  }, [formData.is_japanese_student])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    
    if (name === 'is_japanese_student') {
       const isTrue = value === 'true'
       setFormData(prev => ({ ...prev, [name]: isTrue }))
    } else {
       setFormData(prev => ({ ...prev, [name]: val }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
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
          clubName: clubs.find(c => c.id === formData.club_id)?.name,
          registration_date: new Date().toLocaleString()
        })
      } else {
        setError(res.error || 'Registration failed')
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.')
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

  if (successData) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white p-6 sm:p-10 border border-gray-300 shadow-xl rounded-2xl mt-4 sm:mt-10">
        <div className="text-center mb-8">
          <CheckCircle2 className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-green-600" />
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-extrabold text-black">Registration Successful!</h2>
          <p className="mt-2 text-base sm:text-lg text-gray-800">You have successfully registered for your club.</p>
        </div>
        
        <div className="border-t border-gray-300 py-6 print:py-0">
          <dl className="divide-y divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-bold text-gray-700 uppercase tracking-wide">Student Name</dt>
              <dd className="mt-1 text-base font-medium text-black sm:mt-0 sm:col-span-2 break-words">{successData.student_name}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-bold text-gray-700 uppercase tracking-wide">Register Number</dt>
              <dd className="mt-1 text-base font-medium text-black sm:mt-0 sm:col-span-2 break-words">{successData.register_number}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-bold text-gray-700 uppercase tracking-wide">Department</dt>
              <dd className="mt-1 text-base font-medium text-black sm:mt-0 sm:col-span-2 break-words">{successData.departmentName}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 bg-indigo-100 -mx-4 sm:-mx-6 px-4 sm:px-6 rounded-lg">
              <dt className="text-sm font-bold text-indigo-900 uppercase tracking-wide flex items-center">Selected Club</dt>
              <dd className="mt-1 text-lg font-extrabold text-indigo-900 sm:mt-0 sm:col-span-2 break-words">{successData.clubName}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-bold text-gray-700 uppercase tracking-wide">Confirmation ID</dt>
              <dd className="mt-1 text-base font-mono font-bold bg-gray-200 px-3 py-1 rounded inline-block text-black sm:mt-0 sm:col-span-2 break-all">{successData.confirmation_id}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-8 flex justify-center print:hidden">
          <button onClick={() => window.print()} className="w-full sm:w-auto px-6 py-3 border border-gray-400 shadow-sm text-base font-bold rounded-lg text-black bg-white hover:bg-gray-100 hover:shadow-md transition-all">
            Print Confirmation Ticket
          </button>
        </div>
      </div>
    )
  }

  const availableClubs = clubs.filter(c => {
    if (formData.is_japanese_student) return c.is_japanese_only;
    if (formData.is_aws_interested) return c.is_aws_only;
    return !c.is_japanese_only && !c.is_aws_only;
  })

  return (
    <div className="w-full mx-auto max-w-full bg-white p-5 sm:p-8 md:p-12 shadow-2xl rounded-2xl border border-gray-300 relative">
      <div className="text-center mb-8 sm:mb-10 w-full break-words">
        <Link href="/admin">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-black tracking-tight leading-tight hover:text-indigo-600 transition-colors cursor-pointer">Club Registration Form</h1>
        </Link>
        <p className="mt-2 sm:mt-3 text-sm sm:text-lg font-medium text-gray-700">Please fill out the details carefully. You can only register for ONE club.</p>
      </div>
      
      {error && (
        <div className="mb-8 bg-red-100 border-l-4 border-red-600 p-4 sm:p-5 rounded-r-md flex flex-col sm:flex-row sm:items-center shadow-sm w-full">
          <AlertCircle className="h-6 w-6 text-red-700 mb-2 sm:mb-0 sm:mr-3 flex-shrink-0" />
          <span className="text-sm sm:text-base font-bold text-red-900 break-words">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10 w-full overflow-hidden">
        {/* Step 1: Personal Info */}
        <div className="w-full">
          <h3 className="text-lg sm:text-xl font-extrabold text-black mb-5 flex items-center break-words w-full">
            <span className="bg-indigo-700 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm flex-shrink-0">1</span>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 gap-y-6 sm:gap-y-8 gap-x-6 sm:grid-cols-2 w-full">
            <div className="w-full min-w-0">
              <label htmlFor="student_name" className="block text-sm font-bold text-gray-900 mb-2 truncate">Full Student Name</label>
              <input type="text" name="student_name" id="student_name" required placeholder="John Doe"
                className="block w-full min-w-0 bg-white text-black border-2 border-gray-400 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base placeholder-gray-500"
                value={formData.student_name} onChange={handleInputChange} />
            </div>
            <div className="w-full min-w-0">
              <label htmlFor="register_number" className="block text-sm font-bold text-gray-900 mb-2 truncate">Register Number</label>
              <input type="text" name="register_number" id="register_number" required placeholder="e.g. 21BCE1234"
                className="block w-full min-w-0 bg-white text-black border-2 border-gray-400 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base font-mono uppercase placeholder-gray-500"
                value={formData.register_number} onChange={handleInputChange} />
            </div>
            <div className="w-full min-w-0">
              <label htmlFor="college_email" className="block text-sm font-bold text-gray-900 mb-2 truncate">Official college mail id</label>
              <input type="email" name="college_email" id="college_email" required placeholder="student@mkce.ac.in" pattern=".*@mkce\.ac\.in$"
                className={`block w-full min-w-0 bg-white text-black border-2 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 text-sm sm:text-base placeholder-gray-500
                  ${formData.college_email && !formData.college_email.endsWith('@mkce.ac.in') ? 'border-red-500 focus:ring-red-600 focus:border-red-500' : 'border-gray-400 focus:ring-indigo-600 focus:border-indigo-600'}`}
                value={formData.college_email} onChange={handleInputChange} />
              {formData.college_email && !formData.college_email.endsWith('@mkce.ac.in') && (
                <p className="mt-2 text-sm text-red-600 font-medium">Please use your official @mkce.ac.in mail id.</p>
              )}
            </div>
            <div className="w-full min-w-0">
              <label htmlFor="phone_number" className="block text-sm font-bold text-gray-900 mb-2 truncate">Phone Number</label>
              <input type="tel" name="phone_number" id="phone_number" required placeholder="9876543210"
                className="block w-full min-w-0 bg-white text-black border-2 border-gray-400 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base placeholder-gray-500"
                value={formData.phone_number} onChange={handleInputChange} />
            </div>
          </div>
        </div>

        <hr className="border-gray-300 w-full" />

        {/* Step 2: Academic Info */}
        <div className="w-full">
          <h3 className="text-lg sm:text-xl font-extrabold text-black mb-5 flex items-center break-words w-full">
            <span className="bg-indigo-700 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm flex-shrink-0">2</span>
            Academic Information
          </h3>
          <div className="grid grid-cols-1 gap-y-6 sm:gap-y-8 gap-x-6 sm:grid-cols-2 w-full">
            <div className="w-full min-w-0">
              <label htmlFor="department_id" className="block text-sm font-bold text-gray-900 mb-2 truncate">Select Your Department</label>
              <select name="department_id" id="department_id" required
                className="block w-full min-w-0 bg-white text-black border-2 border-gray-400 rounded-lg shadow-sm py-3 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base cursor-pointer"
                value={formData.department_id} onChange={handleInputChange}>
                <option value="" disabled className="text-gray-900">-- Choose Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="text-black bg-white">{d.name} ({d.short_name})</option>
                ))}
              </select>
            </div>
            
            <div className="w-full min-w-0">
              <label htmlFor="year" className="block text-sm font-bold text-gray-900 mb-2 truncate">Select Your Year</label>
              <select name="year" id="year" required
                className="block w-full min-w-0 bg-white text-black border-2 border-gray-400 rounded-lg shadow-sm py-3 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm sm:text-base cursor-pointer"
                value={formData.year} onChange={handleInputChange}>
                <option value="" disabled className="text-gray-900">-- Choose Year --</option>
                <option value="1st Year" className="text-black bg-white">1st Year</option>
                <option value="2nd Year" className="text-black bg-white">2nd Year</option>
                <option value="3rd Year" className="text-black bg-white">3rd Year</option>
              </select>
            </div>

            <div className="sm:col-span-2 w-full min-w-0 bg-gray-100 p-5 sm:p-6 rounded-xl border-2 border-gray-300 mt-2">
              <span className="block text-base sm:text-lg font-bold text-black mb-4 truncate">Are you a Japanese student?</span>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-10 w-full">
                <label className="flex items-center cursor-pointer min-w-0">
                  <input type="radio" name="is_japanese_student" value="true" required
                    checked={formData.is_japanese_student === true} onChange={handleInputChange}
                    className="focus:ring-indigo-600 h-6 w-6 text-indigo-700 border-gray-400 cursor-pointer flex-shrink-0" />
                  <span className="ml-3 text-base sm:text-lg font-bold text-gray-900 truncate">Yes, I am</span>
                </label>
                <label className="flex items-center cursor-pointer min-w-0">
                  <input type="radio" name="is_japanese_student" value="false" required
                    checked={formData.is_japanese_student === false} onChange={handleInputChange}
                    className="focus:ring-indigo-600 h-6 w-6 text-indigo-700 border-gray-400 cursor-pointer flex-shrink-0" />
                  <span className="ml-3 text-base sm:text-lg font-bold text-gray-900 truncate">No, I am not</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Step 3: Club Selection */}
        {formData.department_id && (
          <>
            <hr className="border-gray-300 w-full" />
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
              <h3 className="text-lg sm:text-xl font-extrabold text-black mb-5 flex items-center break-words w-full">
                <span className="bg-indigo-700 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm flex-shrink-0">3</span>
                Select Your Club
              </h3>
              <p className="text-sm sm:text-base font-medium text-blue-900 mb-6 bg-blue-100 p-4 rounded-lg border-2 border-blue-300 shadow-sm break-words w-full">
                You can select exactly ONE club. Availability is strictly based on seats allocated to your department.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full">
                {availableClubs.map(club => {
                  const avail = availability[club.id]
                  const isFull = avail ? avail.remaining <= 0 : false
                  const isSelected = formData.club_id === club.id

                  return (
                    <label key={club.id} 
                      className={`relative w-full min-w-0 rounded-xl border-2 p-4 sm:p-5 flex flex-col cursor-pointer transition-all duration-200 shadow-sm
                        ${isSelected ? 'bg-indigo-100 border-indigo-700 ring-2 ring-indigo-700 transform sm:scale-[1.02]' : 'bg-white border-gray-400 hover:border-indigo-400 hover:shadow-md'}
                        ${isFull && !isSelected ? 'opacity-60 bg-gray-200 border-gray-300 cursor-not-allowed hover:border-gray-300 hover:shadow-none transform-none' : ''}
                      `}>
                      <div className="flex items-start justify-between w-full min-w-0">
                        <div className="flex items-center w-full min-w-0">
                          <input type="radio" name="club_id" value={club.id} required
                            disabled={isFull}
                            checked={isSelected} onChange={handleInputChange}
                            className="mt-1 h-5 w-5 text-indigo-700 border-gray-400 focus:ring-indigo-600 disabled:opacity-50 cursor-pointer flex-shrink-0" />
                          <span className="ml-3 sm:ml-4 block text-base sm:text-lg font-extrabold text-black break-words min-w-0">
                            {club.name}
                          </span>
                        </div>
                      </div>
                      {avail && (
                        <div className="mt-4 ml-8 sm:ml-9 flex flex-col xl:flex-row xl:justify-between xl:items-center bg-white/80 rounded-md p-2 border border-gray-200 gap-2 w-[calc(100%-2rem)]">
                          <span className="text-xs sm:text-sm font-bold text-gray-700 truncate">Capacity: {avail.registered} / {avail.capacity}</span>
                          {isFull ? (
                            <span className="inline-flex self-start items-center px-2 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider bg-red-200 text-red-900 border border-red-300 flex-shrink-0">
                              CLOSED
                            </span>
                          ) : (
                            <span className={`inline-flex self-start items-center px-2 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider border flex-shrink-0 ${avail.remaining <= 5 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-green-100 text-green-900 border-green-300'}`}>
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
            className="w-full flex justify-center py-3 sm:py-4 px-4 sm:px-8 border border-transparent shadow-xl text-base sm:text-lg font-extrabold rounded-xl text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0 break-words whitespace-normal">
            {submitting ? 'Processing Registration...' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </div>
  )
}
