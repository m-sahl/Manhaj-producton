import { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { calculateMemberStats } from '../utils/stats';
import { Users, CreditCard, AlertCircle, Plus } from 'lucide-react';
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
