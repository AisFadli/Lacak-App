import React from 'react';
import { User, UserRole } from '../types';
import { AdminIcon, TruckIcon, UserIcon } from '../components/icons/Icons';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onNavigateToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister }) => {
  // Demo users for quick login. In a real app, this would be a form.
  const users: User[] = [
    { id: 'admin-01', name: 'Admin Utama', role: UserRole.ADMIN, email: 'admin@example.com' },
    { id: 'd1', name: 'Budi Santoso', role: UserRole.DRIVER, email: 'budi.s@example.com' }, // Matches mock driver ID
    { id: 'c1', name: 'Andi Wijaya', role: UserRole.CUSTOMER, email: 'andi.w@example.com' }, // Matches mock customer ID
  ];

  const getIconForRole = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <AdminIcon className="h-8 w-8 text-white" />;
      case UserRole.DRIVER:
        return <TruckIcon className="h-8 w-8 text-white" />;
      case UserRole.CUSTOMER:
        return <UserIcon className="h-8 w-8 text-white" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white">Selamat Datang</h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Pilih peran Anda untuk melanjutkan</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => onLogin(user)}
            className="group p-8 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex-shrink-0 mb-4 bg-blue-500 group-hover:bg-blue-600 rounded-full p-4 transition-colors">
                {getIconForRole(user.role)}
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.role}</p>
            </div>
          </button>
        ))}
      </div>
       <div className="mt-12 text-center">
        <p className="text-gray-600 dark:text-gray-400">Pelanggan baru?</p>
        <button
            onClick={onNavigateToRegister}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1"
        >
            Daftar sebagai Pelanggan Baru
        </button>
      </div>
    </div>
  );
};

export default LoginPage;