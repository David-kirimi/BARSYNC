
import React, { useState, useRef } from 'react';
import { User, Role } from '../types';

interface ProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  business: any;
  onUpdateBusiness: (b: any) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, business, onUpdateBusiness }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    password: user.password || '',
    avatar: user.avatar
  });

  const [bizData, setBizData] = useState({
    name: business.name,
    logo: business.logo || ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'logo') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setMessage({ text: 'Image is too large. Please select one under 1MB.', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'avatar') {
          setFormData(prev => ({ ...prev, avatar: reader.result as string }));
        } else {
          setBizData(prev => ({ ...prev, logo: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    setTimeout(() => {
      onUpdate({
        ...user,
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        avatar: formData.avatar,
        updatedAt: new Date().toISOString()
      });

      if (user.role === Role.OWNER || user.role === Role.ADMIN) {
        onUpdateBusiness({
          ...business,
          name: bizData.name,
          logo: bizData.logo
        });
      }

      setIsSaving(false);
      setMessage({ text: 'Settings updated successfully!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 pt-16 md:pt-0 pb-20">
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Settings & Profile</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Manage your personal and establishment details</p>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-orange-400 to-amber-600 relative">
          <div className="absolute -bottom-16 left-12">
            <div className="relative group">
              <img
                src={formData.avatar}
                className="w-32 h-32 rounded-[2.5rem] border-8 border-white shadow-2xl object-cover bg-white"
                alt="Profile"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                <i className="fa-solid fa-camera text-2xl"></i>
              </button>
              <input type="file" ref={fileInputRef} onChange={e => handleImageChange(e, 'avatar')} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>

        <div className="pt-20 px-10 pb-12">
          <form onSubmit={handleSubmit} className="space-y-10">
            {message && (
              <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                {message.text}
              </div>
            )}

            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Display Name</label>
                  <input
                    type="text" required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Contact Phone</label>
                  <input
                    type="tel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Terminal PIN / Password</label>
                <input
                  type="password" required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 tracking-widest focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </section>

            {(user.role === Role.OWNER || user.role === Role.ADMIN) && (
              <section className="space-y-6 pt-6">
                <h3 className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] border-b border-orange-50 pb-4">Business Branding</h3>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                      {bizData.logo ? (
                        <img src={bizData.logo} className="w-full h-full object-cover" alt="Business Logo" />
                      ) : (
                        <i className="fa-solid fa-image text-slate-300 text-2xl"></i>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-700 active:scale-95"
                    >
                      <i className="fa-solid fa-plus text-xs"></i>
                    </button>
                    <input type="file" ref={logoInputRef} onChange={e => handleImageChange(e, 'logo')} className="hidden" accept="image/*" />
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Establishment Name</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all uppercase"
                        value={bizData.name}
                        onChange={e => setBizData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold px-2 italic">* Branding changes will be reflected on all reports and terminal headers.</p>
                  </div>
                </div>
              </section>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-6 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-4 ${isSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
                  }`}
              >
                {isSaving ? (
                  <><i className="fa-solid fa-circle-notch animate-spin"></i> Syncing Node...</>
                ) : (
                  <><i className="fa-solid fa-cloud-arrow-up"></i> Push Settings</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100 flex items-start gap-4">
        <i className="fa-solid fa-shield-halved text-amber-500 text-2xl mt-1"></i>
        <div>
          <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Access Control Warning</h4>
          <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">
            Changing your password will take effect immediately across all terminals. Your role is restricted to <strong>{user.role}</strong> and can only be elevated by a system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
