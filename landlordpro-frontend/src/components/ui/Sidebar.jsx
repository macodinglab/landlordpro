import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Building, Users, FileText, DollarSign, Settings,
  BrickWall, CreditCard, StoreIcon, Wallet, User2,
  ChevronLeft, ChevronRight, LayoutDashboard, BarChart3, Key, X
} from 'lucide-react';

const ICONS = {
  Dashboard: Home,
  Users: Users,
  Properties: Building,
  Floors: StoreIcon,
  Locals: BrickWall,
  Tenants: Users,
  Leases: FileText,
  PaymentMode: CreditCard,
  Invoices: FileText,
  Payments: DollarSign,
  Expenses: Wallet,
  Staff: User2,
  Documents: FileText,
  Reports: BarChart3, // Changed from FileText to BarChart3 based on the instruction's implied icon
  Settings: Settings,
  'Admin Users': Key, // Added based on the instruction's implied menu item
};

const Sidebar = ({ links, open, onClose, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();

  const isLinkActive = (linkPath) => {
    if (linkPath === '/admin' || linkPath === '/manager') {
      return location.pathname === linkPath;
    }
    return location.pathname.startsWith(linkPath);
  };

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-950 shadow-[20px_0_50px_rgba(0,0,0,0.3)] z-40 transform transition-all duration-300 ease-in-out border-r border-gray-800/50 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${isCollapsed ? 'w-24' : 'w-72'}`}
      >
        {/* Branding */}
        <div className={`p-8 border-b border-gray-800/50 flex items-center h-20 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-600 rounded-xl text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                <LayoutDashboard size={20} />
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent uppercase italic tracking-tighter">
                Matrix<span className="text-white">Pro</span>
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="p-2 bg-teal-600 rounded-xl text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <LayoutDashboard size={20} />
            </div>
          )}
          <button
            className="lg:hidden p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1 overflow-y-auto no-scrollbar px-3">
          <ul className="space-y-1">
            {links.map((link) => {
              const Icon = ICONS[link.label];
              const active = isLinkActive(link.path);

              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-[1.2rem] transition-all group relative border ${active
                      ? 'bg-teal-500/10 text-teal-400 font-black border-teal-500/20 shadow-[0_0_20px_rgba(20,184,166,0.1)]'
                      : 'text-gray-500 border-transparent hover:bg-gray-900 hover:text-white hover:border-gray-800'
                      }`}
                    onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                  >
                    {Icon && (
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-teal-400' : ''}`} />
                    )}
                    {!isCollapsed && (
                      <span className="truncate text-sm">{link.label}</span>
                    )}

                    {/* Tooltip for collapsed mode */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                        {link.label}
                      </div>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse Toggle */}
        <div className="p-4 border-t border-gray-50 dark:border-gray-800">
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-full p-2 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-teal-600 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
          >
            {isCollapsed ? <ChevronRight size={20} /> : (
              <div className="flex items-center gap-2">
                <ChevronLeft size={20} />
                <span className="text-xs font-medium uppercase tracking-wider">Collapse Menu</span>
              </div>
            )}
          </button>

          <div className={`mt-2 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between text-xs text-gray-400'}`}>
            {!isCollapsed && <span>v1.2.0</span>}
            <div className={`w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]`}></div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm lg:hidden z-30 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
