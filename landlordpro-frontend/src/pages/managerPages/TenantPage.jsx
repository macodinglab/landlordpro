import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getAllTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  restoreTenant,
} from '../../services/tenantService';
import { getAllLocals } from '../../services/localService';
import leaseService from '../../services/leaseService';
import { Button, Modal, Input, Card, Select } from '../../components';
import {
  Edit2,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Users,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  ArrowRight,
  History,
  LayoutDashboard
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';
import useAccessibleProperties from '../../hooks/useAccessibleProperties';

const TenantPage = () => {
  const [tenants, setTenants] = useState([]);
  const [locals, setLocals] = useState([]);
  const [leases, setLeases] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [editData, setEditData] = useState({ name: '', email: '', phone: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  const fetchLocalsForFilter = useCallback(async (propertyId) => {
    try {
      const params = { page: 1, limit: 500 };
      if (propertyId) {
        params.propertyId = propertyId;
      }
      const response = await getAllLocals(params);
      setLocals(response.locals || response.data || []);
    } catch (error) {
      console.error('Failed to fetch locals for tenant filtering:', error);
      setLocals([]);
    }
  }, []);

  const fetchLeasesForFilter = useCallback(async () => {
    try {
      const response = await leaseService.getLeases(1, 500);
      setLeases(response.data || []);
    } catch (error) {
      console.error('Failed to fetch leases for tenant filtering:', error);
      setLeases([]);
    }
  }, []);

  useEffect(() => {
    if (isManager && properties.length > 0 && !selectedPropertyId) {
      return;
    }

    fetchLocalsForFilter(selectedPropertyId || undefined);
    fetchLeasesForFilter();
  }, [selectedPropertyId, isManager, properties.length, fetchLocalsForFilter, fetchLeasesForFilter]);

  useEffect(() => {
    setPage(1);
  }, [selectedPropertyId]);

  const fetchTenants = async (pageNumber = 1, search = '') => {
    try {
      setLoading(true);
      const data = await getAllTenants(pageNumber, 10, search);
      setTenants(data.tenants || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || pageNumber);
    } catch (err) {
      showError('Failed to synchronize occupant registry.');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager && properties.length > 0 && !selectedPropertyId) {
      return;
    }
    fetchTenants(page, searchTerm);
  }, [page, searchTerm, selectedPropertyId, isManager, properties.length]);

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

  const tenantPropertyMap = useMemo(() => {
    const map = new Map();
    leases.forEach((lease) => {
      const tenantId = lease.tenant?.id;
      const localId = lease.local?.id;
      if (!tenantId || !localId) return;

      const propertyId = localPropertyMap.get(localId);
      if (!propertyId) return;

      if (!map.has(tenantId)) {
        map.set(tenantId, new Set());
      }
      map.get(tenantId).add(propertyId);
    });
    return map;
  }, [leases, localPropertyMap]);

  const accessiblePropertyIds = useMemo(
    () => new Set(properties.map((property) => property.id)),
    [properties]
  );

  const searchTermLower = searchTerm.toLowerCase();

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesSearch =
        !searchTermLower ||
        tenant.name?.toLowerCase().includes(searchTermLower) ||
        tenant.email?.toLowerCase().includes(searchTermLower) ||
        tenant.phone?.toLowerCase().includes(searchTermLower);
      if (!matchesSearch) return false;

      const tenantProperties = tenantPropertyMap.get(tenant.id);

      if (isManager) {
        if (!tenantProperties || tenantProperties.size === 0) return false;
        const hasAccessible = [...tenantProperties].some((propertyId) =>
          accessiblePropertyIds.has(propertyId)
        );
        if (!hasAccessible) return false;
        if (selectedPropertyId) {
          return tenantProperties.has(selectedPropertyId);
        }
        return true;
      }

      if (selectedPropertyId) {
        return tenantProperties?.has(selectedPropertyId) ?? false;
      }

      return true;
    });
  }, [
    tenants,
    searchTermLower,
    tenantPropertyMap,
    isManager,
    accessiblePropertyIds,
    selectedPropertyId
  ]);

  const handleEditClick = (tenant) => {
    setSelectedTenant(tenant);
    setEditData({
      name: tenant.name,
      email: tenant.email || '',
      phone: tenant.phone || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const { name, email, phone } = editData;

    if (!name?.trim()) {
      showError('Name is required.');
      return;
    }

    try {
      if (selectedTenant) {
        await updateTenant(selectedTenant.id, { name, email, phone });
        showSuccess('Tenant updated successfully!');
      } else {
        await createTenant({ name, email, phone });
        showSuccess('Tenant added successfully!');
        setPage(1);
      }

      fetchTenants(page, searchTerm);
      setModalOpen(false);
      setSelectedTenant(null);
      setEditData({ name: '', email: '', phone: '' });
    } catch (err) {
      showError(err?.message || 'Failed to save tenant');
    }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) return;

    try {
      await deleteTenant(tenant.id);
      showInfo('Tenant soft deleted successfully.');
      fetchTenants(page, searchTerm);
    } catch (err) {
      showError(err?.message || 'Failed to delete tenant');
    }
  };

  const handleRestore = async (tenant) => {
    try {
      await restoreTenant(tenant.id);
      showSuccess('Tenant restored successfully!');
      fetchTenants(page, searchTerm);
    } catch (err) {
      showError(err?.message || 'Failed to restore tenant');
    }
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
                  <Users size={12} /> Occupant Registry
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Occupant <span className="text-teal-500">Matrix</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Managing residency nodes and relationship hierarchy
                </p>
              </div>
            </div>

            <Button
              className="flex items-center gap-3 bg-teal-600 hover:bg-teal-500 text-white shadow-2xl px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all active:scale-95 transition-transform"
              onClick={() => {
                setSelectedTenant(null);
                setEditData({ name: '', email: '', phone: '' });
                setModalOpen(true);
              }}
              disabled={isManager && properties.length === 0}
            >
              <Plus size={18} /> Register Occupant
            </Button>
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
                placeholder="Scan occupant name, contact, or identifier..."
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
                <option value="" className="bg-gray-900">Global Directory</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-500 font-black uppercase tracking-widest italic text-[10px]">Synchronizing Occupant Nodes...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <Card className="p-20 text-center bg-gray-800/40 backdrop-blur-sm border-gray-700/50 border-dashed rounded-[2rem]" hover={false}>
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                <Users className="w-12 h-12 text-gray-600" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Occupant Match</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic mb-8">No occupant profiles found matching current filters.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
              {/* Mobile Feed */}
              <div className="md:hidden divide-y divide-gray-700/30 px-4">
                {filteredTenants.map((tenant) => (
                  <div key={tenant.id} className={`py-6 space-y-4 group/row ${tenant.deletedAt ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover/row:scale-110 transition-transform duration-500 font-black italic">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-white italic uppercase tracking-tighter text-base group-hover/row:text-teal-400 transition-colors uppercase">{tenant.name}</h3>
                          <p className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1 uppercase">NODE_ID: {tenant.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      {tenant.deletedAt ? (
                        <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[8px] font-black uppercase italic tracking-widest">PURGED</span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase italic tracking-widest">ACTIVE</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {tenant.email && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase italic tracking-widest">
                          <Mail size={12} className="text-gray-600" /> {tenant.email}
                        </div>
                      )}
                      {tenant.phone && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase italic tracking-widest">
                          <Phone size={12} className="text-gray-600" /> {tenant.phone}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-700/30">
                      {!tenant.deletedAt ? (
                        <>
                          <button
                            className="p-3 bg-gray-900 border border-gray-700 text-gray-400 rounded-xl"
                            onClick={() => handleEditClick(tenant)}
                          >
                            <Edit2 size={16} />
                          </button>
                          {isAdminUser && (
                            <button
                              className="p-3 bg-gray-900 border border-gray-700 text-gray-400 rounded-xl"
                              onClick={() => handleDelete(tenant)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      ) : (
                        isAdminUser && (
                          <button
                            className="p-3 bg-gray-900 border border-gray-700 text-teal-400 rounded-xl"
                            onClick={() => handleRestore(tenant)}
                          >
                            <RefreshCw size={16} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-900/60 border-b border-gray-700/50">
                    <tr>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Resident Identity</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Communication Vector</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Matrix Status</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className={`group transition-all hover:bg-gray-700/20 ${tenant.deletedAt ? 'bg-rose-500/5' : ''}`}>
                        <td className="px-6 py-6 min-w-[250px]">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 font-black italic">
                              {tenant.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-white italic uppercase text-base tracking-tight group-hover:text-teal-400 transition-colors uppercase">{tenant.name}</div>
                              <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1 uppercase">NODE_ID: {tenant.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="space-y-2">
                            {tenant.email && (
                              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase italic tracking-widest">
                                <Mail size={12} className="text-gray-600" />
                                {tenant.email}
                              </div>
                            )}
                            {tenant.phone && (
                              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase italic tracking-widest">
                                <Phone size={12} className="text-gray-600" />
                                {tenant.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          {tenant.deletedAt ? (
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <ShieldAlert size={12} /> Purged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Shield size={12} /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex justify-center gap-3">
                            {!tenant.deletedAt ? (
                              <>
                                <button
                                  className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 rounded-xl transition-all shadow-xl"
                                  onClick={() => handleEditClick(tenant)}
                                  title="Edit Profile"
                                >
                                  <Edit2 size={16} />
                                </button>
                                {isAdminUser && (
                                  <button
                                    className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-rose-500 hover:border-rose-500/50 rounded-xl transition-all shadow-xl opacity-0 group-hover:opacity-100"
                                    onClick={() => handleDelete(tenant)}
                                    title="Purge Occupant"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </>
                            ) : (
                              isAdminUser && (
                                <button
                                  className="p-3 bg-gray-900 border border-gray-700 text-teal-400 hover:bg-teal-500 hover:text-white rounded-xl transition-all shadow-xl"
                                  onClick={() => handleRestore(tenant)}
                                  title="Restore Occupant"
                                >
                                  <RefreshCw size={16} />
                                </button>
                              )
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

      {modalOpen && (
        <Modal
          title={selectedTenant ? 'Reconfigure Occupant Profile' : 'Register New Occupant'}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        >
          <div className="space-y-6">
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6 flex gap-4">
              <Users className="w-6 h-6 text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-black text-teal-300 mb-1 uppercase tracking-widest italic">Profile Specification</p>
                <p className="text-[11px] font-black text-teal-400/80 uppercase italic leading-relaxed">Define the identity and communication parameters for this resident node.</p>
              </div>
            </div>

            <Input
              label="Full Legal Metadata (Name)"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 font-black italic uppercase text-xs"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Digital Vector (Email)"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                placeholder="e.g. john@matrix.com"
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 font-black italic uppercase text-xs"
              />
              <Input
                label="Voice Channel (Phone)"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="e.g. +250 7XX XXX XXX"
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 font-black italic uppercase text-xs"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TenantPage;




