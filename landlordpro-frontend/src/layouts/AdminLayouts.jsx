import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar, Topbar } from '../components';
import { logout, getLoggedInUser, getToken } from '../services/AuthService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Links for admin sidebar
const adminLinks = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Users', path: '/admin/adminUsers' },
  { label: 'Properties', path: '/admin/properties' },
  { label: 'Floors', path: '/admin/floors' },
  { label: 'Locals', path: '/admin/locals' },
  { label: 'Tenants', path: '/admin/tenants' },
  { label: 'Leases', path: '/admin/leases' },
  { label: 'PaymentMode', path: '/admin/paymentMode' },
  // { label: 'Invoices', path: '/admin/invoices' },
  { label: 'Payments', path: '/admin/payments' },
  { label: 'Expenses', path: '/admin/expenses' },
  { label: 'Staff', path: '/admin/staff' },
  { label: 'Documents', path: '/admin/documents' },
  { label: 'Reports', path: '/admin/reports' },
  { label: 'Settings', path: '/admin/settings' },
];

// Decode JWT and get expiration time
const getTokenExpiry = (token) => {
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp;
  } catch (error) {
    console.error('Invalid token', error);
    return 0;
  }
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // ... existing auth logic
    const currentUser = getLoggedInUser();
    const token = getToken();

    if (!currentUser || !token) {
      logout();
      navigate('/');
      return;
    }

    const role = String(currentUser.role || '').toLowerCase();
    if (role !== 'admin') {
      if (role === 'manager') {
        navigate('/manager');
      } else {
        toast.error('Access denied. Admin privileges required.');
        logout();
        navigate('/');
      }
      return;
    }

    setUser(currentUser);

    const expiry = getTokenExpiry(token);
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = expiry - now;

    if (timeLeft <= 0) {
      toast.info('Your session has expired. Logging out...');
      logout();
      navigate('/');
      return;
    }

    const timer = setTimeout(() => {
      toast.info('Your session has expired. Logging out...');
      logout();
      navigate('/');
    }, timeLeft * 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-800">
        <div className="text-teal-600 dark:text-teal-400 text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar
        links={adminLinks}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-24' : 'lg:ml-72'
          }`}
      >
        {/* Topbar */}
        <Topbar
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Page content */}
        <main className="pt-20 px-4 md:px-8 lg:px-10 py-10 flex-1 overflow-auto relative custom-scrollbar bg-gray-950 dark:bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
