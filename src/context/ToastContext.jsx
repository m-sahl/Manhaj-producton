import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-emerald-500" size={20} />;
            case 'error': return <AlertCircle className="text-rose-500" size={20} />;
            case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
            default: return <Info className="text-blue-500" size={20} />;
        }
    };

    const getStyles = (type) => {
        switch (type) {
            case 'success': return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-500/30';
            case 'error': return 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-500/30';
            case 'warning': return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/30';
            default: return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-500/30';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto
                            flex items-center gap-3 min-w-[300px] max-w-sm p-4 rounded-2xl shadow-lg border backdrop-blur-md
                            transform transition-all duration-300 animate-toast-slide-in
                            ${getStyles(toast.type)}
                        `}
                    >
                        <div className="shrink-0">
                            {getIcon(toast.type)}
                        </div>
                        <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {toast.message}
                        </p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
