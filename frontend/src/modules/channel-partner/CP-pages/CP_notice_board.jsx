import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    FiFileText,
    FiImage,
    FiVideo,
    FiCalendar,
    FiUser,
    FiEye,
    FiFilter,
    FiSearch,
    FiRefreshCw,
    FiZoomIn,
    FiX,
    FiPlay
} from 'react-icons/fi'
import CP_navbar from '../CP-components/CP_navbar'
import { useToast } from '../../../contexts/ToastContext'

// --- Mock Data ---
const MOCK_NOTICES = [
    {
        id: 'n1',
        title: 'New Commission Structure Effective Immediately',
        content: 'We have updated our commission slabs for Q1 2026. Please review the new rates for web development projects. Standard Websites: Commission increased to 15%. E-commerce Solutions: Flat ₹10,000 bonus for projects above ₹1L.',
        date: '22 Jan 2026',
        author: 'Admin Team',
        type: 'text',
        priority: 'high',
        views: 120
    },
    {
        id: 'n2',
        title: 'Maintenance: Dashboard Downtime',
        content: 'The partner dashboard will be undergoing scheduled maintenance on Saturday, 24th Jan from 2 AM to 4 AM. Please plan your activities accordingly.',
        date: '21 Jan 2026',
        author: 'Tech Support',
        type: 'text',
        priority: 'medium',
        views: 85
    },
    {
        id: 'n3',
        title: 'Welcome to the New Partner Portal!',
        content: 'Explore the new features including the Demo Videos section and improved Lead Management tools. Check out the video below for a quick tour.',
        date: '20 Jan 2026',
        author: 'Community Manager',
        type: 'video',
        videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        priority: 'low',
        views: 200
    },
    {
        id: 'n4',
        title: 'Urgent: Policy Update Regarding Client Data',
        content: 'Strict compliance required for all partners handling client data. Failure to comply may lead to account suspension. Please read the attached guidelines carefully.',
        date: '18 Jan 2026',
        author: 'Legal Team',
        type: 'text',
        priority: 'urgent',
        views: 310
    },
    {
        id: 'n5',
        title: 'Q4 2025 Top Performers',
        content: 'Congratulations to our top performing partners of the last quarter! Setup a meeting with them to learn their secrets.',
        date: '15 Jan 2026',
        author: 'Admin Team',
        type: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        priority: 'medium',
        views: 150
    }
];

