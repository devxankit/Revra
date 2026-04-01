import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Bell, Check, Trash2,
    TrendingUp, CreditCard, Award, Megaphone,
    Clock, ChevronRight, AlertCircle
} from 'lucide-react';
import CP_navbar from '../CP-components/CP_navbar';
import { cpNotificationService } from '../CP-services/cpNotificationService';
import { useToast } from '../../../contexts/ToastContext';

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'lead', label: 'Leads' },
    { id: 'payment', label: 'Payments' },
    { id: 'reward', label: 'Rewards' },
    { id: 'admin', label: 'Admin' }
];

// Map backend notification types to frontend display types
const mapNotificationType = (backendType) => {
    if (backendType?.startsWith('lead_')) return 'lead';
    if (backendType?.startsWith('payment_') || backendType?.startsWith('wallet_') || backendType?.startsWith('withdrawal_')) return 'payment';
    if (backendType?.startsWith('reward_') || backendType?.startsWith('incentive_')) return 'reward';
    if (backendType === 'system') return 'admin';
    return 'other';
};

const CP_notifications = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('all');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Format time ago
    const formatTimeAgo = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return `${Math.floor(diffDays / 30)}mo ago`;
    };

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);
                // Fetch all notifications - filtering will be done client-side
                const params = {};

                const [notificationsResponse, unreadResponse] = await Promise.all([
                    cpNotificationService.getNotifications(params),
                    cpNotificationService.getUnreadCount()
                ]);

                if (notificationsResponse.success) {
                    const formattedNotifications = notificationsResponse.data.map(notif => ({
                        id: notif._id || notif.id,
                        type: mapNotificationType(notif.type),
                        backendType: notif.type, // Keep original for filtering
                        title: notif.title,
                        message: notif.message,
                        createdAt: notif.createdAt,
                        time: formatTimeAgo(notif.createdAt),
                        isRead: notif.read || false,
                        isPinned: notif.priority === 'urgent' || notif.priority === 'high',
                        path: notif.actionUrl || getDefaultPath(notif.type, notif.reference),
                        rawData: notif
                    }));

                    setNotifications(formattedNotifications);
                }

                if (unreadResponse.success) {
                    setUnreadCount(unreadResponse.data?.unreadCount || 0);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
                addToast('Failed to load notifications', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [addToast]);

    // Get default path based on notification type and reference
    const getDefaultPath = (type, reference) => {
        if (type?.startsWith('lead_')) {
            if (reference?.id) return `/cp-lead-details/${reference.id}`;
            return '/cp-leads';
        }
        if (type?.startsWith('payment_') || type?.startsWith('wallet_') || type?.startsWith('withdrawal_')) {
            return '/cp-wallet';
        }
        if (type?.startsWith('reward_') || type?.startsWith('incentive_')) {
            return '/cp-rewards';
        }
        if (type === 'system') {
            return '/cp-notice-board';
        }
        return null;
    };

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'all') return true;
        if (activeTab === 'lead') {
            return n.backendType?.startsWith('lead_');
        }
        if (activeTab === 'payment') {
            return n.backendType?.startsWith('payment_') || 
                   n.backendType?.startsWith('wallet_') || 
                   n.backendType?.startsWith('withdrawal_');
        }
        if (activeTab === 'reward') {
            return n.backendType?.startsWith('reward_') || 
                   n.backendType?.startsWith('incentive_');
        }
        if (activeTab === 'admin') {
            return n.backendType === 'system';
        }
        return n.type === activeTab;
    }).sort((a, b) => {
        // Sort: unread first, then pinned, then by date
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
    });

    const markAllRead = async () => {
        try {
            const response = await cpNotificationService.markAllAsRead();
            if (response.success) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
                addToast('All notifications marked as read', 'success');
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            addToast('Failed to mark all as read', 'error');
        }
    };

    const handleNotificationClick = async (id, path) => {
        const notification = notifications.find(n => n.id === id);
        
        // Mark as read if not already read
        if (notification && !notification.isRead) {
            try {
                await cpNotificationService.markAsRead(id);
                setNotifications(prev => prev.map(n => 
                    n.id === id ? { ...n, isRead: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        }
        
        // Navigate
        if (path) navigate(path);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'lead': return <TrendingUp className="w-5 h-5 text-blue-600" />;
            case 'payment': return <CreditCard className="w-5 h-5 text-emerald-600" />;
            case 'reward': return <Award className="w-5 h-5 text-amber-600" />;
            case 'admin': return <Megaphone className="w-5 h-5 text-purple-600" />;
            default: return <Bell className="w-5 h-5 text-gray-600" />;
        }
    };

    const getBgColor = (type) => {
        switch (type) {
            case 'lead': return 'bg-blue-100';
            case 'payment': return 'bg-emerald-100';
            case 'reward': return 'bg-amber-100';
            case 'admin': return 'bg-purple-100';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-20 font-sans text-[#1E1E1E]">
            <CP_navbar />

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-xl mx-auto px-4 py-3 pt-14 md:pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight">Notifications</h1>
                            {unreadCount > 0 && (
                                <p className="text-xs text-indigo-600 font-semibold">{unreadCount} unread updates</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={markAllRead}
                        className="text-xs font-bold text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                    >
                        <Check className="w-4 h-4" /> Mark All Read
                    </button>
                </div>

                {/* Tabs */}
                <div className="max-w-xl mx-auto px-4 pb-0 overflow-hidden">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-3">
                        {TABS.map(tab => {
                            const count = notifications.filter(n => {
                                if (n.isRead) return false;
                                if (tab.id === 'all') return true;
                                if (tab.id === 'lead') return n.backendType?.startsWith('lead_');
                                if (tab.id === 'payment') return n.backendType?.startsWith('payment_') || n.backendType?.startsWith('wallet_') || n.backendType?.startsWith('withdrawal_');
                                if (tab.id === 'reward') return n.backendType?.startsWith('reward_') || n.backendType?.startsWith('incentive_');
                                if (tab.id === 'admin') return n.backendType === 'system';
                                return n.type === tab.id;
                            }).length;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${activeTab === tab.id
                                            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                                            : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                                        }`}
                                >
                                    {tab.label}
                                    {count > 0 && (
                                        <span className={`w-1.5 h-1.5 rounded-full ${activeTab === tab.id ? 'bg-red-400' : 'bg-red-500'}`}></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <main className="max-w-xl mx-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="bg-white rounded-[24px] p-6 border border-gray-100 animate-pulse">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <AnimatePresence mode='popLayout'>
                        {filteredNotifications.length > 0 ? (
                            filteredNotifications.map(notification => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification.id, notification.path)}
                                className={`relative p-6 rounded-[24px] border border-gray-100 shadow-sm transition-all cursor-pointer group ${notification.isRead
                                        ? 'bg-white border-gray-100'
                                        : 'bg-white border-indigo-100 shadow-md shadow-indigo-100/50'
                                    }`}
                            >
                                {/* Pinned Indicator */}
                                {notification.isPinned && !notification.isRead && (
                                    <div className="absolute top-0 right-0 p-3">
                                        <AlertCircle className="w-4 h-4 text-red-500 fill-red-50" />
                                    </div>
                                )}
                                {!notification.isRead && !notification.isPinned && (
                                    <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-500 rounded-full"></div>
                                )}

                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getBgColor(notification.type)}`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 pr-4">
                                        <h3 className={`text-sm font-bold mb-1 leading-tight ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                            {notification.title}
                                        </h3>
                                        <p className={`text-xs leading-relaxed line-clamp-2 ${notification.isRead ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium mt-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {notification.time}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-sm border border-gray-100">
                                🎉
                            </div>
                            <h3 className="text-gray-900 font-bold mb-1">You're all caught up!</h3>
                            <p className="text-gray-500 text-sm">No new notifications for now.</p>
                        </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </main>
        </div>
    );
};

export default CP_notifications;
