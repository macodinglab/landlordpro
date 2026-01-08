import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Button, Input, Badge } from '../../components';
import {
  ArrowLeft,
  Layers,
  Home,
  Search,
  LayoutDashboard,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  LayoutTemplate,
  History
} from 'lucide-react';
import useAccessibleProperties from '../../hooks/useAccessibleProperties';
import { getLocalsByFloorId } from '../../services/localService';
import { getFloorById, getFloorOccupancy } from '../../services/floorService';
import { showError } from '../../utils/toastHelper';

const STATUS_META = {
  occupied: { label: 'Occupied', className: 'bg-emerald-100 text-emerald-700' },
  available: { label: 'Available', className: 'bg-blue-100 text-blue-700' },
  maintenance: { label: 'Maintenance', className: 'bg-amber-100 text-amber-700' },
};

const ManagerFloorLocalsPage = () => {
  const { floorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isManager, accessiblePropertyIds, loading: loadingProperties } = useAccessibleProperties();

  const propertyId = searchParams.get('propertyId');
  const propertyNameParam = decodeURIComponent(searchParams.get('propertyName') || '');
  const floorNameFromUrl = decodeURIComponent(searchParams.get('floorName') || '');

  const [floor, setFloor] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [locals, setLocals] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propertyMeta, setPropertyMeta] = useState({ id: propertyId || null, name: propertyNameParam });
  const [page, setPage] = useState(1);
  const limit = 10;

  const propertyAccessible = useMemo(() => {
    if (!propertyId) return true;
    if (!isManager) return true;
    return accessiblePropertyIds.includes(propertyId) || accessiblePropertyIds.includes(Number(propertyId));
  }, [propertyId, accessiblePropertyIds, isManager]);

  useEffect(() => {
    if (!floorId || (isManager && !loadingProperties && !propertyAccessible)) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);

        const [floorResponse, occupancyResponse, localsResponse] = await Promise.all([
          getFloorById(floorId),
          getFloorOccupancy(floorId),
          getLocalsByFloorId(floorId),
        ]);

        const floorData = floorResponse?.data || floorResponse;
        setFloor(floorData);
        setOccupancy(occupancyResponse?.data || occupancyResponse);

        const localsData = Array.isArray(localsResponse?.data)
          ? localsResponse.data
          : Array.isArray(localsResponse)
            ? localsResponse
            : [];
        const filteredLocals = localsData.filter((local) => String(local?.floor_id) === String(floorId));
        setLocals(filteredLocals);

        const resolvedProperty = floorData?.propertyForFloor || floorData?.property;
        if (resolvedProperty) {
          setPropertyMeta({ id: resolvedProperty.id, name: resolvedProperty.name });
        }
      } catch (err) {
        console.error(err);
        setError(err?.message || 'Failed to load locals for this floor');
        showError(err?.message || 'Failed to load locals for this floor');
        setLocals([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [floorId, propertyAccessible, isManager, loadingProperties]);

  const filteredLocals = useMemo(() => {
    if (!Array.isArray(locals)) return [];
    if (!search.trim()) return locals;
    const term = search.toLowerCase();
    return locals.filter((local) =>
      local.local_number?.toLowerCase().includes(term) ||
      local.reference_code?.toLowerCase().includes(term) ||
      local.status?.toLowerCase().includes(term)
    );
  }, [locals, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginatedLocals = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredLocals.slice(start, start + limit);
  }, [filteredLocals, page]);

  const totalPages = Math.ceil(filteredLocals.length / limit) || 1;

  const stats = useMemo(() => {
    const total = locals.length;
    if (!total) return { total: 0, occupied: 0, available: 0, maintenance: 0, occupancyRate: 0 };
    const occupied = locals.filter((local) => local.status === 'occupied').length;
    const available = locals.filter((local) => local.status === 'available').length;
    const maintenance = locals.filter((local) => local.status === 'maintenance').length;
    const occupancyRate = total ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, available, maintenance, occupancyRate };
  }, [locals]);

  const resolvedPropertyId = propertyMeta.id || floor?.property_id || floor?.propertyForFloor?.id;
  const resolvedPropertyName = propertyMeta.name || floor?.propertyForFloor?.name || floor?.property_name || '';

  const handleBackToFloors = () => {
    if (resolvedPropertyId) {
      navigate(`/manager/properties/${resolvedPropertyId}/floors`);
    } else {
      navigate('/manager/floors');
    }
  };

  if (!floorId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 text-center text-gray-600">Missing floor identifier.</Card>
      </div>
    );
  }

  if (loadingProperties || loading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <div className="text-gray-500">Loading floor locals...</div>
      </div>
    );
  }

  if (isManager && !propertyAccessible) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Card className="p-8 text-center max-w-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Access Restricted</h2>
          <p className="text-sm text-gray-600 mb-6">
            You do not have permission to view this floor. Please contact an administrator if you believe this is an error.
          </p>
          <Button
            onClick={() => navigate('/manager/floors')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Floors
          </Button>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Card className="p-8 text-center max-w-lg text-red-600">{error}</Card>
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

        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-16 space-y-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button
                  className="bg-gray-800/40 hover:bg-gray-800 text-white backdrop-blur border border-gray-700/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2 transition-all active:scale-95"
                  onClick={handleBackToFloors}
                >
                  <ArrowLeft size={14} /> System Registry
                </Button>
                <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                  <Layers size={12} /> Level {floor?.level_number ?? '?'}
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Unit <span className="text-teal-500">Matrix</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Managing node hierarchy for {resolvedPropertyName || 'Asset Matrix'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Nodes', value: stats.total, icon: <LayoutDashboard size={18} />, color: 'teal' },
              { label: 'Occupied', value: stats.occupied, icon: <CheckCircle2 size={18} />, color: 'indigo' },
              { label: 'Available', value: stats.available, icon: <ShieldCheck size={18} />, color: 'emerald' },
              { label: 'Maintenance', value: stats.maintenance, icon: <ShieldAlert size={18} />, color: 'rose' },
              { label: 'Efficiency', value: `${stats.occupancyRate}%`, icon: <History size={18} />, color: 'amber' }
            ].map((stat, i) => (
              <div key={i} className="bg-gray-900/40 backdrop-blur-sm p-5 rounded-2xl border border-gray-800/50 shadow-inner group transition-all hover:bg-gray-900/60">
                <div className="flex items-center gap-3">
                  <div className={`p-3 bg-gray-900 rounded-xl border border-gray-700/50 text-${stat.color}-400`}>
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{stat.label}</div>
                    <div className="text-xl font-black text-white italic tracking-tighter">{stat.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {/* Search */}
        <div className="py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-gray-800/50 mb-8">
          <div className="relative max-w-2xl group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
            </div>
            <input
              type="text"
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
              placeholder="Filter nodes by identifier or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredLocals.length === 0 ? (
          <Card className="p-20 text-center bg-gray-800/40 backdrop-blur-sm border-gray-700/50 border-dashed rounded-[2rem]" hover={false}>
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                <ShieldAlert className="w-12 h-12 text-gray-600" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Node Matches</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic mb-8">No structural units found within current matrix parameters.</p>
          </Card>
        ) : (
          <>
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
              {/* Mobile Feed */}
              <div className="md:hidden divide-y divide-gray-700/30 px-4">
                {paginatedLocals.length === 0 ? (
                  <div className="p-20 text-center italic text-gray-400 font-bold uppercase text-[10px] tracking-widest">No Node Signal Captured.</div>
                ) : (
                  paginatedLocals.map((local) => {
                    const statusKey = local.status?.toLowerCase();
                    return (
                      <div key={local.id} className="py-6 space-y-4 group/row">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                              <LayoutDashboard size={20} />
                            </div>
                            <div>
                              <h3 className="font-black text-white italic uppercase tracking-tighter text-base">
                                {local.local_number || local.reference_code || `LOC-${String(local.id).slice(0, 6)}`}
                              </h3>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-1">NODE_ID: {local.id.slice(0, 8)}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase italic tracking-widest ${statusKey === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : statusKey === 'occupied' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {local.status || 'Unknown'}
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-black uppercase italic tracking-widest">
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-gray-600 mb-1">Area</p>
                              <p className="text-white">{local.area || '—'} M²</p>
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">Rent</p>
                              <p className="text-white">{local.rent_price ? Number(local.rent_price).toLocaleString() : '—'} FRW</p>
                            </div>
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
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Node Manifest</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Status Vector</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Dimension (M²)</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Rent Provision</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Last Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {paginatedLocals.map((local) => {
                      const statusKey = local.status?.toLowerCase();
                      return (
                        <tr key={local.id} className="group transition-all hover:bg-gray-700/20">
                          <td className="px-6 py-6 min-w-[200px]">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-700/50 text-teal-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <LayoutDashboard size={22} />
                              </div>
                              <div>
                                <div className="font-black text-white italic uppercase text-sm tracking-tight group-hover:text-teal-400 transition-colors uppercase">
                                  {local.local_number || local.reference_code || `LOC-${String(local.id).slice(0, 6)}`}
                                </div>
                                <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1">NODE_ID: {local.id.slice(0, 8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 min-w-[150px]">
                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest border ${statusKey === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              statusKey === 'occupied' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${statusKey === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                statusKey === 'occupied' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' :
                                  'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                }`} />
                              {local.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="text-lg font-black text-white italic tracking-tighter">
                              {local.area || '—'}
                              <span className="text-[10px] text-gray-600 ml-1 font-black uppercase">M²</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="text-lg font-black text-white italic tracking-tighter">
                              {local.rent_price ? Number(local.rent_price).toLocaleString() : '—'}
                              <span className="text-[10px] text-gray-600 ml-1 font-black uppercase">FRW</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-widest flex items-center gap-2">
                              <History size={12} className="text-gray-700" />
                              {local.updatedAt
                                ? new Date(local.updatedAt).toLocaleDateString()
                                : local.updated_at
                                  ? new Date(local.updated_at).toLocaleDateString()
                                  : '—'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredLocals.length > 0 && (
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
          </>
        )}
      </div>
    </div>
  );
};

export default ManagerFloorLocalsPage;
