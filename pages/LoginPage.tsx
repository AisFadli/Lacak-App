import React, { useState } from 'react';
import { User } from '../types';
import { TruckIcon } from '../components/icons/Icons';
import { loginUser, requestPasswordReset } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { ToastType } from '../components/Toast';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onNavigateToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      if (user) {
        addToast(`Selamat datang kembali, ${user.name}!`, ToastType.SUCCESS);
        onLogin(user);
      } else {
        addToast('Email atau kata sandi salah.', ToastType.ERROR);
      }
    } catch (error) {
      console.error(error);
      addToast('Terjadi kesalahan saat login.', ToastType.ERROR);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = async (resetEmail: string) => {
    setLoading(true);
    try {
      await requestPasswordReset(resetEmail);
      // For security reasons, always show a generic success message to prevent email enumeration attacks.
      addToast('Jika email Anda terdaftar, Anda akan menerima instruksi reset.', ToastType.INFO);
    } catch (error) {
      console.error(error);
      addToast('Terjadi kesalahan. Coba lagi nanti.', ToastType.ERROR);
    } finally {
      setLoading(false);
      setIsForgotPasswordModalOpen(false);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-800">
        <div className="text-center">
            <div className="inline-block bg-blue-500 rounded-full p-3 mb-4">
                <TruckIcon className="h-8 w-8 text-white"/>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Masuk ke Akun Anda</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                atau{' '}
                <button onClick={onNavigateToRegister} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    daftar sebagai pelanggan baru
                </button>
            </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alamat Email</label>
            <input 
              type="email" 
              name="email" 
              id="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="anda@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kata Sandi</label>
            <input 
              type="password" 
              name="password" 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
              placeholder="••••••••"
            />
          </div>
          
          <div className="flex items-center justify-end">
            <div className="text-sm">
              <button
                type="button"
                onClick={() => setIsForgotPasswordModalOpen(true)}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Lupa kata sandi?
              </button>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </div>
        </form>
      </div>
      {isForgotPasswordModalOpen && (
        <ForgotPasswordModal
          onClose={() => setIsForgotPasswordModalOpen(false)}
          onSubmit={handleForgotPassword}
          loading={loading}
        />
      )}
    </div>
  );
};

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSubmit: (email: string) => void;
  loading: boolean;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, onSubmit, loading }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Lupa Kata Sandi</h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Masukkan alamat email Anda di bawah ini. Jika terdaftar, kami akan mengirimkan instruksi untuk mengatur ulang kata sandi Anda.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alamat Email</label>
            <input
              type="email"
              name="email"
              id="reset-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="anda@email.com"
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
              {loading ? 'Mengirim...' : 'Kirim Instruksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default LoginPage;