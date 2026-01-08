import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sun, Moon, Bell, LogOut, Settings, User, Menu } from 'lucide-react';
import { toast } from 'react-toastify';
import { getUnreadNotifications, markNotificationRead } from '../../services/UserService';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../../assets/react.svg';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** Resolve avatar URL with fallback */
const resolveAvatarUrl = (user) => {
  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'User';

  if (!user?.avatar) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=14B8A6&color=fff&rounded=true`;
  }

  if (user.avatar.startsWith('http')) return user.avatar;
  if (user.avatar.startsWith('/uploads')) {
    const trimmedBase = API_BASE_URL.replace(/\/$/, '');
    return `${trimmedBase}${user.avatar}`;
  }

  return defaultAvatar;
};

/** Reusable Avatar component */
const Avatar = ({ user, size = 36 }) => {
  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'User';
  const url = resolveAvatarUrl(user);

  return (
    <img
      src={url}
      alt={`${displayName} avatar`}
      className={`w-${size} h-${size} rounded-full border border-gray-200 dark:border-gray-700 object-cover`}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = defaultAvatar;
      }}
    />
  );
};

const Topbar = ({ user, onLogout, onMenuClick }) => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const displayName = useMemo(() => user?.full_name || user?.name || user?.email?.split('@')[0] || 'User', [user]);

  const goToProfile = () => navigate('/profile');

  // Persist theme preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Close dropdowns on outside click & ESC
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setNotificationsOpen(false);
      }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') { setMenuOpen(false); setNotificationsOpen(false); } };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const data = await getUnreadNotifications();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      toast.error('Failed to load notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
      await Promise.all(notifications.map((notif) => markNotificationRead(notif.id)));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark all as read');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, is_read: true } : notif)));
      await markNotificationRead(id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark notification as read');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-gray-900/60 backdrop-blur-lg border-b border-gray-800/50 z-20 flex items-center justify-between px-4 sm:px-10 transition-all duration-300">
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-2 sm:gap-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 rounded-xl bg-gray-800/50 text-gray-400 hover:bg-gray-800 transition-all border border-gray-700/30 shadow-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent uppercase italic tracking-tighter">
          <span className="hidden sm:inline">Command</span> <span className="text-teal-500">Center</span>
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 relative" ref={menuRef}>
        {/* Notifications */}
        <div className="relative">
          <button
            aria-label="Notifications"
            className="relative p-2.5 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-600 dark:text-gray-400 transition-all border border-transparent hover:border-white/20 dark:hover:border-gray-700/30"
            onClick={() => setNotificationsOpen((prev) => !prev)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-[-40px] sm:right-0 mt-3 w-72 sm:w-80 bg-gray-950 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden animate-dropdown z-50">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800 bg-gray-900/50">
                <span className="font-bold text-white">Notifications</span>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-teal-400 hover:text-teal-300"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Bell size={32} className="opacity-10 mb-2" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkRead(notif.id)}
                      className={`p-3 rounded-xl transition-all cursor-pointer border border-transparent ${!notif.is_read
                        ? 'bg-teal-50/50 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                    >
                      <p className={`text-sm ${!notif.is_read ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">Just now</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          aria-label="Toggle dark mode"
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-600 dark:text-gray-400 transition-all border border-transparent hover:border-white/20 dark:hover:border-gray-700/30"
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all border border-transparent hover:border-white/20 dark:hover:border-gray-700/30"
          >
            <Avatar user={user} size={8} />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[100px]">{displayName}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight truncate max-w-[100px] uppercase tracking-tighter">Admin</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-gray-950 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden animate-dropdown z-50 p-2">
              <div className="px-3 py-3 mb-2 bg-gray-900/50 rounded-xl">
                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-gray-500 truncate">{user.email || 'Admin User'}</p>
              </div>

              <div className="space-y-1">
                <button onClick={goToProfile} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-gray-900 hover:text-white transition-all">
                  <User size={16} className="opacity-70" /> Profile
                </button>
                <button className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-gray-900 hover:text-white transition-all">
                  <Settings size={16} className="opacity-70" /> Settings
                </button>
                <div className="h-px bg-gray-800 my-1 mx-2" />
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all font-medium"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
