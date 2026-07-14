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
        <div className="animate-fade-in space-y-5 pb-28 max-w-md mx-auto">

            {/* ── 1. Profile Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ${member.balance > 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'}`}>
                        {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{member.name}</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone size={11} className="text-slate-400" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">{member.phone}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setEditData({ name: member.name, phone: member.phone, subscriptionAmount: member.subscriptionAmount, subscriptionType: member.subscriptionType || 'Monthly', email: member.email || '', joinDate: member.joinDate });
                            setIsEditModalOpen(true);
                        }}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 active:scale-90 transition-all"
                    >
                        <Edit2 size={17} />
                    </button>
                    <button
                        onClick={handleDeleteMember}
                        className="p-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-500 active:scale-90 transition-all"
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            </div>

            {/* ── 2. Balance Summary Card ── */}
            <div className={`rounded-2xl p-4 border ${member.totalDue > 0 ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'}`}>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Balance</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${member.totalDue > 0 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'}`}>
                        {member.totalDue > 0 ? 'Due' : 'Paid'}
                    </span>
                </div>
                <p className={`text-3xl font-black mb-3 ${member.totalDue > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    ₹{Math.round(member.totalDue).toLocaleString()}
                </p>
                <div className="border-t border-slate-200/60 dark:border-white/10 pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Unpaid months ({member.unpaidMonthsCount})</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">₹{(member.unpaidMonthsCount * (parseFloat(member.subscriptionAmount) || 0)).toLocaleString()}</span>
                    </div>
                    {member.openingDues > 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Opening arrears</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">₹{member.openingDues.toLocaleString()}</span>
                        </div>
                    )}
                    {member.advanceCredit > 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-emerald-600 dark:text-emerald-400">Credit rollover</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">-₹{member.advanceCredit.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 3. Info Row ── */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-2xl p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Monthly Rate</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">₹{parseFloat(member.subscriptionAmount).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{member.subscriptionType}</p>
                </div>
                <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-2xl p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Advance Credit</p>
                    <p className={`text-lg font-black ${member.advanceCredit > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>₹{member.advanceCredit.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Rollover</p>
                </div>
            </div>

            {/* ── 4. Subscription Month Grid ── */}
            <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Subscription Status</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>{gridItems.filter(m => m.status === 'paid').length} paid</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>{gridItems.filter(m => m.status === 'unpaid').length} due</span>
                    </div>
                </div>
                <p className="text-[10px] text-blue-500 font-semibold mb-3">Tap a month to record payment</p>
                <div className="grid grid-cols-2 gap-2">
                    {gridItems.map((item, idx) => {
                        const isPaid = item.status === 'paid';
                        const isPartial = item.status === 'partial';
                        return (
                            <button
                                key={idx}
                                onClick={() => handleToggleMonth(item)}
                                className={`p-3 rounded-xl border text-left transition-all active:scale-95 relative overflow-hidden ${
                                    isPaid ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                                    : isPartial ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                                }`}
                            >
                                <p className="text-[10px] font-semibold text-slate-400 leading-none mb-1">
                                    {item.label || format(item.date, 'MMM yyyy')}
                                </p>
                                <p className={`text-xs font-bold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : isPartial ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                                    {isPaid ? 'Settled' : isPartial ? 'Partial' : 'Pending'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">₹{item.coverageAmount.toLocaleString()}</p>
                                {isPaid && <CheckCircle2 size={36} className="absolute -right-2 -bottom-2 text-emerald-400/20" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 5. Payment History ── */}
            {payments.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <History size={14} className="text-slate-400" />
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment History</p>
                    </div>
                    {payments.map((p, index) => {
                        const isMonthly = p.forMonth !== undefined;
                        return (
                            <div
                                key={p._id}
                                style={{ animationDelay: `${index * 40}ms` }}
                                className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-2xl animate-slide-up group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isMonthly ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600'}`}>
                                        <CreditCard size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                                            {isMonthly ? `${p.forMonth} ${p.forYear}` : 'Direct Entry'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{format(new Date(p.date), 'dd MMM yyyy • h:mm a')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <p className={`text-sm font-bold ${isMonthly ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                        ₹{Math.round(p.amount).toLocaleString()}
                                    </p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPaymentToRevert(p);
                                            setSelectedMonthDate(isMonthly ? parseMonth(p.forMonth, p.forYear) : new Date(p.date));
                                            setIsRevertModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg text-rose-400 opacity-0 group-hover:opacity-100 active:opacity-100 transition-all bg-rose-50 dark:bg-rose-500/10"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Edit Modal ── */}
            {isEditModalOpen && editData && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 z-10">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Member</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateMember} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Full Name</label>
                                <input required type="text"
                                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                                    value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Phone</label>
                                <input required type="tel"
                                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                                    value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500">Fee Amount</label>
                                    <input required type="number"
                                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                                        value={editData.subscriptionAmount} onChange={e => setEditData({ ...editData, subscriptionAmount: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500">Cycle</label>
                                    <select className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium appearance-none"
                                        value={editData.subscriptionType} onChange={e => setEditData({ ...editData, subscriptionType: e.target.value })}>
                                        <option>Monthly</option>
                                        <option>Yearly</option>
                                        <option>One-Time</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all mt-2">
                                <Save size={16} />
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Payment Modal ── */}
            {isPaymentModalOpen && selectedMonthDate && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 z-10">
                        <div className="flex items-center justify-between mb-1">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {selectedMonthStatus === 'partial' ? 'Clear Arrears' : 'Record Payment'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">{format(selectedMonthDate, 'MMMM yyyy')}</p>
                            </div>
                            {selectedMonthStatus === 'partial' && paymentToRevert && (
                                <button onClick={() => { setIsPaymentModalOpen(false); setIsRevertModalOpen(true); }}
                                    className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl active:scale-90 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        <div className="space-y-3 mt-5">
                            {selectedMonthStatus !== 'partial' && (
                                <button onClick={() => handlePostPayment(member.subscriptionAmount, true)}
                                    className="w-full bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all">
                                    <div className="text-left">
                                        <p className="text-xs text-emerald-100">Full Payment</p>
                                        <p className="text-lg font-black">₹{parseFloat(member.subscriptionAmount).toLocaleString()}</p>
                                    </div>
                                    <CheckCircle2 size={24} className="text-emerald-200" />
                                </button>
                            )}
                            <button onClick={() => { setIsPaymentModalOpen(false); setIsCustomAmountModalOpen(true); }}
                                className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all">
                                <div className="text-left">
                                    <p className="text-xs text-slate-400">{selectedMonthStatus === 'partial' ? 'Pay Remaining' : 'Custom Amount'}</p>
                                    <p className="text-base font-bold text-slate-800 dark:text-white">Enter amount</p>
                                </div>
                                <ArrowRight size={18} className="text-slate-400" />
                            </button>
                            <button onClick={() => setIsPaymentModalOpen(false)}
                                className="w-full py-3 text-sm text-slate-400 font-medium">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Custom Amount Modal ── */}
            {isCustomAmountModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCustomAmountModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Custom Amount</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Enter partial payment</p>
                            </div>
                            {member.totalDue > 0 ? (
                                <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-lg">Due ₹{member.totalDue}</span>
                            ) : (
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg">Credit ₹{member.advanceCredit}</span>
                            )}
                        </div>
                        <form onSubmit={handleCustomPayment} className="space-y-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">₹</span>
                                <input autoFocus type="number" required
                                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl pl-9 pr-4 py-4 text-2xl font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    placeholder="0" value={customAmount} onChange={e => setCustomAmount(e.target.value)} />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsCustomAmountModalOpen(false)}
                                    className="flex-1 py-3.5 text-sm font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancel</button>
                                <button type="submit"
                                    className="flex-[2] bg-blue-600 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all">Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Revert Modal ── */}
            {isRevertModalOpen && paymentToRevert && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsRevertModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 z-10 text-center">
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Payment?</h3>
                        <p className="text-sm text-slate-400 mt-1.5 mb-6">
                            Remove ₹{paymentToRevert.amount} from history? This can't be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsRevertModalOpen(false)}
                                className="flex-1 py-3.5 text-sm font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancel</button>
                            <button onClick={handleConfirmRevert}
                                className="flex-[2] bg-rose-500 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
