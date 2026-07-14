import { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { calculateMemberStats } from '../utils/stats';
import { Users, CreditCard, AlertCircle, Plus, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import RevenueChart from '../components/RevenueChart';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div
        className="w-full text-left bg-white dark:bg-slate-800/50 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none relative overflow-hidden"
    >
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${color}`}></div>
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
                {subtext && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-900/50 ${color.replace('bg-', 'text-')}`}>
                <Icon size={20} />
            </div>
        </div>
    </div>
);

export default function Dashboard() {
    const membersData = useQuery(api.members.list);
    const paymentsData = useQuery(api.payments.list, {});

    const members = (membersData && paymentsData)
        ? membersData.map(m => calculateMemberStats(m, paymentsData))
        : [];

    const stats = {
        totalMembers: members.length,
        totalPending: members.reduce((sum, m) => sum + (m.balance > 0 ? m.balance : 0), 0),
        members,
        pendingMembers: members.filter(m => m.balance > 0)
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10 max-w-md mx-auto px-1">
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    title="Total Members"
                    value={stats.totalMembers}
                    icon={Users}
                    color="bg-blue-600"
                />
                <StatCard
                    title="Pending Dues"
                    value={`₹${stats.totalPending.toLocaleString()}`}
                    icon={AlertCircle}
                    color="bg-rose-500"
                />
            </div>

            {/* Revenue Chart */}
            {paymentsData && paymentsData.length > 0 && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <RevenueChart payments={paymentsData} />
                </div>
            )}

            {/* Outstanding Dues List */}
            {stats.pendingMembers.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            Outstanding Dues
                        </h2>
                        <Link to="/members" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                            View All
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                        {stats.pendingMembers.slice(0, 5).map((member) => (
                            <Link
                                key={member._id}
                                to={`/members/${member._id}`}
                                className="premium-card group relative p-4 pl-6 flex items-center justify-between no-underline bg-white dark:bg-slate-900/40 backdrop-blur-xl transition-all active:scale-[0.98]"
                            >
                                {/* Status Accent Bar */}
                                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-all group-hover:top-2 group-hover:bottom-2" />

                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center font-black text-rose-600 dark:text-rose-400 shadow-inner">
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{member.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{member.unpaidMonthsCount} month{member.unpaidMonthsCount !== 1 ? 's' : ''} due</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-[9px] font-black uppercase text-rose-500 tracking-tighter">Due</span>
                                        <span className="text-sm font-black text-rose-600 dark:text-rose-400">₹{member.balance.toLocaleString()}</span>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                        <ChevronRight size={14} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {stats.pendingMembers.length > 5 && (
                            <Link to="/members" className="text-center py-2 text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors">
                                + {stats.pendingMembers.length - 5} more members with dues
                            </Link>
                        )}
                    </div>
                </div>
            )}



            <div className="pt-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                    <Link to="/members/add" className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg shadow-blue-500/30 dark:shadow-blue-900/20 active:scale-95 transition-all">
                        <div className="bg-white/20 p-3 rounded-full">
                            <Plus size={24} className="text-white" />
                        </div>
                        <span className="font-medium text-sm text-white">Add Member</span>
                    </Link>

                    <Link to="/members" className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 border border-slate-200 dark:border-slate-700 transition-colors active:scale-95 shadow-sm dark:shadow-none">
                        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">
                            <Users size={24} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-sm text-slate-600 dark:text-slate-300">View Directory</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
