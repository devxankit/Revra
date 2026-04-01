import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiDollarSign, FiClock, FiCreditCard, FiArrowUpRight,
    FiArrowDownLeft, FiFilter, FiDownload, FiAlertCircle,
    FiSend, FiX
} from 'react-icons/fi';
import CP_navbar from '../CP-components/CP_navbar';
import { cpWalletService } from '../CP-services/cpWalletService';
import { cpRequestService } from '../CP-services/cpRequestService';
import { useToast } from '../../../contexts/ToastContext';

// --- Components ---

const TransactionItem = ({ item }) => {
    const isCredit = item.type === 'credit';
    const isPending = item.status === 'pending';
    const amount = item.amount || 0;
    const formattedAmount = isCredit ? `+₹${amount.toLocaleString('en-IN')}` : `-₹${amount.toLocaleString('en-IN')}`;
    
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const now = new Date();
        // Compare by calendar day (so "Today" works correctly)
        const startOfNow = new Date(now);
        startOfNow.setHours(0, 0, 0, 0);
        const startOfDate = new Date(date);
        startOfDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((startOfNow - startOfDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'debit' ? 'bg-red-50 text-red-600' :
                    isPending ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}>
                    {item.type === 'debit' ? <FiArrowUpRight /> : isCredit ? <FiArrowDownLeft /> : <FiClock />}
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 text-sm">{item.description || 'Transaction'}</h4>
                    <p className="text-xs text-gray-500">{formatDate(item.createdAt)} • {item.status || 'Completed'}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={`font-bold ${item.type === 'debit' ? 'text-gray-900' : 'text-green-600'}`}>
                    {formattedAmount}
                </p>
                {isPending && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">PENDING</span>}
            </div>
        </div>
    );
};

const CP_wallet = () => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('transactions');
    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState({
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingWithdrawals: 0
    });
    const [transactions, setTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawDescription, setWithdrawDescription] = useState('');
    const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const summaryResponse = await cpWalletService.getWalletSummary();
            if (summaryResponse.success && summaryResponse.data) {
                const wallet = summaryResponse.data.wallet || {};
                setWalletData({
                    balance: wallet.balance || 0,
                    totalEarned: wallet.totalEarned || 0,
                    totalWithdrawn: wallet.totalWithdrawn || 0,
                    pendingWithdrawals: summaryResponse.data.pendingWithdrawals || 0
                });
            }
            const transactionsResponse = await cpWalletService.getTransactions({
                page: currentPage,
                limit: 20
            });
            if (transactionsResponse.success && transactionsResponse.data) {
                setTransactions(transactionsResponse.data || []);
                setTotalPages(transactionsResponse.pages || 1);
            }
            try {
                const requestsResponse = await cpRequestService.getMyRequests({
                    direction: 'outgoing',
                    type: 'withdrawal-request',
                    limit: 20
                });
                if (requestsResponse.success && requestsResponse.data) {
                    setWithdrawalRequests(requestsResponse.data || []);
                }
            } catch (reqErr) {
                console.warn('Could not load withdrawal requests:', reqErr);
                setWithdrawalRequests([]);
            }
        } catch (error) {
            console.error('Error fetching wallet data:', error);
            addToast({ message: 'Failed to load wallet data', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletData();
    }, [currentPage, addToast]);

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) {
            addToast('Please enter a valid amount', 'error');
            return;
        }
        if (amount > walletData.balance) {
            addToast('Amount exceeds available balance', 'error');
            return;
        }
        setWithdrawSubmitting(true);
        try {
            const res = await cpRequestService.createWithdrawalRequest({
                amount,
                description: withdrawDescription.trim() || undefined
            });
            if (res.success && res.data) {
                addToast({ message: 'Withdrawal request submitted. Admin will review it shortly.', type: 'success' });
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                setWithdrawDescription('');
                await fetchWalletData();
            } else {
                addToast({ message: res.message || 'Failed to submit withdrawal request', type: 'error' });
            }
        } catch (err) {
            addToast({ message: err.message || 'Failed to submit withdrawal request', type: 'error' });
        } finally {
            setWithdrawSubmitting(false);
        }
    };

    const pendingWithdrawalCount = withdrawalRequests.filter((r) => r.status === 'pending').length;

    const formatCurrency = (amount) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] pb-24 md:pb-0 font-sans text-[#1E1E1E]">
                <CP_navbar />
                <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8">
                    <div className="animate-pulse space-y-8">
                        <div className="h-8 bg-gray-200 rounded w-32"></div>
                        <div className="h-48 bg-gray-200 rounded-[28px]"></div>
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl"></div>)}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-24 md:pb-0 font-sans text-[#1E1E1E]">
            <CP_navbar />

            <main className="max-w-md mx-auto md:max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-8 space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
                    <button className="p-2 text-indigo-600 bg-indigo-50 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                        <FiDownload /> Statement
                    </button>
                </div>

                {/* Hero Card */}
                <div className="bg-gradient-to-br from-[#1E1E1E] via-gray-900 to-gray-800 rounded-[28px] p-6 text-white shadow-xl shadow-indigo-900/10 mb-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <FiCreditCard className="w-48 h-48" />
                    </div>

                    <div className="relative z-10">
                        <p className="text-indigo-200 text-sm font-medium mb-1">Available Balance</p>
                        <h2 className="text-4xl font-bold mb-6">{formatCurrency(walletData.balance)}</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-2 mb-1 text-orange-300">
                                    <FiClock className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wide">Pending requests</span>
                                </div>
                                <p className="font-bold text-lg">{pendingWithdrawalCount}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-2 mb-1 text-green-300">
                                    <FiDollarSign className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wide">Lifetime</span>
                                </div>
                                <p className="font-bold text-lg">{formatCurrency(walletData.totalEarned)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Request Withdrawal */}
                <div className="flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={() => setShowWithdrawModal(true)}
                        disabled={walletData.balance <= 0}
                        className="p-3 bg-indigo-600 text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FiSend /> Request Withdrawal
                    </button>
                </div>

                {withdrawalRequests.length > 0 && (
                    <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-3">My Withdrawal Requests</h3>
                        <div className="space-y-2">
                            {withdrawalRequests.slice(0, 5).map((req) => (
                                <div key={req._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <span className="text-sm text-gray-700">₹{(req.amount || 0).toLocaleString('en-IN')}</span>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                        req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {req.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'transactions' ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        Transactions
                        {activeTab === 'transactions' && <motion.div layoutId="activeTabWallet" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('earnings')}
                        className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'earnings' ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        Earnings Analysis
                        {activeTab === 'earnings' && <motion.div layoutId="activeTabWallet" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                    </button>
                </div>

                {/* Content */}
                <AnimatePresence mode='wait'>
                    {activeTab === 'transactions' ? (
                        <motion.div
                            key="transactions"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-700">Recent Activity</h3>
                                <button className="p-2 text-gray-400 hover:text-gray-600"><FiFilter /></button>
                            </div>

                            <div>
                                {transactions.length > 0 ? (
                                    <>
                                        {transactions.map((item, index) => (
                                            <TransactionItem key={item._id || index} item={item} />
                                        ))}
                                        {totalPages > 1 && (
                                            <div className="flex justify-center gap-2 mt-6">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Previous
                                                </button>
                                                <span className="px-4 py-2 text-sm text-gray-600">
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 text-sm">No transactions found</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="earnings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center py-12"
                        >
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50 text-2xl">
                                📊
                            </div>
                            <p className="text-gray-500 text-sm font-medium">Detailed charts coming soon.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Withdrawal Request Modal */}
            <AnimatePresence>
                {showWithdrawModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                        onClick={() => !withdrawSubmitting && setShowWithdrawModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Request Withdrawal</h3>
                                <button
                                    type="button"
                                    onClick={() => !withdrawSubmitting && setShowWithdrawModal(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Your request will be sent to admin. Wallet balance will be deducted only after approval.
                            </p>
                            <form onSubmit={handleWithdrawSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        max={walletData.balance}
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Enter amount"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Available: {formatCurrency(walletData.balance)}</p>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                                    <textarea
                                        value={withdrawDescription}
                                        onChange={(e) => setWithdrawDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                        placeholder="e.g. Bank transfer"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowWithdrawModal(false)}
                                        disabled={withdrawSubmitting}
                                        className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={withdrawSubmitting}
                                        className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {withdrawSubmitting ? 'Submitting…' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CP_wallet;
