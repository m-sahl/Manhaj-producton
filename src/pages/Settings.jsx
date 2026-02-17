import { useState, useEffect } from 'react';
import { Moon, Sun, KeyRound, Eye, EyeOff, ShieldCheck, Clock, Monitor, Timer, X, User, Pencil, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from '../context/ToastContext';

export default function Settings() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    // Admin Name State
    const [adminName, setAdminName] = useState(localStorage.getItem('admin_name') || 'Admin');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(adminName);
    const updateNameMutation = useMutation(api.auth.updateName);

    // Admin Username State
    const [adminUsername, setAdminUsername] = useState(localStorage.getItem('admin_username') || 'admin');
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [tempUsername, setTempUsername] = useState(adminUsername);
    const updateUsernameMutation = useMutation(api.auth.updateUsername);


    const handleUpdateName = async () => {
        if (!tempName.trim()) {
            showToast('Name cannot be empty', 'error');
            return;
        }
        try {
            await updateNameMutation({ name: tempName });
            localStorage.setItem('admin_name', tempName);
            setAdminName(tempName);
            setIsEditingName(false);
            window.dispatchEvent(new Event('adminProfileChanged'));
            showToast('Name updated successfully', 'success');
        } catch (err) {
            showToast('Failed to update name', 'error');
            console.error(err);
        }
    };

    const handleUpdateUsername = async () => {
        if (!tempUsername.trim()) {
            showToast('Username cannot be empty', 'error');
            return;
        }
        try {
            const result = await updateUsernameMutation({ username: tempUsername });
            if (result.success) {
                localStorage.setItem('admin_username', tempUsername);
                setAdminUsername(tempUsername);
                setIsEditingUsername(false);
                showToast('Username updated successfully', 'success');
            } else {
                showToast(result.message || 'Failed to update username', 'error');
            }
        } catch (err) {
            showToast('Failed to update username', 'error');
            console.error(err);
        }
    };

    // Security States
    const [autoLogout, setAutoLogout] = useState(localStorage.getItem('auto_logout') === 'true');
    const [logoutDuration, setLogoutDuration] = useState(parseInt(localStorage.getItem('logout_duration')) || 15);

    // Session Info
    const lastLogin = localStorage.getItem('last_login');
    const loginDevice = localStorage.getItem('login_device') || 'Current Session';

    // Password Prompt State
    const [promptState, setPromptState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onSuccess: null
    });
    const [promptPassword, setPromptPassword] = useState('');
    const [promptError, setPromptError] = useState('');
    const [showPromptPassword, setShowPromptPassword] = useState(false);

    const openPrompt = (title, message, onSuccess) => {
        setPromptState({ isOpen: true, title, message, onSuccess });
        setPromptPassword('');
        setPromptError('');
        setShowPromptPassword(false);
    };

    const closePrompt = () => {
        setPromptState({ ...promptState, isOpen: false });
        setPromptPassword('');
        setPromptError('');
    };

    const verifyMutation = useMutation(api.auth.verify);

    const handlePromptSubmit = async (e) => {
        e.preventDefault();
        setPromptError('');
        const result = await verifyMutation({ password: promptPassword });
        if (result.success) {
            promptState.onSuccess();
            closePrompt();
        } else {
            setPromptError('Incorrect admin password');
            setPromptPassword('');
        }
    };

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const updatePasswordMutation = useMutation(api.auth.updatePassword);

    const handleChangePassword = async () => {
        if (passData.new.length < 4) {
            showToast('New password must be at least 4 characters', 'warning');
            return;
        }
        if (passData.new !== passData.confirm) {
            showToast('New passwords do not match', 'error');
            return;
        }

        try {
            const result = await updatePasswordMutation({
                currentPassword: passData.current,
                newPassword: passData.new
            });

            if (result.success) {
                showToast('Password updated successfully', 'success');
                setIsChangingPassword(false);
                setPassData({ current: '', new: '', confirm: '' });
            } else {
                showToast('Failed to update password: ' + result.message, 'error');
            }
        } catch (err) {
            showToast('Connection error. Please try again.', 'error');
        }
    };

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('auto_logout', autoLogout);
        localStorage.setItem('logout_duration', logoutDuration);
        // Dispatch a custom event to notify App.jsx of setting changes
        window.dispatchEvent(new Event('securitySettingsChanged'));
    }, [autoLogout, logoutDuration]);

    const handleLogout = () => {
        openPrompt(
            "Confirm Logout",
            "Please enter your admin password to sign out.",
            () => {
                localStorage.removeItem('auth_token');
                navigate('/login');
            }
        );
    };

    return (
        <div className="animate-fade-in space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
            </div>

            {/* Account Section - Logout & Security */}
            <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700/50 mb-6 space-y-6">
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                            <User size={24} />
                        </div>
                        <div>
                            {isEditingName ? (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-900 dark:text-white w-40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        autoFocus
                                    />
                                    <button onClick={handleUpdateName} className="p-1.5 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20 transition-colors">
                                        <Check size={14} />
                                    </button>
                                    <button onClick={() => { setIsEditingName(false); setTempName(adminName); }} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2 group">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{adminName}</h3>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="text-slate-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Edit Name"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>
                            )}
                            {isEditingUsername ? (
                                <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-slate-400 text-sm">@</span>
                                    <input
                                        type="text"
                                        value={tempUsername}
                                        onChange={(e) => setTempUsername(e.target.value)}
                                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        autoFocus
                                    />
                                    <button onClick={handleUpdateUsername} className="p-1 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-500/20 transition-colors">
                                        <Check size={12} />
                                    </button>
                                    <button onClick={() => { setIsEditingUsername(false); setTempUsername(adminUsername); }} className="p-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-1 group mt-0.5">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">@{adminUsername}</p>
                                    <button
                                        onClick={() => setIsEditingUsername(true)}
                                        className="text-slate-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                                        title="Edit Username"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-xl active:scale-95 transition-all text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-100 dark:border-rose-500/10"
                    >
                        Log Out
                    </button>
                </div>

                {/* Change Password Panel */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                        className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-sm mb-4"
                    >
                        <KeyRound size={16} />
                        <span>{isChangingPassword ? 'Cancel Password Change' : 'Change Admin Password'}</span>
                    </button>

                    {isChangingPassword && (
                        <form className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl space-y-3 animate-fade-in border border-slate-200 dark:border-slate-700" autoComplete="off">
                            <div className="relative">
                                <input
                                    type={showChangePassword ? "text" : "password"}
                                    placeholder="Current Password"
                                    autoComplete="new-password"
                                    value={passData.current}
                                    onChange={e => setPassData({ ...passData, current: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowChangePassword(!showChangePassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showChangePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <input
                                type={showChangePassword ? "text" : "password"}
                                placeholder="New Password"
                                autoComplete="new-password"
                                value={passData.new}
                                onChange={e => setPassData({ ...passData, new: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <input
                                type={showChangePassword ? "text" : "password"}
                                placeholder="Confirm New Password"
                                autoComplete="new-password"
                                value={passData.confirm}
                                onChange={e => setPassData({ ...passData, confirm: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <button
                                type="button"
                                onClick={handleChangePassword}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20"
                            >
                                Update Password
                            </button>
                        </form>
                    )}
                </div>
            </section>

            {/* Appearance Section */}
            <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                            {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Appearance</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Toggle between Light and Dark mode</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
                        aria-label="Toggle Theme"
                    >
                        <div className={`absolute left-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
                            {theme === 'dark' ? <Moon size={14} className="text-blue-600" /> : <Sun size={14} className="text-amber-500" />}
                        </div>
                    </button>
                </div>
            </section>

            {/* Security Privacy Section */}
            <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 ml-2 text-[10px]">Security & Privacy</h3>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700/50 space-y-6">
                    {/* Auto-Logout */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                                <Timer size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Auto-Logout</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Lock app after inactivity</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const newState = !autoLogout;
                                setAutoLogout(newState);
                                showToast(
                                    `Auto-logout ${newState ? 'enabled' : 'disabled'}`,
                                    newState ? 'success' : 'info'
                                );
                            }}
                            className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 ${autoLogout ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${autoLogout ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {autoLogout && (
                        <div className="pl-14 pt-2 animate-fade-in space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Inactivity Timeout
                            </p>
                            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl w-full max-w-md">
                                {[5, 10, 15, 30, 60].map(mins => (
                                    <button
                                        key={mins}
                                        onClick={() => {
                                            setLogoutDuration(mins);
                                            showToast(`Auto-logout set to ${mins} minutes`, 'info');
                                        }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${logoutDuration === mins
                                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        {mins}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Session Info */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-700 space-y-4">
                        <div className="flex items-start space-x-4">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Session Intelligence</h3>
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                                        <Clock size={12} />
                                        <span>Last Login: {lastLogin ? format(new Date(lastLogin), 'iii, dd MMM - HH:mm') : 'First session'}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                                        <Monitor size={12} />
                                        <span>Device: {loginDevice}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="text-center">
                <p className="text-xs text-slate-400 font-mono">Manhaj v1.2.0</p>
            </div>

            {/* Password Validation Modal */}
            {promptState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative">
                        <button
                            onClick={closePrompt}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{promptState.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{promptState.message}</p>
                        </div>

                        <form onSubmit={handlePromptSubmit} className="space-y-4" autoComplete="off">
                            <div className="relative">
                                <input
                                    autoFocus
                                    type={showPromptPassword ? "text" : "password"}
                                    placeholder="Enter Admin Password"
                                    autoComplete="new-password"
                                    value={promptPassword}
                                    onChange={e => setPromptPassword(e.target.value)}
                                    className="w-full text-center text-lg font-bold tracking-widest px-12 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPromptPassword(!showPromptPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1"
                                >
                                    {showPromptPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {promptError && (
                                <p className="text-rose-500 text-xs text-center font-bold bg-rose-50 dark:bg-rose-500/10 py-2 rounded-lg border border-rose-100 dark:border-rose-500/20">
                                    {promptError}
                                </p>
                            )}
                            <button
                                type="submit"
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                            >
                                Confirm Access
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
