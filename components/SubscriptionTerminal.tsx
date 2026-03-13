
import React, { useState, useMemo } from 'react';
import { Business, Invoice } from '../types';
import { useToast } from './Toast';
import { generateInvoicePDF } from '../lib/invoicePDF';

interface SubscriptionTerminalProps {
    business: Business;
    onUpdateStatus: (status: 'Active' | 'Trial' | 'Expired' | 'Pending Approval', note?: string) => void;
}

const SubscriptionTerminal: React.FC<SubscriptionTerminalProps> = ({ business, onUpdateStatus }) => {
    const { showToast } = useToast();
    const [verificationNote, setVerificationNote] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Pro' | 'Enterprise'>(business.subscriptionPlan || 'Basic');

    const plans = [
        {
            id: 'Basic',
            price: '1,500',
            features: ['Single Terminal', 'Max 5 Staff', 'Standard Reports', 'Email Support'],
        },
        {
            id: 'Pro',
            price: '3,500',
            features: ['Unlimited Terminals', 'Unlimited Staff', 'AI Insights', 'Profit Tracking'],
        },
        {
            id: 'Enterprise',
            price: '7,000',
            features: ['Bulk Stock Management', 'Multi-Location Sync', 'API Access', 'Priority Support'],
        }
    ];

    const isNearExpiry = useMemo(() => {
        if (!business.expiryDate) return false;
        const expiry = new Date(business.expiryDate).getTime();
        const now = new Date().getTime();
        const fiveDays = 5 * 24 * 60 * 60 * 1000;
        return (expiry - now) < fiveDays;
    }, [business.expiryDate]);

    const showPaymentOptions = business.subscriptionStatus !== 'Active' || isNearExpiry;

    return (
        <div className="space-y-12 p-4 md:p-10 pt-20 md:pt-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
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

            {/* Account Status & Next Billing */}
            {(business.expiryDate || business.nextBillingDate) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 text-2xl">
                            <i className="fa-solid fa-calendar-xmark"></i>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Expiry</p>
                            <h4 className="text-xl font-black text-slate-800 tracking-tight">
                                {business.expiryDate ? new Date(business.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                            </h4>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6">
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 text-2xl">
                            <i className="fa-solid fa-calendar-check"></i>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Next Billing Date</p>
                            <h4 className="text-xl font-black text-slate-800 tracking-tight">
                                {business.nextBillingDate ? new Date(business.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                            </h4>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Section */}
            {showPaymentOptions ? (
                <div className="bg-slate-950 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Activate Terminal</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter leading-none">
                                Ready to scale <br />your business?
                            </h2>
                            <p className="text-slate-400 font-medium text-lg max-w-md mb-8">
                                Complete your payment verification to unlock the full power of BarSync.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {/* Option 1: Bank */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/10 transition-all group">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl">
                                        <i className="fa-solid fa-building-columns"></i>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Option 1: Bank Paybill</p>
                                        <h3 className="text-xl font-black">Direct Transfer</h3>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Paybill (DTB)</span>
                                        <span className="text-lg font-black text-white tracking-widest">516600</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Account Number</span>
                                        <span className="text-lg font-black text-indigo-400 tracking-widest">5492080001</span>
                                    </div>
                                </div>
                            </div>

                            {/* Option 2: MPESA */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/10 transition-all group">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-2xl">
                                        <i className="fa-solid fa-mobile-screen-button"></i>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">Option 2: M-Pesa Direct</p>
                                        <h3 className="text-xl font-black">Instant Activation</h3>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Contact Support</span>
                                        <span className="text-lg font-black text-white tracking-widest">+254 757 983 954</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Direct Send</span>
                                        <span className="text-lg font-black text-emerald-400 tracking-widest">0757983954</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex-1 max-w-lg">
                            <h4 className="text-xl font-black mb-3">Submit Payment Details</h4>
                            <p className="text-sm text-slate-400 font-medium">Paste your bank or M-Pesa confirmation message below for manual verification.</p>
                        </div>
                        <div className="flex-1 w-full flex gap-3">
                            <input
                                value={verificationNote}
                                onChange={(e) => setVerificationNote(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-white"
                                placeholder="Paste confirmation message here..."
                            />
                            <button
                                onClick={() => {
                                    if (!verificationNote) return;
                                    onUpdateStatus('Pending Approval', verificationNote);
                                    setVerificationNote('');
                                    showToast("Payment submitted for verification!", "success");
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-500/20"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-[3rem] p-12 flex items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                        <div className="w-16 h-16 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-200">
                            <i className="fa-solid fa-shield-check"></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Account Fully Secured</h3>
                            <p className="text-emerald-600 font-bold text-sm">Your subscription is active and verified. Payment options are hidden until near expiry.</p>
                        </div>
                    </div>
                    <div className="px-6 py-3 bg-white rounded-2xl border border-emerald-100 flex flex-col items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                        <p className="text-sm font-black text-emerald-600 uppercase">Verified</p>
                    </div>
                </div>
            )}

            {/* Invoice History */}
            <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Invoice History</h3>
                        <p className="text-xs text-slate-500 font-medium">Review and download your recent subscription payments.</p>
                    </div>
                    <i className="fa-solid fa-file-invoice-dollar text-3xl text-slate-300"></i>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice ID</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-600">
                            {business.invoices && business.invoices.length > 0 ? (
                                business.invoices.map((inv) => (
                                    <tr key={inv.id} className="border-b border-slate-100 group hover:bg-white transition-colors">
                                        <td className="py-6 px-2">#{inv.id}</td>
                                        <td className="py-6 whitespace-nowrap">{new Date(inv.date).toLocaleDateString()}</td>
                                        <td className="py-6">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase">{inv.plan}</span>
                                        </td>
                                        <td className="py-6">Ksh {inv.amount.toLocaleString()}</td>
                                        <td className="py-6">
                                            <span className={`flex items-center gap-2 ${inv.status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                <i className={`fa-solid ${inv.status === 'Paid' ? 'fa-circle-check' : 'fa-clock'}`}></i>
                                                {inv.status === 'Paid' ? 'Paid' : 'Pending Verification'}
                                            </span>
                                        </td>
                                        <td className="py-6 text-right">
                                            <button 
                                                onClick={() => generateInvoicePDF(business, inv)}
                                                className="text-indigo-600 hover:text-indigo-700 transition-colors"
                                            >
                                                <i className="fa-solid fa-download"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                        No invoice history found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionTerminal;
