import React, { useEffect, useState, useMemo } from 'react';
import {
  getAllPaymentModes,
  createPaymentMode,
  updatePaymentMode,
  deletePaymentMode,
  restorePaymentMode
} from '../../services/paymentModeService';
import { Button, Modal, Input, Card, Select } from '../../components';
import {
  Edit3,
  Plus,
  Trash2,
  Search,
  RefreshCcw,
  CreditCard,
  Activity,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileText,
  Building,
  Zap
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';

const PAGE_LIMIT = 10;

const requiresProofOptions = [
  { value: 'true', label: 'Mandatory' },
  { value: 'false', label: 'Optional' },
];

const PaymentModePage = () => {
  const [paymentModes, setPaymentModes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [editData, setEditData] = useState({
    code: '',
    displayName: '',
    requiresProof: 'false',
    description: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const normalizeRequiresProof = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return ['true', 'yes', '1'].includes(value.toLowerCase());
    return false;
  };

  const fetchPaymentModes = async (pageNumber = 1, search = '') => {
    try {
      setLoading(true);
      const res = await getAllPaymentModes(pageNumber, PAGE_LIMIT, search);
      const modesArray = Array.isArray(res) ? res : Array.isArray(res.paymentModes) ? res.paymentModes : [];
      const modes = modesArray.map(m => ({ ...m, requiresProof: normalizeRequiresProof(m.requiresProof) }));
      setPaymentModes(modes);
      setTotalPages(res.totalPages || Math.ceil(modes.length / PAGE_LIMIT));
      setPage(res.page || pageNumber);
    } catch (err) {
      showError(err?.message || 'Failed to sync payment protocols.');
    } finally {
      setLoading(false);
    }
  };

  const refreshList = () => fetchPaymentModes(page, searchTerm);

  useEffect(() => {
    fetchPaymentModes(page, searchTerm);
  }, [page, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleEditClick = (mode) => {
    setEditData({
      code: mode.code,
      displayName: mode.displayName,
      requiresProof: mode.requiresProof ? 'true' : 'false',
      description: mode.description || ''
    });
    setSelectedMode(mode);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const { code, displayName, requiresProof, description } = editData;
    if (!code?.trim() || !displayName?.trim()) return showError('Signature code and display label required.');
    const payload = { code: code.trim(), displayName: displayName.trim(), requiresProof: requiresProof === 'true', description: description?.trim() || '' };
    try {
      if (selectedMode) {
        await updatePaymentMode(selectedMode.id, payload);
        showSuccess('Protocol updated.');
      } else {
        await createPaymentMode(payload);
        showSuccess('New protocol initialized.');
        setPage(1);
      }
      setModalOpen(false);
      refreshList();
    } catch (err) {
      showError(err?.message || 'Failed to sync protocol.');
    }
  };

  const handleDelete = async (mode) => {
    if (!window.confirm('Neutralize this payment protocol?')) return;
    try {
      await deletePaymentMode(mode.id);
      showInfo('Protocol neutralized.');
      refreshList();
    } catch (err) {
      showError(err?.message || 'Failed to neutralize protocol.');
    }
  };

  const handleRestore = async (mode) => {
    try {
      await restorePaymentMode(mode.id);
      showSuccess('Protocol restored to matrix.');
      refreshList();
    } catch (err) {
      showError(err?.message || 'Failed to restore protocol.');
    }
  };

  const filteredModes = useMemo(() =>
    paymentModes.filter(pm =>
      pm.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pm.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [paymentModes, searchTerm]
  );

  if (loading && page === 1 && !searchTerm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <Zap size={48} className="text-teal-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Syncing Pathway registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Hero Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <CreditCard size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Gateway Configuration Terminal
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Payment <span className="text-teal-500">Protocols</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  <Settings size={14} className="text-teal-400" /> Defining inbound revenue pathways
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                setSelectedMode(null);
                setEditData({ code: '', displayName: '', requiresProof: 'false', description: '' });
                setModalOpen(true);
              }}
              className="px-10"
            >
              <Plus size={18} className="mr-2" /> <span>Inject Pathway</span>
            </Button>
          </div>
        </Card>

        {/* Search */}
        <div className="relative group animate-fade-in">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Query protocol registry for specific signature or display label..."
            className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Content Table */}
        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {/* Mobile Feed */}
          <div className="md:hidden divide-y divide-gray-700/30">
            {filteredModes.length === 0 ? (
              <div className="p-20 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No protocol signals detected.</div>
            ) : (
              filteredModes.map((mode) => (
                <div key={mode.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{mode.displayName}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mt-1">
                          Signature: {mode.code}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700/30 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase italic">Validation</p>
                      {mode.requiresProof ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase italic tracking-widest">
                          <ShieldCheck size={12} /> Mandatory
                        </span>
                      ) : <span className="text-[10px] font-black text-gray-600 uppercase italic">Optional</span>}
                    </div>
                    <div className="flex gap-2">
                      {mode.deleted_at ? (
                        <Button onClick={() => handleRestore(mode)} className="px-6 py-2 rounded-xl text-[10px] bg-emerald-600">
                          RESTORE
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400" onClick={() => handleEditClick(mode)}>
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400" onClick={() => handleDelete(mode)}>
                            <Trash2 size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-10 py-6">Pathway Signature</th>
                  <th className="px-10 py-6">Display Label</th>
                  <th className="px-10 py-6">Validation</th>
                  <th className="px-10 py-6">Descriptor context</th>
                  <th className="px-10 py-6 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredModes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No protocol signals detected.</td>
                  </tr>
                ) : (
                  filteredModes.map((mode) => (
                    <tr key={mode.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                      <td className="px-10 py-8">
                        <span className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                          {mode.code}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">{mode.displayName}</span>
                      </td>
                      <td className="px-10 py-8">
                        {mode.requiresProof ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase italic tracking-widest">
                            <ShieldCheck size={12} /> Mandatory
                          </span>
                        ) : <span className="text-[10px] font-black text-gray-600 uppercase italic">Optional</span>}
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-xs font-bold text-gray-500 italic uppercase truncate max-w-[200px]">{mode.description || 'Global configuration'}</p>
                      </td>
                      <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <div className="flex items-center justify-end gap-3">
                          {mode.deleted_at ? (
                            <Button onClick={() => handleRestore(mode)} className="px-6 py-2.5 rounded-xl text-[10px] bg-emerald-600 hover:bg-emerald-500">
                              RESTORE <RefreshCcw size={14} className="ml-2" />
                            </Button>
                          ) : (
                            <>
                              <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(mode)}>
                                <Edit3 size={16} />
                              </Button>
                              <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(mode)}>
                                <Trash2 size={16} />
                              </Button>
                            </>
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

        {/* Modal Module */}
        {modalOpen && (
          <Modal
            title={selectedMode ? `Override Protocol Logic: ${selectedMode.displayName}` : 'Initialize Pathway Injection'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            className="max-w-xl"
          >
            <div className="space-y-10 py-4">
              <Input
                label="Pathway Signature Code *"
                value={editData.code}
                onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                placeholder="e.g. BANK_TRANSFER"
                icon={Layers}
              />
              <Input
                label="Interface Display Label *"
                value={editData.displayName}
                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                placeholder="e.g. Bank Transfer"
                icon={CreditCard}
              />
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Validation requirement</label>
                <div className="grid grid-cols-2 gap-4">
                  {requiresProofOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setEditData({ ...editData, requiresProof: opt.value })}
                      className={`py-4 rounded-xl border text-[9px] font-black uppercase italic tracking-widest transition-all ${editData.requiresProof === opt.value
                        ? 'bg-teal-500 text-white border-teal-500 shadow-lg scale-105'
                        : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-teal-500/50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="Descriptor Context"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Add protocol details..."
                icon={FileText}
              />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default PaymentModePage;