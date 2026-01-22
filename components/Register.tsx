
import React, { useState } from 'react';
import { User, Business } from '../types';

interface RegisterProps {
    onBack: () => void;
    onSuccess: (user: User, business: Business) => void;
    backendUrl: string;
}

const Register: React.FC<RegisterProps> = ({ onBack, onSuccess, backendUrl }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        businessName: '',
        ownerName: '',
        password: '',
        plan: 'Basic' as 'Basic' | 'Pro' | 'Enterprise',
        paymentMethod: 'Mpesa' as 'Mpesa' | 'PayPal' | 'Card'
    });

    const plans = [
        { id: 'Basic', price: '1,500', features: ['Single Terminal', 'Max 5 Staff'] },
        { id: 'Pro', price: '3,500', features: ['Multi-Terminal', 'Unlimited Staff', 'AI Insights'] },
        { id: 'Enterprise', price: '7,000', features: ['Multi-Location', 'API Access', 'Priority Support'] }
    ];

    const handleRegister = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${backendUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Registration failed');

            onSuccess(result.user, result.business);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl w-full">
            <div className="bg-white/95 backdrop-blur rounded-[3.5rem] p-10 shadow-2xl space-y-8 border border-white/20 relative overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <button onClick={onBack} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">
                        <i className="fa-solid fa-arrow-left mr-2"></i> Back to Login
                    </button>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Step {step} of 3</span>
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Identity Setup</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Found Your Network Node</p>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Business Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Skyline Lounge"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold"
                                    value={formData.businessName}
                                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Owner Name</label>
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold"
                                    value={formData.ownerName}
                                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Master PIN/Pass</label>
                                <input
                                    type="password"
                                    placeholder="••••••"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold tracking-widest"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            disabled={!formData.businessName || !formData.ownerName || !formData.password}
                            onClick={() => setStep(2)}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Configure Plan <i className="fa-solid fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Scale Options</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Select Execution Tier</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {plans.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setFormData({ ...formData, plan: p.id as any })}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.plan === p.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-black text-slate-800 uppercase text-sm">{p.id}</h3>
                                        <span className="text-indigo-600 font-black text-xs">Ksh {p.price}/mo</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{p.features.join(' • ')}</p>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setStep(3)}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-indigo-700"
                        >
                            Continue to Payment <i className="fa-solid fa-credit-card ml-2"></i>
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Checkout</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Finalize Activation</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {(['Mpesa', 'PayPal', 'Card'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setFormData({ ...formData, paymentMethod: m })}
                                    className={`py-6 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === m ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100'
                                        }`}
                                >
                                    <i className={`fa-solid ${m === 'Mpesa' ? 'fa-mobile-screen' : m === 'PayPal' ? 'fa-brands fa-paypal' : 'fa-credit-card'} text-lg text-slate-700`}></i>
                                    <span className="text-[8px] font-black uppercase">{m}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase">
                                <span className="text-slate-400">Order Summary</span>
                                <span className="text-slate-800">{formData.plan} Plan</span>
                            </div>
                            <div className="flex justify-between text-xl font-black uppercase tracking-tighter">
                                <span className="text-slate-800">Total</span>
                                <span className="text-indigo-600">Ksh {plans.find(p => p.id === formData.plan)?.price}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-500 p-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center">
                                {error}
                            </div>
                        )}

                        <button
                            disabled={loading}
                            onClick={handleRegister}
                            className="w-full py-6 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-emerald-100 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                                    Processing Gateway...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-bolt"></i>
                                    Complete Activation
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
