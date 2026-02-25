import { Moon, Sun } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
    const { showToast } = useToast();
    const { theme, toggleTheme } = useTheme();

    const handleToggle = () => {
        toggleTheme();
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        showToast(`Switched to ${nextTheme} mode`, 'success');
    };

    return (
        <div className="animate-fade-in space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
            </div>

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
                        onClick={handleToggle}
                        className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
                        aria-label="Toggle Theme"
                    >
                        <div className={`absolute left-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
                            {theme === 'dark' ? <Moon size={14} className="text-blue-600" /> : <Sun size={14} className="text-amber-500" />}
                        </div>
                    </button>
                </div>
            </section>

            <div className="text-center">
                <p className="text-xs text-slate-400 font-mono">Manhaj v1.2.0</p>
            </div>
        </div>
    );
}
