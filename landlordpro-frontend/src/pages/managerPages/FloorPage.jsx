import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getFloorsByPropertyId,
  getAllFloorsOccupancy,
  extractFloorsData,
} from '../../services/floorService';
import { Card, Input, Select, Spinner, Button } from '../../components';
import {
  Search,
  Filter,
  X,
  Layers,
  LayoutTemplate,
  Home,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  ShieldAlert,
  LayoutDashboard,
  Plus
} from 'lucide-react';
import { showError } from '../../utils/toastHelper';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAccessibleProperties from '../../hooks/useAccessibleProperties';

const dedupeById = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id && !map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

const ManagerFloorPage = () => {
  const [floors, setFloors] = useState([]);
  const [occupancyReports, setOccupancyReports] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const limit = 10;

  const navigate = useNavigate();
  const { isAdmin, isManager, properties, propertyOptions, loading: loadingProperties } =
    useAccessibleProperties();

  const [searchParams, setSearchParams] = useSearchParams();
  const propertyIdFromUrl = searchParams.get('propertyId');

  useEffect(() => {
    if (propertyIdFromUrl) {
      setSelectedPropertyId(propertyIdFromUrl);
    }
  }, [propertyIdFromUrl]);

  useEffect(() => {
    if (!isManager) return;
    if (properties.length === 1 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [isManager, properties, selectedPropertyId]);

  const propertyNameMap = useMemo(
    () => new Map(properties.map((p) => [p.id, p.name || 'Unnamed Asset'])),
    [properties]
  );

  const selectedPropertyOption = useMemo(
    () => propertyOptions.find((option) => option.value === selectedPropertyId) ?? null,
    [propertyOptions, selectedPropertyId]
  );

  const fetchFloors = useCallback(async () => {
    if (loadingProperties) return;

    const targetPropertyIds = selectedPropertyId
      ? [selectedPropertyId]
      : properties.map((p) => p.id);

    if (targetPropertyIds.length === 0 && isManager) {
      setFloors([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const responses = await Promise.all(
        targetPropertyIds.map((pid) => getFloorsByPropertyId(pid))
      );

      const combined = dedupeById(
        responses.flatMap((res, idx) => {
          const data = extractFloorsData(res);
          const pid = targetPropertyIds[idx];
          return data.map((f) => ({
            ...f,
            property_name: f.property_name || propertyNameMap.get(pid),
          }));
        })
      );

      setFloors(combined);

      const occResponses = await Promise.all(
        targetPropertyIds.map((pid) => getAllFloorsOccupancy({ propertyId: pid }))
      );
      const occMap = {};
      occResponses.forEach((res) => {
        const reports = extractFloorsData(res);
        reports.forEach((r) => {
          occMap[r.floor_id] = r;
        });
      });
      setOccupancyReports(occMap);
    } catch (err) {
      console.error(err);
      showError('Failed to synchronize structural nodes.');
    } finally {
      setLoading(false);
    }
  }, [loadingProperties, selectedPropertyId, properties, propertyNameMap, isManager]);

  useEffect(() => {
    fetchFloors();
  }, [fetchFloors]);

  const filteredFloors = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return floors.filter(f =>
      f.name?.toLowerCase().includes(term) ||
      f.property_name?.toLowerCase().includes(term)
    );
  }, [floors, searchTerm]);

  const paginatedFloors = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredFloors.slice(start, start + limit);
  }, [filteredFloors, page]);

  const totalPages = Math.ceil(filteredFloors.length / limit) || 1;

  const canAdd = isAdmin; // Only admin can add floors usually, but check current logic
  // Original logic didn't have canAdd definition, let's assume isAdmin
  // Wait, let's check the original file for canAdd logic.
  // Original had: const canAdd = isAdmin; (at line 98 in PropertyPage, but let's check FloorPage)

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
                  <Layers size={12} /> Structural Hierarchy
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Core <span className="text-teal-500">Levels</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Vertical node categorization and management
                </p>
              </div>
            </div>

            {isAdmin && (
              <Button
                className="flex items-center gap-3 bg-teal-600 hover:bg-teal-500 text-white shadow-2xl px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all active:scale-95"
              >
                <Plus size={18} /> Initialize Level
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {/* Filters */}
        <div className="py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-gray-800/50 mb-8">
          <div className="flex flex-col md:flex-row gap-4 max-w-4xl">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
              </div>
              <input
                type="text"
                className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                placeholder="Scan level identifier or metadata..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative min-w-[300px]">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Building2 size={18} className="text-gray-500" />
              </div>
              <select
                className="w-full pl-16 pr-10 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-black uppercase text-[11px] tracking-widest italic outline-hidden transition-all shadow-inner appearance-none cursor-pointer focus:border-indigo-500/30 focus:shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setSearchParams(e.target.value ? { propertyId: e.target.value } : {});
                }}
              >
                <option value="" className="bg-gray-900">All Manifests</option>
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
            <p className="text-gray-500 font-black uppercase tracking-widest italic text-[10px]">Synchronizing Matrix Levels...</p>
          </div>
        ) : filteredFloors.length === 0 ? (
          <Card className="p-20 text-center bg-gray-800/40 backdrop-blur-sm border-gray-700/50 border-dashed rounded-[2rem]" hover={false}>
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                <ShieldAlert className="w-12 h-12 text-gray-600" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Structural Nodes</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic mb-8">No structural level data found within current search parameters.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
              {/* Mobile Feed */}
              <div className="md:hidden divide-y divide-gray-700/30 px-4">
                {paginatedFloors.length === 0 ? (
                  <div className="p-20 text-center italic text-gray-400 font-bold uppercase text-[10px] tracking-widest">No structural node captured.</div>
                ) : (
                  paginatedFloors.map((floor) => {
                    const report = occupancyReports[floor.id] || {};
                    return (
                      <div key={floor.id} className="py-6 space-y-6 group/row">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                              <Layers size={22} />
                            </div>
                            <div>
                              <h3 className="font-black text-white italic uppercase tracking-tighter text-lg leading-none">{floor.name}</h3>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-2">{floor.property_name || 'ORPHAN NODE'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Operational Load</p>
                            <span className="text-[10px] font-black text-white italic">{report.occupancy_rate || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden border border-gray-700/30">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 shadow-[0_0_10px_rgba(20,184,166,0.2)] transition-all duration-1000"
                              style={{ width: `${report.occupancy_rate || 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-black italic uppercase">
                            <span className="text-teal-500">{report.occupied || 0} USE</span>
                            <span className="text-indigo-500">{report.available || 0} LIQ</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                          <Button
                            className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest shadow-lg shadow-teal-500/10"
                            onClick={() => navigate(`/manager/floors/${floor.id}/locals`)}
                          >
                            UNIT GRID
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
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Level Manifest</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Parent Asset</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Occupancy Matrix</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {paginatedFloors.map((floor) => {
                      const report = occupancyReports[floor.id] || {};
                      return (
                        <tr key={floor.id} className="group transition-all hover:bg-gray-700/20">
                          <td className="px-6 py-6 min-w-[250px]">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <Layers size={22} />
                              </div>
                              <div>
                                <div className="font-black text-white italic uppercase text-sm tracking-tight group-hover:text-teal-400 transition-colors uppercase">{floor.name}</div>
                                <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1">LVL_ID: {floor.id.slice(0, 8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 min-w-[200px]">
                            <div className="flex items-center gap-3 text-indigo-400 font-black italic uppercase text-[10px] tracking-widest bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10 inline-flex">
                              <Building2 size={12} className="text-indigo-600" />
                              {floor.property_name || 'ORPHAN NODE'}
                            </div>
                          </td>
                          <td className="px-6 py-6 min-w-[300px]">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                                <div
                                  className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 shadow-[0_0_10px_rgba(20,184,166,0.3)] transition-all duration-1000"
                                  style={{ width: `${report.occupancy_rate || 0}%` }}
                                />
                              </div>
                              <div className="text-[10px] font-black text-white italic uppercase tracking-widest w-12 text-right">{report.occupancy_rate || 0}%</div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <span className="text-[8px] font-black text-teal-500 uppercase italic">{report.occupied || 0} OCC</span>
                              <span className="text-[8px] font-black text-indigo-500 uppercase italic">{report.available || 0} AVL</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex justify-center">
                              <Button
                                className="bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all shadow-xl flex items-center gap-3"
                                onClick={() => navigate(`/manager/floors/${floor.id}/locals`)}
                              >
                                <LayoutDashboard size={14} />
                                <span>Unit Grid</span>
                              </Button>
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
    </div>
  );
};

export default ManagerFloorPage;