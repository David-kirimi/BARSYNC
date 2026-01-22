import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        console.log(`[Toast] ${type.toUpperCase()}: ${message}`);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    // Show a welcome toast to verify system visibility
    useEffect(() => {
        const timer = setTimeout(() => {
            showToast("Terminal Gateway Ready", "success");
        }, 1500);
        return () => clearTimeout(timer);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-10 left-1/2 -translate-x-1/2 md:top-auto md:bottom-12 md:right-12 md:left-auto z-[9999999] flex flex-col gap-4 pointer-events-none md:translate-x-0">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 flex items-center gap-5 animate-slide-up min-w-[340px]
              ${toast.type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/50' : ''}
              ${toast.type === 'error' ? 'bg-slate-900 text-rose-400 border-rose-500/50' : ''}
              ${toast.type === 'warning' ? 'bg-slate-900 text-amber-400 border-amber-500/50' : ''}
              ${toast.type === 'info' ? 'bg-slate-900 text-indigo-400 border-indigo-500/50' : ''}
            `}
                    >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20' :
                                    toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-indigo-500/10 border-indigo-500/20'
                            }`}>
                            <i className={`fa-solid text-lg ${toast.type === 'success' ? 'fa-circle-check' :
                                    toast.type === 'error' ? 'fa-circle-exclamation' :
                                        toast.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'
                                }`}></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em]">{toast.message}</p>
                            <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mt-0.5">System Notification</p>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
        @keyframes slide-up {
          from { transform: translateY(30px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
      `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
