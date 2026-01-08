import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { getAllUsers, updateUser, disableUser, enableUser, registerUser } from '../../services/UserService';
import { Button, Modal, Input, Select, Card } from '../../components';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';
import {
  Edit3,
  UserPlus,
  Search,
  Mail,
  User,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  X,
  Check,
  Activity,
  Download,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  Zap,
  ShieldCheck,
  Fingerprint,
  RefreshCcw,
  Star,
  Building
} from 'lucide-react';

const roleStyles = {
  admin: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  manager: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  tenant: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  landlord: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  default: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const PAGE_LIMIT = 10;

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null, action: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const roleOptions = [
    { value: 'admin', label: 'Admin (System Core)' },
    { value: 'manager', label: 'Manager (Node Op)' },
    { value: 'tenant', label: 'Tenant (User)' },
    { value: 'landlord', label: 'Landlord (Asset Owner)' }
  ];

  const fetchUsers = useCallback(async (pageNumber = 1) => {
    try {
      setLoading(true);
      const data = await getAllUsers(pageNumber, PAGE_LIMIT);
      const { users, totalPages, page, total } = data;

      if (users.length === 0 && pageNumber > 1) {
        return fetchUsers(pageNumber - 1);
      }

      setUsers(users);
      setTotalPages(totalPages);
      setPage(page);
      setTotalUsers(total);
    } catch (err) {
      showError('Failed to synchronize user matrix.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  const validateField = (name, value) => {
    const errors = { ...formErrors };
    switch (name) {
      case 'name':
        if (!value.trim()) errors.name = 'Identity signature required'; else delete errors.name;
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) errors.email = 'Comms relay required'; else if (!emailRegex.test(value)) errors.email = 'Invalid relay protocol'; else delete errors.email;
        break;
      case 'password':
        if (!selectedUser) {
          if (!value.trim()) errors.password = 'Security string required'; else if (value.length < 6) errors.password = 'String depth insufficient (min 6)'; else delete errors.password;
        }
        break;
      case 'confirmPassword':
        if (!selectedUser) {
          if (value !== formData.password) errors.confirmPassword = 'String mismatch'; else delete errors.confirmPassword;
        }
        break;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({ name: user.full_name, email: user.email, role: user.role, password: '', confirmPassword: '' });
    setModalOpen(true);
    setFormErrors({});
  };

  const handleAddClick = () => {
    setSelectedUser(null);
    setFormData({ name: '', email: '', role: '', password: '', confirmPassword: '' });
    setModalOpen(true);
    setFormErrors({});
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setFormData({ name: '', email: '', role: '', password: '', confirmPassword: '' });
    setFormErrors({});
  };

  const isFormValid = () => {
    const { name, email, role, password, confirmPassword } = formData;
    if (!name.trim() || !email.trim() || !role) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    if (!selectedUser) {
      if (!password.trim() || password.length < 6) return false;
      if (password !== confirmPassword) return false;
    }
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting || !isFormValid()) return;
    try {
      setSubmitting(true);
      const { name, email, role, password } = formData;
      if (selectedUser) {
        await updateUser(selectedUser.id, { full_name: name, email, role });
        showSuccess('User recalibrated.');
      } else {
        await registerUser({ full_name: name, email, role, password });
        showSuccess('New identity initialized.');
      }
      handleModalClose();
      fetchUsers(selectedUser ? page : 1);
      if (!selectedUser) setPage(1);
    } catch (err) {
      showError(err.message || 'Signal interruption during save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisableEnable = (user) => {
    setConfirmDialog({ open: true, user, action: user.is_active ? 'disable' : 'enable' });
  };

  const confirmDisableEnable = async () => {
    try {
      const { user, action } = confirmDialog;
      await (action === 'disable' ? disableUser(user.id) : enableUser(user.id));
      showSuccess(`Subject status: ${action}d`);
      setConfirmDialog({ open: false, user: null, action: '' });
      fetchUsers(page);
    } catch (err) {
      showError(err.message || 'Status recalibration failed.');
    }
  };

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) newSelected.delete(userId); else newSelected.add(userId);
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) setSelectedUsers(new Set()); else setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
  };

  const handleBulkAction = (action) => {
    showInfo(`Executing bulk ${action} protocol for ${selectedUsers.size} subjects.`);
    setSelectedUsers(new Set());
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    let filtered = [...users];
    const term = searchTerm.toLowerCase().trim();
    if (term) filtered = filtered.filter(u => u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term) || u.role?.toLowerCase().includes(term));
    if (roleFilter !== 'all') filtered = filtered.filter(u => u.role?.toLowerCase() === roleFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(u => statusFilter === 'active' ? u.is_active : !u.is_active);
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [users, searchTerm, roleFilter, statusFilter, sortConfig]);

  if (loading && page === 1 && !searchTerm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <Zap size={48} className="text-cyan-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Interrogating user matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Hero Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Users size={200} className="text-cyan-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Personnel Management Matrix
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  User <span className="text-cyan-500">Accounts</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-cyan-400" /> Managing clearance levels and identities
                </p>
              </div>
            </div>

            <Button onClick={handleAddClick} className="px-10 bg-cyan-600 hover:bg-cyan-500">
              <UserPlus size={18} className="mr-2" /> <span>Inject Identity</span>
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Total Subjects', val: totalUsers, icon: Users, color: 'cyan' },
            { label: 'Active Signals', val: users.filter(u => u.is_active).length, icon: Check, color: 'emerald' },
            { label: 'Neutralized', val: users.filter(u => !u.is_active).length, icon: Lock, color: 'rose' }
          ].map((stat, i) => (
            <div key={i} className="p-6 bg-gray-800/40 rounded-3xl border border-gray-700/50 flex items-center gap-6 group hover:border-cyan-500/30 transition-all">
              <div className={`p-4 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{stat.label}</p>
                <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{stat.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="sticky top-4 z-30 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-[2rem] shadow-2xl">
          <div className="lg:col-span-6 relative">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search by name, relay, or access..."
              className="w-full pl-16 pr-6 py-4 bg-gray-900 border-2 border-transparent focus:border-cyan-500/30 rounded-2xl text-white font-bold italic placeholder-gray-500 outline-hidden transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              options={[{ label: 'All Roles', value: 'all' }, ...roleOptions]}
              value={[{ label: 'All Roles', value: 'all' }, ...roleOptions].find(o => o.value === roleFilter)}
              onChange={(o) => setRoleFilter(o.value)}
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active Only', value: 'active' },
                { label: 'Disabled Only', value: 'disabled' }
              ]}
              value={[
                { label: 'All Status', value: 'all' },
                { label: 'Active Only', value: 'active' },
                { label: 'Disabled Only', value: 'disabled' }
              ].find(o => o.value === statusFilter)}
              onChange={(o) => setStatusFilter(o.value)}
            />
          </div>
        </div>

        {/* Table Content */}
        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {selectedUsers.size > 0 && (
            <div className="p-6 bg-cyan-950/20 border-b border-cyan-500/20 flex flex-col md:flex-row justify-between items-center gap-6 animate-fade-in">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic">{selectedUsers.size} Identity vectors captured</span>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => handleBulkAction('enable')} className="px-6 py-2 rounded-xl text-[10px] bg-emerald-600 hover:bg-emerald-500">ENABLE</Button>
                <Button onClick={() => handleBulkAction('disable')} className="px-6 py-2 rounded-xl text-[10px] bg-rose-600 hover:bg-rose-500">DISABLE</Button>
                <button onClick={() => setSelectedUsers(new Set())} className="p-2 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
            </div>
          )}

          {/* Mobile Feed */}
          <div className="md:hidden divide-y divide-gray-700/30">
            {filteredUsers.length === 0 ? (
              <div className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No identity signals detected.</div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="p-6 space-y-6 group active:bg-gray-700/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleSelectUser(user.id)} className={`p-1 rounded bg-gray-950 border border-gray-700 text-cyan-400 transition-all ${selectedUsers.has(user.id) ? 'bg-cyan-500 border-cyan-400 text-white' : ''}`}>
                        <Check size={12} strokeWidth={4} />
                      </button>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-black italic shadow-xl">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-white italic tracking-tighter uppercase leading-none truncate">{user.full_name}</p>
                        <p className="text-[9px] font-bold text-gray-500 italic mt-1 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                    <span className={`inline-flex px-2 py-1 rounded-md border text-[8px] font-black uppercase italic tracking-widest ${roleStyles[user.role?.toLowerCase()] || roleStyles.default}`}>
                      {user.role}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400" onClick={() => handleEditClick(user)}>
                        <Edit3 size={16} />
                      </Button>
                      <Button variant="outline" className={`p-2.5 rounded-xl border-gray-700 ${user.is_active ? 'text-rose-400' : 'text-emerald-400'}`} onClick={() => handleDisableEnable(user)}>
                        {user.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-6 w-16">
                    <button onClick={handleSelectAll} className={`p-1 rounded bg-gray-950 border border-gray-700 text-cyan-400 transition-all ${selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? 'bg-cyan-500 border-cyan-400 text-white' : ''}`}>
                      <Check size={12} strokeWidth={4} />
                    </button>
                  </th>
                  <th className="px-6 py-6 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-2">User Signature <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-6 py-6 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => handleSort('role')}>
                    <div className="flex items-center gap-2">Clearance <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-6 py-6">Signal Status</th>
                  <th className="px-6 py-6 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No identity signals detected in current spectrum.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                      <td className="px-6 py-8">
                        <button onClick={() => handleSelectUser(user.id)} className={`p-1 rounded bg-gray-950 border border-gray-700 text-cyan-400 transition-all ${selectedUsers.has(user.id) ? 'bg-cyan-500 border-cyan-400 text-white' : ''}`}>
                          <Check size={12} strokeWidth={4} />
                        </button>
                      </td>
                      <td className="px-6 py-8">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-black italic shadow-xl group-hover:scale-110 transition-transform">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">{user.full_name}</p>
                            <p className="text-[10px] font-bold text-gray-500 italic mt-1">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-8">
                        <span className={`inline-flex px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase italic tracking-widest ${roleStyles[user.role?.toLowerCase()] || roleStyles.default}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-8">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase italic tracking-widest ${user.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                          {user.is_active ? 'ACTIVE_LINK' : 'LINK_TERMINATED'}
                        </span>
                      </td>
                      <td className="px-6 py-8 text-right opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <div className="flex items-center justify-end gap-3">
                          <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-cyan-400" onClick={() => handleEditClick(user)}>
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="outline" className={`p-2.5 rounded-xl border-gray-700 ${user.is_active ? 'text-rose-400 hover:text-rose-500' : 'text-emerald-400 hover:text-emerald-500'}`} onClick={() => handleDisableEnable(user)}>
                            {user.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination Section */}
        <div className="flex justify-between items-center py-6">
          <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-[0.2em]">
            Index <span className="text-cyan-400 font-black">{page}</span> // Matrix <span className="text-white font-black">{totalPages}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page <= 1
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'text-gray-400 hover:text-cyan-400 hover:bg-gray-800'
                }`}
            >
              Retreat
            </button>
            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page >= totalPages
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'bg-cyan-600 text-white shadow-xl hover:bg-cyan-500 hover:scale-105 active:scale-95'
                }`}
            >
              Advance
            </button>
          </div>
        </div>

        {/* Modal Module */}
        {modalOpen && (
          <Modal
            title={selectedUser ? `Calibrating Identity: ${selectedUser.full_name}` : 'Initializing Identity Injection'}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
            className="max-w-2xl"
          >
            <div className="space-y-10 py-4">
              <Input
                label="Full Identity Signature *"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); validateField('name', e.target.value); }}
                error={formErrors.name}
                placeholder="Subject full naming..."
                icon={User}
              />
              <Input
                label="Communication Relay (Email) *"
                type="email"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); validateField('email', e.target.value); }}
                error={formErrors.email}
                placeholder="agent@intel.io"
                icon={Mail}
              />
              <Select
                label="Clearance Authorization *"
                options={roleOptions}
                value={roleOptions.find(o => o.value === formData.role)}
                onChange={(o) => { setFormData({ ...formData, role: o.value }); validateField('role', o.value); }}
                error={formErrors.role}
                icon={ShieldCheck}
              />
              {!selectedUser && (
                <div className="grid md:grid-cols-2 gap-10">
                  <Input
                    label="Security String (Pass) *"
                    type="password"
                    value={formData.password}
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); validateField('password', e.target.value); }}
                    error={formErrors.password}
                    placeholder="Min 6 vectors..."
                    icon={Fingerprint}
                  />
                  <Input
                    label="Verify String *"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); validateField('confirmPassword', e.target.value); }}
                    error={formErrors.confirmPassword}
                    placeholder="Redundancy check..."
                    icon={ShieldCheck}
                  />
                </div>
              )}

              <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl flex gap-4 animate-pulse">
                <Star size={20} className="text-cyan-500 shrink-0" />
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic leading-relaxed">
                  CRITICAL: Authorization level determines subject's interaction limits with core asset nodes.
                </p>
              </div>
            </div>
          </Modal>
        )}

        {/* Confirm Dialog Module */}
        {confirmDialog.open && (
          <Modal
            title="Authorization Recalibration"
            onClose={() => setConfirmDialog({ open: false, user: null, action: '' })}
            onSubmit={confirmDisableEnable}
          >
            <div className="py-10 text-center space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center bg-${confirmDialog.action === 'disable' ? 'rose' : 'emerald'}-500/10 text-${confirmDialog.action === 'disable' ? 'rose' : 'emerald'}-500 mb-6`}>
                {confirmDialog.action === 'disable' ? <Lock size={48} /> : <Unlock size={48} />}
              </div>
              <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                {confirmDialog.action === 'disable' ? 'Neutralize' : 'Authorize'} Subject?
              </h3>
              <p className="text-gray-400 text-sm font-bold italic">
                Confirming {confirmDialog.action === 'disable' ? 'termination' : 'restoration'} of access for <span className="text-white font-black">{confirmDialog.user?.full_name}</span>.
              </p>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;