import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import leaseService from '../../services/leaseService';
import { getAllTenants } from '../../services/tenantService';
import { getAllLocals } from '../../services/localService';
import { Button, Input, Modal, Card, Select } from '../../components';
import {
  FileText,
  Plus,
  Trash2,
  Search,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
  MoreVertical,
  Building2,
  Users,
  History,
  LayoutDashboard,
  Shield,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';
import useAccessibleProperties from '../../hooks/useAccessibleProperties';

const LeasePage = () => {
  const [leases, setLeases] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [locals, setLocals] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);
  const [editData, setEditData] = useState({
    startDate: '',
    endDate: '',
    status: 'active',
    tenantId: undefined,
    localId: undefined,
    leaseAmount: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  // Role: derive from Redux (with optional localStorage fallback)
  const reduxUser = useSelector((state) => state.user?.user);
  const storedUser = JSON.parse(localStorage.getItem('user')) || {};
  const currentUser = reduxUser || storedUser || {};
  const isAdminUser = currentUser.role === 'admin';

  const {
    isManager,
    properties,
    propertyOptions,
    loading: loadingProperties,
  } = useAccessibleProperties();

  useEffect(() => {
    if (!isManager) return;

    if (properties.length === 1) {
      setSelectedPropertyId(properties[0].id);
    } else if (!properties.find((property) => property.id === selectedPropertyId)) {
      setSelectedPropertyId('');
    }
  }, [isManager, properties, selectedPropertyId]);

  // Fetch tenants and locals
  const fetchTenantsAndLocals = async (propertyId) => {
    try {
      const tenantsData = await getAllTenants(1, 100);
      const localsParams = { page: 1, limit: 500 };
      if (propertyId) {
        localsParams.propertyId = propertyId;
      }
      const localsData = await getAllLocals(localsParams);
      setTenants(tenantsData.tenants || []);
      setLocals(localsData.locals || localsData.data || []);
    } catch {
      showError('Failed to fetch tenants or locals');
    }
  };

  // Fetch leases
  const fetchLeases = async (pageNumber = 1, term = '') => {
    try {
      setLoading(true);
      const res = await leaseService.getLeases(pageNumber, PAGE_SIZE, term);
      setLeases(res.data || []);
      setTotalPages(Math.ceil((res.total || (res.data?.length || 0)) / PAGE_SIZE));
      setPage(pageNumber);
    } catch {
      showError('Failed to synchronize lease matrix.');
      setLeases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager && properties.length > 0 && !selectedPropertyId) {
      return;
    }

    fetchTenantsAndLocals(selectedPropertyId || undefined);
  }, [selectedPropertyId, isManager, properties.length]);

  useEffect(() => {
    setPage(1);
  }, [selectedPropertyId]);

  useEffect(() => {
    fetchLeases(page, searchTerm);
  }, [page, searchTerm]);

  const tenantsOptions = tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }));
  const localsOptions = locals.map((local) => ({
    value: local.id,
    label: local.reference_code || local.referenceCode || 'Unnamed Local'
  }));

  const localPropertyMap = useMemo(() => {
    const map = new Map();
    locals.forEach((local) => {
      if (!local?.id) return;
      const propertyId =
        local.property_id ||
        local.propertyId ||
        local.property?.id ||
        local.property?.property_id ||
        null;
      if (propertyId) {
        map.set(local.id, propertyId);
      }
    });
    return map;
  }, [locals]);

  const accessiblePropertyIds = useMemo(
    () => new Set(properties.map((property) => property.id)),
    [properties]
  );

  const searchTermLower = searchTerm.toLowerCase();

  const filteredLeases = useMemo(() => {
    return leases.filter((lease) => {
      const tenantName = lease.tenant?.name?.toLowerCase() || '';
      const localCode =
        lease.local?.referenceCode?.toLowerCase() ||
        lease.local?.reference_code?.toLowerCase() ||
        '';

      const matchesSearch =
        !searchTermLower || tenantName.includes(searchTermLower) || localCode.includes(searchTermLower);
      if (!matchesSearch) return false;

      const localId = lease.local?.id;
      const leasePropertyId = localPropertyMap.get(localId);

      if (isManager) {
        if (!leasePropertyId || !accessiblePropertyIds.has(leasePropertyId)) {
          return false;
        }
        if (selectedPropertyId && leasePropertyId !== selectedPropertyId) {
          return false;
        }
      } else if (selectedPropertyId && leasePropertyId !== selectedPropertyId) {
        return false;
      }

      return true;
    });
  }, [
    leases,
    searchTermLower,
    localPropertyMap,
    isManager,
    accessiblePropertyIds,
    selectedPropertyId
  ]);

  const handleEditClick = lease => {
    setSelectedLease(lease);
    setEditData({
      startDate: lease.startDate?.split('T')[0] || '',
      endDate: lease.endDate?.split('T')[0] || '',
      status: lease.status || 'active',
      tenantId: lease.tenant?.id || undefined,
      localId: lease.local?.id || undefined,
      leaseAmount: lease.leaseAmount || '',
    });
    setModalOpen(true);
  };


  const handleSubmit = async () => {
    const { startDate, endDate, status, tenantId, localId, leaseAmount } = editData;
    console.log(editData)
    // Validate fields
    if (!startDate || !endDate || !tenantId || !localId || !leaseAmount) {
      showError('All fields are required');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      showError('End date cannot be before start date.');
      return;
    }

    try {
      const payload = { startDate, endDate, status, tenantId, localId, leaseAmount: Number(leaseAmount) };
      if (selectedLease) {
        await leaseService.updateLease(selectedLease.id, payload);
        showSuccess('Lease updated successfully!');
      } else {
        await leaseService.createLease(payload);
        showSuccess('Lease created successfully!');
      }
      fetchLeases(page, searchTerm);
      setModalOpen(false);
      setSelectedLease(null);
      setEditData({ startDate: '', endDate: '', status: 'active', tenantId: '', localId: '', leaseAmount: '' });
    } catch {
      showError('Failed to save lease');
    }
  };

  const handleDelete = async lease => {
    if (!window.confirm('Are you sure you want to delete this lease?')) return;
    try {
      await leaseService.deleteLease(lease.id);
      showInfo('Lease deleted successfully');
      fetchLeases(page, searchTerm);
    } catch {
      showError('Failed to delete lease');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await leaseService.downloadPdfReport();
      showSuccess('PDF report downloaded!');
    } catch {
      showError('Failed to download PDF');
    }
  };

  const statusBadge = (status) => {
    const statusKey = status?.toLowerCase();
    const styles = {
      active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      expired: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };

    const icons = {
      active: <CheckCircle className="w-3 h-3" />,
      inactive: <XCircle className="w-3 h-3" />,
      expired: <AlertCircle className="w-3 h-3" />,
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-widest border ${styles[statusKey] || styles.inactive}`}>
        {icons[statusKey] || icons.inactive}
        {statusKey}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 border-l border-gray-800/50 pb-12">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-teal-950 via-indigo-950 to-slate-950 text-white border-b border-gray-800/50">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-16 space-y-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                  <FileText size={12} /> Lease Governance
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Contract <span className="text-teal-500">Matrix</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Managing contractual residency nodes and legal hierarchy
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleDownloadPdf}
                className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700 text-white border border-gray-700 shadow-2xl px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all active:scale-95"
              >
                <Printer size={18} /> Generate Analytics
              </Button>
              <Button
                className="flex items-center gap-3 bg-teal-600 hover:bg-teal-500 text-white shadow-2xl px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all active:scale-95 transition-transform"
                onClick={() => {
                  setSelectedLease(null);
                  setEditData({ startDate: '', endDate: '', status: 'active', tenantId: '', localId: '', leaseAmount: '' });
                  setModalOpen(true);
                }}
                disabled={isManager && properties.length === 0}
              >
                <Plus size={18} /> Initiate Protocol
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {/* Filters */}
        <div className="py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-gray-800/50">
          <div className="flex flex-col md:flex-row gap-4 max-w-4xl">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
              </div>
              <input
                type="text"
                className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                placeholder="Scan contract identifier, occupant, or node..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative min-w-[300px]">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Shield size={18} className="text-gray-500" />
              </div>
              <select
                className="w-full pl-16 pr-10 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-black uppercase text-[11px] tracking-widest italic outline-hidden transition-all shadow-inner appearance-none cursor-pointer focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
              >
                <option value="" className="bg-gray-900">All Contract Matrices</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isManager && !loadingProperties && properties.length === 0 ? (
          <Card className="p-20 text-center bg-gray-800/40 backdrop-blur-sm border-gray-700/50 border-dashed rounded-[2rem]" hover={false}>
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                <Building2 className="w-12 h-12 text-gray-600" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Assets Assigned</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic mb-8">System detects no property nodes linked to your identity.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest italic text-[10px]">Synchronizing Lease Matrix...</p>
              </div>
            ) : filteredLeases.length === 0 ? (
              <Card className="p-20 text-center bg-gray-800/40 backdrop-blur-sm border-gray-700/50 border-dashed rounded-[2rem]" hover={false}>
                <div className="flex justify-center mb-6">
                  <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                    <FileText className="w-12 h-12 text-gray-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Lease Match</h3>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic mb-8">No contractual nodes found matching current filters.</p>
              </Card>
            ) : (
              <div className="space-y-8">
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
                  {/* Mobile Feed */}
                  <div className="md:hidden divide-y divide-gray-700/30 px-4">
                    {filteredLeases.map((lease) => (
                      <div key={lease.id} className="py-6 space-y-4 group/row">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover/row:scale-110 transition-transform duration-500 font-black italic">
                              {lease.tenant?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <h3 className="font-black text-white italic uppercase tracking-tighter text-base group-hover/row:text-teal-400 transition-colors">{lease.tenant?.name || 'Unknown Node'}</h3>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-1 flex items-center gap-1">
                                <Building2 size={10} /> {lease.local?.referenceCode || 'No Unit'}
                              </p>
                            </div>
                          </div>
                          {statusBadge(lease.status)}
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-black uppercase italic tracking-widest">
                          <div>
                            <p className="text-gray-600 mb-1">Monthly Yield</p>
                            <p className="text-white">{lease.leaseAmount ? `${lease.leaseAmount.toLocaleString()} RWF` : '0.00'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-600 mb-1">Duration</p>
                            <p className="text-indigo-400 font-bold tracking-tight">TO: {lease.endDate?.split('T')[0]}</p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-700/30">
                          <button
                            className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 rounded-xl transition-all shadow-xl"
                            onClick={() => handleEditClick(lease)}
                          >
                            <FileText size={16} />
                          </button>
                          {isAdminUser && (
                            <button
                              className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-rose-500 hover:border-rose-500/50 rounded-xl transition-all shadow-xl"
                              onClick={() => handleDelete(lease)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto scrollbar-hide">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-900/60 border-b border-gray-700/50">
                        <tr>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Tenant / Node</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Duration Timeline</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Contract Value</th>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Matrix Status</th>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/30">
                        {filteredLeases.map((lease) => (
                          <tr key={lease.id} className="group transition-all hover:bg-gray-700/20">
                            <td className="px-6 py-6 min-w-[250px]">
                              <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 font-black italic">
                                  {lease.tenant?.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div className="font-black text-white italic uppercase text-base tracking-tight group-hover:text-teal-400 transition-colors uppercase">{lease.tenant?.name || 'Unknown Node'}</div>
                                  <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1 uppercase flex items-center gap-1">
                                    <Building2 size={10} /> {lease.local?.referenceCode || 'No Unit'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6 font-mono text-[10px] text-gray-400">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-indigo-400 uppercase italic font-black tracking-widest">
                                  <Calendar size={12} className="text-gray-600" /> {lease.startDate?.split('T')[0]}
                                </div>
                                <div className="pl-5 text-gray-600 uppercase italic font-black tracking-widest">
                                  PROX: {lease.endDate?.split('T')[0]}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="font-black text-white italic text-base tracking-tight">{lease.leaseAmount ? `${lease.leaseAmount.toLocaleString()} RWF` : '0.00'}</div>
                              <div className="text-[9px] font-black text-teal-500 uppercase italic tracking-widest mt-1 uppercase">Monthly Cycle</div>
                            </td>
                            <td className="px-6 py-6 text-center">
                              {statusBadge(lease.status)}
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex justify-center gap-3">
                                <button
                                  className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 rounded-xl transition-all shadow-xl"
                                  onClick={() => handleEditClick(lease)}
                                  title="Reconfigure Contract"
                                >
                                  <FileText size={16} />
                                </button>
                                {isAdminUser && (
                                  <button
                                    className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-rose-500 hover:border-rose-500/50 rounded-xl transition-all shadow-xl opacity-0 group-hover:opacity-100"
                                    onClick={() => handleDelete(lease)}
                                    title="Terminate Protocol"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center py-6">
                    <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-[0.2em]">
                      Index <span className="text-teal-400 font-black">{page}</span> // Directory <span className="text-white font-black">{totalPages}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        disabled={page <= 1}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page <= 1
                          ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                          : 'text-gray-400 hover:text-teal-400 hover:bg-gray-800'
                          }`}
                      >
                        Reverse
                      </button>
                      <button
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
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
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={selectedLease ? 'Reconfigure Lease Protocol' : 'Initiate New Contract'}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        >
          <div className="space-y-6">
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6 flex gap-4">
              <FileText className="w-6 h-6 text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-black text-teal-300 mb-1 uppercase tracking-widest italic">Governance Specification</p>
                <p className="text-[11px] font-black text-teal-400/80 uppercase italic leading-relaxed">Define the temporal and financial parameters for this contractual node.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Input
                type="date"
                label="Commencement Date"
                value={editData.startDate}
                onChange={e => setEditData({ ...editData, startDate: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
              />
              <Input
                type="date"
                label="Termination Date"
                value={editData.endDate}
                onChange={e => setEditData({ ...editData, endDate: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
              />
            </div>

            <Input
              type="number"
              label="Standard Monthly Yield (RWF)"
              placeholder="0.00"
              value={editData.leaseAmount}
              onChange={e => setEditData({ ...editData, leaseAmount: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Assign Occupant"
                value={tenantsOptions.find(t => t.value === editData.tenantId) || undefined}
                onChange={selected => setEditData({ ...editData, tenantId: selected?.value || undefined })}
                options={tenantsOptions}
                placeholder="Search Identity..."
                isSearchable
                className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
              />
              <Select
                label="Assign Local Unit"
                value={localsOptions.find(l => l.value === editData.localId) || undefined}
                onChange={selected => setEditData({ ...editData, localId: selected?.value || undefined })}
                options={localsOptions}
                placeholder="Search Node..."
                isSearchable
                className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
              />
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-black text-gray-500 uppercase italic tracking-widest mb-3 block">Protocol State</label>
              <div className="flex items-center gap-3 p-1.5 bg-gray-950 rounded-2xl border border-gray-800">
                {['active', 'inactive', 'expired'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setEditData({ ...editData, status })}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${editData.status === status
                      ? 'bg-teal-600 text-white shadow-xl'
                      : 'text-gray-600 hover:text-gray-400'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LeasePage;
