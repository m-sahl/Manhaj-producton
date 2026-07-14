import { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { calculateMemberStats } from '../utils/stats';
import { Search, User, ChevronRight, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Members() {
    const membersData = useQuery(api.members.list);
    const paymentsData = useQuery(api.payments.list, {});
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'due'
    const navigate = useNavigate();

    const members = (membersData && paymentsData)
        ? membersData.map(m => calculateMemberStats(m, paymentsData))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];

    const filteredMembers = members.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
        const matchesStatus =
            statusFilter === 'all' ? true :
                statusFilter === 'paid' ? parseFloat(m.balance) <= 0 :
                    statusFilter === 'due' ? parseFloat(m.balance) > 0 : true;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="animate-fade-in max-w-md mx-auto px-4 pt-2 pb-28 min-h-screen">

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Search members…"
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none mb-4">
                {[
                    { id: 'all', label: 'All', count: members.length },
                    { id: 'paid', label: 'Paid', count: members.filter(m => m.balance <= 0).length },
                    { id: 'due', label: 'Due', count: members.filter(m => m.balance > 0).length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                            statusFilter === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        {tab.label}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            statusFilter === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Members List */}
            <div className="flex flex-col gap-2">
                {filteredMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 animate-fade-in">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                            <User size={28} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-400">No members found</p>
                        <p className="text-xs text-slate-400 mt-1">Try a different search or filter</p>
                    </div>
                ) : (
                    filteredMembers.map((member, index) => {
                        const hasDue = parseFloat(member.balance) > 0;
                        return (
                            <Link
                                key={member._id}
                                to={`/members/${member._id}`}
                                style={{ animationDelay: `${index * 30}ms` }}
                                className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 active:scale-[0.98] transition-all no-underline animate-slide-up"
                            >
                                {/* Avatar + Name */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${
                                        hasDue
                                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'
                                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                                    }`}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                                        {member.name}
                                    </span>
                                </div>

                                {/* Balance / Status */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {hasDue ? (
                                        <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-lg">
                                            ₹{parseFloat(member.balance).toLocaleString()}
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                            Paid
                                        </span>
                                    )}
                                    <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Floating Action Button */}
            <Link
                to="/members/add"
                className="fixed bottom-24 right-5 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-90 transition-all z-20"
            >
                <Plus size={24} />
            </Link>
        </div>
    );
}

