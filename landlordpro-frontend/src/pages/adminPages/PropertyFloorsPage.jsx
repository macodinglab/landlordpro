import React, { useEffect, useState, useMemo } from 'react';
import {
  getFloorsByPropertyId,
  updateFloor,
  deleteFloor,
  extractFloorsData,
  getAllFloorsOccupancy
} from '../../services/floorService';
import { getPropertyById } from '../../services/propertyService';
import { Button, Modal, Input, Card } from '../../components';
import {
  Edit3,
  Trash2,
  ArrowLeft,
  Layers,
  Home,
  Search,
  Activity,
  Box,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  ArrowRight,
  Zap,
  Building
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';
import { useParams, useNavigate } from 'react-router-dom';

const normaliseFloors = (floors = [], propertyMeta = {}) => {
  const targetPropertyId = propertyMeta.id || null;
  return floors.map((floor) => {
    const rawLocals = floor.locals_count !== undefined
      ? floor.locals
      : floor.locals || floor.localsForFloor || [];

    const filteredLocals = Array.isArray(rawLocals)
      ? rawLocals.filter((local) => {
        if (!local) return false;
        if (targetPropertyId && local.property_id) {
          return String(local.property_id) === String(targetPropertyId);
        }
        if (floor.id && local.floor_id) {
          return String(local.floor_id) === String(floor.id);
        }
        return true;
      })
      : [];

    const localsCount = floor.locals_count !== undefined
      ? floor.locals_count
      : filteredLocals.length;

    return {
      id: floor.id,
      name: floor.name,
      level_number: floor.level_number,
      locals: filteredLocals,
      locals_count: localsCount,
      property_id: floor.property_id || propertyMeta.id,
      property_name: floor.property_name || propertyMeta.name,
    };
  });
};

const PropertyFloorsPage = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();

  const [floors, setFloors] = useState([]);
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [editData, setEditData] = useState({ name: '', level_number: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [occupancyReports, setOccupancyReports] = useState({});

  const fetchPropertyFloors = async () => {
    try {
      setLoading(true);
      let propertyDetails = null;
      try {
        propertyDetails = await getPropertyById(propertyId);
        if (propertyDetails) {
          setPropertyInfo({
            id: propertyDetails.id,
            name: propertyDetails.name,
            location: propertyDetails.location,
          });
        }
      } catch (innerError) {
        console.warn('getPropertyById fallback:', innerError?.message || innerError);
      }

      const response = await getFloorsByPropertyId(propertyId);

      let floorsData = extractFloorsData(response);
      if ((!floorsData || floorsData.length === 0) && propertyDetails?.floorsForProperty) {
        floorsData = propertyDetails.floorsForProperty;
      }

      const normalisedFloors = normaliseFloors(floorsData, {
        id: propertyDetails?.id || response?.property?.id || propertyId,
        name: propertyDetails?.name || response?.property?.name || 'Property Floors',
      });
      setFloors(normalisedFloors);

      const occupancyResponse = await getAllFloorsOccupancy({ propertyId });
      const occupancyMap = {};
      extractFloorsData(occupancyResponse).forEach((report) => {
        occupancyMap[report.floor_id] = report;
      });
      setOccupancyReports(occupancyMap);
    } catch (err) {
      console.error('Error fetching property floors:', err);
      showError(err?.message || 'Failed to fetch floors for this property');
      setFloors([]);
      setOccupancyReports({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchPropertyFloors();
    }
  }, [propertyId]);

  const filteredFloors = useMemo(() => {
    if (!Array.isArray(floors)) return [];
    if (!searchTerm.trim()) return floors;
    const term = searchTerm.toLowerCase();
    return floors.filter((floor) =>
      floor.name?.toLowerCase().includes(term) ||
      String(floor.level_number).toLowerCase().includes(term)
    );
  }, [floors, searchTerm]);

  const paginatedFloors = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredFloors.slice(startIndex, startIndex + limit);
  }, [filteredFloors, page, limit]);

  const totalPages = Math.ceil(filteredFloors.length / limit) || 1;

  const stats = useMemo(() => {
    const totalLocals = floors.reduce((sum, floor) => sum + (floor.locals_count || 0), 0);
    const occupied = floors.reduce((sum, floor) => sum + (occupancyReports[floor.id]?.occupied || 0), 0);
    const available = floors.reduce((sum, floor) => sum + (occupancyReports[floor.id]?.available || 0), 0);
    const maintenance = floors.reduce((sum, floor) => sum + (occupancyReports[floor.id]?.maintenance || 0), 0);
    const occupancyRate = totalLocals > 0 ? Math.round((occupied / totalLocals) * 100) : 0;

    return { totalLocals, occupied, available, maintenance, occupancyRate };
  }, [floors, occupancyReports]);

  const handleEditClick = (floor) => {
    setSelectedFloor(floor);
    setEditData({
      name: floor.name,
      level_number: floor.level_number
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const { name, level_number } = editData;
    if (!name?.trim()) {
      showError('Floor name is required.');
      return;
    }
    try {
      if (selectedFloor) {
        await updateFloor(selectedFloor.id, {
          name: name.trim(),
          level_number: parseInt(level_number, 10),
        });
        showSuccess('Floor updated successfully!');
        fetchPropertyFloors();
      }
      setModalOpen(false);
      setSelectedFloor(null);
      setEditData({ name: '', level_number: 0 });
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to save floor');
    }
  };

  const handleDelete = async (floor) => {
    if (!window.confirm(`Are you sure you want to delete "${floor.name}"?`)) return;
    try {
      await deleteFloor(floor.id);
      showInfo('Floor deleted successfully.');
      fetchPropertyFloors();
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to delete floor');
    }
  };

  const handleBackToProperties = () => {
    navigate('/admin/properties');
  };

  const handleViewLocals = (floor) => {
    navigate(`/admin/floors/${floor.id}/locals?propertyId=${propertyId}&propertyName=${encodeURIComponent(propertyInfo?.name || '')}&floorName=${encodeURIComponent(floor.name)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <Zap size={48} className="text-teal-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Syncing Asset Architecture...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Breadcrumbs & Navigation */}
        <div className="flex items-center gap-6 animate-fade-in group">
          <button
            onClick={handleBackToProperties}
            className="p-4 rounded-2xl bg-gray-800/40 backdrop-blur-sm shadow-xl text-gray-400 hover:text-teal-400 transition-all hover:scale-110 border border-gray-700/50"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-10 w-px bg-gray-700 hidden sm:block"></div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 italic">Asset Path</p>
            <div className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase italic">
              <span className="hover:text-teal-500 cursor-pointer transition-colors" onClick={() => navigate('/admin')}>Portfolio</span>
              <span className="text-gray-600">/</span>
              <span className="hover:text-teal-500 cursor-pointer transition-colors" onClick={handleBackToProperties}>Properties</span>
              <span className="text-gray-600">/</span>
              <span className="text-teal-500">{propertyInfo?.name || 'Asset Matrix'}</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Home size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Vertical Architecture Oversight
              </div>
              <div className="max-w-full overflow-hidden">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none truncate pr-4">
                  {propertyInfo?.name || 'Asset Matrix'}
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2 truncate">
                  <Building size={14} className="text-teal-500 shrink-0" /> <span className="truncate">{propertyInfo?.location || 'Sector Unknown'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8 shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-500 uppercase italic tracking-widest mb-1">Architecture Depth</p>
                <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{floors.length} Levels</p>
              </div>
              <div className="h-12 w-px bg-gray-700 hidden sm:block"></div>
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-gray-500 uppercase italic tracking-widest mb-1">Total Unit Clusters</p>
                <p className="text-3xl font-black text-teal-400 italic tracking-tighter leading-none">{stats.totalLocals}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Active Tenancy', value: `${stats.occupancyRate}%`, icon: Activity, color: 'teal' },
              { label: 'Operational Nodes', value: stats.occupied, icon: CheckCircle, color: 'emerald' },
              { label: 'Liquid Reserves', value: stats.available, icon: Box, color: 'indigo' },
              { label: 'Fault Isolation', value: stats.maintenance, icon: Clock, color: 'amber' }
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
            placeholder="Query floors within this asset by identity or altitude..."
            className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Content Table */}
        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {/* Mobile Card Feed */}
          <div className="md:hidden divide-y divide-gray-700/30">
            {paginatedFloors.length === 0 ? (
              <div className="p-20 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No vertical records isolated.</div>
            ) : (
              paginatedFloors.map((floor) => {
                const report = occupancyReports[floor.id] || {};
                const rate = report.occupancy_rate || 0;
                return (
                  <div key={floor.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform shadow-lg">
                          <Layers size={24} />
                        </div>
                        <div>
                          <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{floor.name}</h3>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mt-1">
                            Altitude P{floor.level_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <span className="text-[10px] font-black text-white italic">{rate}% Occupancy</span>
                        <div className="w-16 h-1 bg-gray-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-teal-500' : 'bg-rose-500'}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <p className="text-[9px] font-black text-gray-500 uppercase italic">Operational Load</p>
                          <p className="text-sm font-black text-gray-300 italic">{report.occupied || 0} USE / {report.available || 0} LIQ</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleViewLocals(floor)} className="p-2 rounded-xl text-[9px] font-black">
                          INSPECT
                        </Button>
                        <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(floor)}>
                          <Edit3 size={14} />
                        </Button>
                        <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(floor)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent">
            <table className="w-full text-left table-auto min-w-[800px]">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-6 font-black uppercase">Floor Identity</th>
                  <th className="px-6 py-6 font-black uppercase">Altitude</th>
                  <th className="px-6 py-6 text-center font-black uppercase">Operational Load</th>
                  <th className="px-6 py-6 text-center font-black uppercase">Capacity visual</th>
                  <th className="px-6 py-6 text-right font-black uppercase">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {paginatedFloors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No vertical records isolated.</td>
                  </tr>
                ) : (
                  paginatedFloors.map((floor) => {
                    const report = occupancyReports[floor.id] || {};
                    const rate = report.occupancy_rate || 0;
                    return (
                      <tr key={floor.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform shadow-lg shrink-0">
                              <Layers size={18} />
                            </div>
                            <span className="text-lg font-black text-white italic uppercase tracking-tighter leading-none truncate max-w-[150px]">{floor.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest italic whitespace-nowrap">
                            Altitude P{floor.level_number}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center text-sm font-black text-gray-300 italic whitespace-nowrap">
                          <div className="flex justify-center gap-3">
                            <span className="text-emerald-500 font-black">{report.occupied || 0} USE</span>
                            <span className="text-teal-500 font-black">{report.available || 0} LIQ</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center whitespace-nowrap">
                          <div className="flex items-center gap-4 justify-center">
                            <div className="w-24 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-teal-500' : 'bg-rose-500'}`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-white italic">{rate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                            <Button onClick={() => handleViewLocals(floor)} className="px-4 py-2 rounded-lg text-[9px] font-black">
                              INSPECT <ArrowRight size={12} className="ml-2" />
                            </Button>
                            <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(floor)}>
                              <Edit3 size={14} />
                            </Button>
                            <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(floor)}>
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
            title={selectedFloor ? `Override Architecture Sector: ${selectedFloor.name}` : 'Initialize New Level Dimension'}
            onClose={() => {
              setModalOpen(false);
              setSelectedFloor(null);
              setEditData({ name: '', level_number: 0 });
            }}
            onSubmit={handleSubmit}
            className="max-w-xl"
          >
            <div className="p-4 space-y-10 animate-fade-in">
              <Input
                label="Designation Label signature *"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="e.g. Level One, Premium Wing..."
                icon={Layers}
              />
              <Input
                label="Altitude Priority Vector (Level Index) *"
                type="number"
                value={editData.level_number}
                onChange={(e) => setEditData({ ...editData, level_number: parseInt(e.target.value, 10) || 0 })}
                icon={Activity}
              />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default PropertyFloorsPage;