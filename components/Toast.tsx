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
        }, 4000);
    }, []);

    // Debug: Show a welcome toast on first load to verify system
    useEffect(() => {
        showToast("Terminal session active", "info");
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 md:top-auto md:bottom-10 md:right-10 md:left-auto z-[99999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 animate-slide-up min-w-[300px] backdrop-blur-md
              ${toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400 shadow-emerald-500/20' : ''}
              ${toast.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400 shadow-rose-500/20' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500/90 text-white border-amber-400 shadow-amber-500/20' : ''}
              ${toast.type === 'info' ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-indigo-500/20' : ''}
            `}
                    >
                        <div className="bg-white/20 w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' :
                                    toast.type === 'error' ? 'fa-circle-exclamation' :
                                        toast.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'
                                }`}></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest">{toast.message}</p>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
