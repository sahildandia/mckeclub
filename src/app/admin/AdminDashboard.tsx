'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AdminData, Club } from '@/types'
import { Download, RefreshCw, Users, Armchair, CircleCheck, CircleAlert, Search, ClipboardList } from 'lucide-react'

import { getAdminData } from './actions'

export default function AdminDashboard({ session }: { session: Session }) {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClub, setSelectedClub] = useState('')
  const [exportClub, setExportClub] = useState('')
  const [search, setSearch] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await getAdminData(session.access_token)
      if (res.success && res.data) {
        setData(res.data)
        setUpdatedAt(new Date())
      } else {
        setError(res.error || "Failed to fetch dashboard data.")
      }
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred while fetching data.")
    } finally {
      setLoading(false)
    }
  }, [session.access_token])

  useEffect(() => {
    const timer = setTimeout(() => { void fetchData() }, 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  if (loading && !data) return <div className="admin-loading" role="status"><RefreshCw size={20} className="admin-spin" /> Loading registrations and seat allocations…</div>
  if (!data) return <div className="admin-error" role="alert">{error || 'Unable to load dashboard.'} <button className="admin-button" onClick={fetchData}>Try again</button></div>

  // Calculate metrics
  const totalRegistrations = data.registrations.length

  // Normal clubs are those not japanese only and not aws only
  const normalClubs = data.clubs.filter((c) => !c.is_japanese_only && !c.is_aws_only)
  const normalClubIds = normalClubs.map((c) => c.id)

  const normalCapacities = data.capacities.filter((c) => normalClubIds.includes(c.club_id))
  const totalNormalCapacity = normalCapacities.reduce((sum, c) => sum + c.capacity, 0)

  const normalRegistrations = data.registrations.filter((r) => normalClubIds.includes(r.club_id) && r.status === 'ACCEPTED')
  const totalNormalRemaining = totalNormalCapacity - normalRegistrations.length


  // Matrix calculation
  const matrix: Record<string, { club: Club; departments: Record<string, { capacity: number; registered: number; remaining: number; status: string }> }> = {}
  normalClubs.forEach((club) => {
    matrix[club.id] = { club, departments: {} }
    data.departments.forEach((dept) => {
      const cap = data.capacities.find((c) => c.club_id === club.id && c.department_id === dept.id)?.capacity || 0
      const reg = normalRegistrations.filter((r) => r.club_id === club.id && r.department_id === dept.id).length
      matrix[club.id].departments[dept.id] = {
        capacity: cap,
        registered: reg,
        remaining: cap - reg,
        status: cap - reg <= 0 ? 'Full' : 'Available'
      }
    })
  })

  let fullCombos = 0
  Object.values(matrix).forEach((clubData) => {
    Object.values(clubData.departments).forEach((deptData) => {
      if (deptData.status === 'Full' && deptData.capacity > 0) fullCombos++
    })
  })

  const exportCSV = (clubId?: string) => {
    const headers = ['Name', 'Register Number', 'Official college mail id', 'Phone', 'Department', 'Year', 'Japanese Student', 'AWS Interested', 'Club', 'Status', 'Confirmation ID', 'Registration Date']

    const filteredRegistrations = clubId
      ? data.registrations.filter((r) => r.club_id === clubId)
      : data.registrations

    const rows = filteredRegistrations.map((r) => [
      r.student_name,
      r.register_number,
      r.college_email,
      r.phone_number,
      r.departments?.name,
      r.year,
      r.is_japanese_student ? 'Yes' : 'No',
      r.is_aws_interested ? 'Yes' : 'No',
      r.clubs?.name,
      r.status,
      r.confirmation_id,
      new Date(r.created_at).toLocaleString()
    ])

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map((e) => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(",")).join("\n")

    const clubName = clubId ? data.clubs.find((c) => c.id === clubId)?.name.replace(/\s+/g, '_') : 'all'

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `registrations_${clubName}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const activeClub = normalClubs.find(club => club.id === selectedClub) || normalClubs[0]
  const activeStats = activeClub ? matrix[activeClub.id].departments : {}
  const activeCapacity = Object.values(activeStats).reduce((sum, row) => sum + row.capacity, 0)
  const activeRegistered = Object.values(activeStats).reduce((sum, row) => sum + row.registered, 0)
  const recentRegistrations = data.registrations.slice(0, 50)
  const query = search.trim().toLowerCase()
  const visibleRegistrations = recentRegistrations.filter(row =>
    [row.student_name, row.register_number, row.departments?.short_name, row.clubs?.name]
      .some(value => value?.toLowerCase().includes(query)))
  const metrics = [
    { label: 'Total registrations', value: totalRegistrations, note: 'Across all clubs', icon: Users },
    { label: 'Allocated seats', value: totalNormalCapacity, note: 'Department-based quotas', icon: Armchair },
    { label: 'Available seats', value: totalNormalRemaining, note: 'In clubs with seat limits', icon: CircleCheck, accent: true },
    { label: 'Full quotas', value: fullCombos, note: 'Club and department combinations', icon: CircleAlert },
  ]

  return (
    <div>
      <div className="admin-toolbar">
        <p className="admin-muted"><span className="admin-status-dot" />{updatedAt ? `Updated at ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Registration overview'}</p>
        <button className="admin-button" onClick={fetchData} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'admin-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      <div className="admin-metrics">
        {metrics.map(metric => <div key={metric.label} className={`admin-metric ${metric.accent ? 'admin-metric-accent' : ''}`}>
          <div className="admin-metric-label"><span>{metric.label}</span><metric.icon size={17} aria-hidden="true" /></div>
          <span className="admin-metric-number">{metric.value.toLocaleString()}</span>
          <p className="admin-metric-note">{metric.note}</p>
        </div>)}
      </div>

      <div className="admin-workspace">
        <section className="admin-panel" aria-labelledby="capacity-heading">
          <div className="admin-panel-heading">
            <div><h2 id="capacity-heading">Seat allocation</h2><p>Compare availability across departments.</p></div>
            <label className="sr-only" htmlFor="capacity-club">Club for seat allocation</label>
            <select id="capacity-club" className="admin-control admin-club-select" value={activeClub?.id || ''} onChange={e => setSelectedClub(e.target.value)}>
              {normalClubs.map(club => <option value={club.id} key={club.id}>{club.name === 'Communication Club' ? 'LEXORA (Communication Club)' : club.name}</option>)}
            </select>
          </div>
          {activeClub ? <>
            <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Department seat allocation">
              <table className="admin-table">
                <thead><tr><th scope="col">Department</th><th scope="col" className="admin-number">Seats</th><th scope="col" className="admin-number">Registered</th><th scope="col" className="admin-number">Available</th><th scope="col">Status</th></tr></thead>
                <tbody>{data.departments.map(dept => {
                  const row = activeStats[dept.id]
                  return <tr key={dept.id}>
                    <th scope="row" style={{ background: 'transparent', color: 'var(--admin-ink)', fontSize: 13 }} title={dept.name}>{dept.short_name}</th>
                    <td className="admin-number">{row.capacity}</td><td className="admin-number">{row.registered}</td>
                    <td className="admin-number" style={{ fontWeight: 600 }}>{Math.max(0, row.remaining)}</td>
                    <td><span className={`admin-badge ${row.remaining <= 0 ? 'admin-badge-full' : row.remaining <= 3 ? 'admin-badge-low' : ''}`}>{row.capacity === 0 ? 'Not allocated' : row.remaining <= 0 ? 'Full' : row.remaining <= 3 ? 'Filling up' : 'Available'}</span></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
            <div className="admin-panel-footer">{activeRegistered.toLocaleString()} registered · {activeCapacity.toLocaleString()} allocated seats · {Math.max(0, activeCapacity - activeRegistered).toLocaleString()} available</div>
          </> : <div className="admin-empty">No club allocations available.</div>}
        </section>

        <section className="admin-panel admin-export" aria-labelledby="export-heading">
          <h2 id="export-heading">Export registrations</h2>
          <p>Download student details as a CSV file for your records.</p>
          <button className="admin-button admin-button-primary" style={{ marginTop: 20 }} onClick={() => exportCSV()}><Download size={16} /> Export all registrations</button>
          <div className="admin-export-divider" />
          <label htmlFor="export-club" className="admin-field-label">Export a specific club</label>
          <select id="export-club" className="admin-control" value={exportClub} onChange={e => setExportClub(e.target.value)}>
            <option value="">Choose a club</option>
            {data.clubs.filter(club => !club.is_aws_only).map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
          </select>
          <button className="admin-button" disabled={!exportClub} onClick={() => exportCSV(exportClub)}><Download size={16} /> Export selected club</button>
          <div className="admin-note"><strong>Seats are allocated by department</strong>Year does not affect club quotas. Japanese Club registrations are separate from the seat totals above.</div>
        </section>
      </div>

      <section className="admin-panel" aria-labelledby="registrations-heading">
        <div className="admin-panel-heading">
          <div><h2 id="registrations-heading">Recent registrations</h2><p>Latest {recentRegistrations.length} of {totalRegistrations.toLocaleString()} registrations.</p></div>
          <div className="admin-search"><Search size={16} aria-hidden="true" /><label htmlFor="registration-search" className="sr-only">Search the latest 50 registrations</label><input id="registration-search" className="admin-control" placeholder="Search name, register no. or club" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        {visibleRegistrations.length ? <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Latest registrations">
          <table className="admin-table">
            <thead><tr><th scope="col">Student</th><th scope="col">Register number</th><th scope="col">Department</th><th scope="col">Club</th><th scope="col">Status</th><th scope="col">Registered</th></tr></thead>
            <tbody>{visibleRegistrations.map(reg => <tr key={reg.id}>
              <td style={{ fontWeight: 600 }}>{reg.student_name}</td><td style={{ fontFamily: 'monospace', color: 'var(--admin-muted)' }}>{reg.register_number}</td><td>{reg.departments?.short_name || '—'}</td><td>{reg.clubs?.name || '—'}</td>
              <td><span className={`admin-badge ${reg.status !== 'ACCEPTED' ? 'admin-badge-full' : ''}`}>{reg.status.charAt(0) + reg.status.slice(1).toLowerCase()}</span></td>
              <td className="admin-muted">{new Date(reg.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</td>
            </tr>)}</tbody>
          </table>
        </div> : <div className="admin-empty"><ClipboardList size={30} aria-hidden="true" /><strong>{query ? 'No matching registrations' : 'No registrations yet'}</strong><p>{query ? 'Try another name or register number within the latest 50 records.' : 'New student registrations will appear here. Refresh to check for updates.'}</p></div>}
        <div className="admin-panel-footer">Showing {visibleRegistrations.length} of the latest {recentRegistrations.length} records. Export all registrations to download the complete list.</div>
      </section>
    </div>
  )
}
