import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import leaseService from '../../services/leaseService';
import { getAllTenants } from '../../services/tenantService';
import { getAllLocals } from '../../services/localService';
import { getAllProperties } from '../../services/propertyService';
import { Button, Input, Modal, Card, Select } from '../../components';
import {
  FileText,
  Plus,
  Trash2,
  Search,
  Download,
  Clock,
  Edit2,
  Activity,
  Building,
  Users,
  Box,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  History,
  RefreshCcw
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';

const LeasePage = () => {
  const [leases, setLeases] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [locals, setLocals] = useState([]);
  const [filteredLocals, setFilteredLocals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);
  const [editData, setEditData] = useState({
    startDate: '',
    endDate: '',
    status: 'active',
    tenantId: '',
    propertyId: '',
    localId: '',
    leaseAmount: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;
  const [errors, setErrors] = useState({});

  const reduxUser = useSelector((state) => state.user?.user);
  const storedUser = JSON.parse(localStorage.getItem('user')) || {};
  const currentUser = reduxUser || storedUser || {};
  const isAdminUser = currentUser.role === 'admin';

  const fetchTenantsAndLocals = async () => {
    try {
      setError(null);
      const [tenantsData, localsData] = await Promise.all([
        getAllTenants(1, 100),
        getAllLocals({ page: 1, limit: 100 })
      ]);

      setTenants(tenantsData.tenants || tenantsData.data || []);
      const localsArray = localsData.data || localsData.locals || localsData || [];
      setLocals(Array.isArray(localsArray) ? localsArray : []);
    } catch (err) {
      console.error('Error fetching tenants or locals:', err);
      setError('Failed to fetch auxiliary architecture data');
      showError('Failed to fetch tenants or locals');
    }
  };

  const fetchPropertiesData = async () => {
    try {
      setError(null);
      const res = await getAllProperties(1, 100);
      setProperties(res.properties || res.data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to fetch property portfolio');
      showError('Failed to fetch properties');
    }
  };

  const fetchLeases = async (pageNumber = 1, filterStatus = '', term = '') => {
    try {
      setLoading(true);
      setError(null);

      const res = await leaseService.getLeases(pageNumber, PAGE_SIZE, filterStatus, term);
      const leasesData = res.data || res.leases || res || [];
      const totalCount = res.total || res.totalCount || res.totalItems ||
        (Array.isArray(leasesData) ? leasesData.length : 0);

      setLeases(Array.isArray(leasesData) ? leasesData : []);
      setPage(pageNumber);
      setTotalPages(Math.ceil(totalCount / PAGE_SIZE) || 1);
    } catch (err) {
      setError('Failed to fetch lease matrix: ' + (err.message || 'Unknown error'));
      showError('Failed to fetch leases');
      setLeases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantsAndLocals();
    fetchPropertiesData();
    fetchLeases(1);
  }, []);

  useEffect(() => {
    setPage(1);
    fetchLeases(1, statusFilter, searchTerm);
  }, [statusFilter, searchTerm]);

  const tenantsOptions = tenants.map(t => ({
    value: t.id,
    label: t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || `Entity ${t.id}`
  }));

  const propertiesOptions = properties.map(p => ({
    value: p.id,
    label: p.name || p.property_name || `Asset ${p.id}`
  }));

  const filteredLeases = useMemo(
    () =>
      leases.filter(
        l =>
          l.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.local?.reference_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [leases, searchTerm]
  );

  const handleEditClick = lease => {
    setSelectedLease(lease);
    const propertyId = lease.local?.property_id || lease.local?.propertyId ||
      lease.property_id || lease.propertyId || '';

    const localsForProperty = locals.filter(l =>
      (l.property_id || l.propertyId) === propertyId
    );
    setFilteredLocals(localsForProperty);

    setEditData({
      startDate: lease.start_date?.split('T')[0] || lease.startDate?.split('T')[0] || '',
      endDate: lease.end_date?.split('T')[0] || lease.endDate?.split('T')[0] || '',
      status: lease.status || 'active',
      tenantId: lease.tenant_id || lease.tenant?.id || '',
      propertyId: propertyId,
      localId: lease.local_id || lease.local?.id || '',
      leaseAmount: lease.lease_amount || lease.leaseAmount || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const { startDate, endDate, status, tenantId, localId, leaseAmount } = editData;
    const newErrors = {};

    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date cannot be before start date';
    }
    if (!tenantId) newErrors.tenantId = 'Tenant signature is required';
    if (!localId) newErrors.localId = 'Local node is required';
    if (!leaseAmount || Number(leaseAmount) <= 0) {
      newErrors.leaseAmount = 'Valuation must be greater than zero';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const payload = {
        startDate,
        endDate,
        status,
        tenantId,
        localId,
        leaseAmount: Number(leaseAmount),
      };

      if (selectedLease) {
        await leaseService.updateLease(selectedLease.id, payload);
        showSuccess('Lease protocol updated.');
      } else {
        await leaseService.createLease(payload);
        showSuccess('New lease protocol initialized.');
      }

      fetchLeases(page, statusFilter, searchTerm);
      setModalOpen(false);
      setSelectedLease(null);
      setEditData({
        startDate: '',
        endDate: '',
        status: 'active',
        tenantId: '',
        propertyId: '',
        localId: '',
        leaseAmount: '',
      });
      setFilteredLocals([]);
      setErrors({});
    } catch (err) {
      showError(err.message || 'Failed to sync lease protocol');
    }
  };

  const handleDelete = async lease => {
    if (!window.confirm('Initialize protocol termination?')) return;
    try {
      await leaseService.deleteLease(lease.id);
      showInfo('Lease protocol neutralized.');
      fetchLeases(page, statusFilter, searchTerm);
    } catch (err) {
      showError(err.message || 'Failed to terminate protocol');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await leaseService.downloadPdfReport();
      showSuccess('PDF matrix downloaded.');
    } catch (err) {
      showError(err.message || 'Failed to export PDF');
    }
  };

  const handleTriggerExpired = async () => {
    if (!window.confirm('Execute manual expiration sweep?')) return;
    try {
      await leaseService.triggerExpiredLeases();
      showSuccess('Expiration sweep completed.');
      fetchLeases(page, statusFilter, searchTerm);
    } catch (err) {
      showError(err.message || 'Failed to execute sweep');
    }
  };

  const statusBadge = (status) => {
    const styles = {
      active: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      expired: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };
    return (
      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic border ${styles[status] || styles.inactive}`}>
        {status || 'Unknown'}
      </span>
    );
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
            <FileText size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Contractual Intelligence
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Lease <span className="text-teal-500">Matrix</span>
                </h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4">
                  Temporal Asset Governance // Contractual Monitoring Console
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <Button onClick={() => setModalOpen(true)} className="px-8 flex-1 sm:flex-none">
                <div className="flex items-center gap-3">
                  <Plus size={18} />
                  <span>Execute Protocol</span>
                </div>
              </Button>
              <Button variant="outline" onClick={handleDownloadPdf} className="px-8 border-gray-700/50 flex-1 sm:flex-none">
                <div className="flex items-center gap-3">
                  <Download size={18} />
                  <span>Export</span>
                </div>
              </Button>
              <Button variant="outline" onClick={handleTriggerExpired} className="p-4 border-gray-700/50 text-amber-500 hover:bg-amber-500/10">
                <Clock size={18} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Active Protocols', value: leases.filter(l => l.status === 'active').length, icon: ShieldCheck, color: 'teal' },
              { label: 'Total Capture', value: leases.length, icon: History, color: 'indigo' },
              { label: 'Asset Nodes', value: locals.length, icon: Building, color: 'violet' },
              { label: 'Temporal State', value: 'Sync', icon: RefreshCcw, color: 'emerald' }
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

        {error && (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-[1.5rem] flex items-center gap-4 animate-fade-in">
            <AlertCircle size={20} />
            <p className="text-sm font-black uppercase italic tracking-tight">{error}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Filer matrix by tenant signature, node ref, or protocol ID..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full lg:w-72">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Filter size={18} className="text-gray-500" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-black uppercase text-[11px] tracking-widest italic outline-hidden transition-all shadow-inner appearance-none cursor-pointer focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
            >
              <option value="">Full Spectrum</option>
              <option value="active">Active protocols</option>
              <option value="inactive">Inactive protocols</option>
              <option value="expired">Expired protocols</option>
            </select>
            <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
              <ChevronRight size={14} className="text-gray-500 rotate-90" />
            </div>
          </div>
        </div>

        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          <div className="xl:hidden divide-y divide-gray-700/30">
            {loading ? (
              <div className="p-20 text-center space-y-4 animate-pulse">
                <Activity size={40} className="mx-auto text-teal-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Interrogating Matrix...</p>
              </div>
            ) : filteredLeases.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Protocol Signal Detected.</div>
            ) : (
              filteredLeases.map((l) => (
                <div key={l.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{l.tenant?.name || 'UNKNOWN_ENTITY'}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mt-1 flex items-center gap-2">
                          <Box size={10} className="text-indigo-500" /> {l.local?.reference_code || 'NODE-UNDEF'}
                        </p>
                      </div>
                    </div>
                    {statusBadge(l.status)}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
                    <div className="flex flex-col">
                      <p className="text-[9px] font-black text-gray-500 uppercase italic">Monthly Impact</p>
                      <p className="text-lg font-black text-white italic">{(l.lease_amount || 0).toLocaleString()} <span className="text-[10px] text-gray-400">RWF</span></p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(l)}>
                        <Edit2 size={14} />
                      </Button>
                      {isAdminUser && (
                        <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(l)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-10 py-6">Protocol Reference</th>
                  <th className="px-10 py-6">Stakeholder Signature</th>
                  <th className="px-10 py-6">Node Architecture</th>
                  <th className="px-10 py-6">Monthly Value</th>
                  <th className="px-10 py-6 text-center">Temporal Span</th>
                  <th className="px-10 py-6 text-center">Protocol State</th>
                  <th className="px-10 py-6 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Activity size={48} className="text-teal-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Protocol Matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No protocols found in current sector.</td>
                  </tr>
                ) : (
                  filteredLeases.map((l) => (
                    <tr key={l.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                      <td className="px-10 py-8">
                        <span className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 italic text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-teal-400 transition-colors">
                          {l.reference || 'UNOFFICIAL'}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 shadow-lg group-hover:scale-110 transition-transform">
                            <Users size={18} />
                          </div>
                          <div>
                            <p className="font-black text-white italic uppercase tracking-tighter text-xl leading-none">{l.tenant?.name || 'UNKNOWN_ENTITY'}</p>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-2">SIG: {l.tenant_id?.toString().slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-3">
                          <Box size={16} className="text-teal-500" />
                          <span className="font-black text-sm text-gray-300 uppercase italic tracking-tight">{l.local?.reference_code || 'NODE-UNDEF'}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-xl font-black text-teal-400 italic tracking-tighter">
                          {(l.lease_amount || 0).toLocaleString()} <small className="text-[10px] text-gray-400 uppercase">RWF</small>
                        </span>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase italic text-gray-400">
                            <span className="text-emerald-400">{new Date(l.start_date || l.startDate).toLocaleDateString()}</span>
                            <ArrowRight size={12} className="text-gray-600" />
                            <span className="text-rose-400">{new Date(l.end_date || l.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">{statusBadge(l.status)}</td>
                      <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <div className="flex items-center justify-end gap-3">
                          <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(l)}>
                            <Edit2 size={16} />
                          </Button>
                          {isAdminUser && (
                            <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(l)}>
                              <Trash2 size={16} />
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
            title={selectedLease ? `Modify Protocol: ${selectedLease.reference || ''}` : 'Initialize New Protocol'}
            onClose={() => { setModalOpen(false); setFilteredLocals([]); setErrors({}); }}
            onSubmit={handleSubmit}
            className="max-w-4xl"
          >
            <div className="space-y-10 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Activation Date *"
                  type="date"
                  value={editData.startDate}
                  onChange={e => setEditData({ ...editData, startDate: e.target.value })}
                  icon={Calendar}
                  error={errors.startDate}
                />
                <Input
                  label="Termination Date *"
                  type="date"
                  value={editData.endDate}
                  onChange={e => setEditData({ ...editData, endDate: e.target.value })}
                  icon={Calendar}
                  error={errors.endDate}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Equilibrium Valuation (RWF) *"
                  type="number"
                  value={editData.leaseAmount}
                  onChange={e => setEditData({ ...editData, leaseAmount: e.target.value })}
                  icon={DollarSign}
                  error={errors.leaseAmount}
                />
                <Select
                  label="Stakeholder Signature *"
                  value={editData.tenantId ? tenantsOptions.find(t => t.value === editData.tenantId) : null}
                  options={tenantsOptions}
                  onChange={selected => setEditData({ ...editData, tenantId: selected?.value || '' })}
                  placeholder="Identify Entity..."
                  error={errors.tenantId}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Select
                  label="Target Asset *"
                  value={editData.propertyId ? propertiesOptions.find(p => p.value === editData.propertyId) : null}
                  options={propertiesOptions}
                  onChange={selected => {
                    const propertyId = selected?.value || '';
                    setEditData({ ...editData, propertyId, localId: '' });
                    setFilteredLocals(locals.filter(l => (l.property_id || l.propertyId) === propertyId));
                  }}
                  placeholder="Allocate Asset..."
                />
                <Select
                  label="Architectural Node (Unit) *"
                  value={editData.localId ? filteredLocals.map(l => ({ value: l.id, label: l.reference_code || l.referenceCode || l.code })).find(l => l.value === editData.localId) : null}
                  options={filteredLocals.map(l => ({ value: l.id, label: l.reference_code || l.referenceCode || l.code }))}
                  onChange={selected => setEditData({ ...editData, localId: selected?.value || '' })}
                  isDisabled={!editData.propertyId}
                  placeholder={editData.propertyId ? "Assign Node..." : "Select Asset First"}
                  error={errors.localId}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Protocol State Configuration</label>
                <div className="grid grid-cols-3 gap-6">
                  {['active', 'inactive', 'expired'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditData({ ...editData, status: s })}
                      className={`py-5 rounded-[1.5rem] border-2 transition-all font-black uppercase text-[10px] tracking-widest italic flex flex-col items-center gap-2 ${editData.status === s
                        ? 'bg-teal-500 border-teal-500 text-white shadow-2xl shadow-teal-500/30'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                        }`}
                    >
                      {s === 'active' && <ShieldCheck size={18} />}
                      {s === 'inactive' && <Activity size={18} />}
                      {s === 'expired' && <Clock size={18} />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-teal-500/5 rounded-[2.5rem] border border-teal-500/10 flex items-center gap-6">
                <TrendingUp className="text-teal-500 animate-pulse" size={32} />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic leading-relaxed flex-1">
                  Commitment to this protocol will automate fiscal schedules and initialize custodial associations for the selected node.
                </p>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default LeasePage;