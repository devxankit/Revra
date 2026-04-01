import React, { useEffect, useState, useMemo } from 'react'
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
    FiArrowLeft as ArrowLeft,
    FiFolder as Folder,
    FiPieChart as PieChart,
    FiCalendar as Calendar,
    FiTrendingUp as TrendingUp,
    FiGrid as Grid,
    FiList as List
} from 'react-icons/fi'

const getInitials = (name) => {
    if (!name) return '?'
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'
}

const Employee_team_management = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [teamLead, setTeamLead] = useState(null)
    const [teamMembers, setTeamMembers] = useState([])
    const [projects, setProjects] = useState([])
    const [teamStats, setTeamStats] = useState({ totalMembers: 0, activeProjects: 0 })
    const [activeTab, setActiveTab] = useState('overview')

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
                    setProjects(response.data.projects || [])
                    setTeamStats(response.data.teamStats || { totalMembers: 0, activeProjects: 0 })
                } else {
                    setError('Could not load team data.')
                }
            } catch (err) {
                if (!isMounted) return
                const msg = err.response?.data?.message || err.message || 'Failed to load team'
                setError(msg)
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        load()
        return () => { isMounted = false }
    }, [])

    // Aggregated stats for Overview
    const projectStatsList = [
        { label: 'Active', count: projects.filter(p => !['completed', 'cancelled'].includes(p.status)).length, color: 'text-teal-600', bg: 'bg-teal-50' },
        { label: 'Testing', count: projects.filter(p => p.status === 'testing').length, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Completed', count: projects.filter(p => p.status === 'completed').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'On Hold', count: projects.filter(p => p.status === 'on-hold').length, color: 'text-amber-600', bg: 'bg-amber-50' }
    ];

    const departmentDistribution = teamMembers.reduce((acc, m) => {
        const dept = m.department || 'General';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
    }, {});

    const topSkills = [...new Set(teamMembers.flatMap(m => m.skills || []))].slice(0, 10);

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200'
            case 'active': return 'bg-teal-100 text-teal-700 border-teal-200'
            case 'planning': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'on-hold': return 'bg-amber-100 text-amber-700 border-amber-200'
            default: return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
                <Employee_navbar />
                <main className="pt-16 pb-24 md:pt-20 md:pb-8">
                    <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
                        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                            <Loader className="w-10 h-10 text-teal-600 animate-spin" />
                            <p className="text-gray-600 font-medium">Loading team management dashboard...</p>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    if (error && !teamLead) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
                <Employee_navbar />
                <main className="pt-16 pb-24 md:pt-20 md:pb-8">
                    <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
                        <div className="max-w-xl mx-auto pt-6">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-bold mb-6 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Back
                            </button>
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center">
                                <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-100">
                                    <AlertCircle className="w-10 h-10 text-amber-600" />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 mb-3">Access Restricted</h2>
                                <p className="text-gray-600 font-medium">{error}</p>
                                <p className="text-gray-500 text-xs mt-4 font-bold uppercase tracking-widest">Only assigned team leads can view this page.</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
            <Employee_navbar />
            <main className="pt-16 pb-24 md:pt-20 md:pb-8">
                <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
                    {/* Header Section */}
                    <div
                        className="relative overflow-hidden rounded-[2rem] p-8 mb-6 text-white shadow-xl border border-white/10"
                        style={{ background: gradients.primary }}
                    >
                        {/* Subtle Background pattern */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />

                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">Team Management</h1>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />
                                            <p className="text-teal-50 font-bold text-sm">Managing {teamStats.totalMembers} Members</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />
                                            <p className="text-teal-50 font-bold text-sm">{teamStats.activeProjects} Active Projects</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 flex items-center gap-4">
                                <div className="w-11 h-11 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-white shadow-sm">
                                    <span className="text-sm font-black text-gray-800">{getInitials(teamLead?.name)}</span>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-teal-100 uppercase tracking-widest mb-0.5 opacity-80">Team Lead</p>
                                    <p className="font-black text-sm leading-none">{teamLead?.name}</p>
                                </div>
                                <div className="h-8 w-px bg-white/10 mx-1" />
                                <div>
                                    <p className="text-[9px] font-black text-teal-100 uppercase tracking-widest mb-0.5 opacity-80">Scope</p>
                                    <p className="font-extrabold text-[12px]">{teamLead?.department || 'Operations'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex p-1 bg-gray-200/50 rounded-xl border border-gray-200 mb-6 max-w-sm mx-auto md:mx-0 backdrop-blur-sm">
                        {[
                            { id: 'overview', label: 'Overview', icon: PieChart },
                            { id: 'members', label: 'Team', icon: Users },
                            { id: 'projects', label: 'Projects', icon: Folder }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all duration-300 font-black text-[10px] uppercase tracking-wider ${activeTab === tab.id
                                    ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                    }`}
                            >
                                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-teal-600' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Section */}
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Project Statistics Card */}
                                <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-gray-200/30 border border-gray-100">
                                    <h3 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
                                        <div className="p-1.5 bg-teal-50 rounded-lg">
                                            <TrendingUp className="w-4 h-4 text-teal-600" />
                                        </div>
                                        Project Statistics
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {projectStatsList.map((stat) => (
                                            <div key={stat.label} className={`p-4 ${stat.bg} rounded-2xl border border-black/5`}>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                                <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Team Load Factor</span>
                                            <span className="text-xs font-black text-teal-700">
                                                {teamMembers.length > 0 ? (projects.length / teamMembers.length).toFixed(1) : '0'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${Math.min((projects.length / (teamMembers.length || 1)) * 20, 100)}%` }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Team Overview Card */}
                                <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/20 border border-gray-100 md:col-span-2 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

                                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-teal-600 rounded-2xl shadow-lg shadow-teal-600/20">
                                                <Users className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Team Overview</h3>
                                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-0.5">Composition & Capability</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-8 px-6 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Squad Size</p>
                                                <p className="text-xl font-black text-teal-700">{teamMembers.length}</p>
                                            </div>
                                            <div className="w-px h-8 bg-gray-200 self-center" />
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Departments</p>
                                                <p className="text-xl font-black text-gray-900">{Object.keys(departmentDistribution).length}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-6">
                                                <div className="w-2 h-6 bg-teal-500 rounded-full" />
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Departmental Distribution</p>
                                            </div>
                                            <div className="space-y-4">
                                                {Object.entries(departmentDistribution).map(([dept, count]) => (
                                                    <div key={dept} className="flex items-center justify-between group/item">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-gray-200 text-teal-600 font-bold shadow-sm transition-transform group-hover/item:scale-110">
                                                                {dept[0]}
                                                            </div>
                                                            <span className="text-sm font-extrabold text-gray-700 tracking-tight">{dept}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-1.5 w-full max-w-[200px] bg-gray-200 rounded-full overflow-hidden hidden sm:block">
                                                                <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(count / teamMembers.length) * 100}%` }} />
                                                            </div>
                                                            <span className="text-xs font-black text-teal-700 bg-white px-3 py-1 rounded-lg border border-teal-100 shadow-sm min-w-[32px] text-center">{count}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'members' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {teamMembers.length === 0 ? (
                                    <div className="col-span-full bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-12 text-center">
                                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-black text-gray-900 mb-1">Empty Roster</h3>
                                        <p className="text-gray-500 text-xs max-w-xs mx-auto">No developers assigned.</p>
                                    </div>
                                ) : (
                                    teamMembers.map((member) => {
                                        const memberProjectCount = projects.filter(p =>
                                            p.assignedTeam?.some(id => id === member.id || id === member._id)
                                        ).length;

                                        return (
                                            <div
                                                key={member.id}
                                                className="group bg-white rounded-[1.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 p-5 hover:border-teal-200 transition-all duration-300 relative overflow-hidden"
                                            >
                                                {/* Background Accent */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full blur-3xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />

                                                <div className="relative flex items-center justify-between gap-4 mb-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div
                                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-teal-700 text-sm font-black flex-shrink-0 shadow-md border border-white"
                                                            style={{ background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)' }}
                                                        >
                                                            {getInitials(member.name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{member.name}</h4>
                                                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                                <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[7px] font-black uppercase tracking-widest rounded-md border border-teal-100">
                                                                    {member.position}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[7px] font-black uppercase tracking-widest rounded-md border border-gray-100">
                                                                    {member.department || 'General'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="relative grid grid-cols-2 gap-3 mb-4">
                                                    <div className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100">
                                                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">Missions</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 bg-white rounded-md border border-teal-100">
                                                                <Folder className="w-2.5 h-2.5 text-teal-600" />
                                                            </div>
                                                            <p className="text-xs font-black text-gray-900">{memberProjectCount} Projects</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100">
                                                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                                            <p className="text-[10px] font-black text-gray-700">Active</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="relative flex items-center justify-between pt-4 border-t border-gray-100 gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <a href={`mailto:${member.email}`} className="p-1.5 bg-gray-50 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all border border-gray-100 hover:border-teal-100">
                                                            <Mail className="w-3.5 h-3.5" />
                                                        </a>
                                                        <a href={`tel:${member.phone}`} className="p-1.5 bg-gray-50 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all border border-gray-100 hover:border-teal-100">
                                                            <Phone className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {member.skills?.slice(0, 2).map((s) => (
                                                            <span key={s} className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100">
                                                                {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {projects.length === 0 ? (
                                    <div className="col-span-full bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-12 text-center">
                                        <Folder className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-black text-gray-900 mb-1">No Missions</h3>
                                        <p className="text-gray-500 text-xs mx-auto">Zero active projects.</p>
                                    </div>
                                ) : (
                                    projects.map((project) => (
                                        <div
                                            key={project._id}
                                            onClick={() => navigate(`/employee-project/${project._id}`)}
                                            className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-[0.98]"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-start space-x-3 flex-1">
                                                    <div className="p-2.5 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl group-hover:from-teal-100 group-hover:to-teal-200 transition-all duration-300 border border-teal-100/50">
                                                        <Folder className="h-5 w-5 text-teal-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between mb-1.5">
                                                            <h3 className="text-base font-black text-gray-900 leading-tight group-hover:text-teal-700 transition-colors duration-300 uppercase tracking-tight truncate">{project.name}</h3>
                                                        </div>
                                                        <div className="flex items-center space-x-1.5 mb-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(project.status)}`}>{project.status}</span>
                                                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200">{project.priority || 'NORMAL'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">
                                                {project.description || 'No description provided for this mission.'}
                                            </p>

                                            <div className="mb-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Progress</span>
                                                    <span className="text-xs font-black text-teal-700">{project.progress || 0}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden border border-gray-200/50">
                                                    <div
                                                        className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                                                        style={{ width: `${project.progress || 0}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex items-center space-x-1 text-gray-400 group-hover:text-teal-600 transition-colors">
                                                        <Users className="h-3.5 w-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-tight">{project.teamSize || 0} Devs</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1 text-gray-400 group-hover:text-amber-600 transition-colors">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-tight">{project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-black text-teal-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Details →
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default Employee_team_management
