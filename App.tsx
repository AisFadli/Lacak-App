import React, { useState, useCallback, useEffect } from 'react';
import { User, UserRole } from './types';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DriverDashboard from './pages/DriverDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import Layout from './components/Layout';
import { ToastProvider } from './contexts/ToastContext';
import RegisterPage from './pages/RegisterPage';
import { logoutUser, supabase } from './services/supabase';
import ResetPasswordPage from './pages/ResetPasswordPage';

type View = 'login' | 'register' | 'dashboard' | 'resetPassword';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('login');

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User has clicked the password reset link.
        // The Supabase client automatically sets the session from the URL hash.
        setView('resetPassword');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
    setView('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser();
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
    } else if (view === 'resetPassword') {
        return <ResetPasswordPage onPasswordReset={handleBackToLogin} />;
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