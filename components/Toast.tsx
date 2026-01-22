
import React, { createContext, useContext, useState, useCallback } from 'react';

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
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-up
              ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : ''}
              ${toast.type === 'error' ? 'bg-rose-500 text-white border-rose-400' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500 text-white border-amber-400' : ''}
              ${toast.type === 'info' ? 'bg-indigo-600 text-white border-indigo-500' : ''}
            `}
                    >
                        <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' :
                                toast.type === 'error' ? 'fa-circle-exclamation' :
                                    toast.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'
                            }`}></i>
                        <span className="text-[11px] font-black uppercase tracking-widest">{toast.message}</span>
                    </div>
                ))}
            </div>
            <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
      `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
