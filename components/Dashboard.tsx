
import React, { useMemo, useState, useEffect } from 'react';
import { Sale, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  business: any;
  setView: (v: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ sales, products, business, setView }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (business?.subscriptionStatus !== 'Trial' && business?.subscriptionStatus !== 'Pending Approval') return;

    const calculateTimeLeft = () => {
      const trialDuration = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
      
      // CRITICAL: Ensure we have a valid start date
      const startTimeStr = business?.trialStartedAt || business?.createdAt;
      if (!startTimeStr) return;

      const startTime = new Date(startTimeStr).getTime();
      const expiry = startTime + trialDuration;
      const nowTs = new Date().getTime();
      const difference = expiry - nowTs;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        // Set to zeroed out state instead of null to keep UI consistent
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();
    return () => clearInterval(timer);
  }, [business?.subscriptionStatus, business?.trialStartedAt, business?.createdAt]);

  const { totalRev, totalProfit } = useMemo(() => {
    let rev = 0;
    let profit = 0;
    sales.forEach(sale => {
      rev += sale.totalAmount;
      sale.items.forEach(item => {
        if (item.buyingPrice) {
          profit += (item.price - item.buyingPrice) * item.quantity;
        }
      });
    });
    return { totalRev: rev, totalProfit: profit };
  }, [sales]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      revenue: 0,
      orders: 0
    }));

    sales.forEach(sale => {
      const hour = new Date(sale.date).getHours();
      hours[hour].revenue += sale.totalAmount;
      hours[hour].orders += 1;
    });

    return hours.filter(h => h.orders > 0 || (Number(h.hour.split(':')[0]) > 10 && Number(h.hour.split(':')[0]) < 23));
  }, [sales]);

  const topItems = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.quantity;
      });
    });

    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  const generateAIInsights = async () => {
    setLoadingInsights(true);
    setInsights(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const lowStockItems = products.filter(p => p.stock < 10).map(p => `${p.name} (${p.stock} left)`);
      const topSelling = topItems.map(i => `${i.name} (${i.qty} units)`).join(', ');

      const prompt = `You are a business consultant for a high-end bar called BarSync. 
      Analyze the following data and provide 3-4 short, actionable bullet points to improve profitability:
      - Total Revenue: Ksh ${totalRev}
      - Estimated Gross Profit: Ksh ${totalProfit}
      - Top Selling Items: ${topSelling}
      - Critical Low Stock: ${lowStockItems.join(', ')}
      - Peak Hours: ${hourlyData.slice(-3).map(h => h.hour).join(', ')}
      
      Keep the advice specific to inventory, staffing, or promotions. Focus on maximizing margins. Be concise.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });

      setInsights(response.text || "No insights available at this time.");
    } catch (error) {
      console.error("AI Insight error:", error);
      setInsights("Unable to connect to Gemini AI. Check your internet connection.");
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-6 pt-16 md:pt-0">
      {/* Trial Countdown Banner */}
      {(business?.subscriptionStatus === 'Trial' || business?.subscriptionStatus === 'Pending Approval') && timeLeft && (
        <div className="bg-indigo-600 rounded-[2rem] p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-indigo-500/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md">
              <i className="fa-solid fa-hourglass-half animate-pulse"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-1">Trial Version Active</p>
              <h3 className="text-xl font-black tracking-tight uppercase">Your free trial expires in:</h3>
            </div>
          </div>

          <div className="flex gap-4">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hrs', value: timeLeft.hours },
              { label: 'Min', value: timeLeft.minutes },
              { label: 'Sec', value: timeLeft.seconds }
            ].map((unit, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black backdrop-blur-md border border-white/5">
                  {unit.value.toString().padStart(2, '0')}
                </div>
                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mt-2">{unit.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setView('SUBSCRIPTION')}
            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-xl active:scale-95"
          >
            Upgrade Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
          <h4 className="text-2xl font-black text-slate-800 mt-1">Ksh {totalRev.toLocaleString()}</h4>
        </div>
        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 shadow-sm">
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Gross Profit</p>
          <h4 className="text-2xl font-black text-orange-700 mt-1">Ksh {totalProfit.toLocaleString()}</h4>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-br from-orange-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border border-orange-500/20">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-orange-500/30 rounded-lg flex items-center justify-center backdrop-blur-md border border-orange-400/30">
                <i className="fa-solid fa-wand-magic-sparkles text-orange-300"></i>
              </div>
              <h3 className="font-black text-lg uppercase tracking-wider">Gemini Smart Insights</h3>
            </div>
            {insights ? (
              <div className="mt-4 prose prose-invert max-w-none text-sm leading-relaxed text-orange-100 font-medium">
                <div className="whitespace-pre-line">{insights}</div>
                <button
                  onClick={() => setInsights(null)}
                  className="mt-4 text-[10px] font-black uppercase tracking-widest text-orange-400 hover:text-white transition-colors"
                >
                  Clear Analysis
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400 font-medium">Get real-time business advice based on your current sales and inventory trends.</p>
            )}
          </div>
          <button
            onClick={generateAIInsights}
            disabled={loadingInsights}
            className="shrink-0 bg-orange-500 hover:bg-orange-400 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-3"
          >
            {loadingInsights ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                Analyzing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt"></i>
                Generate Strategy
              </>
            )}
          </button>
        </div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Hourly Revenue Trend</h3>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase">Live Stats</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 uppercase text-xs tracking-widest">Popular Inventory</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 800 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="qty" fill="#f97316" radius={[0, 8, 8, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.filter(p => p.stock < 10).slice(0, 4).map(p => (
          <div key={p.id} className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex items-center justify-between group hover:bg-rose-100 transition-colors">
            <div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Low Stock
              </p>
              <p className="text-sm font-black text-slate-800 mt-1 truncate max-w-[120px] uppercase">{p.name}</p>
            </div>
            <div className="text-rose-600 font-black text-xl group-hover:scale-110 transition-transform">{p.stock}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
