import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  getAllTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  restoreTenant,
} from '../../services/tenantService';
import { Button, Modal, Input, Card } from '../../components';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  RefreshCcw,
  Users,
  Mail,
  Phone,
  Briefcase,
  CreditCard,
  Activity,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Plus,
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';

const TenantPage = () => {
  const [tenants, setTenants] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    tin_number: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errors, setErrors] = useState({});

  const reduxUser = useSelector((state) => state.user?.user);
  const storedUser = JSON.parse(localStorage.getItem('user')) || {};
  const currentUser = reduxUser || storedUser || {};
  const isAdminUser = currentUser.role === 'admin';

  const fetchTenants = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const data = await getAllTenants(pageNumber, 10, searchTerm);
      const { tenants, totalPages, page } = data;
      setTenants(tenants);
      setTotalPages(totalPages);
      setPage(page);
    } catch (err) {
      showError(err?.message || 'Failed to fetch tenants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants(page);
  }, [page, searchTerm]);

  const handleEditClick = (tenant) => {
    setSelectedTenant(tenant);
    setEditData({
      name: tenant.name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      company_name: tenant.company_name || '',
      tin_number: tenant.tin_number || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const { name, email, phone, company_name, tin_number } = editData;
    const newErrors = {};

    if (!name?.trim()) newErrors.name = 'Tenant name is required';
    if (!company_name?.trim()) newErrors.company_name = 'Company name is required';
    if (!tin_number?.trim()) newErrors.tin_number = 'TIN number is required';

    if (email?.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email.trim())) {
        newErrors.email = 'Enter a valid email address';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (selectedTenant) {
        await updateTenant(selectedTenant.id, { name, email, phone, company_name, tin_number });
        showSuccess('Entity logic updated successfully.');
      } else {
        await createTenant({ name, email, phone, company_name, tin_number });
        showSuccess('New entity signature registered.');
        setPage(1);
      }
      fetchTenants(page);
      handleModalClose();
    } catch (err) {
      showError(err?.message || 'Failed to save entity signature.');
    }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm('Initialize entity deletion protocol?')) return;
    try {
      await deleteTenant(tenant.id);
      showInfo('Entity signature archived.');
      fetchTenants(page);
    } catch (err) {
      showError(err?.message || 'Failed to archive entity.');
    }
  };

  const handleRestore = async (tenant) => {
    try {
      await restoreTenant(tenant.id);
      showSuccess('Entity signature re-synchronized.');
      fetchTenants(page);
    } catch (err) {
      showError(err?.message || 'Failed to re-sync entity.');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTenant(null);
    setEditData({ name: '', email: '', phone: '', company_name: '', tin_number: '' });
    setErrors({});
  };

  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 bg-gray-800/40 backdrop-blur-sm border-rose-500/20 text-center space-y-6">
          <AlertCircle size={64} className="mx-auto text-rose-500 animate-pulse" />
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-rose-500 uppercase italic tracking-tighter">Access Inhibited</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Administrative Clearance Level Required</p>
          </div>
          <Button variant="outline" className="w-full border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white" onClick={() => window.history.back()}>
            Withdraw
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Users size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Ecosystem Surveillance
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Tenant <span className="text-teal-500">Registry</span>
                </h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4">
                  Stakeholder Logic Management // Entity Verification Console
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <Button onClick={() => setModalOpen(true)} className="px-8">
                <div className="flex items-center gap-3">
                  <UserPlus size={18} />
                  <span>Integrate Stakeholder</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Verified Entities', value: tenants.length, icon: CheckCircle, color: 'teal' },
              { label: 'Active Links', value: tenants.filter(t => !t.deletedAt).length, icon: Activity, color: 'indigo' },
              { label: 'Corporate Anchors', value: tenants.filter(t => t.company_name).length, icon: Briefcase, color: 'violet' },
              { label: 'Sync Status', value: 'Nominal', icon: RefreshCcw, color: 'emerald' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1 group">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic group-hover:text-teal-500 transition-colors">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <stat.icon size={14} className={`text-${stat.color}-400`} />
                  <p className="text-2xl font-black text-white italic tracking-tighter">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Query entity database by name, email or corporation..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4 h-[64px]">
            <Button variant="outline" className="px-8 rounded-[1.5rem] border-gray-700/50 text-gray-400 hover:text-teal-400">
              <Filter size={18} className="mr-2" /> Filter
            </Button>
            <Button variant="outline" className="px-8 rounded-[1.5rem] border-gray-700/50 text-gray-400 hover:text-emerald-400">
              <Download size={18} className="mr-2" /> Export
            </Button>
          </div>
        </div>

        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          <div className="xl:hidden divide-y divide-gray-700/30">
            {loading ? (
              <div className="p-20 text-center space-y-4 animate-pulse">
                <Activity size={40} className="mx-auto text-teal-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Stakeholder Matrix...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Stakeholder Signal Detected.</div>
            ) : (
              tenants.map((t) => (
                <div key={t.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${t.deletedAt ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'} flex items-center justify-center border group-hover/row:scale-110 transition-transform shadow-lg`}>
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{t.name}</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic flex items-center gap-2 mt-1">
                          <Mail size={10} className="text-teal-500" /> {t.email || 'NO_DIGITAL_SIG'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic border ${t.deletedAt ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {t.deletedAt ? 'Archived' : 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] font-black text-gray-400 uppercase italic tracking-widest">
                    <div className="flex items-center gap-2">
                      <Briefcase size={12} className="text-teal-500" /> {t.company_name || 'Individual'}
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard size={12} className="text-teal-500" /> TIN: {t.tin_number || 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                    <div className="flex gap-2">
                      {!t.deletedAt ? (
                        <>
                          <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(t)}>
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(t)}>
                            <Trash2 size={16} />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-emerald-400" onClick={() => handleRestore(t)}>
                          <RefreshCcw size={16} />
                        </Button>
                      )}
                    </div>
                    <p className="text-[9px] font-black text-gray-600 uppercase italic">SIG: {t.id.toString().slice(0, 8)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-10 py-6">Entity Signature</th>
                  <th className="px-10 py-6">Digital Address</th>
                  <th className="px-10 py-6">Corporate Anchor</th>
                  <th className="px-10 py-6">Tax Encryption (TIN)</th>
                  <th className="px-10 py-6 text-center">Status Index</th>
                  <th className="px-10 py-6 text-right">Command Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Activity size={48} className="text-teal-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Updating Entity Registry...</span>
                      </div>
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">Registry scan failed. No data captured.</td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl ${t.deletedAt ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'} flex items-center justify-center border shadow-lg group-hover:scale-110 transition-transform`}>
                            <Users size={24} />
                          </div>
                          <div>
                            <p className="font-black text-white italic uppercase tracking-tighter text-xl leading-none">{t.name}</p>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-2 flex items-center gap-2">
                              <Phone size={12} className="text-teal-500" /> {t.phone || 'COMM_LINK_NONE'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-sm font-black uppercase italic text-gray-400 tracking-tighter">{t.email || 'N/A'}</td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-3">
                          <Briefcase size={16} className="text-teal-500/50" />
                          <span className="text-sm font-black uppercase tracking-widest italic text-gray-300">{t.company_name || 'Individual'}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
                          {t.tin_number || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic border ${t.deletedAt ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {t.deletedAt ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <div className="flex items-center justify-end gap-3">
                          {!t.deletedAt ? (
                            <>
                              <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(t)}>
                                <Edit2 size={16} />
                              </Button>
                              <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(t)}>
                                <Trash2 size={16} />
                              </Button>
                            </>
                          ) : (
                            <Button variant="outline" className="px-6 py-2.5 rounded-xl border-gray-700 text-[10px] text-emerald-400 hover:bg-emerald-500 hover:text-white" onClick={() => handleRestore(t)}>
                              <RefreshCcw size={14} className="mr-2" /> Restore
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex justify-between items-center py-6">
          <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-[0.2em]">
            Index <span className="text-teal-400 font-black">{page}</span> // Matrix <span className="text-white font-black">{totalPages}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage(Math.max(page - 1, 1))}
              disabled={page <= 1}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page <= 1
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'text-gray-400 hover:text-teal-400 hover:bg-gray-800'
                }`}
            >
              Retreat
            </button>
            <button
              onClick={() => setPage(Math.min(page + 1, totalPages))}
              disabled={page >= totalPages}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page >= totalPages
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'bg-teal-600 text-white shadow-xl hover:bg-teal-500 hover:scale-105 active:scale-95'
                }`}
            >
              Advance
            </button>
          </div>
        </div>

        {modalOpen && (
          <Modal
            title={selectedTenant ? `Edit Stakeholder: ${selectedTenant.name}` : 'Integrate New Stakeholder'}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
            className="max-w-2xl"
          >
            <div className="space-y-10 py-4">
              <Input
                label="Legal Designation *"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="e.g. JOHN DOE / ALPHA SOLUTIONS"
                icon={Users}
                error={errors.name}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Digital Address"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="contact@entity.com"
                  icon={Mail}
                  error={errors.email}
                />
                <Input
                  label="Comms Frequency"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="+250 XXX XXX XXX"
                  icon={Phone}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Corporate Anchor *"
                  value={editData.company_name}
                  onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
                  placeholder="e.g. ACME CORP"
                  icon={Briefcase}
                  error={errors.company_name}
                />
                <Input
                  label="Tax Identification (TIN) *"
                  value={editData.tin_number}
                  onChange={(e) => setEditData({ ...editData, tin_number: e.target.value })}
                  placeholder="e.g. 123456789"
                  icon={CreditCard}
                  error={errors.tin_number}
                />
              </div>

              <div className="p-6 bg-teal-500/5 rounded-[1.5rem] border border-teal-500/10 flex items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <CheckCircle size={24} className="animate-pulse" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic leading-relaxed flex-1">
                  Entity signature will be committed to the decentralized registry for lease association and fiscal interrogation.
                </p>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default TenantPage;
