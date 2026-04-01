import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Users,
    TrendingUp,
    DollarSign,
    Activity,
    CheckCircle,
    Clock,
    ArrowRight,
    Wallet,
    Bell,
    Phone,
    Mail,
    Plus,
    Share2,
    FileText,
    PlayCircle,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react'
import CP_navbar from '../CP-components/CP_navbar'
import { cpDashboardService } from '../CP-services/cpDashboardService'
import { cpLeadService } from '../CP-services/cpLeadService'
import { cpAuthService } from '../CP-services/cpAuthService'
import { cpNotificationService } from '../CP-services/cpNotificationService'
import { cpRewardService } from '../CP-services/cpRewardService'
import { useToast } from '../../../contexts/ToastContext'

// --- Premium Components ---

const CountUp = ({ value, duration = 2, prefix = '', suffix = '', className = '' }) => {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value
    const spring = useSpring(0, { duration: duration * 1000, bounce: 0 })
    const displayValue = useTransform(spring, (current) =>
        prefix + Math.floor(current).toLocaleString() + suffix
    )

    useEffect(() => {
        spring.set(numericValue)
    }, [spring, numericValue])

    return <motion.span className={className}>{displayValue}</motion.span>
}

const DashboardSkeleton = () => (
    <div className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
                <div className="h-6 w-32 bg-gray-200 rounded-lg"></div>
                <div className="h-4 w-24 bg-gray-100 rounded-lg"></div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
        </div>
        <div className="h-48 bg-gray-200 rounded-[24px]"></div>
        <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-[24px]"></div>)}
        </div>
        <div className="flex gap-3 overflow-hidden"><div className="w-full h-24 bg-gray-200 rounded-xl"></div></div>
    </div>
)

