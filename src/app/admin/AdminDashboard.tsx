'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, RefreshCw } from 'lucide-react'

export default function AdminDashboard({ session }: { session: any }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch all needed data
    const [deptRes, clubRes, capRes, regRes] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('clubs').select('*').order('name'),
      supabase.from('club_department_capacities').select('*'),
      supabase.from('registrations').select(`
        *,
        departments(name, short_name),
        clubs(name)
      `).order('created_at', { ascending: false })
    ])

    if (deptRes.error || clubRes.error || capRes.error || regRes.error) {
      console.error("Error fetching data")
      setLoading(false)
      return
    }

    const departments = deptRes.data || []
    const clubs = clubRes.data || []
    const capacities = capRes.data || []
    const registrations = regRes.data || []

    setData({ departments, clubs, capacities, registrations })
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading || !data) return <div className="text-center py-10">Loading dashboard...</div>

  // Calculate metrics
  const totalRegistrations = data.registrations.length
  
  // Normal clubs are those not japanese only
  const normalClubs = data.clubs.filter((c: any) => !c.is_japanese_only)
  const normalClubIds = normalClubs.map((c: any) => c.id)
  
  const normalCapacities = data.capacities.filter((c: any) => normalClubIds.includes(c.club_id))
  const totalNormalCapacity = normalCapacities.reduce((sum: number, c: any) => sum + c.capacity, 0)
  
  const normalRegistrations = data.registrations.filter((r: any) => normalClubIds.includes(r.club_id) && r.status === 'ACCEPTED')
  const totalNormalRemaining = totalNormalCapacity - normalRegistrations.length

  const japaneseRegistrations = data.registrations.filter((r: any) => !normalClubIds.includes(r.club_id))

  // Matrix calculation
  const matrix: any = {}
  normalClubs.forEach((club: any) => {
    matrix[club.id] = { club, departments: {} }
    data.departments.forEach((dept: any) => {
      const cap = data.capacities.find((c: any) => c.club_id === club.id && c.department_id === dept.id)?.capacity || 0
      const reg = normalRegistrations.filter((r: any) => r.club_id === club.id && r.department_id === dept.id).length
      matrix[club.id].departments[dept.id] = {
        capacity: cap,
        registered: reg,
        remaining: cap - reg,
        status: cap - reg <= 0 ? 'Full' : 'Available'
      }
    })
  })

  let fullCombos = 0
  Object.values(matrix).forEach((clubData: any) => {
    Object.values(clubData.departments).forEach((deptData: any) => {
      if (deptData.status === 'Full' && deptData.capacity > 0) fullCombos++
    })
  })

  const exportCSV = (clubId?: string) => {
    const headers = ['Name', 'Register Number', 'College ID', 'Phone', 'Department', 'Year', 'Japanese Student', 'Club', 'Status', 'Confirmation ID', 'Registration Date']
    
    const filteredRegistrations = clubId 
      ? data.registrations.filter((r: any) => r.club_id === clubId)
      : data.registrations

    const rows = filteredRegistrations.map((r: any) => [
      r.student_name,
      r.register_number,
      r.college_email,
      r.phone_number,
      r.departments?.name,
      r.year,
      r.is_japanese_student ? 'Yes' : 'No',
      r.clubs?.name,
      r.status,
      r.confirmation_id,
      new Date(r.created_at).toLocaleString()
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map((e: any[]) => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(",")).join("\n")

    const clubName = clubId ? data.clubs.find((c: any) => c.id === clubId)?.name.replace(/\s+/g, '_') : 'all'

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `registrations_${clubName}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Registrations</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalRegistrations}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Normal Capacity</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalNormalCapacity}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Remaining Normal Seats</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{totalNormalRemaining}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Full Combinations</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{fullCombos}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Capacity Matrix</h2>
        <button onClick={fetchData} className="flex items-center text-sm text-indigo-600 hover:text-indigo-800">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </button>
      </div>

      {/* Matrix */}
      {normalClubs.map((club: any) => {
        const cData = matrix[club.id]
        
        let clubTotalCap = 0
        let clubTotalReg = 0
        Object.values(cData.departments).forEach((d: any) => {
          clubTotalCap += d.capacity
          clubTotalReg += d.registered
        })

        return (
          <div key={club.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{club.name}</h3>
              <div className="text-sm text-gray-500">
                Total: {clubTotalReg} / {clubTotalCap} ({clubTotalCap - clubTotalReg} remaining)
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.departments.map((dept: any) => {
                    const stats = cData.departments[dept.id]
                    return (
                      <tr key={dept.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dept.short_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{stats.capacity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{stats.registered}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                          <span className={stats.remaining <= 3 && stats.remaining > 0 ? "text-amber-600" : (stats.remaining === 0 ? "text-red-600" : "text-green-600")}>
                            {stats.remaining}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center border-l">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stats.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {stats.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Export Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Export Club Data</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => exportCSV()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            <Download className="h-4 w-4 mr-2" /> All Registrations
          </button>
          {data.clubs.map((club: any) => (
            <button key={club.id} onClick={() => exportCSV(club.id)} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2 text-gray-400" /> {club.name}
            </button>
          ))}
        </div>
      </div>

      {/* Registrations List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Registrations</h3>
          <button onClick={() => exportCSV()} className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
            <Download className="h-4 w-4 mr-1" /> Export All CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.registrations.slice(0, 50).map((reg: any) => (
                <tr key={reg.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reg.student_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.register_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.departments?.short_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{reg.clubs?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(reg.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.registrations.length > 50 && (
            <div className="px-6 py-3 text-sm text-gray-500 text-center border-t border-gray-200">
              Showing 50 most recent registrations. Export CSV for all records.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
