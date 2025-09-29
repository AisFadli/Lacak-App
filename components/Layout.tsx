import React from 'react';
import { User } from '../types';
import { TruckIcon, LogoutIcon } from './icons/Icons';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentUser, onLogout }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <TruckIcon className="h-8 w-8 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Lacak Kiriman</h1>
            </div>
            {currentUser && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-medium text-sm text-gray-800 dark:text-white">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email || currentUser.role}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                  aria-label="Logout"
                >
                  <LogoutIcon className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>
      <main className="flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Lacak Kiriman v1.0.0
      </footer>
    </div>
  );
};

export default Layout;