const CP_dashboard = () => {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        wallet: { balance: 0 },
        leads: { total: 0, converted: 0, pending: 0 },
        clients: { total: 0 },
        revenue: { total: 0 }
    })
    const [sharedLeadsCount, setSharedLeadsCount] = useState(0)
    const [recentActivity, setRecentActivity] = useState([])
    const [salesManager, setSalesManager] = useState(null)
    const [unreadNotifications, setUnreadNotifications] = useState(0)
    const [recentNotifications, setRecentNotifications] = useState([])
    const [performanceMetrics, setPerformanceMetrics] = useState({
        currentLevel: 'Bronze Partner',
        nextLevel: 'Silver Partner',
        progress: 0,
        totalConversions: 0
    })

    // Helper function to get initials from name
    const getInitials = (name) => {
        if (!name) return 'SM';
        return name
            .split(' ')
            .filter(Boolean)
            .map((segment) => segment[0]?.toUpperCase())
            .join('')
            .slice(0, 2) || 'SM';
    };

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true)
                
                // Fetch dashboard stats
                const statsResponse = await cpDashboardService.getDashboardStats()
                if (statsResponse.success && statsResponse.data) {
                    setDashboardData(statsResponse.data)
                }

                // Fetch shared leads count
                try {
                    const sharedResponse = await cpLeadService.getSharedLeadsWithSales({ limit: 1 })
                    if (sharedResponse.success) {
                        setSharedLeadsCount(sharedResponse.total || 0)
                    }
                } catch (err) {
                    console.error('Error fetching shared leads:', err)
                }

                // Fetch recent activity
                try {
                    const activityResponse = await cpDashboardService.getRecentActivity({ limit: 5 })
                    if (activityResponse.success && activityResponse.data) {
                        setRecentActivity(activityResponse.data.clients || [])
                    }
                } catch (err) {
                    console.error('Error fetching recent activity:', err)
                }

                // Fetch unread notifications count and recent notifications
                try {
                    const [unreadResponse, notificationsResponse] = await Promise.all([
                        cpNotificationService.getUnreadCount(),
                        cpNotificationService.getNotifications({ limit: 3 })
                    ])
                    
                    if (unreadResponse.success) {
                        setUnreadNotifications(unreadResponse.data?.unreadCount || 0)
                    }
                    
                    if (notificationsResponse.success && notificationsResponse.data) {
                        // Format notifications for display
                        const formatted = notificationsResponse.data.slice(0, 2).map(notif => ({
                            id: notif._id || notif.id,
                            title: notif.title,
                            message: notif.message,
                            isRead: notif.read || false,
                            path: notif.actionUrl || (notif.reference?.type === 'lead' && notif.reference?.id ? `/cp-lead-details/${notif.reference.id}` : null)
                        }))
                        setRecentNotifications(formatted)
                    }
                } catch (err) {
                    console.error('Error fetching notifications:', err)
                }

                // Fetch performance metrics for gamification card
                try {
                    const performanceResponse = await cpRewardService.getPerformanceMetrics()
                    if (performanceResponse.success && performanceResponse.data) {
                        setPerformanceMetrics({
                            currentLevel: performanceResponse.data.currentLevel || 'Bronze Partner',
                            nextLevel: performanceResponse.data.nextLevel || 'Silver Partner',
                            progress: performanceResponse.data.progress || 0,
                            totalConversions: performanceResponse.data.convertedLeads || 0
                        })
                    }
                } catch (err) {
                    console.error('Error fetching performance metrics:', err)
                }

                // Fetch CP profile to get sales team lead info
                try {
                    const profileResponse = await cpAuthService.getProfile()
                    if (profileResponse.success && profileResponse.data) {
                        const salesTeamLead = profileResponse.data.salesTeamLeadId;
                        if (salesTeamLead) {
                            // Format role for display
                            let displayRole = salesTeamLead.role || 'Sales Lead';
                            if (salesTeamLead.isTeamLead) {
                                displayRole = 'Senior Sales Lead';
                            } else if (displayRole && typeof displayRole === 'string') {
                                // Capitalize first letter of each word
                                displayRole = displayRole.split('_').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                ).join(' ');
                            }

                            // Format phone number (remove any non-digits, add country code if needed)
                            // Sales model uses 'phone', but we map it to 'phoneNumber' for consistency
                            let phoneNumber = salesTeamLead.phoneNumber || salesTeamLead.phone || '';
                            if (phoneNumber && !phoneNumber.startsWith('+')) {
                                // If it's a 10-digit Indian number, add +91
                                const cleanPhone = phoneNumber.replace(/\D/g, '');
                                if (cleanPhone.length === 10) {
                                    phoneNumber = `+91${cleanPhone}`;
                                } else {
                                    phoneNumber = cleanPhone;
                                }
                            }

                            setSalesManager({
                                id: salesTeamLead._id || salesTeamLead.id,
                                name: salesTeamLead.name || profileResponse.data.salesTeamLeadName || 'Sales Manager',
                                email: salesTeamLead.email || '',
                                phone: phoneNumber,
                                role: displayRole,
                                initials: getInitials(salesTeamLead.name || profileResponse.data.salesTeamLeadName)
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error fetching sales manager:', err)
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
                addToast('Failed to load dashboard data', 'error')
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [addToast])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F9F9]">
                <CP_navbar />
                <DashboardSkeleton />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 font-sans text-[#1E1E1E]">
            <CP_navbar />

            <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-8">

                {/* 1. Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-center"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hello, Partner</h1>
                        <p className="text-sm text-gray-500 font-medium">Let's grow together</p>
                    </div>
                </motion.div>

                {/* 2. Wallet Highlight Card (Premium Glassmorphism) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="relative overflow-hidden rounded-[28px] bg-[#1E1E1E] p-6 text-white shadow-xl shadow-indigo-900/10 group"
                >
                    {/* Animated Background */}
                    <div className="absolute top-[-50%] right-[-20%] w-[300px] h-[300px] bg-[#F6C453] rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
                    <div className="absolute bottom-[-30%] left-[-10%] w-[200px] h-[200px] bg-indigo-600 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>

                    {/* Noise Texture for Texture */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm"><Wallet className="w-3.5 h-3.5 text-[#F6C453]" /></span>
                                    <p className="text-gray-300 text-xs font-bold uppercase tracking-widest">Total Balance</p>
                                </div>
                                <h2 className="text-4xl font-bold tracking-tight text-white">
                                    <CountUp value={dashboardData.wallet?.balance || 0} prefix="₹ " />
                                </h2>
                            </div>
                            {/* Active Indicator */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold text-emerald-400">ACTIVE</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => navigate('/cp-wallet')}
                                className="flex-1 py-3.5 px-4 bg-[#F6C453] text-gray-900 rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowRight className="w-4 h-4" /> Withdraw
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => navigate('/cp-wallet')}
                                className="flex-1 py-3.5 px-4 bg-white/5 text-white rounded-2xl font-bold text-sm backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all"
                            >
                                History
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Quick Stats Grid (Modern Cards) */}
                <div>
                    <div className="flex justify-between items-center mb-5 px-1">
                        <h3 className="text-lg font-bold text-gray-900">Overview</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            {
                                label: 'Active Leads',
                                count: dashboardData.leads?.pending || 0,
                                icon: Activity,
                                color: 'text-blue-600',
                                bg: 'bg-blue-50',
                                path: '/cp-leads',
                                state: { activeTab: 'all', searchQuery: '' }
                            },
                            {
                                label: 'Total Leads',
                                count: dashboardData.leads?.total || 0,
                                icon: TrendingUp,
                                color: 'text-[#F6C453]',
                                bg: 'bg-orange-50',
                                path: '/cp-leads',
                                state: { activeTab: 'all', searchQuery: '' }
                            },
                            {
                                label: 'Shared Leads',
                                count: sharedLeadsCount,
                                icon: Share2,
                                color: 'text-purple-600',
                                bg: 'bg-purple-50',
                                path: '/cp-shared-leads'
                            },
                            {
                                label: 'Converted',
                                count: dashboardData.leads?.converted || 0,
                                icon: CheckCircle,
                                color: 'text-emerald-600',
                                bg: 'bg-emerald-50',
                                path: '/cp-converted'
                            },
                        ].map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * idx }}
                                whileHover={{ y: -4, shadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(stat.path, { state: stat.state })}
                                className={`${stat.bg} p-5 rounded-[24px] border border-transparent cursor-pointer relative overflow-hidden h-32 flex flex-col justify-between group`}
                            >
                                <div className="absolute right-[-10px] top-[-10px] opacity-5 transform rotate-12 scale-150 transition-transform group-hover:scale-125">
                                    <stat.icon className={`w-24 h-24 ${stat.color}`} />
                                </div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className={`w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center ${stat.color}`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-3xl font-bold text-gray-900 tracking-tight">
                                        <CountUp value={stat.count} />
                                    </span>
                                </div>
                                <div className="relative z-10">
                                    <p className={`text-sm font-bold ${stat.color.replace('text-', 'text-').replace('600', '800')}`}>{stat.label}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* 4. Quick Actions (Horizontal Scroll) */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-5 px-1">Quick Actions</h3>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-4">
                        {[
                            { label: 'Track', sub: 'Progress', icon: Activity, path: '/cp-converted', color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Resources', sub: 'Library', icon: FileText, path: '/cp-resources', color: 'text-orange-600', bg: 'bg-orange-50' },
                            { label: 'Quotes', sub: 'Create', icon: FileText, path: '/cp-quotations', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Demos', sub: 'Videos', icon: PlayCircle, path: '/cp-tutorials', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        ].map((action, idx) => (
                            <motion.button
                                key={idx}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + (0.05 * idx) }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(action.path)}
                                className="flex-none w-20 h-24 flex flex-col items-center justify-center gap-2"
                            >
                                <div className={`w-12 h-12 rounded-full ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <action.icon className={`w-6 h-6 ${action.color}`} />
                                </div>
                                <div className="text-center">
                                    <span className="block text-xs font-bold text-gray-900">{action.label}</span>
                                    <span className="block text-[10px] text-gray-400 font-medium mt-0.5">{action.sub}</span>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* 5. Alerts & Gamification */}
                <div className="grid gap-6">
                    {/* Recent Updates / Notifications */}
                    {(unreadNotifications > 0 || recentNotifications.length > 0) && (
                        <div className="bg-white rounded-[24px] p-1 border border-gray-100 shadow-sm">
                            <div className="p-4 flex items-center justify-between border-b border-gray-50 pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                    <h3 className="font-bold text-gray-900">Recent Updates</h3>
                                </div>
                                {unreadNotifications > 0 && (
                                    <span className="px-2 py-1 rounded-lg bg-indigo-100 text-[10px] font-bold text-indigo-600">
                                        {unreadNotifications} NEW
                                    </span>
                                )}
                            </div>

                            <div className="px-4 pb-4 space-y-3">
                                {recentNotifications.length > 0 ? (
                                    recentNotifications.map((notif, idx) => (
                                        <motion.div
                                            key={notif.id || idx}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => notif.path && navigate(notif.path)}
                                            className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 border border-indigo-50 hover:bg-indigo-50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm flex-shrink-0">
                                                    <Bell className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 text-sm truncate">{notif.title || 'Notification'}</p>
                                                    <p className="text-xs text-indigo-600 font-medium truncate">{notif.message || ''}</p>
                                                </div>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 ml-2"></div>
                                            )}
                                        </motion.div>
                                    ))
                                ) : unreadNotifications > 0 ? (
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate('/cp-notifications')}
                                        className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 border border-indigo-50 hover:bg-indigo-50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm">
                                                <Bell className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{unreadNotifications} Unread Notification{unreadNotifications > 1 ? 's' : ''}</p>
                                                <p className="text-xs text-indigo-600 font-medium">View all notifications</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:text-indigo-500 transition-colors" />
                                    </motion.div>
                                ) : null}
                                
                                {recentNotifications.length > 0 && (
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate('/cp-notifications')}
                                        className="w-full py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        View All Notifications
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Gamification Card */}
                    <motion.div
                        whileHover={{ y: -2 }}
                        onClick={() => navigate('/cp-rewards')}
                        className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-[28px] p-6 text-white shadow-xl relative overflow-hidden cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#F6C453] rounded-full -mt-10 -mr-10 blur-[60px] opacity-20 animate-pulse"></div>

                        <div className="flex justify-between items-end mb-6 relative z-10">
                            <div>
                                <span className="inline-block px-2 py-1 bg-white/10 backdrop-blur-sm rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2 text-[#F6C453] border border-white/5">
                                    Current Rank
                                </span>
                                <h3 className="text-xl font-bold">{performanceMetrics.currentLevel}</h3>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-[#F6C453]">
                                    <CountUp value={performanceMetrics.totalConversions} />
                                </span>
                                <p className="text-xs text-gray-400 font-medium mt-1">Conversions</p>
                            </div>
                        </div>

                        <div className="relative h-2.5 bg-gray-700/50 rounded-full overflow-hidden mb-5 backdrop-blur-sm border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${performanceMetrics.progress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#F6C453] to-orange-500 rounded-full shadow-[0_0_10px_rgba(246,196,83,0.5)]"
                            ></motion.div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-medium text-gray-300 relative z-10">
                            {performanceMetrics.nextLevel && performanceMetrics.progress < 100 ? (
                                <p>
                                    Unlock <span className="text-white font-bold">{performanceMetrics.nextLevel}</span>
                                    {performanceMetrics.progress > 0 && (
                                        <span> - {Math.round(100 - performanceMetrics.progress)}% remaining</span>
                                    )}
                                </p>
                            ) : (
                                <p className="text-[#F6C453] font-bold">🏆 Maximum Level Achieved!</p>
                            )}
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/cp-rewards');
                                }}
                                className="flex items-center gap-1 text-[#F6C453] hover:text-white transition-colors"
                            >
                                View Rewards <ArrowRight className="w-3 h-3" />
                            </motion.button>
                        </div>
                    </motion.div>
                </div>

                {/* 6. Activity & Team Lead */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Conversions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm order-1 lg:order-1 h-full"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-900">Recent Conversions</h3>
                            <button onClick={() => navigate('/cp-converted')} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
                        </div>
                        <div className="space-y-4">
                            {recentActivity.length > 0 ? (
                                recentActivity.slice(0, 3).map((client, i) => (
                                    <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{client.name || 'Client'}</h4>
                                            <p className="text-xs text-gray-400 mt-1">{client.companyName || 'Company'}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="mb-1">
                                                <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded">ACTIVE</span>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium">
                                                {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-4">No recent conversions</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Sales Manager Card */}
                    {salesManager ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center order-2 lg:order-2 h-full cursor-pointer"
                            onClick={() => navigate(`/cp-sales-manager/${salesManager.id}`)}
                        >
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-8">YOUR SALES MANAGER</p>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                                        {salesManager.initials}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{salesManager.name}</h3>
                                        <p className="text-sm text-gray-500 font-medium">{salesManager.role}</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <a 
                                        href={salesManager.phone ? `tel:${salesManager.phone}` : '#'}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!salesManager.phone) {
                                                e.preventDefault();
                                            }
                                        }}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                            salesManager.phone 
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Phone className="w-5 h-5" />
                                    </a>
                                    <a 
                                        href={salesManager.email ? `mailto:${salesManager.email}` : '#'}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!salesManager.email) {
                                                e.preventDefault();
                                            }
                                        }}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                            salesManager.email 
                                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Mail className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center order-2 lg:order-2 h-full"
                        >
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-8">YOUR SALES MANAGER</p>
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-500">No sales manager assigned yet</p>
                                <p className="text-xs text-gray-400 mt-2">Contact admin to get assigned</p>
                            </div>
                        </motion.div>
                    )}
                </div>


            </main>
        </div>
    )
}

export default CP_dashboard
