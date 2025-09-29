import React, { useState, useCallback } from 'react';
import { User, UserRole } from './types';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DriverDashboard from './pages/DriverDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import Layout from './components/Layout';
import { ToastProvider } from './contexts/ToastContext';
import RegisterPage from './pages/RegisterPage';

type View = 'login' | 'register' | 'dashboard';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('login');

  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
    setView('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setView('login');
  }, []);
  
  const handleNavigateToRegister = useCallback(() => {
    setView('register');
  }, []);

  const handleBackToLogin = useCallback(() => {
    setView('login');
  }, []);


  const renderContent = () => {
    if (view === 'dashboard' && currentUser) {
        switch (currentUser.role) {
          case UserRole.ADMIN:
            return <AdminDashboard />;
          case UserRole.DRIVER:
            return <DriverDashboard driverId={currentUser.id} />;
          case UserRole.CUSTOMER:
            return <CustomerDashboard customerId={currentUser.id} />;
          default:
            return <p>Invalid user role.</p>;
        }
    } else if (view === 'register') {
        return <RegisterPage onRegister={handleLogin} onBackToLogin={handleBackToLogin} />;
    } else {
        return <LoginPage onLogin={handleLogin} onNavigateToRegister={handleNavigateToRegister} />;
    }
  };

  return (
    <ToastProvider>
      <Layout currentUser={currentUser} onLogout={handleLogout}>
        {renderContent()}
      </Layout>
    </ToastProvider>
  );
};

export default App;