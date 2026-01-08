import React, { useEffect, useState, useMemo } from 'react';
import useCurrentUser from '../../hooks/useCurrentUser';
import {
  getAllProperties,
  createProperty,
  deleteProperty
} from '../../services/propertyService';
import { Button, Modal, Input, Card } from '../../components';
import { Plus, Trash2, Search, Layers, MapPin, Building2, ShieldAlert, ArrowRight } from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';
import { useNavigate } from 'react-router-dom';

const PropertyPage = () => {
  const [properties, setProperties] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', location: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Get current user and role flags from shared hook
  const { currentUser, isAdmin, isManager } = useCurrentUser();

  const navigate = useNavigate();

  const fetchProperties = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const data = await getAllProperties(pageNumber, 10);

      const { properties = [], totalPages = 1, page = 1 } = data;

      if (properties.length === 0 && pageNumber > 1) {
        return fetchProperties(pageNumber - 1);
      }

      setProperties(properties);
      setTotalPages(totalPages);
      setPage(page);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
      setProperties([]);
      setTotalPages(1);
      setPage(1);
      showError(err?.message || 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(page);
  }, [page]);

  const handleSubmit = async () => {
    const { name, location, description } = editData;

    if (!name?.trim() || !location?.trim()) {
      showError('Name and location are required.');
      return;
    }

    try {
      await createProperty({ name, location, description });
      showSuccess('Property added successfully!');
      setPage(1);
      fetchProperties(1);
      setModalOpen(false);
      setEditData({ name: '', location: '', description: '' });
    } catch (err) {
      showError(err?.message || 'Failed to add property');
    }
  };

  const handleDelete = async (property) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;

    try {
      await deleteProperty(property.id);
      showInfo('Property deleted successfully.');
      fetchProperties(page);
    } catch (err) {
      showError(err?.message || 'Failed to delete property');
    }
  };

  const filteredProperties = useMemo(() => {
    if (!Array.isArray(properties)) return [];
    return properties.filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [properties, searchTerm]);

  // Permissions
  const canAdd = isAdmin || isManager;
  const canEdit = isAdmin;  // Only admin can edit
  const canDelete = isAdmin; // Only admin can delete

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
                  <Building2 size={12} /> Asset Registry
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Core <span className="text-teal-500">Assets</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  {isAdmin ? 'High-level portfolio management' : 'Assigned property manifestation'}
                </p>
              </div>
            </div>

            {canAdd && (
              <Button
                className="flex items-center gap-3 bg-teal-600 hover:bg-teal-500 text-white shadow-2xl px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all active:scale-95 transition-transform"
                onClick={() => {
                  setEditData({ name: '', location: '', description: '' });
                  setModalOpen(true);
                }}
              >
                <Plus size={18} /> Add New Asset
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-500 font-black uppercase tracking-widest italic text-[10px]">Synchronizing Nodes...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card className="p-20 text-center bg-gray-800/40 backdrop-blur-sm border-gray-700/50 border-dashed rounded-[2rem]" hover={false}>
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                <ShieldAlert className="w-12 h-12 text-gray-600" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Assets Detected</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic mb-8">No property data found within current search parameters.</p>
            {searchTerm && (
              <Button
                onClick={() => setSearchTerm('')}
                className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest italic"
              >
                Reset Search Filters
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* Search */}
            <div className="py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-gray-800/50">
              <div className="relative max-w-2xl group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                  placeholder="Scan identifier, location, or metadata..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Properties Matrix */}
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
              {/* Mobile Feed */}
              <div className="md:hidden divide-y divide-gray-700/30 px-4">
                {filteredProperties.map((property) => (
                  <div key={property.id} className="py-6 space-y-4 group/row">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-black text-white italic uppercase tracking-tighter text-base group-hover/row:text-teal-400 transition-colors">{property.name}</h3>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-1 flex items-center gap-1">
                            <MapPin size={10} /> {property.location}
                          </p>
                        </div>
                      </div>
                      {canDelete && (
                        <button
                          className="p-3 bg-gray-900 border border-gray-700 text-rose-500 rounded-xl"
                          onClick={() => handleDelete(property)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        className="w-full bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest italic flex items-center justify-center gap-2"
                        onClick={() => navigate(`/manager/properties/${property.id}/floors`)}
                      >
                        <Layers size={14} />
                        <span>DIVE DEEPER</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-900/60 border-b border-gray-700/50">
                    <tr>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Asset Identification</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Geographic Link</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Metadata</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Matrix Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {filteredProperties.map((property) => (
                      <tr key={property.id} className="group transition-all hover:bg-gray-700/20">
                        <td className="px-6 py-6 min-w-[280px]">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-700/50 text-teal-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                              <Building2 size={24} />
                            </div>
                            <div>
                              <div className="font-black text-white italic uppercase text-sm tracking-tight group-hover:text-teal-400 transition-colors">{property.name}</div>
                              <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1">UID: {property.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 min-w-[200px]">
                          <div className="flex items-center gap-3 text-gray-400 font-black italic uppercase text-[10px] tracking-widest bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-800/50 inline-flex">
                            <MapPin size={12} className="text-teal-600" />
                            {property.location}
                          </div>
                        </td>
                        <td className="px-6 py-6 min-w-[250px]">
                          <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-wider max-w-[220px] truncate leading-relaxed">
                            {property.description || <span className="opacity-30 italic">NULL_METADATA</span>}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex justify-center gap-4">
                            <Button
                              className="bg-gray-900 border border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all shadow-xl flex items-center gap-3"
                              onClick={() => navigate(`/manager/properties/${property.id}/floors`)}
                            >
                              <Layers size={14} />
                              <span>Dive Deeper</span>
                            </Button>

                            {canDelete && (
                              <button
                                className="p-3 bg-gray-900 border border-gray-700 text-gray-600 hover:text-rose-500 hover:border-rose-500/50 rounded-xl transition-all shadow-xl opacity-0 group-hover:opacity-100"
                                onClick={() => handleDelete(property)}
                                title="Purge Asset"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
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
          </>
        )}
      </div>

      {/* Modal: Add Only (Admin or Manager) */}
      {modalOpen && canAdd && (
        <Modal
          title="Initialize Asset"
          onClose={() => {
            setModalOpen(false);
            setEditData({ name: '', location: '', description: '' });
          }}
          onSubmit={handleSubmit}
        >
          <div className="space-y-6">
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6 flex gap-4">
              <Building2 className="w-6 h-6 text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-black text-teal-300 mb-1 uppercase tracking-widest italic">Node Deployment</p>
                <p className="text-[11px] font-black text-teal-400/80 uppercase italic leading-relaxed">System requires valid geographic and identification markers for registry inclusion.</p>
              </div>
            </div>

            <Input
              label="Manifest Name"
              placeholder="e.g. Kigali Heights"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 font-black italic uppercase text-xs"
            />
            <Input
              label="Geographic Link"
              placeholder="e.g. Nyarutarama, Kigali"
              value={editData.location}
              onChange={(e) => setEditData({ ...editData, location: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 font-black italic uppercase text-xs"
            />
            <Input
              label="Metadata Description"
              placeholder="Asset specification and parameters..."
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 font-black italic uppercase text-xs"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PropertyPage;