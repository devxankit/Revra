import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Employee_navbar from '../../DEV-components/Employee_navbar'
import { employeeService } from '../../DEV-services'
import { gradients } from '../../../../lib/colors'
import {
  FiUsers as Users,
  FiUser as User,
  FiMail as Mail,
  FiPhone as Phone,
  FiBriefcase as Briefcase,
  FiLoader as Loader,
  FiAlertCircle as AlertCircle,
  FiArrowLeft as ArrowLeft
} from 'react-icons/fi'

const getInitials = (name) => {
  if (!name) return '?'
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'
}

const Employee_my_team = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamLead, setTeamLead] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamStats, setTeamStats] = useState({ totalMembers: 0 })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await employeeService.getMyTeam()
        if (!isMounted) return
        if (response?.success && response?.data) {
          setTeamLead(response.data.teamLead || null)
          setTeamMembers(response.data.teamMembers || [])
          setTeamStats(response.data.teamStats || { totalMembers: 0 })
        } else {
          setError('Could not load team data.')
        }
      } catch (err) {
        if (!isMounted) return
        const msg = err.response?.data?.message || err.message || 'Failed to load team'
        setError(msg)
        if (err.response?.status === 403) {
          setTeamLead(null)
          setTeamMembers([])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Employee_navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="text-gray-600">Loading your team...</p>
        </div>
      </div>
    )
  }

  if (error && !teamLead) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Employee_navbar />
        <div className="max-w-xl mx-auto px-4 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Not a team lead</h2>
            <p className="text-gray-600 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">Only team leads can view their team here.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Employee_navbar />

      <div className="max-w-xl mx-auto px-4 pt-4 pb-8">
        {/* Header */}
        <div
          className="rounded-2xl p-6 mb-6 text-white shadow-lg"
          style={{ background: gradients.primary }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">My Team</h1>
              <p className="text-white/90 text-sm">
                {teamStats.totalMembers} member{teamStats.totalMembers !== 1 ? 's' : ''} in your team
              </p>
            </div>
          </div>
          {teamLead && (
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">You (Team Lead)</p>
              <p className="font-medium">{teamLead.name}</p>
              <p className="text-sm text-white/90">{teamLead.position} · {teamLead.department}</p>
            </div>
          )}
        </div>

        {/* Team members list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            Team Members
          </h2>
          {teamMembers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No team members assigned yet.</p>
            </div>
          ) : (
            teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-teal-700 font-semibold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)' }}
                >
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {member.position}
                    {member.department && ` · ${member.department}`}
                  </p>
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1 mt-1"
                    >
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </a>
                  )}
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="text-xs text-gray-500 hover:text-teal-600 flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="w-3 h-3" />
                      {member.phone}
                    </a>
                  )}
                  {member.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Employee_my_team
