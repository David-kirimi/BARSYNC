
import React, { useState, useRef } from 'react';
import { User } from '../types';

interface ProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    password: user.password || '',
    avatar: user.avatar
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64
        setMessage({ text: 'Image is too large. Please select one under 1MB.', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    // Simulate a brief delay
    setTimeout(() => {
      onUpdate({
        ...user,
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        avatar: formData.avatar
      });
      setIsSaving(false);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">My Account</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Manage your personal terminal details</p>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
          <div className="absolute -bottom-16 left-1/2 md:left-12 -translate-x-1/2 md:translate-x-0">
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
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
          </div>
        </div>

        <div className="pt-20 px-10 pb-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            {message && (
              <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Display Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  placeholder="e.g. 254..."
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Terminal Password / PIN</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input 
                  type="password" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit" 
                disabled={isSaving}
                className={`w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] flex items-center justify-center gap-3 ${
                  isSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    Syncing Changes...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i>
                    Save Profile
                  </>
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
