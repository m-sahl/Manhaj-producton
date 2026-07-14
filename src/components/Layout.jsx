import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, ArrowLeft, Settings } from 'lucide-react';

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path === '/members') return 'Members';
        if (path === '/members/add') return 'New Member';
        if (path.startsWith('/members/')) return 'Member Profile';
        if (path === '/reports') return 'Reports';
        if (path === '/settings') return 'Settings';
        return 'Manhaj';
    };

    const showBackButton = location.pathname !== '/' && location.pathname !== '/members' && location.pathname !== '/reports';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans flex flex-col transition-colors duration-300">
            {/* Unified Header */}
            <header className="glass sticky top-0 z-50 border-b border-slate-200 dark:border-white/5">
                <div className="px-5 py-4 flex justify-between items-center max-w-md mx-auto w-full">
                    <div className="flex items-center space-x-3">
                        {showBackButton && (
                            <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-95 rounded-2xl transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white capitalize leading-tight">
                                {getPageTitle()}
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-md mx-auto w-full p-4">
                    <Outlet />
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 glass-dark border-t border-slate-200/50 dark:border-white/5 pb-safe z-50">
                <div className="flex justify-around items-center max-w-md mx-auto w-full h-[68px]">
                    {[
                        { to: '/', icon: LayoutDashboard, label: 'Home', exact: true },
                        { to: '/members', icon: Users, label: 'Directory', exact: true },
                        { to: '/reports', icon: FileText, label: 'Reports', exact: true },
                        { to: '/settings', icon: Settings, label: 'Settings', exact: true },
                    ].map(({ to, icon: Icon, label }) => {
                        const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
                        return (
                            <NavLink
                                key={to}
                                to={to}
                                className="flex flex-col items-center justify-center w-full h-full gap-1 transition-all"
                            >
                                <div className={`flex items-center justify-center px-5 py-1 rounded-full transition-all duration-200 ${isActive ? 'bg-blue-100 dark:bg-blue-500/20' : ''}`}>
                                    <Icon
                                        size={20}
                                        className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                </div>
                                <span className={`text-[10px] font-semibold tracking-wide transition-all ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {label}
                                </span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
