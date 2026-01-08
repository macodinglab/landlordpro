import React, { useEffect, useState, useMemo } from 'react';
import {
  getAllProperties,
  createProperty,
  updateProperty
} from '../../services/propertyService';
import { getAllManagers } from '../../services/UserService';
import { Button, Modal, Input, Card, Select } from '../../components';
import {
  Plus,
  Search,
  Layers,
  Edit2,
  MapPin,
  Info,
  Box,
  User,
  ChevronLeft,
  ChevronRight,
  Home,
  Waves,
  Activity,
  ArrowRight,
  Filter,
  Download,
  Building
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/toastHelper';
import { useNavigate } from 'react-router-dom';

const PropertyPage = () => {
  const [properties, setProperties] = useState([]);
  const [managers, setManagers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [editData, setEditData] = useState({
    name: '',
    location: '',
    description: '',
    number_of_floors: 1,
    has_basement: false,
    manager_id: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const fetchProperties = async (pageNumber = page) => {
    try {
      setLoading(true);
      const data = await getAllProperties(pageNumber, 10);
      const propertiesArray = data?.properties || [];
      const totalPagesCount = data?.totalPages || 1;
      const currentPage = data?.page || pageNumber;

      if (propertiesArray.length === 0 && pageNumber > 1) {
        return fetchProperties(pageNumber - 1);
      }

      setProperties(propertiesArray);
      setTotalPages(totalPagesCount);
      setPage(currentPage);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setProperties([]);
      setTotalPages(1);
      setPage(1);
      showError(err?.message || 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const data = await getAllManagers();
      setManagers(data || []);
    } catch (err) {
      showError('Failed to fetch managers');
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchManagers();
  }, []);

  const handleEditClick = (property) => {
    setSelectedProperty(property);
    setEditData({
      name: property.name || '',
      location: property.location || '',
      description: property.description || '',
      number_of_floors: property.number_of_floors || 1,
      has_basement: property.has_basement || false,
      manager_id: property.manager_id || ''
    });
    setModalOpen(true);
  };

  const handleViewFloors = (property) => {
    navigate(`/admin/properties/${property.id}/floors`);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const { name, location, number_of_floors, has_basement, manager_id, description } = editData;

    if (!name?.trim() || !location?.trim()) {
      showError('Name and location are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        location: location.trim(),
        description: description?.trim() || null,
        number_of_floors: parseInt(number_of_floors) || 1,
        has_basement: Boolean(has_basement),
        manager_id: manager_id || null
      };

      if (selectedProperty) {
        await updateProperty(selectedProperty.id, payload);
        showSuccess('Property updated successfully!');
      } else {
        await createProperty(payload);
        showSuccess('Property added successfully!');
        setPage(1);
      }

      await fetchProperties(selectedProperty ? page : 1);
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Property submit error:', err);
      showError(err?.message || err?.response?.data?.message || 'Failed to save property');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedProperty(null);
    setEditData({
      name: '',
      location: '',
      description: '',
      number_of_floors: 1,
      has_basement: false,
      manager_id: ''
    });
    setErrors({});
  };

  const filteredProperties = useMemo(() => {
    if (!Array.isArray(properties)) return [];
    if (!searchTerm.trim()) return properties;
    const searchLower = searchTerm.toLowerCase();
    return properties.filter(p =>
      p.name?.toLowerCase().includes(searchLower) ||
      p.location?.toLowerCase().includes(searchLower)
    );
  }, [properties, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Home size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Asset Intelligence Hub
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Property <span className="text-teal-500">Registry</span>
                </h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4">
                  Strategic Infrastructure Management // Active Sector Monitoring
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <Button onClick={() => setModalOpen(true)} className="px-8">
                <div className="flex items-center gap-3">
                  <Plus size={18} />
                  <span>Register Asset</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Total Inventory', value: properties.length, icon: Building, color: 'teal' },
              { label: 'Units Captured', value: filteredProperties.length, icon: Box, color: 'indigo' },
              { label: 'Coverage Area', value: 'Global', icon: MapPin, color: 'violet' },
              { label: 'Status', value: 'Online', icon: Activity, color: 'emerald' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1 group">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic group-hover:text-teal-500 transition-colors">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <stat.icon size={14} className={`text-${stat.color}-400`} />
                  <p className="text-2xl font-black text-white italic tracking-tighter">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Filter registry by name, location or metadata..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border-2 border-transparent focus:border-teal-500/30 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="px-6 rounded-[1.5rem] border-gray-700/50 h-full">
              <Filter size={18} className="mr-2" /> Filter
            </Button>
            <Button variant="outline" className="px-6 rounded-[1.5rem] border-gray-700/50 h-full">
              <Download size={18} className="mr-2" /> Export
            </Button>
          </div>
        </div>

        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          <div className="xl:hidden divide-y divide-gray-700/30">
            {loading ? (
              <div className="p-20 text-center space-y-4 animate-pulse">
                <Activity size={40} className="mx-auto text-teal-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Interrogating Registry...</p>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Sector Signal Detected.</div>
            ) : (
              filteredProperties.map((p) => (
                <div key={p.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                        <Layers size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{p.name}</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic flex items-center gap-2 mt-1">
                          <MapPin size={10} className="text-rose-500" /> {p.location}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-gray-900/50 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest italic border border-gray-700/50">
                      {p.number_of_floors} Levels
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
                    <div className="flex gap-2">
                      <Button variant="outline" className="px-4 py-2 text-[9px] rounded-xl border-gray-700" onClick={() => handleViewFloors(p)}>
                        Inspect
                      </Button>
                      <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(p)}>
                        <Edit2 size={14} />
                      </Button>
                    </div>
                    <p className="text-[9px] font-black text-gray-600 uppercase italic">ID: {p.id.toString().slice(0, 8)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-10 py-6">Asset Designation</th>
                  <th className="px-10 py-6">Structural Load</th>
                  <th className="px-10 py-6">Coordinates</th>
                  <th className="px-10 py-6">Lead Custodian</th>
                  <th className="px-10 py-6 text-right">Command Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Activity size={48} className="text-teal-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Asset Matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No assets found in current perimeter.</td>
                  </tr>
                ) : (
                  filteredProperties.map((p) => {
                    const manager = managers.find(m => m.id === p.manager_id);
                    return (
                      <tr key={p.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 shadow-lg group-hover:scale-110 transition-transform">
                              <Layers size={24} />
                            </div>
                            <div>
                              <p className="font-black text-white italic uppercase tracking-tighter text-xl leading-none">{p.name}</p>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-2 flex items-center gap-2">
                                <Info size={12} className="text-teal-500" /> {p.description || 'No meta-payload'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex flex-col gap-2">
                            <span className="px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-[10px] font-black text-gray-400 uppercase italic tracking-widest w-fit">
                              {p.number_of_floors} Levels
                            </span>
                            {p.has_basement && (
                              <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase italic tracking-widest w-fit">
                                Sub-level Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-rose-500 shadow-rose-500/20" />
                            <span className="font-black text-sm text-gray-300 uppercase italic tracking-tight">{p.location}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                              <User size={16} />
                            </div>
                            <span className="text-sm font-black text-gray-300 uppercase italic">{manager?.full_name || 'Pending'}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                          <div className="flex items-center justify-end gap-3">
                            <Button variant="outline" className="px-6 py-2.5 rounded-xl border-gray-700 text-[10px]" onClick={() => handleViewFloors(p)}>
                              Inspect <ArrowRight size={14} className="ml-2" />
                            </Button>
                            <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(p)}>
                              <Edit2 size={16} />
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
              onClick={() => fetchProperties(Math.max(page - 1, 1))}
              disabled={page <= 1}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page <= 1
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'text-gray-400 hover:text-teal-400 hover:bg-gray-800'
                }`}
            >
              Retreat
            </button>
            <button
              onClick={() => fetchProperties(Math.min(page + 1, totalPages))}
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

        {modalOpen && (
          <Modal
            title={selectedProperty ? `Edit Sector: ${selectedProperty.name}` : 'Integrate New Asset'}
            onClose={() => { setModalOpen(false); resetForm(); }}
            onSubmit={handleSubmit}
            className="max-w-4xl"
          >
            <div className="space-y-10 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Asset Designation *"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="e.g. ALPHA TOWER"
                  icon={Home}
                />
                <Input
                  label="Geographic Coordinates *"
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  placeholder="e.g. KIGALI, NYARUGENGE"
                  icon={MapPin}
                />
              </div>

              <div className="space-y-3 group/input">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1 group-focus-within/input:text-teal-500 transition-colors">Strategic Description</label>
                <div className="relative">
                  <div className="absolute left-6 top-6 text-gray-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none">
                    <Info size={20} />
                  </div>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Enter secondary metadata payload..."
                    className="w-full pl-16 pr-8 py-6 bg-gray-800/50 border-2 border-transparent text-white font-bold italic h-32 focus:border-teal-500/30 focus:bg-gray-800 rounded-[1.5rem] transition-all outline-hidden placeholder-gray-600 shadow-inner leading-relaxed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Vertical Scale (Floors) *"
                  type="number"
                  value={editData.number_of_floors}
                  onChange={(e) => setEditData({ ...editData, number_of_floors: parseInt(e.target.value) || 0 })}
                  placeholder="Structure height..."
                  icon={Layers}
                />
                <Select
                  label="Assigned Custodian *"
                  value={managers.map(m => ({ value: m.id, label: m.full_name })).find(op => op.value === editData.manager_id)}
                  options={managers.map(m => ({ value: m.id, label: m.full_name }))}
                  onChange={(selected) => setEditData({ ...editData, manager_id: selected.value })}
                  placeholder="Allocate Personnel..."
                  menuPlacement="top"
                />
              </div>

              <div className="flex items-center gap-6 p-6 bg-teal-500/5 rounded-[1.5rem] border border-teal-500/10">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Waves size={24} className="animate-pulse" />
                </div>
                <label className="flex items-center gap-4 cursor-pointer group flex-1">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={editData.has_basement}
                      onChange={(e) => setEditData({ ...editData, has_basement: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-6 h-6 border-2 border-gray-700 rounded-lg group-hover:border-teal-500/50 peer-checked:bg-teal-500 peer-checked:border-teal-500 transition-all"></div>
                    <Activity className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest italic group-hover:text-white transition-colors">Sub-Level Structural Logic (Basement)</span>
                </label>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default PropertyPage;
