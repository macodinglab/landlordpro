import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllLocals,
  createLocal,
  updateLocal,
  deleteLocal,
  restoreLocal,
  updateLocalStatus
} from '../../services/localService';
import { Button, Modal, Input, Card, Select } from '../../components';
import {
  Edit2,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Grid,
  Maximize,
  Home,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';
import useAccessibleProperties from '../../hooks/useAccessibleProperties';

const LocalPage = () => {
  const [locals, setLocals] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState(null);
  const [editData, setEditData] = useState({ reference_code: '', status: 'available', size_m2: '', property_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const {
    isManager,
    isAdmin,
    properties,
    propertyOptions,
    loading: loadingProperties,
  } = useAccessibleProperties();

  const statusOptions = useMemo(
    () => [
      { value: 'available', label: 'Available' },
      { value: 'occupied', label: 'Occupied' },
      { value: 'maintenance', label: 'Maintenance' },
    ],
    []
  );

  useEffect(() => {
    if (isManager) {
      if (properties.length === 1 && !selectedPropertyId) {
        setSelectedPropertyId(properties[0].id);
      }
    }
  }, [isManager, properties, selectedPropertyId]);

  const selectedPropertyOption = useMemo(
    () => propertyOptions.find((option) => option.value === selectedPropertyId) ?? null,
    [propertyOptions, selectedPropertyId]
  );

  const fetchLocals = useCallback(
    async (pageNumber = 1, propertyId = selectedPropertyId) => {
      if (isManager && !propertyId && properties.length > 0) {
        // Wait for auto-selection or user selection
        return;
      }

      try {
        setLoading(true);
        const params = { page: pageNumber, limit: 10 };
        if (propertyId) params.propertyId = propertyId;

        const response = await getAllLocals(params);
        setLocals(response?.locals || []);
        setTotalPages(response?.totalPages || 1);
      } catch (err) {
        showError('Failed to synchronize unit nodes.');
        setLocals([]);
      } finally {
        setLoading(false);
      }
    },
    [isManager, selectedPropertyId, properties]
  );

  useEffect(() => {
    fetchLocals(page, selectedPropertyId);
  }, [page, selectedPropertyId, fetchLocals]);

  const handleEditClick = (local) => {
    setSelectedLocal(local);
    setEditData({
      reference_code: local.reference_code,
      status: local.status,
      size_m2: local.size_m2,
      property_id: local.property_id
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!editData.reference_code?.trim() || !editData.property_id) {
      showError('Reference identifier and parent asset are required.');
      return;
    }

    try {
      if (selectedLocal) {
        await updateLocal(selectedLocal.id, editData);
        showSuccess('Unit node updated.');
      } else {
        await createLocal(editData);
        showSuccess('New unit node provisioned.');
      }
      setModalOpen(false);
      fetchLocals(page, selectedPropertyId);
    } catch (err) {
      showError(err?.message || 'Failed to save node configuration.');
    }
  };

  const handleDelete = async (localId) => {
    if (!window.confirm('Purge this unit node from the matrix?')) return;
    try {
      await deleteLocal(localId);
      showInfo('Unit node purged.');
      fetchLocals(page, selectedPropertyId);
    } catch (err) {
      showError('Failed to purge node.');
    }
  };

  const handleStatusChange = async (local, newStatus) => {
    try {
      await updateLocalStatus(local.id, newStatus);
      showSuccess('Operational status updated.');
      fetchLocals(page, selectedPropertyId);
    } catch (err) {
      showError('Failed to update status.');
    }
  };

  const filteredLocals = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return locals.filter(l =>
      l.reference_code?.toLowerCase().includes(term) ||
      l.property?.name?.toLowerCase().includes(term)
    );
  }, [locals, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-900 border-l border-gray-800/50 pb-12">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-teal-950 via-indigo-950 to-slate-950 text-white border-b border-gray-800/50">
        {/* Abstract shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-16 space-y-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                  <Grid size={12} /> Unit Governance
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Operational <span className="text-teal-500">Nodes</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Granular unit management and matrix tracking
                </p>
              </div>
            </div>

            <Button
              className="flex items-center gap-3 bg-teal-600 hover:bg-teal-500 text-white shadow-2xl px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all active:scale-95 transition-transform"
              onClick={() => {
                setSelectedLocal(null);
                setEditData({ reference_code: '', status: 'available', size_m2: '', property_id: selectedPropertyId || '' });
                setModalOpen(true);
              }}
            >
              <Plus size={18} /> Provision Unit
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
                placeholder="Scan unit identifier or dimension..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative min-w-[300px]">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Home size={18} className="text-gray-500" />
              </div>
              <select
                className="w-full pl-16 pr-10 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-black uppercase text-[11px] tracking-widest italic outline-hidden transition-all shadow-inner appearance-none cursor-pointer focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
              >
                <option value="" className="bg-gray-900">All Asset Matrices</option>
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
            <p className="text-gray-500 font-black uppercase tracking-widest italic text-[10px]">Synchronizing Matrix Nodes...</p>
          </div>
        ) : filteredLocals.length === 0 ? (
          <Card className="p-20 text-center bg-gray-800/40 backdrop-blur-sm border-gray-700/50 border-dashed rounded-[2rem]" hover={false}>
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                <AlertCircle className="w-12 h-12 text-gray-600" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Unit Match</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic mb-8">No structural unit nodes found matching current filters.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
              {/* Mobile Feed */}
              <div className="md:hidden divide-y divide-gray-700/30 px-4">
                {filteredLocals.length === 0 ? (
                  <div className="p-20 text-center italic text-gray-400 font-bold uppercase text-[10px] tracking-widest">No Node Signal Captured.</div>
                ) : (
                  filteredLocals.map((local) => {
                    const statusKey = local.status?.toLowerCase();
                    return (
                      <div key={local.id} className="py-6 space-y-4 group/row">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                              <Grid size={20} />
                            </div>
                            <div>
                              <h3 className="font-black text-white italic uppercase tracking-tighter text-base group-hover/row:text-teal-400 transition-colors uppercase">{local.reference_code}</h3>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-1 uppercase">{local.property?.name || 'ORPHAN'}</p>
                            </div>
                          </div>
                          <select
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase italic tracking-widest border bg-transparent focus:outline-none ${statusKey === 'available' ? 'text-emerald-400 border-emerald-500/20' : statusKey === 'occupied' ? 'text-indigo-400 border-indigo-500/20' : 'text-rose-400 border-rose-500/20'}`}
                            value={local.status}
                            onChange={(e) => handleStatusChange(local, e.target.value)}
                          >
                            <option value="available" className="bg-gray-900">Available</option>
                            <option value="occupied" className="bg-gray-900">Occupied</option>
                            <option value="maintenance" className="bg-gray-900">Maintenance</option>
                          </select>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-black uppercase italic tracking-widest">
                          <div>
                            <p className="text-gray-600 mb-1">Dimension</p>
                            <p className="text-white">{local.size_m2 || '0'} M²</p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              className="p-3 bg-gray-900 border border-gray-700 text-gray-400 rounded-xl"
                              onClick={() => handleEditClick(local)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="p-3 bg-gray-900 border border-gray-700 text-gray-400 rounded-xl"
                              onClick={() => handleDelete(local.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="hidden md:block overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-900/60 border-b border-gray-700/50">
                    <tr>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Unit Manifest</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Parent Asset</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Dimension (M²)</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Status Vector</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {filteredLocals.map((local) => {
                      const statusKey = local.status?.toLowerCase();
                      return (
                        <tr key={local.id} className="group transition-all hover:bg-gray-700/20">
                          <td className="px-6 py-6 min-w-[200px]">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <Grid size={22} />
                              </div>
                              <div>
                                <div className="font-black text-white italic uppercase text-sm tracking-tight group-hover:text-teal-400 transition-colors uppercase">{local.reference_code}</div>
                                <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1">NODE_ID: {local.id.slice(0, 8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 min-w-[200px]">
                            <div className="flex items-center gap-3 text-indigo-400 font-black italic uppercase text-[10px] tracking-widest bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10 inline-flex">
                              <Home size={12} className="text-indigo-600" />
                              {local.property?.name || 'ORPHAN'}
                            </div>
                          </td>
                          <td className="px-6 py-6 min-w-[150px]">
                            <div className="text-lg font-black text-white italic tracking-tighter">
                              {local.size_m2 || '0'}
                              <span className="text-[10px] text-gray-600 ml-1 font-black uppercase">M²</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <select
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest border transition-all cursor-pointer bg-transparent focus:outline-none ${statusKey === 'available' ? 'text-emerald-400 border-emerald-500/20' :
                                statusKey === 'occupied' ? 'text-indigo-400 border-indigo-500/20' :
                                  'text-rose-400 border-rose-500/20'
                                }`}
                              value={local.status}
                              onChange={(e) => handleStatusChange(local, e.target.value)}
                            >
                              <option value="available" className="bg-gray-900">Available</option>
                              <option value="occupied" className="bg-gray-900">Occupied</option>
                              <option value="maintenance" className="bg-gray-900">Maintenance</option>
                            </select>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex justify-center gap-3">
                              <button
                                className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 rounded-xl transition-all shadow-xl"
                                onClick={() => handleEditClick(local)}
                                title="Edit Node"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="p-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-rose-500 hover:border-rose-500/50 rounded-xl transition-all shadow-xl opacity-0 group-hover:opacity-100"
                                onClick={() => handleDelete(local.id)}
                                title="Purge Node"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center py-6">
                <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-[0.2em]">
                  Index <span className="text-teal-400 font-black">{page}</span> // Matrix <span className="text-white font-black">{totalPages}</span>
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
          title={selectedLocal ? 'Reconfigure Unit Node' : 'Provision Unit Node'}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        >
          <div className="space-y-6">
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6 flex gap-4">
              <Grid className="w-6 h-6 text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-black text-teal-300 mb-1 uppercase tracking-widest italic">Node Specification</p>
                <p className="text-[11px] font-black text-teal-400/80 uppercase italic leading-relaxed">Define the structural and operational parameters for this unit node.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-1">Parent Asset Manifest</label>
              <select
                className="block w-full px-5 py-4 bg-gray-900 border-2 border-gray-700 rounded-xl text-[11px] font-black italic uppercase tracking-widest text-white appearance-none focus:outline-none focus:border-teal-500/50 transition-all cursor-pointer"
                value={editData.property_id}
                onChange={(e) => setEditData({ ...editData, property_id: e.target.value })}
              >
                <option value="" className="bg-gray-900">Select Parent Asset...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>
                ))}
              </select>
            </div>

            <Input
              label="Unit Reference Identifier"
              placeholder="e.g. APT-101"
              value={editData.reference_code}
              onChange={(e) => setEditData({ ...editData, reference_code: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 font-black italic uppercase text-xs"
            />

            <div className="grid grid-cols-2 gap-6">
              <Input
                label="Node Dimension (M²)"
                placeholder="0.00"
                type="number"
                value={editData.size_m2}
                onChange={(e) => setEditData({ ...editData, size_m2: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 font-black italic uppercase text-xs"
              />

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-1">Operational Status</label>
                <select
                  className="block w-full px-5 py-4 bg-gray-900 border-2 border-gray-700 rounded-xl text-[11px] font-black italic uppercase tracking-widest text-white appearance-none focus:outline-none focus:border-teal-500/50 transition-all cursor-pointer"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LocalPage;
