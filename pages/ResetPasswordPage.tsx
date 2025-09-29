import React, { useState } from 'react';
import { updatePassword } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { ToastType } from '../components/Toast';
import { TruckIcon } from '../components/icons/Icons';

interface ResetPasswordPageProps {
  onPasswordReset: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onPasswordReset }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast('Kata sandi tidak cocok.', ToastType.ERROR);
      return;
    }
    if (password.length < 6) {
        addToast('Kata sandi minimal harus 6 karakter.', ToastType.ERROR);
        return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      addToast('Kata sandi Anda berhasil diperbarui. Silakan masuk kembali.', ToastType.SUCCESS);
      onPasswordReset();
    } catch (error) {
      console.error(error);
      addToast('Gagal memperbarui kata sandi.', ToastType.ERROR);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-800">
        <div className="text-center">
            <div className="inline-block bg-blue-500 rounded-full p-3 mb-4">
                <TruckIcon className="h-8 w-8 text-white"/>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Atur Ulang Kata Sandi</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Masukkan kata sandi baru untuk akun Anda.
            </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kata Sandi Baru</label>
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
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Konfirmasi Kata Sandi Baru</label>
            <input 
              type="password" 
              name="confirmPassword" 
              id="confirmPassword" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
              placeholder="••••••••"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
