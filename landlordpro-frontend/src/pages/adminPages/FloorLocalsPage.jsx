import React, { useEffect, useState, useMemo } from 'react';
import {
  getFloorById,
  getFloorOccupancy
} from '../../services/floorService';
import { Button, Modal, Input, Card } from '../../components';
import {
  ArrowLeft,
  Home,
  Layers,
  Edit3,
  Trash2,
  Plus,
  Search,
  Activity,
  Box,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Zap,
  Building,
  CheckCircle
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { createLocal, updateLocal, deleteLocal } from '../../services/localService';

const FloorLocalsPage = () => {
  const { floorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [floor, setFloor] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [locals, setLocals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [editData, setEditData] = useState({
    local_number: '',
    area: '',
    rent_price: '',
    status: 'available'
  });

  const propertyId = searchParams.get('propertyId');
  const propertyNameParam = searchParams.get('propertyName');
  const floorNameFromUrl = searchParams.get('floorName');

  const fetchFloorData = async () => {
    try {
      setLoading(true);
      const floorResponse = await getFloorById(floorId);
      const floorData = floorResponse.data;
      setFloor(floorData);

      const rawLocals = floorData.locals || floorData.locals_details || [];
      // If the backend returns all locals, filter them by floorId
      const filteredLocals = Array.isArray(rawLocals)
        ? rawLocals.filter((local) => String(local?.floor_id) === String(floorId))
        : [];
      setLocals(filteredLocals);

      const occupancyResponse = await getFloorOccupancy(floorId);
      setOccupancy(occupancyResponse.data);

    } catch (err) {
      console.error('Error fetching floor data:', err);
      showError(err?.message || 'Failed to fetch floor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (floorId) {
      fetchFloorData();
    }
  }, [floorId]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const resolvedPropertyId = propertyId || floor?.property_id || floor?.propertyForFloor?.id;
  const resolvedPropertyName = propertyNameParam || floor?.propertyForFloor?.name || floor?.property_name;

  const handleBackToFloors = () => {
    if (resolvedPropertyId) {
      navigate(`/admin/properties/${resolvedPropertyId}/floors`);
    } else {
      navigate('/admin/floors');
    }
  };

  const handleEditLocal = (local) => {
    setSelectedLocal(local);
    setEditData({
      local_number: local.local_number || '',
      area: local.area || '',
      rent_price: local.rent_price || '',
      status: local.status || 'available'
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!editData.local_number?.trim()) {
      showError('Local number is required.');
      return;
    }

    try {
      if (selectedLocal) {
        await updateLocal(selectedLocal.id, {
          ...selectedLocal,
          local_number: editData.local_number.trim(),
          area: editData.area,
          rent_price: editData.rent_price,
          status: editData.status,
        });
        showSuccess('Local updated successfully.');
      } else {
        await createLocal({
          floor_id: floorId,
          local_number: editData.local_number.trim(),
          area: editData.area,
          rent_price: editData.rent_price,
          status: editData.status,
        });
        showSuccess('Local created successfully.');
      }
      setModalOpen(false);
      setSelectedLocal(null);
      setEditData({ local_number: '', area: '', rent_price: '', status: 'available' });
      fetchFloorData();
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to save local');
    }
  };

  const handleDeleteLocal = async (local) => {
    if (!window.confirm(`Are you sure you want to delete local "${local.local_number}"?`)) return;
    try {
      await deleteLocal(local.id);
      showInfo('Local deleted successfully.');
      fetchFloorData();
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to delete local');
    }
  };

  const handleAddLocal = () => {
    setSelectedLocal(null);
    setEditData({ local_number: '', area: '', rent_price: '', status: 'available' });
    setModalOpen(true);
  };

  const filteredLocals = useMemo(() => {
    if (!Array.isArray(locals)) return [];
    if (!searchTerm.trim()) return locals;
    const searchLower = searchTerm.toLowerCase();
    return locals.filter(local =>
      local.local_number?.toLowerCase().includes(searchLower) ||
      local.status?.toLowerCase().includes(searchLower)
    );
  }, [locals, searchTerm]);

  const paginatedLocals = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredLocals.slice(startIndex, startIndex + limit);
  }, [filteredLocals, page, limit]);

  const totalPages = Math.ceil(filteredLocals.length / limit) || 1;

  const localStats = useMemo(() => {
    const total = locals.length;
    const occupied = locals.filter(l => l.status === 'occupied').length;
    const available = locals.filter(l => l.status === 'available').length;
    const maintenance = locals.filter(l => l.status === 'maintenance').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return { total, occupied, available, maintenance, occupancyRate };
  }, [locals]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'occupied': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'available': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'maintenance': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <Zap size={48} className="text-teal-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Synchronizing Floor Logic Entities...</p>
        </div>
      </div>
    );
  }

  const heroTitle = floorNameFromUrl || floor?.name || 'Floor Sector';
  const heroSubtitle = resolvedPropertyName || floor?.property_name || 'Vibrant Asset';

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Breadcrumbs & Navigation */}
        <div className="flex items-center gap-6 animate-fade-in group">
          <button
            onClick={handleBackToFloors}
            className="p-4 rounded-2xl bg-gray-800/40 backdrop-blur-sm shadow-xl text-gray-400 hover:text-teal-400 transition-all hover:scale-110 border border-gray-700/50"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-10 w-px bg-gray-700 hidden sm:block"></div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 italic">Sector Path</p>
            <div className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase italic">
              <span className="hover:text-teal-500 cursor-pointer transition-colors" onClick={() => navigate('/admin')}>Portfolio</span>
              <span className="text-gray-600">/</span>
              <span className="hover:text-teal-500 cursor-pointer transition-colors" onClick={handleBackToFloors}>Levels</span>
              <span className="text-gray-600">/</span>
              <span className="text-teal-500">{heroTitle}</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Box size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Unit Matrix Oversight
              </div>
              <div className="max-w-full overflow-hidden">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none truncate pr-4">
                  {heroTitle}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <span className="max-w-full text-sm text-teal-400 font-black italic uppercase tracking-tighter flex items-center gap-2 bg-teal-500/10 px-4 py-1.5 rounded-full border border-teal-500/20 truncate">
                    <Building size={16} className="shrink-0" /> <span className="truncate">{heroSubtitle}</span>
                  </span>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic shrink-0">Level Altitude P{floor?.level_number || 0}</span>
                </div>
              </div>
            </div>

            <Button onClick={handleAddLocal} className="px-8 w-full lg:w-auto">
              <Plus size={18} className="mr-2" /> <span>Launch Unit Signal</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Cluster Size', value: localStats.total, icon: Box, color: 'teal' },
              { label: 'Occupancy', value: `${localStats.occupancyRate}%`, icon: Activity, color: 'indigo' },
              { label: 'Active Nodes', value: localStats.occupied, icon: CheckCircle, color: 'emerald' },
              { label: 'Faults', value: localStats.maintenance, icon: Zap, color: 'rose' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1 group min-w-0">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic group-hover:text-teal-500 transition-colors truncate">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <stat.icon size={14} className={`text-${stat.color}-400 shrink-0`} />
                  <p className="text-xl md:text-2xl font-black text-white italic tracking-tighter truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Filters */}
        <div className="relative group animate-fade-in">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Query level matrix for specific unit signatures..."
            className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Content Table */}
        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {/* Mobile Card Feed */}
          <div className="md:hidden divide-y divide-gray-700/30">
            {paginatedLocals.length === 0 ? (
              <div className="p-20 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No sector signals isolated.</div>
            ) : (
              paginatedLocals.map((local) => (
                <div key={local.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform shadow-lg">
                        <Box size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{local.local_number}</h3>
                        <span className={`inline-block px-3 py-1 mt-1 rounded-lg border text-[8px] font-black uppercase italic tracking-widest ${getStatusStyle(local.status)}`}>
                          {local.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-teal-400 italic tracking-tighter leading-none">
                        {local.rent_price ? `${Number(local.rent_price).toLocaleString()} FRW` : 'N/A'}
                      </p>
                      <p className="text-[9px] font-black text-gray-500 uppercase italic mt-1">Valuation</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase italic">Dimensions</p>
                      <p className="text-sm font-black text-gray-300 italic">{local.area ? `${local.area} M²` : 'VOID'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditLocal(local)}>
                        <Edit3 size={14} />
                      </Button>
                      <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDeleteLocal(local)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent">
            <table className="w-full text-left table-auto min-w-[800px]">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-6 font-black uppercase">Unit Signature</th>
                  <th className="px-6 py-6 font-black uppercase">State Index</th>
                  <th className="px-6 py-6 text-center font-black uppercase">Dimensions</th>
                  <th className="px-6 py-6 text-center font-black uppercase">Valuation</th>
                  <th className="px-6 py-6 text-right font-black uppercase">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {paginatedLocals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No sector signals isolated.</td>
                  </tr>
                ) : (
                  paginatedLocals.map((local) => (
                    <tr key={local.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform shadow-lg shrink-0">
                            <Box size={18} />
                          </div>
                          <span className="text-lg font-black text-white italic uppercase tracking-tighter leading-none truncate max-w-[150px]">{local.local_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-block px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase italic tracking-widest whitespace-nowrap ${getStatusStyle(local.status)}`}>
                          {local.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center text-sm font-black text-gray-300 italic whitespace-nowrap">
                        {local.area ? `${local.area} M²` : 'VOID'}
                      </td>
                      <td className="px-6 py-6 text-center whitespace-nowrap">
                        <span className="text-lg font-black text-teal-400 italic tracking-tighter leading-none">
                          {local.rent_price ? `${Number(local.rent_price).toLocaleString()} FRW` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditLocal(local)}>
                            <Edit3 size={14} />
                          </Button>
                          <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDeleteLocal(local)}>
                            <Trash2 size={14} />
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

        {/* Pagination */}
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
              Retreat
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

        {/* Modal Module */}
        {modalOpen && (
          <Modal
            title={selectedLocal ? `Override Unit Logic: ${selectedLocal.local_number}` : 'Initialize New Unit Signature'}
            onClose={() => {
              setModalOpen(false);
              setSelectedLocal(null);
              setEditData({ local_number: '', area: '', rent_price: '', status: 'available' });
            }}
            onSubmit={handleSubmit}
            className="max-w-xl"
          >
            <div className="space-y-10 py-4">
              <Input
                label="Signature Designation (Number) *"
                value={editData.local_number}
                onChange={(e) => setEditData({ ...editData, local_number: e.target.value })}
                placeholder="e.g. A-101, UNIT-X"
                icon={Box}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Dimensional Flow (Area)"
                  type="number"
                  value={editData.area}
                  onChange={(e) => setEditData({ ...editData, area: e.target.value })}
                  placeholder="Area in M²"
                  icon={Activity}
                />
                <Input
                  label="Valuation Index (Rent)"
                  type="number"
                  value={editData.rent_price}
                  onChange={(e) => setEditData({ ...editData, rent_price: e.target.value })}
                  placeholder="Rent in FRW"
                  icon={TrendingUp}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Behavioral State</label>
                <div className="grid grid-cols-3 gap-4">
                  {['available', 'occupied', 'maintenance'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditData({ ...editData, status: s })}
                      className={`py-4 rounded-xl border text-[9px] font-black uppercase italic tracking-tighter transition-all ${editData.status === s
                        ? 'bg-teal-500 text-white border-teal-500 shadow-lg scale-105'
                        : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-teal-500/50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default FloorLocalsPage;