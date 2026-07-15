import { Link } from 'react-router-dom';
import { Users, CheckCircle2, TrendingUp, Shield, ArrowRight, Smartphone } from 'lucide-react';

const features = [
    {
        icon: Users,
        title: 'Member Directory',
        desc: 'Manage all members in one place. Search, filter by payment status, and access any profile instantly.',
    },
    {
        icon: TrendingUp,
        title: 'Revenue Tracking',
        desc: 'Live chart of monthly collections. See trends across days, months, or the last 6 months at a glance.',
    },
    {
        icon: CheckCircle2,
        title: 'Payment Recording',
        desc: 'Record full or partial payments per month. Credit rolls over automatically. History is always auditable.',
    },
    {
        icon: Shield,
        title: 'PDF Reports',
        desc: 'Generate and download collection reports for any date range — daily, monthly, quarterly, or custom.',
    },
];

export default function Landing() {
    return (
        <div className="min-h-screen bg-[#0F172A] text-white font-sans overflow-x-hidden">

            {/* ── Nav ── */}
            <nav className="max-w-md mx-auto px-5 py-5 flex items-center justify-between">
                <span className="text-lg font-bold tracking-tight text-white">Manhaj</span>
                <Link
                    to="/dashboard"
                    className="text-xs font-semibold text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl hover:bg-blue-500/10 transition-all"
                >
                    Open App
                </Link>
            </nav>

            {/* ── Hero ── */}
            <section className="max-w-md mx-auto px-5 pt-10 pb-16 text-center">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    Institution Management
                </div>

                <h1 className="text-4xl font-bold leading-tight tracking-tight text-white mb-4">
                    Member dues,<br />
                    <span className="text-blue-400">finally organised.</span>
                </h1>

                <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                    Track subscriptions, record payments, and generate reports — built for institutions managing recurring dues on mobile.
                </p>

                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                    Get Started
                    <ArrowRight size={16} />
                </Link>

                {/* ── App UI Preview ── */}
                <div className="mt-12 relative">
                    {/* Glow */}
                    <div className="absolute inset-x-8 top-4 h-32 bg-blue-600/20 blur-3xl rounded-full"></div>

                    {/* Phone shell */}
                    <div className="relative mx-auto w-[220px] bg-[#1E293B] rounded-[2rem] border border-white/10 shadow-2xl p-3 text-left">
                        {/* Status bar */}
                        <div className="flex justify-between items-center px-2 pb-2">
                            <span className="text-[9px] text-slate-500 font-mono">9:41</span>
                            <div className="flex gap-1">
                                <div className="w-3 h-1.5 rounded-sm bg-slate-600"></div>
                                <div className="w-1 h-1.5 rounded-sm bg-slate-600"></div>
                            </div>
                        </div>

                        {/* Page title */}
                        <p className="text-[11px] font-bold text-white px-1 mb-3">Dashboard</p>

                        {/* Primary stat card */}
                        <div className="bg-blue-600 rounded-xl p-3 mb-2 relative overflow-hidden">
                            <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-white/10"></div>
                            <p className="text-[8px] text-blue-200 font-semibold uppercase tracking-wide">Total Members</p>
                            <p className="text-2xl font-bold text-white">48</p>
                            <p className="text-[8px] text-blue-200 mt-0.5">41 paid · 7 with dues</p>
                        </div>

                        {/* Secondary cards */}
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                            <div className="bg-[#0F172A] rounded-xl p-2.5 border border-white/5">
                                <p className="text-[7px] text-slate-500 uppercase tracking-wide">Paid Up</p>
                                <p className="text-base font-bold text-emerald-400">41</p>
                                <p className="text-[7px] text-slate-500">members</p>
                            </div>
                            <div className="bg-[#0F172A] rounded-xl p-2.5 border border-white/5">
                                <p className="text-[7px] text-slate-500 uppercase tracking-wide">Dues</p>
                                <p className="text-base font-bold text-rose-400">₹3.5k</p>
                                <p className="text-[7px] text-slate-500">outstanding</p>
                            </div>
                        </div>

                        {/* Mini chart */}
                        <div className="bg-[#0F172A] rounded-xl p-2.5 border border-white/5 mb-2">
                            <p className="text-[7px] text-slate-500 font-semibold mb-2">Revenue Trend</p>
                            <svg viewBox="0 0 100 30" className="w-full h-8">
                                <defs>
                                    <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d="M0,30 L0,20 C15,20 20,10 35,12 C50,14 55,5 70,8 C85,11 90,6 100,4 L100,30 Z" fill="url(#lg)" />
                                <path d="M0,20 C15,20 20,10 35,12 C50,14 55,5 70,8 C85,11 90,6 100,4" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </div>

                        {/* Bottom nav dots */}
                        <div className="flex justify-around pt-1 pb-0.5">
                            {['Home', 'Dir', 'Rep', 'Set'].map((label, i) => (
                                <div key={label} className="flex flex-col items-center gap-0.5">
                                    <div className={`w-4 h-4 rounded-md ${i === 0 ? 'bg-blue-500/20' : 'bg-transparent'} flex items-center justify-center`}>
                                        <div className={`w-2 h-2 rounded-sm ${i === 0 ? 'bg-blue-400' : 'bg-slate-600'}`}></div>
                                    </div>
                                    <span className={`text-[6px] ${i === 0 ? 'text-blue-400' : 'text-slate-600'}`}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="max-w-md mx-auto px-5 pb-16">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-5 text-center">What's inside</p>
                <div className="space-y-3">
                    {features.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-4 bg-[#1E293B] border border-white/5 rounded-2xl p-4">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                                <Icon size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
                                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="max-w-md mx-auto px-5 pb-16 text-center">
                <div className="bg-[#1E293B] border border-white/5 rounded-2xl p-8">
                    <Smartphone size={28} className="text-blue-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Built for mobile.</h2>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                        Designed to be used from your phone — no desktop required. Collect dues, check balances, and pull reports from anywhere.
                    </p>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                        Open Manhaj
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="max-w-md mx-auto px-5 pb-10 text-center">
                <p className="text-xs text-slate-600">Manhaj v1.2.0 — Institution Management System</p>
            </footer>
        </div>
    );
}
