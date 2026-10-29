import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth.store';
import { LogIn, AlertCircle, Users, ChevronDown, ChevronUp, KeyRound, Check } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccounts, setShowAccounts] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const demoAccounts = [
    { name: 'Admin Utama', username: 'admin', role: 'Administrator', badge: 'Full Access' },
    { name: 'Manager', username: 'manager', role: 'Manager Operasional', badge: 'Monitoring' },
    { name: 'Pembelian Telur', username: 'telur', role: 'Petugas Telur', badge: 'Telur' },
    { name: 'Pakan & Obat', username: 'pakan', role: 'Petugas Pakan', badge: 'Pakan/Obat' },
    { name: 'Kas Tunai', username: 'tunai', role: 'Kasir Tunai', badge: 'Kasir' },
    { name: 'Kas Transfer (Rifa)', username: 'transfer', role: 'Kasir Transfer', badge: 'Bank/TFR' },
    { name: 'Akuntansi & Rekap', username: 'akuntansi', role: 'Bagian Akuntansi', badge: 'Keuangan' },
    { name: 'Super Admin', username: 'super', role: 'Super Administrator', badge: 'Sistem' },
  ];

  const handleSelectAccount = (accUsername: string) => {
    setUsername(accUsername);
    setPassword('password');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res: any = await apiClient.post('/auth/login', { username, password });
      if (res.data?.accessToken) {
        login(res.data.accessToken, res.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Login gagal. Periksa username dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-7 sm:p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-3 shadow-lg shadow-emerald-500/30">
            BP
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Masuk Bima Pratama ERP</h2>
          <p className="text-xs text-slate-500 mt-1">Sistem Manajemen & Akuntansi Modern v2.0</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Username, Email, atau Nama
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-sm transition-all"
              placeholder="Contoh: admin, manager, telur, rifa, tunai..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-sm transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-sm cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
          </button>
        </form>

        {/* Quick Account Switcher & Reference */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          <button
            type="button"
            onClick={() => setShowAccounts(!showAccounts)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Daftar Akun Pengguna ({demoAccounts.length} Akun)</span>
            </span>
            {showAccounts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAccounts && (
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2 text-xs max-h-56 overflow-y-auto">
              <p className="text-[11px] text-slate-500 font-medium">
                Klik salah satu akun di bawah untuk mengisi form login secara otomatis (password default: <code className="font-bold text-emerald-700 font-mono">password</code>):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {demoAccounts.map((acc) => {
                  const isSelected = username === acc.username;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleSelectAccount(acc.username)}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-[11px] font-bold">{acc.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">@{acc.username}</div>
                      </div>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
                          {acc.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <span>Kata sandi default seluruh pengguna: <strong className="text-slate-600 font-mono">password</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
