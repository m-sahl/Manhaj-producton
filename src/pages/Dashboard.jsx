import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { calculateMemberStats } from '../utils/stats';
import { Users, Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import RevenueChart from '../components/RevenueChart';

export default function Dashboard() {
    const membersData = useQuery(api.members.list);
    const paymentsData = useQuery(api.payments.list, {});

    const members = (membersData && paymentsData)
        ? membersData.map(m => calculateMemberStats(m, paymentsData))
        : [];

    const paidUp = members.filter(m => m.balance <= 0);
    const pendingMembers = members
        .filter(m => m.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(2, 3);

    const stats = {
        totalMembers: members.length,
        totalPending: members.reduce((sum, m) => sum + (m.balance > 0 ? m.balance : 0), 0),
        paidUp: paidUp.length,
    };

    return (
        <div className="space-y-5 animate-fade-in pb-10 max-w-md mx-auto px-1">

            {/* Stat cards — primary wide + two below */}
            <div className="space-y-3">
                {/* Primary card — Members */}
                <div className="w-full bg-blue-600 p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10"></div>
                    <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/5"></div>
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200 mb-1">Total Members</p>
                            <h3 className="text-4xl font-bold text-white">{stats.totalMembers}</h3>
                            <p className="text-xs text-blue-200 mt-1">{stats.paidUp} paid · {stats.totalMembers - stats.paidUp} with dues</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/20">
                            <Users size={24} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* Secondary row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 p-4 rounded-2xl relative overflow-hidden">
                        <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-emerald-500/10"></div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Paid Up</p>
                        <h3 className="text-2xl font-bold text-emerald-500">{stats.paidUp}</h3>
                        <p className="text-xs text-slate-400 mt-1">members</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 p-4 rounded-2xl relative overflow-hidden">
                        <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-rose-500/10"></div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Total Dues</p>
                        <h3 className="text-2xl font-bold text-rose-500">₹{(stats.totalPending / 1000).toFixed(1)}k</h3>
                        <p className="text-xs text-slate-400 mt-1">outstanding</p>
                    </div>
                </div>
            </div>

            {/* #5 — Revenue chart with period selector inside */}
            {paymentsData && paymentsData.length > 0 && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <RevenueChart payments={paymentsData} />
                </div>
            )}

            {/* #6 — Top 3 overdue members sorted by amount */}
            {pendingMembers.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Top Overdue</p>
                        <Link to="/members" className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            View all
                        </Link>
                    </div>
                    {pendingMembers.map((member) => (
                        <Link
                            key={member._id}
                            to={`/members/${member._id}`}
                            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-2xl active:scale-[0.98] transition-all no-underline"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-sm font-bold text-rose-500 shrink-0">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{member.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{member.unpaidMonthsCount} month{member.unpaidMonthsCount !== 1 ? 's' : ''} overdue</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-lg">
                                    ₹{Math.round(member.balance).toLocaleString()}
                                </span>
                                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Add member button */}
            <Link
                to="/members/add"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-2xl shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
            >
                <Plus size={18} />
                Add Member
            </Link>
        </div>
    );
}
