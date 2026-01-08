import React, { useEffect, useState, useMemo } from 'react';
import {
  getFloorsByPropertyId,
  getAllFloors,
  updateFloor,
  deleteFloor,
  getAllFloorsOccupancy,
  extractFloorsData
} from '../../services/floorService';
import { Button, Modal, Input, Card } from '../../components';
import {
  Edit3,
  Trash2,
  Search,
  Layers,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Box,
  CheckCircle,
  Activity,
  Zap,
  ArrowRight,
  Building,
  ArrowLeft
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';
import { useSearchParams, useNavigate } from 'react-router-dom';

const FloorPage = () => {
  const [floors, setFloors] = useState([]);
  const [occupancyReports, setOccupancyReports] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [editData, setEditData] = useState({ name: '', level_number: 0, property_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyIdFromUrl = searchParams.get('propertyId');
  const propertyNameFromUrl = searchParams.get('propertyName');

  // Initialize property filter from URL
  useEffect(() => {
    if (propertyIdFromUrl && propertyNameFromUrl) {
      setSelectedProperty({
        id: propertyIdFromUrl,
        name: decodeURIComponent(propertyNameFromUrl)
      });
    }
  }, [propertyIdFromUrl, propertyNameFromUrl]);

  const fetchFloors = async () => {
    try {
      setLoading(true);

      let data;
      if (selectedProperty) {
        const response = await getFloorsByPropertyId(selectedProperty.id);
        data = extractFloorsData(response);
      } else {
        const response = await getAllFloors();
        data = extractFloorsData(response);
      }

      setFloors(data || []);

      const reportsResponse = await getAllFloorsOccupancy(
        selectedProperty ? { propertyId: selectedProperty.id } : {}
      );
      const reports = extractFloorsData(reportsResponse);
      const reportsMap = {};
      reports.forEach(r => { reportsMap[r.floor_id] = r; });
      setOccupancyReports(reportsMap);
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to fetch floors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, [selectedProperty]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedProperty]);

  const handleEditClick = (floor) => {
    setSelectedFloor(floor);
    setEditData({
      name: floor.name,
      level_number: floor.level_number,
      property_id: floor.property_id
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const { name, level_number, property_id } = editData;
    if (!name?.trim() || !property_id) {
      showError('Name and Property reference are required.');
      return;
    }
    try {
      if (selectedFloor) {
        await updateFloor(selectedFloor.id, {
          name: name.trim(),
          level_number: parseInt(level_number),
          property_id: property_id,
        });
        showSuccess('Floor parameters recalibrated.');
      } else {
        showError('Floor creation protocol not implemented via this terminal.');
      }
      fetchFloors();
      handleModalClose();
    } catch (err) {
      showError(err?.message || 'Failed to save floor parameters');
    }
  };

  const handleDelete = async (floor) => {
    if (!window.confirm(`Neutralize floor signal "${floor.name}"?`)) return;
    try {
      await deleteFloor(floor.id);
      showInfo('Signal neutralized.');
      fetchFloors();
    } catch (err) {
      showError(err?.message || 'Failed to neutralize signal.');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedFloor(null);
    setEditData({ name: '', level_number: 0, property_id: '' });
  };

  const clearPropertyFilter = () => {
    setSelectedProperty(null);
    setSearchParams({});
  };

  const filteredFloors = useMemo(() => {
    if (!Array.isArray(floors)) return [];
    let filtered = floors;
    if (searchTerm.trim()) {
      filtered = filtered.filter(f =>
        f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f?.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [floors, searchTerm]);

  // Frontend pagination (Safe for small data sets like floors)
  const paginatedFloors = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredFloors.slice(startIndex, startIndex + limit);
  }, [filteredFloors, page, limit]);

  const totalPages = Math.ceil(filteredFloors.length / limit);

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
                <Activity size={12} /> Vertical Oversight Terminal
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Floor <span className="text-teal-500">Registry</span>
                </h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4">
                  Vertical Asset Hierarchy // Structural Node Monitoring
                </p>
              </div>
            </div>

            {selectedProperty && (
              <div className="flex items-center gap-4 bg-teal-500/10 border border-teal-500/20 px-6 py-4 rounded-2xl animate-slide-in-right">
                <Building size={20} className="text-teal-500" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest">Active Asset Filter</span>
                  <span className="text-sm font-black text-white italic uppercase">{selectedProperty.name}</span>
                </div>
                <button onClick={clearPropertyFilter} className="ml-4 p-2 bg-white/5 hover:bg-rose-500 text-white rounded-lg transition-all">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Levels Scanned', value: floors.length, icon: Layers, color: 'teal' },
              { label: 'Entity Load', value: floors.reduce((sum, floor) => sum + (floor.locals_count || 0), 0), icon: Box, color: 'indigo' },
              { label: 'Projected Flow', value: 'Nominal', icon: CheckCircle, color: 'emerald' },
              { label: 'Vertical Integrity', value: '100%', icon: Activity, color: 'amber' }
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
              placeholder="Query structural hierarchy by floor name or property identity..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="md:w-auto px-10 border-gray-700/50 text-gray-400 shrink-0 flex items-center justify-center gap-3"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            <span className="whitespace-nowrap">Return</span>
          </Button>
        </div>

        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {/* Mobile Feed */}
          <div className="md:hidden divide-y divide-gray-700/30">
            {loading ? (
              <div className="p-20 text-center space-y-4 animate-pulse">
                <Zap size={40} className="mx-auto text-teal-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Matrix...</p>
              </div>
            ) : paginatedFloors.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Sector Signal Detected.</div>
            ) : (
              paginatedFloors.map((floor) => {
                const report = occupancyReports[floor.id] || {};
                const rate = report.occupancy_rate || 0;
                return (
                  <div key={floor.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                          <Layers size={22} />
                        </div>
                        <div>
                          <h3 className="font-black text-white italic uppercase tracking-tighter text-lg leading-none">{floor.name}</h3>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-2">Altitude P{floor.level_number}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Operational Load</p>
                        <span className="text-[10px] font-black text-white italic">{rate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-teal-500' : 'bg-rose-500'}`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-black italic uppercase">
                        <span className="text-emerald-500">{report.occupied || 0} USE</span>
                        <span className="text-teal-500">{report.available || 0} LIQ</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                      <div className="flex gap-2">
                        <Button
                          className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest shadow-lg shadow-teal-500/10"
                          onClick={() => navigate(`/admin/floors/${floor.id}/locals`)}
                        >
                          UNIT GRID
                        </Button>
                      </div>
                      <div className="flex gap-2 text-gray-400">
                        <button
                          className="p-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-teal-500/50 hover:text-teal-400 transition-all"
                          onClick={() => handleEditClick(floor)}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="p-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-rose-500/50 hover:text-rose-400 transition-all"
                          onClick={() => handleDelete(floor)}
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

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent">
            <table className="w-full text-left table-auto min-w-[800px]">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-6 font-black uppercase">Vertical Identity</th>
                  <th className="px-6 py-6 font-black uppercase">Altitude Index</th>
                  {!selectedProperty && <th className="px-6 py-6 font-black uppercase">Structural Anchor</th>}
                  <th className="px-6 py-6 text-center font-black uppercase">Operational Load</th>
                  <th className="px-6 py-6 text-center font-black uppercase">Capacity Visual</th>
                  <th className="px-6 py-6 text-right font-black uppercase">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={selectedProperty ? 5 : 6} className="px-6 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Zap size={48} className="text-teal-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Structural Matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedFloors.length === 0 ? (
                  <tr>
                    <td colSpan={selectedProperty ? 5 : 6} className="px-6 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No vertical signals captured.</td>
                  </tr>
                ) : (
                  paginatedFloors.map((f) => {
                    const report = occupancyReports[f.id] || {};
                    return (
                      <tr key={f.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform shadow-lg shrink-0">
                              <Layers size={18} />
                            </div>
                            <span className="text-lg font-black text-white italic uppercase tracking-tighter leading-none truncate max-w-[150px]">{f.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className="inline-block px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest italic whitespace-nowrap">
                            Altitude P{f.level_number}
                          </span>
                        </td>
                        {!selectedProperty && (
                          <td className="px-6 py-6">
                            <span className="text-sm font-black uppercase tracking-widest italic text-teal-500/80 truncate max-w-[150px] inline-block">{f.property_name || 'Stand-alone Root'}</span>
                          </td>
                        )}
                        <td className="px-6 py-6 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-[9px] font-black text-emerald-400 border border-emerald-500/20 uppercase italic">
                              {report.occupied || 0} Nodes
                            </span>
                            <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-[9px] font-black text-teal-400 border border-teal-500/20 uppercase italic">
                              {report.available || 0} Open
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-4 justify-center">
                            <div className="w-24 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${report.occupancy_rate >= 80 ? 'bg-emerald-500' : report.occupancy_rate >= 40 ? 'bg-teal-500' : 'bg-rose-500'}`}
                                style={{ width: `${report.occupancy_rate || 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-white italic">{report.occupancy_rate || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                            <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(f)}>
                              <Edit3 size={14} />
                            </Button>
                            <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(f)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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

        {/* Modal Module */}
        {modalOpen && (
          <Modal
            title={selectedFloor ? `Vertical Overwrite: ${selectedFloor.name}` : 'Initialize Level Identity'}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
            className="max-w-2xl"
          >
            <div className="space-y-10 py-4">
              <Input
                label="Identity Designation *"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Designate level identity..."
                icon={Layers}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Altitude Vector (Level) *"
                  type="number"
                  value={editData.level_number}
                  onChange={(e) => setEditData({ ...editData, level_number: parseInt(e.target.value) || 0 })}
                  icon={Activity}
                />
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Structural Anchor</label>
                  <div className="px-6 py-5 bg-gray-900/50 border-2 border-gray-700 rounded-[1.5rem] text-gray-500 font-bold italic">
                    ID: {editData.property_id.toString().slice(0, 12)}...
                  </div>
                </div>
              </div>
              <div className="p-6 bg-teal-500/5 border border-teal-500/10 rounded-[1.5rem] flex items-center gap-4">
                <Activity className="text-teal-500" size={24} />
                <p className="text-[10px] font-black text-gray-400 uppercase italic leading-none">All structural modifications are recorded in the architectural ledger.</p>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default FloorPage;