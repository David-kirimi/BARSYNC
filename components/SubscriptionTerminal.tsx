
import React, { useState } from 'react';
import { Business } from '../types';
import { useToast } from './Toast';

interface SubscriptionTerminalProps {
    business: Business;
    onUpdateStatus: (status: 'Active' | 'Trial' | 'Expired' | 'Pending Approval', note?: string) => void;
}

const SubscriptionTerminal: React.FC<SubscriptionTerminalProps> = ({ business, onUpdateStatus }) => {
    const { showToast } = useToast();
    const [paymentMsg, setPaymentMsg] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Pro' | 'Enterprise'>(business.subscriptionPlan || 'Basic');

    const plans = [
        {
            id: 'Basic',
            price: '1,500',
            features: ['Single Terminal', 'Max 5 Staff', 'Standard Reports', 'Email Support'],
            color: 'slate'
        },
        {
            id: 'Pro',
            price: '3,500',
            features: ['Unlimited Terminals', 'Unlimited Staff', 'AI Insights', 'Profit Tracking'],
            color: 'indigo'
        },
        {
            id: 'Enterprise',
            price: '7,000',
            features: ['Bulk Stock Management', 'Multi-Location Sync', 'API Access', 'Priority Support'],
            color: 'emerald'
        }
    ];

    const handlePaymentSubmit = () => {
        if (!paymentMsg.trim()) {
            showToast("Please paste the payment message!", "warning");
            return;
        }
        onUpdateStatus('Pending Approval', paymentMsg);
        showToast("Payment submitted for verification!", "success");
    };

    return (
        <div className="space-y-10 p-4 md:p-10 pt-20 md:pt-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Subscription Hub</h1>
                <p className="text-slate-500 font-medium max-w-md mx-auto">Scale your business with professional tools designed for efficiency.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id as any)}
                        className={`cursor-pointer group relative p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${selectedPlan === plan.id
                            ? 'border-indigo-600 bg-white shadow-2xl scale-105 z-10'
                            : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 opacity-60'
                            }`}
                    >
                        {selectedPlan === plan.id && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                Selected
                            </div>
                        )}
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{plan.id}</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-sm font-bold text-slate-400">Ksh</span>
                            <span className="text-4xl font-black text-slate-800 tracking-tighter">{plan.price}</span>
                            <span className="text-[10px] font-bold text-slate-400">/mo</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            {plan.features.map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                    <i className="fa-solid fa-circle-check text-indigo-500"></i>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="bg-slate-950 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tighter uppercase">Activate Terminal</h2>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            To activate your subscription, please pay the monthly fee for your selected plan to:
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bank</span>
                                <span className="font-black text-indigo-400">DTB Account Paybill</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Paybill Number</span>
                                <span className="text-2xl font-black tracking-widest">516600</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Account Number</span>
                                <span className="text-xl font-black tracking-tight text-emerald-400">5492080001</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Payment Verification</label>
                            <textarea
                                className="w-full h-40 bg-white/5 border border-white/10 rounded-3xl p-6 text-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium placeholder:text-slate-600 text-white"
                                placeholder="Paste your M-Pesa or Bank confirmation message here..."
                                value={paymentMsg}
                                onChange={(e) => setPaymentMsg(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handlePaymentSubmit}
                            disabled={business.subscriptionStatus === 'Pending Approval'}
                            className={`w-full py-6 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-xl ${business.subscriptionStatus === 'Pending Approval'
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20'
                                }`}
                        >
                            {business.subscriptionStatus === 'Pending Approval' ? 'Wait for Approval' : 'Submit for Verification'}
                        </button>
                        {business.subscriptionStatus === 'Pending Approval' && (
                            <p className="text-center text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                                Verification in progress by SLIEM Tech
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionTerminal;
