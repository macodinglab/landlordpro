import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar, Topbar } from '../components';
import { logout, getLoggedInUser, getToken, saveLoggedInUser } from '../services/AuthService';
import { getProfile } from '../services/UserService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Links for manager sidebar
const managerLinks = [
  { label: 'Dashboard', path: '/manager' },
  { label: 'Properties', path: '/manager/properties' },
  { label: 'Floors', path: '/manager/floors' },
  { label: 'Locals', path: '/manager/locals' },
  { label: 'Tenants', path: '/manager/tenants' },
  { label: 'Leases', path: '/manager/leases' },
  { label: 'Payments', path: '/manager/payments' },
  { label: 'Expenses', path: '/manager/expenses' },
  { label: 'Reports', path: '/manager/reports' },
];

// Decode JWT and get expiration time
const getTokenExpiry = (token) => {
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp; // expiration in seconds
  } catch (error) {
    console.error('Invalid token', error);
    return 0;
  }
};

const ManagerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getLoggedInUser();
    const token = getToken();

    if (!currentUser || !token) {
      logout();
      navigate('/');
      return;
    }

    const role = String(currentUser.role || '').toLowerCase();
    if (role !== 'manager') {
      if (role === 'admin') {
        navigate('/admin');
      } else {
        toast.error('Access denied. Manager privileges required.');
        logout();
        navigate('/');
      }
      return;
    }

    setUser(currentUser);

    const refreshProfile = async () => {
      try {
        const profile = await getProfile();
        const latestUser = profile?.user || profile;
        if (latestUser) {
          saveLoggedInUser(latestUser);
          setUser(latestUser);
        }
      } catch (error) {
        console.error('Failed to refresh profile', error);
      }
    };

    refreshProfile();

    const expiry = getTokenExpiry(token);
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = expiry - now;

    if (timeLeft <= 0) {
      toast.info('Your session has expired. Logging out...');
      logout();
      navigate('/');
      return;
    }

    // Set a timer to auto-logout when the token expires
    const timer = setTimeout(() => {
      toast.info('Your session has expired. Logging out...');
      logout();
      navigate('/');
    }, timeLeft * 1000); // convert to milliseconds

    // Clean up the timer on unmount
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-800">
        <div className="text-gray-600 dark:text-gray-300 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        links={managerLinks}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
        {/* Topbar */}
        <Topbar
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Page content */}
        <main className="pt-16 p-4 sm:p-6 bg-gray-950 dark:bg-gray-950 flex-1 overflow-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ManagerLayout;