const CP_notice_board = () => {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [selectedFilter, setSelectedFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [noticesData, setNoticesData] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showImageModal, setShowImageModal] = useState(false)
    const [selectedImageUrl, setSelectedImageUrl] = useState(null)

    // Refs for debouncing
    const searchTimeoutRef = useRef(null)

    // Simulation of fetch
    const fetchNotices = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true)
        else setRefreshing(true)

        // Simulate API delay
        setTimeout(() => {
            setNoticesData(MOCK_NOTICES)
            setLoading(false)
            setRefreshing(false)
        }, 800)

    }, [])

    useEffect(() => {
        fetchNotices(true)
    }, [fetchNotices])


    const handleNoticeView = (noticeId) => {
        // Mock view increment
        setNoticesData(prev =>
            prev.map(n =>
                n.id === noticeId
                    ? { ...n, views: (n.views || 0) + 1 }
                    : n
            )
        )
    }

    const filters = [
        { id: 'all', label: 'All Notices', icon: FiFileText },
        { id: 'text', label: 'Text', icon: FiFileText },
        { id: 'image', label: 'Images', icon: FiImage },
        { id: 'video', label: 'Videos', icon: FiVideo }
    ]

    const filteredNotices = noticesData.filter(notice => {
        const matchesFilter = selectedFilter === 'all' || notice.type === selectedFilter;
        const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notice.content.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    })

    const getTypeIcon = (type) => {
        switch (type) {
            case 'text': return FiFileText
            case 'image': return FiImage
            case 'video': return FiVideo
            default: return FiFileText
        }
    }

    const getTypeColor = (type) => {
        switch (type) {
            case 'text': return 'from-blue-50 to-blue-100 border-blue-200'
            case 'image': return 'from-purple-50 to-purple-100 border-purple-200'
            case 'video': return 'from-pink-50 to-pink-100 border-pink-200'
            default: return 'from-gray-50 to-gray-100 border-gray-200'
        }
    }

    // Text Notice Card Component
    const TextNoticeCard = ({ notice }) => {
        const TypeIcon = getTypeIcon(notice.type)

        return (
            <div
                onClick={() => handleNoticeView(notice.id)}
                className={`bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer`}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <TypeIcon className="text-white text-sm" />
                        </div>
                        <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Text Notice</span>
                    </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{notice.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{notice.content}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                            <FiUser className="text-xs" />
                            <span>{notice.author}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <FiCalendar className="text-xs" />
                            <span>{notice.date}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <FiEye className="text-xs" />
                        <span>{notice.views || 0}</span>
                    </div>
                </div>
            </div>
        )
    }

    // Image Notice Card Component
    const ImageNoticeCard = ({ notice }) => {
        const TypeIcon = getTypeIcon(notice.type)

        return (
            <div
                className={`bg-gradient-to-br ${getTypeColor(notice.type)} rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow duration-200`}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <TypeIcon className="text-white text-sm" />
                        </div>
                        <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Image Notice</span>
                    </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">{notice.title}</h3>

                {notice.imageUrl && (
                    <div
                        className="mb-3 cursor-pointer group relative"
                        onClick={(e) => {
                            e.stopPropagation()
                            setSelectedImageUrl(notice.imageUrl)
                            setShowImageModal(true)
                            handleNoticeView(notice.id)
                        }}
                    >
                        <img
                            src={notice.imageUrl}
                            alt={notice.title}
                            className="w-full h-32 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <FiZoomIn className="text-white text-2xl drop-shadow-lg" />
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{notice.content}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                            <FiUser className="text-xs" />
                            <span>{notice.author}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <FiCalendar className="text-xs" />
                            <span>{notice.date}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <FiEye className="text-xs" />
                        <span>{notice.views || 0}</span>
                    </div>
                </div>
            </div>
        )
    }

    // Video Notice Card Component
    const VideoNoticeCard = ({ notice }) => {
        const TypeIcon = getTypeIcon(notice.type)

        return (
            <div
                onClick={() => handleNoticeView(notice.id)}
                className={`bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer`}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                            <TypeIcon className="text-white text-sm" />
                        </div>
                        <span className="text-xs font-medium text-pink-700 uppercase tracking-wide">Video Notice</span>
                    </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">{notice.title}</h3>

                {notice.videoUrl ? (
                    <div className="mb-3">
                        <video
                            src={notice.videoUrl}
                            controls
                            className="w-full h-32 object-cover rounded-lg shadow-sm"
                            preload="none"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                ) : (
                    <div className="relative mb-3">
                        <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                            <div className="flex items-center space-x-2 text-gray-500">
                                <FiPlay className="text-2xl" />
                                <span className="text-sm font-medium">Video not available</span>
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{notice.content}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                            <FiUser className="text-xs" />
                            <span>{notice.author}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <FiCalendar className="text-xs" />
                            <span>{notice.date}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <FiEye className="text-xs" />
                        <span>{notice.views || 0}</span>
                    </div>
                </div>
            </div>
        )
    }

    const NoticeCard = ({ notice }) => {
        switch (notice.type) {
            case 'text': return <TextNoticeCard notice={notice} />
            case 'image': return <ImageNoticeCard notice={notice} />
            case 'video': return <VideoNoticeCard notice={notice} />
            default: return <TextNoticeCard notice={notice} />
        }
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] font-sans text-[#1E1E1E]">
            <CP_navbar />

            <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-8">

                {/* Mobile Layout */}
                <div className="lg:hidden">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 shadow-md border border-teal-200/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                                        <FiFileText className="text-white text-lg" />
                                    </div>
                                    <div className="flex-1">
                                        <h1 className="text-xl font-bold text-teal-900 leading-tight">Notice Board</h1>
                                        <p className="text-teal-700 text-xs font-medium mt-0.5">Official updates</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg px-4 py-3 shadow-md border border-white/20 ml-3">
                                    <div className="text-center">
                                        <p className="text-xs text-teal-600 font-medium mb-0.5">Total</p>
                                        <p className="text-2xl font-bold text-teal-900 leading-none">{noticesData.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Search/Filter Mobile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-4"
                    >
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-600" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search notices..."
                                className="w-full pl-8 pr-24 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg ${showFilters ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <FiFilter />
                            </button>
                        </div>
                        {showFilters && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {filters.map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setSelectedFilter(filter.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedFilter === filter.id
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-white border border-gray-200 text-gray-600'
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Mobile List */}
                    <div className="space-y-4">
                        {filteredNotices.map((notice) => (
                            <NoticeCard key={notice.id} notice={notice} />
                        ))}
                        {filteredNotices.length === 0 && !loading && (
                            <p className="text-center text-gray-500 py-10">No notices found.</p>
                        )}
                    </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:block">
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Notice Board</h1>
                                    <p className="text-gray-600 mt-2">Latest updates and announcements from admin</p>
                                </div>
                            </div>

                            {/* Search & Filters */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search notices..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {filters.map((filter) => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setSelectedFilter(filter.id)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedFilter === filter.id
                                                    ? 'bg-teal-500 text-white shadow-md'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            <filter.icon className="w-4 h-4" />
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredNotices.map((notice) => (
                                    <NoticeCard key={notice.id} notice={notice} />
                                ))}
                            </div>
                            {filteredNotices.length === 0 && !loading && (
                                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                    <FiFileText className="mx-auto h-12 w-12 text-gray-300" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No notices found</h3>
                                </div>
                            )}

                        </div>

                        {/* Sidebar */}
                        <div className="col-span-4 space-y-6">
                            {/* Stats */}
                            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 shadow-md border border-teal-200">
                                <h3 className="text-lg font-bold text-teal-900 mb-4">Notice Statistics</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-teal-700 text-sm">Total Notices</span>
                                        <span className="text-teal-900 font-bold">{noticesData.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-teal-700 text-sm">Text Updates</span>
                                        <span className="text-teal-900 font-bold">{noticesData.filter(n => n.type === 'text').length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-teal-700 text-sm">Multimedia</span>
                                        <span className="text-teal-900 font-bold">{noticesData.filter(n => n.type !== 'text').length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* Image Modal */}
            <AnimatePresence>
                {showImageModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowImageModal(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
                    >
                        <div className="relative max-w-4xl w-full max-h-[90vh]">
                            <button
                                onClick={() => setShowImageModal(false)}
                                className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
                            >
                                <FiX className="text-3xl" />
                            </button>
                            <motion.img
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                src={selectedImageUrl}
                                alt="Full View"
                                className="w-full h-full object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default CP_notice_board
