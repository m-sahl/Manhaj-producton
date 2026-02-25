import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { calculateMemberStats } from '../utils/stats';
import { Phone, Trash2, CheckCircle2, History, Clock, Edit2, X, Save, CreditCard, ArrowRight, Plus, AlertCircle } from 'lucide-react';
import { format, startOfMonth, addMonths, isBefore, parseISO } from 'date-fns';

export default function MemberDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const memberData = useQuery(api.members.get, { id });
    const paymentsData = useQuery(api.payments.list, { memberId: id });

    const updateMemberMutation = useMutation(api.members.update);
    const deleteMemberMutation = useMutation(api.members.remove);
    const addPaymentMutation = useMutation(api.payments.add);
    const deletePaymentMutation = useMutation(api.payments.remove);
    const toggleMonthMutation = useMutation(api.payments.toggleMonth);

    const parseMonth = (monthName, year) => {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = months.indexOf(monthName);
        return new Date(year, monthIndex !== -1 ? monthIndex : 0);
    };

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [selectedMonthStatus, setSelectedMonthStatus] = useState(null);
    const [isDeleteMemberModalOpen, setIsDeleteMemberModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCustomAmountModalOpen, setIsCustomAmountModalOpen] = useState(false);
    const [selectedMonthDate, setSelectedMonthDate] = useState(null);
    const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
    const [paymentToRevert, setPaymentToRevert] = useState(null);
    const [customAmount, setCustomAmount] = useState('');

    const member = useMemo(() => {
        if (memberData && paymentsData) {
            return calculateMemberStats(memberData, paymentsData);
        }
        return null;
    }, [memberData, paymentsData]);

    const payments = useMemo(() => {
        if (!paymentsData) return [];
        return [...paymentsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [paymentsData]);

    const handlePostPayment = async (amount, isFull = false) => {
        try {
            if (isFull) {
                await addPaymentMutation({
                    memberId: id,
                    amount: parseFloat(amount),
                    forMonth: format(selectedMonthDate, 'MMMM'),
                    forYear: selectedMonthDate.getFullYear(),
                    mode: 'Full Payment'
                });
            } else {
                await addPaymentMutation({
                    memberId: id,
                    amount: parseFloat(amount),
                    mode: 'Payment'
                });
            }
            setIsPaymentModalOpen(false);
        } catch (error) {
            console.error(error);
            alert('Failed to record payment');
        }
    };

    const handleCustomPayment = async (e) => {
        e.preventDefault();
        const amount = parseFloat(customAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            await addPaymentMutation({
                memberId: id,
                amount,
                forMonth: selectedMonthDate ? format(selectedMonthDate, 'MMMM') : undefined,
                forYear: selectedMonthDate ? selectedMonthDate.getFullYear() : undefined,
                mode: selectedMonthDate ? 'Monthly Fee' : 'Payment'
            });

            setIsCustomAmountModalOpen(false);
            setCustomAmount('');
        } catch (error) {
            console.error(error);
            alert('Failed to record payment');
        }
    };

    const handleDeleteMember = async () => {
        if (confirm('Are you sure you want to delete this member?')) {
            await deleteMemberMutation({ id });
            navigate('/members');
        }
    };

    const handleUpdateMember = async (e) => {
        e.preventDefault();
        try {
            await updateMemberMutation({
                id,
                ...editData,
                subscriptionAmount: parseFloat(editData.subscriptionAmount),
                active: member.active
            });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error(error);
            alert('Failed to update member');
        }
    };

    const handleConfirmRevert = async () => {
        if (paymentToRevert) {
            await deletePaymentMutation({ id: paymentToRevert._id });
            setIsRevertModalOpen(false);
            setPaymentToRevert(null);
        }
    };

    if (!member) return <div className="p-10 text-center text-slate-500">Loading...</div>;

    // Calculate grid items using chronological coverage logic
    const joinDate = startOfMonth(parseISO(member.joinDate));
    const today = startOfMonth(new Date());
    const monthlyFee = parseFloat(member.subscriptionAmount) || 0;

    // Pool all lifetime payments
    const totalPaidEver = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const openingDues = parseFloat(member.openingBalance || 0);
    let remainingToCover = totalPaidEver;

    const gridItems = [];

    // 1. First cover Opening Dues
    if (openingDues > 0) {
        let status = 'unpaid';
        let coverageAmount = 0;
        // Use epsilon buffer to handle rounding differences
        if (remainingToCover >= (openingDues - 0.01)) {
            status = 'paid';
            coverageAmount = openingDues;
            remainingToCover -= openingDues;
        } else if (remainingToCover > 0.01) {
            status = 'partial';
            coverageAmount = remainingToCover;
            remainingToCover = 0;
        }
        gridItems.push({
            type: 'opening',
            label: 'Opening Due',
            status,
            coverageAmount,
            total: openingDues
        });
    }

    // 2. Then cover months
    let current = joinDate;
    // Show months up to today, OR further into the future if they have coverage
    // Determine the furthest month to display based on today and any remaining credit
    let endLimit = addMonths(today, 1); // Default to one month past today
    if (remainingToCover > 0) {
        // If there's remaining credit, calculate how many future months it can cover
        const futureMonthsCovered = Math.ceil(remainingToCover / monthlyFee);
        endLimit = addMonths(endLimit, futureMonthsCovered);
    }

    while (current <= endLimit) {
        let status = 'unpaid';
        let coverageAmount = 0;

        // Use epsilon to handle floating point precision
        if (remainingToCover >= (monthlyFee - 0.01)) {
            remainingToCover -= monthlyFee;
            status = 'paid';
            coverageAmount = monthlyFee;
        } else if (remainingToCover > 0.01) {
            status = 'partial';
            coverageAmount = Math.round(remainingToCover * 100) / 100;
            remainingToCover = 0;
        }

        gridItems.push({
            type: 'month',
            date: current,
            status,
            coverageAmount
        });
        current = addMonths(current, 1);
        if (gridItems.length > 120) break;
    }
    gridItems.reverse();

    const handleToggleMonth = async (item) => {
        if (item.status === 'paid') {
            if (item.type === 'opening') {
                alert('Opening Dues are covered by pool payments. Delete the oldest payments in history to change this.');
                return;
            }

            // Find the specific record for this month
            const monthName = format(item.date, 'MMMM');
            const year = item.date.getFullYear();
            const p = payments.find(p => p.forMonth === monthName && p.forYear === year);

            if (p) {
                setPaymentToRevert(p);
                setSelectedMonthDate(item.date);
                setIsRevertModalOpen(true);
            } else {
                alert('Paid via credit rollover. Please delete the original overpayment in the history below.');
            }
        } else {
            // Unpaid or Partial
            setPaymentToRevert(null);
            setSelectedMonthDate(item.date || new Date());
            setSelectedMonthStatus(item.status);
            setIsPaymentModalOpen(true);
        }
    };


    // Filter payments to only show monthly fee records for the history list
    const monthWiseHistory = payments.filter(p => p.forMonth !== undefined);

    return (
        <div className="animate-fade-in space-y-6 pb-24 relative min-h-[90vh]">
            {/* Profile Header & Actions */}
            <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-5">
                        <div className="relative group">
                            <div className={`absolute -inset-1 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-500 ${member.balance > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                            <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black shadow-2xl transition-transform group-hover:scale-105 duration-300 ${member.balance > 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                {member.name}
                            </h1>
                            <div className="flex items-center space-x-3 mt-1.5">
                                <div className="flex items-center space-x-1 px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/5">
                                    <Phone size={12} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{member.phone}</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-100 dark:border-white/5">
                                    #{member._id.slice(0, 8)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => {
                                setEditData({
                                    name: member.name,
                                    phone: member.phone,
                                    subscriptionAmount: member.subscriptionAmount,
                                    subscriptionType: member.subscriptionType || 'Monthly',
                                    email: member.email || '',
                                    joinDate: member.joinDate
                                });
                                setIsEditModalOpen(true);
                            }}
                            className="p-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-slate-200 dark:border-white/5 shadow-sm active:scale-90"
                        >
                            <Edit2 size={20} />
                        </button>
                        <button
                            onClick={handleDeleteMember}
                            className="p-3.5 bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-500 hover:text-white rounded-2xl text-rose-500 transition-all border border-rose-100 dark:border-rose-500/10 shadow-sm active:scale-90"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="premium-card p-5 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 -mr-12 -mt-12 transition-colors duration-500 ${member.totalDue > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 font-mono">Current Balance</p>
                        <div className="flex items-baseline space-x-1">
                            <span className={`text-2xl font-black ${member.totalDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                ₹{Math.round(member.totalDue).toLocaleString()}
                            </span>
                        </div>
                        <div className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${member.totalDue > 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'}`}>
                            {member.totalDue > 0 ? 'Pending Dues' : 'Fully Paid'}
                        </div>
                    </div>

                    <div className="premium-card p-5 group">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 font-mono">Monthly Rate</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">₹{parseFloat(member.subscriptionAmount).toLocaleString()}</p>
                        <div className="mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {member.subscriptionType} Cycle
                        </div>
                    </div>

                    <div className={`premium-card p-5 group col-span-2 md:col-span-1 border-emerald-500/20 shadow-emerald-500/5 ${member.advanceCredit > 0 ? 'bg-emerald-50/30 dark:bg-emerald-500/5' : 'opacity-60'}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 font-mono">Advance Credit</p>
                        <p className={`text-2xl font-black ${member.advanceCredit > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            ₹{member.advanceCredit.toLocaleString()}
                        </p>
                        <p className="mt-3 text-[10px] font-bold text-slate-400">Rollover for next month</p>
                    </div>
                </div>
            </div>

            {/* Breakdown Summary */}
            <div className="premium-card p-6 bg-slate-50/50 dark:bg-white/5 space-y-4">
                <div className="flex items-center space-x-2">
                    <History size={16} className="text-blue-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-mono">Dues Breakdown</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500">Unpaid Cycle ({member.unpaidMonthsCount})</span>
                        <span className="text-slate-900 dark:text-white font-mono">₹{(member.unpaidMonthsCount * (parseFloat(member.subscriptionAmount) || 0)).toLocaleString()}</span>
                    </div>
                    {member.openingDues > 0 && (
                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-500">Opening Arrears</span>
                            <span className="text-slate-900 dark:text-white font-mono">₹{member.openingDues.toLocaleString()}</span>
                        </div>
                    )}
                    {member.advanceCredit > 0 && (
                        <div className="flex justify-between items-center text-xs font-bold px-3 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                            <span className="text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-tighter">Credit Rollover</span>
                            <span className="text-emerald-600 dark:text-emerald-500 font-black font-mono">-₹{member.advanceCredit.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Final Balance</span>
                        <span className={`text-xl font-black ${member.totalDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            ₹{Math.round(member.totalDue).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Payment Sheet Window */}
            <div className="glass-dark rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Subscription Status</h3>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-[0.2em]">TAP TO RECORD PAYMENT</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                            Status: {member.totalDue > 0 ? 'Action Required' : 'Current'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                    {gridItems.map((item, idx) => {
                        const isPaid = item.status === 'paid';
                        const isPartial = item.status === 'partial';

                        return (
                            <button
                                key={idx}
                                onClick={() => handleToggleMonth(item)}
                                className={`p-5 rounded-[1.8rem] border-2 transition-all active:scale-95 text-left group/btn relative overflow-hidden ${isPaid
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                    : isPartial
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                                        : 'bg-slate-50/50 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-500 hover:border-blue-500/30'
                                    }`}
                            >
                                <div className="space-y-1 relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-60">
                                        {item.label || format(item.date, 'MMM yyyy')}
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <h4 className="text-base font-black tracking-tight leading-none capitalize">
                                            {isPaid ? 'Settled' : isPartial ? 'Balance' : 'Pending'}
                                        </h4>
                                    </div>
                                    <p className="text-xs font-black font-mono opacity-80 mt-1">
                                        ₹{item.coverageAmount.toLocaleString()}
                                    </p>
                                </div>

                                {isPaid && (
                                    <CheckCircle2 size={48} className="absolute -right-4 -bottom-4 text-emerald-500/20 transition-transform group-hover/btn:scale-110" />
                                )}
                                {!isPaid && !isPartial && (
                                    <div className="absolute right-4 bottom-4 w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity">
                                        <Plus size={14} className="text-slate-400" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest mb-1">Quick Stats</span>
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                                        {gridItems.filter(m => m.status === 'paid').length} Paid
                                    </span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                                        {gridItems.filter(m => m.status === 'unpaid').length} Due
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History List */}
            {payments.length > 0 && (
                <div id="payment-history" className="space-y-6">
                    <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 px-1">
                        <History size={16} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] font-mono">Payment History</h3>
                    </div>

                    <div className="space-y-3">
                        {payments.map((p, index) => {
                            const isMonthly = p.forMonth !== undefined;
                            return (
                                <div
                                    key={p._id}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className="premium-card group relative p-4 pl-6 flex justify-between items-center bg-white dark:bg-slate-900/40 backdrop-blur-xl animate-slide-up"
                                >
                                    {/* Status Accent Bar */}
                                    <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full transition-all group-hover:top-2 group-hover:bottom-2 ${isMonthly ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]'}`} />

                                    <div className="flex items-center space-x-4">
                                        <div className={`p-2.5 rounded-2xl ${isMonthly ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500'}`}>
                                            <CreditCard size={20} />
                                        </div>
                                        <div className="relative z-10 space-y-0.5">
                                            <p className="text-sm font-black text-slate-900 dark:text-white capitalize">
                                                {isMonthly
                                                    ? `${p.mode === 'Monthly Fee' ? 'Fee:' : 'Partial:'} ${p.forMonth} ${p.forYear}`
                                                    : 'Direct Entry'}
                                            </p>
                                            <div className="flex items-center space-x-1 text-slate-400">
                                                <Clock size={10} />
                                                <p className="text-[9px] font-bold font-mono uppercase tracking-tighter">
                                                    {format(new Date(p.date), 'dd MMM yyyy • h:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4 relative z-10">
                                        <div className="text-right">
                                            <p className={`text-base font-black ${isMonthly ? 'text-emerald-600 dark:text-emerald-500' : 'text-blue-600 dark:text-blue-500'}`}>₹{Math.round(p.amount).toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">POSTED</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPaymentToRevert(p);
                                                setSelectedMonthDate(isMonthly ? parseMonth(p.forMonth, p.forYear) : new Date(p.date));
                                                setIsRevertModalOpen(true);
                                            }}
                                            className="p-2.5 bg-rose-50 dark:bg-rose-500/5 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="glass-dark w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Modify Profile</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-rose-500 p-2 bg-white dark:bg-slate-900 rounded-xl transition-colors border border-slate-100 dark:border-white/5 shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateMember} className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 font-mono">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold placeholder-slate-400 shadow-inner"
                                    value={editData.name}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 font-mono">Dues Rate</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold shadow-inner"
                                        value={editData.subscriptionAmount}
                                        onChange={e => setEditData({ ...editData, subscriptionAmount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 font-mono">Cycle</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold shadow-inner appearance-none"
                                        value={editData.subscriptionType}
                                        onChange={e => setEditData({ ...editData, subscriptionType: e.target.value })}
                                    >
                                        <option>Monthly</option>
                                        <option>Yearly</option>
                                        <option>One-Time</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 font-mono">Phone Line</label>
                                <input
                                    required
                                    type="tel"
                                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold shadow-inner"
                                    value={editData.phone}
                                    onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black py-5 rounded-[1.8rem] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] active:scale-95 transition-all flex items-center justify-center space-x-3 mt-6"
                            >
                                <Save size={20} className="opacity-80" />
                                <span className="uppercase tracking-widest text-xs">Save Changes</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Confirmation Modal */}
            {isPaymentModalOpen && selectedMonthDate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsPaymentModalOpen(false)}></div>
                    <div className="glass-dark w-full max-w-sm rounded-[3rem] overflow-hidden relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-4 text-center relative">
                            {selectedMonthStatus === 'partial' && paymentToRevert && (
                                <button
                                    onClick={() => {
                                        setIsPaymentModalOpen(false);
                                        setIsRevertModalOpen(true);
                                    }}
                                    className="absolute top-8 right-8 p-3 bg-white dark:bg-slate-900 text-rose-500 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all border border-slate-200 dark:border-white/5 shadow-sm active:scale-90"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-blue-500/5">
                                <CreditCard className="text-blue-600 dark:text-blue-400" size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {selectedMonthStatus === 'partial' ? 'Clear Arrears' : 'Payment Portal'}
                            </h3>
                            <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-wide">
                                {format(selectedMonthDate, 'MMMM yyyy')}
                            </p>
                        </div>

                        <div className="p-8 pt-4 space-y-4">
                            {selectedMonthStatus !== 'partial' && (
                                <button
                                    onClick={() => handlePostPayment(member.subscriptionAmount, true)}
                                    className="w-full bg-gradient-to-br from-emerald-500 to-green-600 text-white p-6 rounded-3xl flex flex-col items-center group active:scale-95 transition-all text-center shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] border-none"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 mb-1">Standard Payment</p>
                                    <p className="text-xl font-black">Full Payment</p>
                                    <p className="text-xs font-bold text-white mt-2 bg-white/20 px-3 py-1 rounded-full border border-white/20">₹{parseFloat(member.subscriptionAmount).toLocaleString()}</p>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setIsPaymentModalOpen(false);
                                    setIsCustomAmountModalOpen(true);
                                }}
                                className="premium-card w-full border-2 border-dashed dark:border-white/10 p-6 flex flex-col items-center group active:scale-95 transition-all text-center group bg-white/50 dark:bg-white/5"
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Flexible Mode</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">
                                    {selectedMonthStatus === 'partial' ? 'Pay Remaining' : 'Other Amount'}
                                </p>
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg mt-3 group-hover:scale-110 transition-transform">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="w-full py-4 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-slate-700 dark:hover:text-white transition-colors mt-2"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Amount Modal */}
            {isCustomAmountModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setIsCustomAmountModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8 pb-4">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Custom Amount</h3>
                                {member.totalDue > 0 ? (
                                    <div className="bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                                        <p className="text-[10px] font-black text-orange-600 uppercase">Due: ₹{member.totalDue}</p>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase">Credit: ₹{member.advanceCredit}</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-500 font-medium">
                                Enter the partial payment amount
                            </p>
                        </div>

                        <form onSubmit={handleCustomPayment} className="p-8 pt-2 space-y-6">
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">₹</span>
                                <input
                                    autoFocus
                                    type="number"
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-10 py-5 text-3xl font-black text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    placeholder="0"
                                    value={customAmount}
                                    onChange={e => setCustomAmount(e.target.value)}
                                />
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCustomAmountModalOpen(false)}
                                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
                                >
                                    Confirm Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revert Modal */}
            {isRevertModalOpen && paymentToRevert && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsRevertModalOpen(false)}></div>
                    <div className="glass-dark w-full max-w-sm rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Revert Ledger?</h3>
                            <p className="text-slate-400 text-sm font-bold mt-2 leading-relaxed">
                                Decouple this transaction (₹{paymentToRevert.amount}) from member history? This action is semi-permanent.
                            </p>
                            <div className="mt-8 space-y-3">
                                <button
                                    onClick={handleConfirmRevert}
                                    className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                                >
                                    Confirm Deletion
                                </button>
                                <button
                                    onClick={() => setIsRevertModalOpen(false)}
                                    className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
