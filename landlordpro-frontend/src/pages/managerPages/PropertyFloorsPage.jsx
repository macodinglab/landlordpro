import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input } from '../../components';
import {
  ArrowLeft,
  ArrowRight,
  Layers,
  Search,
  Activity,
  LayoutDashboard,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import useAccessibleProperties from '../../hooks/useAccessibleProperties';
import {
  getFloorsByPropertyId,
  getAllFloorsOccupancy,
  extractFloorsData,
} from '../../services/floorService';
import { getPropertyById } from '../../services/propertyService';
import { showError, showSuccess, showInfo } from '../../utils/toastHelper';

const normaliseFloors = (floors = [], propertyMeta = {}) =>
  floors.map((floor) => {
    const targetPropertyId = propertyMeta.id || floor.property_id;
    const rawLocals = floor.locals || floor.localsForFloor || [];
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
    const localsCount = floor.locals_count ?? filteredLocals.length ?? 0;
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

const ManagerPropertyFloorsPage = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const {
    isManager,
    properties,
    accessiblePropertyIds,
    loading: loadingProperties,
  } = useAccessibleProperties();

  const [floors, setFloors] = useState([]);
  const [occupancyReports, setOccupancyReports] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const property = useMemo(
    () => properties.find((item) => String(item.id) === String(propertyId)) || propertyInfo,
    [properties, propertyId, propertyInfo]
  );

  const propertyAccessible = useMemo(() => {
    if (!propertyId) return false;
    if (!isManager) return true;
    return accessiblePropertyIds.includes(propertyId) || accessiblePropertyIds.includes(Number(propertyId));
  }, [accessiblePropertyIds, isManager, propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    if (property) {
      setPropertyInfo({ id: property.id, name: property.name, location: property.location });
      return;
    }

    const fetchPropertyDetails = async () => {
      try {
        const details = await getPropertyById(propertyId);
        if (details) {
          setPropertyInfo({ id: details.id, name: details.name, location: details.location });
        }
      } catch (error) {
        console.warn('Failed to fetch property details', error?.message || error);
      }
    };

    fetchPropertyDetails();
  }, [propertyId, property]);

  useEffect(() => {
    if (!propertyId || (isManager && !loadingProperties && !propertyAccessible)) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        setLoading(true);
        const floorsResponse = await getFloorsByPropertyId(propertyId);
        let floorsData = extractFloorsData(floorsResponse);
        if ((!floorsData || floorsData.length === 0) && propertyInfo?.floorsForProperty) {
          floorsData = propertyInfo.floorsForProperty;
        }

        const normalisedFloors = normaliseFloors(floorsData, {
          id: propertyInfo?.id || floorsResponse?.property?.id || propertyId,
          name: property?.name || propertyInfo?.name || floorsResponse?.property?.name,
        });

        const occupancyResponse = await getAllFloorsOccupancy({ propertyId });
        const occupancyMap = {};
        extractFloorsData(occupancyResponse).forEach((report) => {
          occupancyMap[report.floor_id] = report;
        });

        setFloors(normalisedFloors);
        setOccupancyReports(occupancyMap);
      } catch (error) {
        console.error(error);
        showError(error?.message || 'Failed to load floors for this property');
        setFloors([]);
        setOccupancyReports({});
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [propertyAccessible, propertyId, property, loadingProperties, isManager]);

  const filteredFloors = useMemo(() => {
    if (!Array.isArray(floors)) return [];
    if (!search.trim()) return floors;
    const term = search.toLowerCase();
    return floors.filter((floor) =>
      floor.name?.toLowerCase().includes(term) ||
      String(floor.level_number).toLowerCase().includes(term)
    );
  }, [floors, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginatedFloors = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredFloors.slice(start, start + limit);
  }, [filteredFloors, page]);

  const totalPages = Math.ceil(filteredFloors.length / limit) || 1;

  const stats = useMemo(() => {
    if (!floors.length) {
      return { total: 0, locals: 0, occupied: 0, available: 0, maintenance: 0, occupancyRate: 0 };
    }
    const locals = floors.reduce((sum, floor) => sum + (floor.locals_count || 0), 0);
    const occupied = floors.reduce((sum, floor) => sum + (occupancyReports[floor.id]?.occupied || 0), 0);
    const available = floors.reduce((sum, floor) => sum + (occupancyReports[floor.id]?.available || 0), 0);
    const maintenance = floors.reduce((sum, floor) => sum + (occupancyReports[floor.id]?.maintenance || 0), 0);
    const occupancyRate = locals > 0 ? Math.round((occupied / locals) * 100) : 0;
    return { total: floors.length, locals, occupied, available, maintenance, occupancyRate };
  }, [floors, occupancyReports]);

  if (!propertyId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 text-center text-gray-600">Missing property identifier.</Card>
      </div>
    );
  }

  if (loadingProperties || loading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <div className="text-gray-500">Loading property floors...</div>
      </div>
    );
  }

  if (isManager && !propertyAccessible) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Card className="p-8 text-center max-w-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Access Restricted</h2>
          <p className="text-sm text-gray-600 mb-6">
            You do not have permission to view floors for this property. Please contact an administrator if you believe this is an error.
          </p>
          <Button
            onClick={() => navigate('/manager/properties')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Properties
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 border-l border-gray-800/50 pb-12">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-teal-950 via-indigo-950 to-slate-950 text-white border-b border-gray-800/50">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-16 space-y-12 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate(-1)}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all active:scale-95"
                >
                  <ArrowLeft size={18} />
                </Button>
                <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                  <Layers size={12} /> Matrix Hierarchy
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] italic mb-3">
                  <MapPin size={12} className="text-teal-500" />
                  {property?.location || 'Unknown Sector'} // <span className="text-teal-500/50">{property?.name || 'Asset'}</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Floor <span className="text-teal-500">Architecture</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Analyzing vertical nodal distribution and occupancy density
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Stats Summary In-Hero */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-950/50 border border-gray-800 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Density Index</span>
                  <span className="text-2xl font-black text-teal-500 italic tracking-tighter">{stats.occupancyRate}%</span>
                </div>
                <div className="p-4 bg-gray-950/50 border border-gray-800 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Active Nodes</span>
                  <span className="text-2xl font-black text-white italic tracking-tighter">{stats.locals}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Total Levels', value: stats.total, icon: <Layers size={20} className="text-teal-400" />, sub: 'Structural units' },
              { title: 'Operational', value: stats.occupied, icon: <CheckCircle2 size={20} className="text-indigo-400" />, sub: 'Nodal saturation' },
              { title: 'Available', value: stats.available, icon: <LayoutDashboard size={20} className="text-teal-400" />, sub: 'Liquidity potential' },
              { title: 'Maintenance', value: stats.maintenance, icon: <Activity size={20} className="text-rose-400" />, sub: 'Stalled protocols' },
            ].map((card, idx) => (
              <Card key={idx} className="p-6 bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-500 group relative overflow-hidden rounded-[2rem]" hover={true}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gray-800 rounded-full blur-[40px] -mr-12 -mt-12 group-hover:bg-teal-900/20 transition-colors duration-700 opacity-50" />
                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mb-1">{card.title}</h3>
                    <div className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{card.value}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 mt-12 space-y-8">
        {/* Controls */}
        <div className="py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-gray-800/50">
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
              </div>
              <input
                type="text"
                className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                placeholder="Scan level identifier or nodal descriptor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Floors Matrix */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
          {/* Mobile Feed */}
          <div className="md:hidden divide-y divide-gray-700/30 px-4">
            {filteredFloors.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">Zero Vertical signal.</div>
            ) : (
              paginatedFloors.map((floor) => {
                const report = occupancyReports[floor.id] || {};
                const rate = report.occupancy_rate || 0;
                return (
                  <div key={floor.id} className="py-6 space-y-4 group/row">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover/row:scale-110 transition-transform duration-500 font-black italic text-xs">
                          {floor.level_number}
                        </div>
                        <div>
                          <h3 className="font-black text-white italic uppercase tracking-tighter text-base group-hover/row:text-teal-400 transition-colors uppercase">{floor.name}</h3>
                          <p className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1">Efficiency: {rate}% LOAD</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <div className="text-[10px] font-black text-white italic uppercase tracking-tighter">{floor.locals_count || 0} Nodes</div>
                        <div className="flex gap-2 text-[8px] font-black uppercase italic tracking-widest">
                          <span className="text-teal-400">{report.available || 0} AVL</span>
                          <span className="text-indigo-400">{report.occupied || 0} OCC</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        className="w-full bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest italic"
                        onClick={() =>
                          navigate(
                            `/manager/floors/${floor.id}/locals?propertyId=${propertyId}&propertyName=${encodeURIComponent(
                              property?.name || ''
                            )}&floorName=${encodeURIComponent(floor.name)}`
                          )
                        }
                      >
                        Inspect Locals <ArrowRight size={14} className="ml-2" />
                      </Button>
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
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Floor / Level</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Sub-Nodal Matrix</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Status Vector</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Efficiency</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredFloors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <div className="flex justify-center mb-6">
                        <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                          <Layers className="w-12 h-12 text-gray-600" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Vertical match</h3>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">No levels found in the current structural sector.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedFloors.map((floor) => {
                    const report = occupancyReports[floor.id] || {};
                    const rate = report.occupancy_rate || 0;

                    return (
                      <tr key={floor.id} className="group transition-all hover:bg-gray-700/20">
                        <td className="px-6 py-6 min-w-[200px]">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 font-black italic text-xs">
                              {floor.level_number}
                            </div>
                            <div>
                              <div className="font-black text-white italic uppercase text-base tracking-tight group-hover:text-teal-400 transition-colors uppercase">{floor.name}</div>
                              <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1">Level Index: {floor.level_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-wrap gap-2 max-w-[300px]">
                            {(floor.locals || []).slice(0, 5).map((local) => (
                              <span key={local.id} className="px-2 py-1 bg-gray-900 border border-gray-800 text-[9px] font-black text-gray-500 uppercase italic tracking-widest rounded-lg">
                                {local.local_number || local.reference_code || 'NODE'}
                              </span>
                            ))}
                            {(floor.locals_count || 0) > 5 && (
                              <span className="px-2 py-1 bg-teal-500/10 border border-teal-500/20 text-[9px] font-black text-teal-500 uppercase italic tracking-widest rounded-lg">
                                +{floor.locals_count - 5}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex justify-center gap-4">
                            <div className="text-center">
                              <div className="text-xs font-black text-white italic tracking-tighter">{report.occupied || 0}</div>
                              <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest">OCC</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-black text-teal-500 italic tracking-tighter">{report.available || 0}</div>
                              <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest">AVL</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-black text-rose-500 italic tracking-tighter">{report.maintenance || 0}</div>
                              <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest">MNT</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div className="relative inline-flex items-center justify-center">
                            <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
                            <div className={`relative px-4 py-1.5 rounded-full border text-[10px] font-black uppercase italic tracking-widest ${rate >= 70 ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' :
                              rate >= 40 ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              }`}>
                              {rate}% LOAD
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <Button
                            className="bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all shadow-xl group/btn"
                            onClick={() =>
                              navigate(
                                `/manager/floors/${floor.id}/locals?propertyId=${propertyId}&propertyName=${encodeURIComponent(
                                  property?.name || ''
                                )}&floorName=${encodeURIComponent(floor.name)}`
                              )
                            }
                          >
                            <span>Inspect Locals</span>
                            <ArrowRight size={14} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredFloors.length > 0 && (
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
    </div>
  );
};

export default ManagerPropertyFloorsPage;
