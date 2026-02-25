import { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { calculateMemberStats } from '../utils/stats';
import { Search, User, ChevronRight, Plus, Filter } from 'lucide-react';
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
        <div className="animate-fade-in space-y-6 min-h-[80vh] pb-24">
            {/* Search and Header */}
            <div className="space-y-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-500 shadow-sm glass"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                    <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 mr-2">
                        <Filter size={16} />
                    </div>
                    {[
                        { id: 'all', label: 'All Members', count: members.length },
                        { id: 'paid', label: 'Fully Paid', count: members.filter(m => m.balance <= 0).length },
                        { id: 'due', label: 'Outstanding', count: members.filter(m => m.balance > 0).length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === tab.id
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10'
                                }`}
                        >
                            {tab.label}
                            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Members List */}
            <div className="grid grid-cols-1 gap-3">
                {filteredMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-fade-in">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-4 border border-dashed border-slate-300 dark:border-white/10">
                            <User size={32} className="text-slate-400" />
                        </div>
                        <p className="font-bold text-slate-400">No results found</p>
                        <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search</p>
                    </div>
                ) : (
                    filteredMembers.map((member, index) => (
                        <Link
                            key={member._id}
                            to={`/members/${member._id}`}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className="premium-card group relative p-4 pl-6 flex items-center justify-between no-underline animate-slide-up bg-white dark:bg-slate-900/40 backdrop-blur-xl"
                        >
                            {/* Status Accent Bar */}
                            <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full transition-all group-hover:top-2 group-hover:bottom-2 ${parseFloat(member.balance) > 0 ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'}`} />

                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-transform group-hover:scale-110 ${parseFloat(member.balance) > 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-slate-900 dark:text-white font-black text-base">{member.name}</h3>
                                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-white/5 py-0.5 px-1.5 rounded text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5">
                                            #ID-{member._id.slice(0, 4)}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-slate-500">
                                        <p className="text-xs font-semibold">{member.phone}</p>
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                        <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-full border border-slate-100 dark:border-white/5">
                                            {member.subscriptionType}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="text-right flex flex-col items-end">
                                    {parseFloat(member.balance) > 0 ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Outstanding</span>
                                            <span className="text-sm font-black text-rose-600 dark:text-rose-400">₹{member.balance.toLocaleString()}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Status</span>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">Paid</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Floating Action Button */}
            <Link
                to="/members/add"
                className="fixed bottom-24 right-5 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl shadow-[0_8px_32px_rgba(79,70,229,0.3)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center justify-center hover:scale-105 active:scale-90 transition-all z-20 group"
            >
                <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
            </Link>
        </div>
    );
}

