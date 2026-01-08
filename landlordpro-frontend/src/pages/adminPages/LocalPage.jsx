import React, { useEffect, useState, useMemo } from 'react';
import {
  getAllLocals,
  createLocal,
  updateLocal,
  deleteLocal,
  restoreLocal,
  updateLocalStatus
} from '../../services/localService';
import { getAllProperties } from '../../services/propertyService';
import { Button, Modal, Input, Card, Select } from '../../components';
import {
  Edit3,
  Plus,
  Trash2,
  Search,
  RefreshCcw,
  Home,
  Layers,
  Activity,
  Box,
  Maximize2,
  Navigation,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';

const LocalPage = () => {
  const [locals, setLocals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState(null);
  const [editData, setEditData] = useState({
    reference_code: '',
    status: 'available',
    size_m2: '',
    property_id: '',
    level: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Status options for consistency
  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  // Fetch locals
  const fetchLocals = async (pageNumber = page) => {
    try {
      setLoading(true);
      const data = await getAllLocals({ page: pageNumber, limit });
      setLocals(data.data || data.locals || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || pageNumber);
    } catch (err) {
      showError(err?.message || 'Failed to sync unit matrix.');
      setLocals([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch properties
  const fetchProperties = async () => {
    try {
      const data = await getAllProperties(1, 100);
      setProperties(data.properties || []);
    } catch (err) {
      setProperties([]);
    }
  };

  useEffect(() => {
    fetchLocals();
    fetchProperties();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (searchTerm) setPage(1);
  }, [searchTerm]);

  const handleEditClick = (local) => {
    setSelectedLocal(local);
    setEditData({
      reference_code: local.reference_code || '',
      status: local.status || 'available',
      size_m2: local.size_m2 || '',
      property_id: local.property_id || '',
      level: local.level || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const { reference_code, property_id, level, size_m2 } = editData;
    if (!reference_code?.trim()) return showError('Reference signature required.');
    if (!property_id) return showError('Property node selection required.');
    if (!level?.trim()) return showError('Level designation required.');
    if (size_m2 && (isNaN(Number(size_m2)) || Number(size_m2) <= 0)) return showError('Size must be a valid positive valuation.');

    setSubmitting(true);
    try {
      const payload = { ...editData, reference_code: reference_code.trim(), level: level.trim(), size_m2: size_m2 ? Number(size_m2) : null };
      if (selectedLocal) {
        await updateLocal(selectedLocal.id, payload);
        showSuccess('Unit parameters recalibrated.');
      } else {
        await createLocal(payload);
        showSuccess('New unit node initialized.');
        setPage(1);
      }
      await fetchLocals(selectedLocal ? page : 1);
      handleModalClose();
    } catch (err) {
      showError(err?.message || 'Failed to sync unit signal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (local) => {
    if (!window.confirm(`Neutralize unit signature "${local.reference_code}"?`)) return;
    try {
      await deleteLocal(local.id);
      showInfo('Signal neutralized.');
      await fetchLocals(page);
    } catch (err) {
      showError(err?.message || 'Failed to neutralize signal.');
    }
  };

  const handleRestore = async (local) => {
    try {
      await restoreLocal(local.id);
      showSuccess('Signal restored to matrix.');
      await fetchLocals(page);
    } catch (err) {
      showError(err?.message || 'Failed to restore signal.');
    }
  };

  const handleStatusChange = async (local, newStatus) => {
    if (local.status === newStatus) return;
    try {
      await updateLocalStatus(local.id, newStatus);
      showSuccess('Node state updated.');
      await fetchLocals(page);
    } catch (err) {
      showError(err?.message || 'Failed to update node state.');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedLocal(null);
    setEditData({ reference_code: '', status: 'available', size_m2: '', property_id: '', level: '' });
  };

  const getPropertyName = (propertyId) => properties.find(p => p.id === propertyId)?.name || '-';
  const propertyOptions = useMemo(() => properties.map(p => ({ value: p.id, label: p.name })), [properties]);

  const filteredLocals = useMemo(() => {
    if (!Array.isArray(locals)) return [];
    if (!searchTerm.trim()) return locals;
    const searchLower = searchTerm.toLowerCase();
    return locals.filter(l =>
      l.reference_code?.toLowerCase().includes(searchLower) ||
      getPropertyName(l.property_id).toLowerCase().includes(searchLower) ||
      l.level?.toString().toLowerCase().includes(searchLower)
    );
  }, [locals, searchTerm, properties]);

  const getStatusStyle = (status) => {
    const styles = {
      available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      occupied: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      maintenance: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return styles[status] || styles.available;
  };

  const StatusBadge = ({ status, deleted }) => {
    if (deleted) return <span className="px-3 py-1 rounded-lg bg-gray-500/10 text-gray-400 text-[9px] font-black uppercase italic tracking-widest border border-gray-500/20">Decommissioned</span>;
    return <span className={`px-3 py-1 rounded-lg ${getStatusStyle(status)} text-[9px] font-black uppercase italic tracking-widest border flex items-center gap-1.5`}>
      <Activity size={10} className="animate-pulse" /> {status}
    </span>;
  };

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Layers size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Spatial Asset Intelligence
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Unit <span className="text-teal-500">Matrix</span>
                </h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4">
                  Spatial Node Governance // Unit-Level Occupancy Monitoring
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <Button onClick={() => setModalOpen(true)} className="px-8 flex-1 sm:flex-none">
                <div className="flex items-center gap-3">
                  <Plus size={18} />
                  <span>Initialize Node</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Aggregate Units', value: locals.length, icon: Box, color: 'teal' },
              { label: 'Available Nodes', value: locals.filter(l => l.status === 'available' && !l.deleted_at).length, icon: CheckCircle, color: 'emerald' },
              { label: 'Occupancy Rate', value: locals.length > 0 ? `${Math.round((locals.filter(l => l.status === 'occupied' && !l.deleted_at).length / locals.length) * 100)}%` : '0%', icon: Activity, color: 'indigo' },
              { label: 'Maintenance', value: locals.filter(l => l.status === 'maintenance' && !l.deleted_at).length, icon: Clock, color: 'amber' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1 group">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic group-hover:text-teal-500 transition-colors">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <stat.icon size={14} className={`text-${stat.color}-400`} />
                  <p className="text-xl md:text-2xl font-black text-white italic tracking-tighter truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 animate-fade-in group">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Query unit registry by reference, property, or level..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4 shrink-0">
            <Button variant="outline" className="md:w-auto px-10 border-gray-700/50 text-gray-400 flex items-center justify-center gap-3">
              <Filter size={18} /> <span>Gates</span>
            </Button>
            <Button variant="outline" className="md:w-auto px-10 border-gray-700/50 text-gray-400 flex items-center justify-center gap-3">
              <Download size={18} /> <span>Export</span>
            </Button>
          </div>
        </div>

        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {/* Mobile Feed */}
          <div className="md:hidden divide-y divide-gray-700/30">
            {loading ? (
              <div className="p-20 text-center space-y-4 animate-pulse">
                <Zap size={40} className="mx-auto text-teal-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Interrogating Sector...</p>
              </div>
            ) : locals.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Unit Signal Detected.</div>
            ) : (
              filteredLocals.map((local) => (
                <div key={local.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                        <Box size={22} />
                      </div>
                      <div>
                        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg leading-none">{local.reference_code}</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-2">{local.property_name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">Valuation</p>
                      <p className="text-sm font-black text-teal-400 italic">
                        {local.rent_price ? `${Number(local.rent_price).toLocaleString()} FRW` : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">Status</p>
                      <span className={`inline-block px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase italic tracking-widest whitespace-nowrap ${getStatusStyle(local.status)}`}>
                        {local.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                    <div className="flex gap-2">
                      <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400" onClick={() => handleEditClick(local)}>
                        <Edit3 size={16} />
                      </Button>
                      <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400" onClick={() => handleDelete(local)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <p className="text-[9px] font-black text-gray-600 uppercase italic">Floor {local.floor_name || 'N/A'}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent">
            <table className="w-full text-left table-auto min-w-[1000px]">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-6 font-black uppercase">Reference signature</th>
                  <th className="px-6 py-6 font-black uppercase">Property Anchor</th>
                  <th className="px-6 py-6 font-black uppercase">Spatial Level</th>
                  <th className="px-6 py-6 text-center font-black uppercase">Valuation Area</th>
                  <th className="px-6 py-6 text-center font-black uppercase">State Index</th>
                  <th className="px-6 py-6 text-right font-black uppercase">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Zap size={48} className="text-teal-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Unit Registry Matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLocals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No unit nodes isolated.</td>
                  </tr>
                ) : (
                  filteredLocals.map((local) => (
                    <tr key={local.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform shadow-lg shrink-0">
                            <Layers size={18} />
                          </div>
                          <span className="text-lg font-black text-white italic uppercase tracking-tighter leading-none truncate max-w-[150px]">{local.reference_code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <Home size={14} className="text-teal-500/50 shrink-0" />
                          <span className="text-sm font-black uppercase tracking-widest italic text-gray-300 truncate max-w-[150px] inline-block">{getPropertyName(local.property_id)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="inline-block px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest italic whitespace-nowrap">
                          {local.level || 'DECK G'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-black text-teal-400 italic tracking-tighter leading-none">{local.size_m2 ? `${local.size_m2} m²` : 'N/A'}</span>
                          <Maximize2 size={12} className="text-gray-600 mt-1" />
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center whitespace-nowrap">
                        {!local.deleted_at ? (
                          <div className="flex flex-col items-center gap-2">
                            <StatusBadge status={local.status} />
                            <div className="w-32 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Select
                                value={statusOptions.find(opt => opt.value === local.status)}
                                options={statusOptions}
                                onChange={(s) => handleStatusChange(local, s.value)}
                                placeholder="Update State..."
                              />
                            </div>
                          </div>
                        ) : (
                          <StatusBadge status={local.status} deleted={true} />
                        )}
                      </td>
                      <td className="px-6 py-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          {!local.deleted_at ? (
                            <>
                              <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(local)}>
                                <Edit3 size={14} />
                              </Button>
                              <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(local)}>
                                <Trash2 size={14} />
                              </Button>
                            </>
                          ) : (
                            <Button variant="outline" className="px-6 py-2.5 rounded-lg border-gray-700 text-[10px] text-emerald-400 hover:bg-emerald-500 hover:text-white" onClick={() => handleRestore(local)}>
                              RESTORE NODE
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

        {/* Pagination */}
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

        {/* Create/Edit Modal */}
        {modalOpen && (
          <Modal
            title={selectedLocal ? `Override Unit parameters: ${selectedLocal.reference_code}` : 'Initialize Spatial Node Injection'}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
            className="max-w-3xl"
          >
            <div className="space-y-10 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Reference Signature *"
                  value={editData.reference_code}
                  onChange={(e) => setEditData({ ...editData, reference_code: e.target.value })}
                  placeholder="e.g. SECTOR-A1"
                  icon={Navigation}
                />
                <Select
                  label="Property Anchor *"
                  value={propertyOptions.find(o => o.value === editData.property_id)}
                  options={propertyOptions}
                  onChange={(s) => setEditData({ ...editData, property_id: s.value })}
                  placeholder="Allocate Property..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Spatial Level (Deck) *"
                  value={editData.level}
                  onChange={(e) => setEditData({ ...editData, level: e.target.value })}
                  placeholder="e.g. DECK-07"
                  icon={Layers}
                />
                <Input
                  label="Valuation Area (m²)"
                  type="number"
                  value={editData.size_m2}
                  onChange={(e) => setEditData({ ...editData, size_m2: e.target.value })}
                  placeholder="Spatial Area vector"
                  icon={Maximize2}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Initial State Vector *</label>
                <Select
                  value={statusOptions.find(o => o.value === editData.status)}
                  options={statusOptions}
                  onChange={(s) => setEditData({ ...editData, status: s.value })}
                  isSearchable={false}
                />
              </div>

              {submitting && (
                <div className="p-8 bg-teal-500/10 border border-teal-500/20 rounded-[2.5rem] flex items-center justify-center gap-4 animate-pulse">
                  <Zap size={24} className="text-teal-500 animate-spin" />
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest italic leading-none">Synchronizing Node logic with matrix...</p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default LocalPage;