import React, { useEffect, useState, useMemo } from 'react';
import {
  getAllPayments,
  createPayment,
  updatePayment,
  softDeletePayment,
  restorePayment,
  getPaymentProofUrl,
} from '../../services/paymentService';
import { getAllPaymentModes } from '../../services/paymentModeService';
import leaseService from '../../services/leaseService';
import { Button, Modal, Input, Card, Select } from '../../components';
import {
  Trash2,
  Search,
  Plus,
  RefreshCcw,
  Edit2,
  Calendar,
  CreditCard,
  FileText,
  Activity,
  CheckCircle,
  Image as ImageIcon,
  DollarSign,
  Briefcase,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  Download,
  Wallet
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';

const PaymentPage = () => {
  const [payments, setPayments] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [leases, setLeases] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofPreview, setProofPreview] = useState(null);
  const [editData, setEditData] = useState({
    amount: '',
    leaseId: '',
    paymentModeId: '',
    startDate: '',
    endDate: '',
    proof: null,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  // ✅ Helper to get full proof URL
  const getFullProofUrl = (payment) => {
    if (!payment.proofUrl) return null;
    if (payment.proofUrl.startsWith('http')) return payment.proofUrl;
    if (payment.proofUrl.startsWith('/uploads')) return `${import.meta.env.VITE_API_BASE_URL}${payment.proofUrl}`;
    if (payment.proofFilename) return getPaymentProofUrl(payment.id, payment.proofFilename);
    return `${import.meta.env.VITE_API_BASE_URL}${payment.proofUrl}`;
  };

  const fetchPayments = async (pageNumber = 1, term = '') => {
    try {
      setLoading(true);
      const res = await getAllPayments(term);
      const paymentsArray = Array.isArray(res) ? res : res?.data || [];
      setPayments(paymentsArray);
      setTotalPages(Math.ceil(paymentsArray.length / PAGE_SIZE) || 1);
      setPage(pageNumber);
    } catch (err) {
      showError(err?.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [leasesRes, modesRes] = await Promise.all([
        leaseService.getLeases(),
        getAllPaymentModes()
      ]);
      setLeases(Array.isArray(leasesRes?.data) ? leasesRes.data : leasesRes || []);
      setPaymentModes(Array.isArray(modesRes?.data) ? modesRes.data : modesRes || []);
    } catch (err) {
      showError(err?.message || 'Failed to fetch options');
    }
  };

  useEffect(() => {
    fetchPayments(page, searchTerm);
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchPayments(page, searchTerm);
  }, [page, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const getMonthsBetween = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    const totalMonths = years * 12 + months + 1;
    return totalMonths <= 0 ? 0 : totalMonths;
  };

  const handleSubmit = async () => {
    const { amount, leaseId, paymentModeId, startDate, endDate, proof } = editData;
    if (!amount || !leaseId || !paymentModeId || !startDate || !endDate) {
      return showError('Missing essential architecture parameters.');
    }
    if (new Date(endDate) < new Date(startDate)) {
      return showError('Temporal conflict: End date precedes start date.');
    }
    const months = getMonthsBetween(startDate, endDate);
    if (months <= 0) {
      return showError('Selected period must encompass at least one month.');
    }

    try {
      const monthlyAmount = Number(amount);
      const totalAmount = monthlyAmount * months;
      const payload = { amount: totalAmount, leaseId, paymentModeId, startDate, endDate, proof: proof || undefined };

      if (selectedPayment) {
        await updatePayment(selectedPayment.id, payload);
        showSuccess('Payment signature updated.');
      } else {
        await createPayment(payload);
        showSuccess('New payment signal recorded.');
      }

      fetchPayments(page, searchTerm);
      setModalOpen(false);
      setSelectedPayment(null);
      setEditData({ amount: '', leaseId: '', paymentModeId: '', startDate: '', endDate: '', proof: null });
      setProofPreview(null);
    } catch (err) {
      showError(err?.message || 'Failed to sync payment signal.');
    }
  };

  const handleEditClick = (payment) => {
    setSelectedPayment(payment);
    setEditData({
      amount: (payment.amount || 0).toString(),
      leaseId: payment.leaseId || '',
      paymentModeId: payment.paymentModeId || '',
      startDate: payment.startDate?.split('T')[0] || '',
      endDate: payment.endDate?.split('T')[0] || '',
      proof: null,
    });
    const fullProofUrl = getFullProofUrl(payment);
    if (fullProofUrl) setProofPreview(fullProofUrl);
    setModalOpen(true);
  };

  const handleDelete = async (payment) => {
    if (!window.confirm('Neutralize payment signal?')) return;
    try {
      await softDeletePayment(payment.id);
      showInfo('Signal neutralized.');
      fetchPayments(page, searchTerm);
    } catch (err) {
      showError(err?.message || 'Failed to neutralize signal.');
    }
  };

  const handleRestore = async (payment) => {
    try {
      await restorePayment(payment.id);
      showSuccess('Signal restored to matrix.');
      fetchPayments(page, searchTerm);
    } catch (err) {
      showError(err?.message || 'Failed to restore signal.');
    }
  };

  const handleViewProof = (url) => {
    setProofUrl(url);
    setProofModalOpen(true);
  };

  const handleProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return showError('File exceeds 5MB architecture limit.');
      if (!file.type.startsWith('image/')) return showError('Binary conflict: Image expected.');
      setEditData({ ...editData, proof: file });
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const filteredPayments = useMemo(() =>
    payments.filter((p) => {
      const lease = leases.find((l) => l.id === p.leaseId);
      const leaseName = lease?.reference || lease?.local?.reference_code || '';
      return (
        p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leaseName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }),
    [payments, searchTerm, leases]
  );

  const paginatedPayments = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredPayments.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPayments, page]);

  const leasesOptions = leases.map((l) => ({ value: l.id, label: l.reference || `Protocol ${l.id}` }));
  const paymentModesOptions = paymentModes.map((pm) => ({ value: pm.id, label: pm.displayName }));

  const formatDateRange = (start, end) => {
    if (!start || !end) return 'N/A';
    const startDate = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const endDate = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startDate} » ${endDate}`;
  };

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <DollarSign size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Revenue Intelligence
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Payments <span className="text-teal-500">Gateway</span>
                </h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4">
                  Fiscal Synchronicity Management // Revenue Stream Monitoring
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <Button onClick={() => setModalOpen(true)} className="px-8">
                <div className="flex items-center gap-3">
                  <Plus size={18} />
                  <span>Inject Signal</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Total Inbound', value: payments.length, icon: CreditCard, color: 'teal' },
              { label: 'Signal Velocity', value: 'Nominal', icon: TrendingUp, color: 'indigo' },
              { label: 'Validated Stream', value: payments.filter(p => !p.deleted_at).length, icon: CheckCircle, color: 'violet' },
              { label: 'Wallet Sync', value: 'Online', icon: Wallet, color: 'emerald' }
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
              placeholder="Isolate financial signal by invoice number or protocol ref..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
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
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Synchronizing Revenue Stream...</p>
              </div>
            ) : paginatedPayments.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Signal Captured in this Sector.</div>
            ) : (
              paginatedPayments.map((p) => {
                const lease = leases.find((l) => l.id === p.leaseId);
                const leaseName = lease?.reference || `Protocol ${p.leaseId}`;
                const modeName = paymentModes.find((m) => m.id === p.paymentModeId)?.displayName || 'N/A';
                const totalAmount = Number(p.amount) || 0;

                return (
                  <div key={p.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${p.deleted_at ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'} flex items-center justify-center border group-hover/row:scale-110 transition-transform shadow-lg`}>
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{p.invoiceNumber}</h3>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic flex items-center gap-2 mt-1">
                            <Briefcase size={10} className="text-teal-500" /> {leaseName}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-indigo-500/10 rounded-lg text-[9px] font-black text-indigo-400 uppercase tracking-widest italic border border-indigo-500/20">
                        {modeName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-gray-500 uppercase italic">Signal Magnitude</p>
                        <p className="text-lg font-black text-white italic">{totalAmount.toLocaleString()} <span className="text-[10px] text-gray-400">RWF</span></p>
                      </div>
                      <div className="flex gap-2">
                        {!p.deleted_at ? (
                          <>
                            <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(p)}>
                              <Edit2 size={14} />
                            </Button>
                            <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(p)}>
                              <Trash2 size={14} />
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" className="p-2 rounded-xl border-gray-700 text-gray-400 hover:text-emerald-400" onClick={() => handleRestore(p)}>
                            <RefreshCcw size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-10 py-6">Invoice Signal</th>
                  <th className="px-10 py-6">Valuation Matrix</th>
                  <th className="px-10 py-6">Protocol Reference</th>
                  <th className="px-10 py-6">Transfer Mode</th>
                  <th className="px-10 py-6 text-center">Temporal Horizon</th>
                  <th className="px-10 py-6 text-center">Protocol Buffer</th>
                  <th className="px-10 py-6 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Activity size={48} className="text-teal-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Revenue Stream Matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No financial signals captured in current perimeter.</td>
                  </tr>
                ) : (
                  paginatedPayments.map((p) => {
                    const lease = leases.find((l) => l.id === p.leaseId);
                    const leaseName = lease?.reference || `Protocol ${p.leaseId}`;
                    const modeName = paymentModes.find((m) => m.id === p.paymentModeId)?.displayName || 'N/A';
                    const fullProofUrl = getFullProofUrl(p);
                    const totalAmount = Number(p.amount) || 0;

                    return (
                      <tr key={p.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                        <td className="px-10 py-8">
                          <span className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 italic text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-teal-400 transition-colors">
                            {p.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex flex-col">
                            <span className="text-xl font-black text-teal-400 italic tracking-tighter leading-none">{totalAmount.toLocaleString()} <small className="text-[10px] text-gray-400">RWF</small></span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3">
                            <Briefcase size={16} className="text-teal-500/50" />
                            <span className="font-black text-sm text-gray-300 uppercase italic tracking-tight">{leaseName}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase italic tracking-widest w-fit">
                            {modeName}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase italic">
                            <Calendar size={14} className="text-teal-500" /> {formatDateRange(p.startDate, p.endDate)}
                          </div>
                        </td>
                        <td className="px-10 py-8 text-center">
                          {fullProofUrl ? (
                            <img
                              src={fullProofUrl}
                              alt="proof"
                              className="h-12 w-12 object-cover rounded-xl shadow-xl cursor-pointer border border-gray-700 hover:scale-125 transition-transform"
                              onClick={() => handleViewProof(fullProofUrl)}
                            />
                          ) : (
                            <span className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest">No Buffer</span>
                          )}
                        </td>
                        <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                          <div className="flex items-center justify-end gap-3">
                            {!p.deleted_at ? (
                              <>
                                <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => handleEditClick(p)}>
                                  <Edit2 size={16} />
                                </Button>
                                <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(p)}>
                                  <Trash2 size={16} />
                                </Button>
                              </>
                            ) : (
                              <Button variant="outline" className="px-6 py-2.5 rounded-xl border-gray-700 text-[10px] text-emerald-400 hover:bg-emerald-500 hover:text-white" onClick={() => handleRestore(p)}>
                                <RefreshCcw size={14} className="mr-2" /> Restore
                              </Button>
                            )}
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

        {modalOpen && (
          <Modal
            title={selectedPayment ? `Override Signal: ${selectedPayment.invoiceNumber}` : 'Initialize Revenue Signal injection'}
            onClose={() => { setModalOpen(false); setProofPreview(null); setSelectedPayment(null); }}
            onSubmit={handleSubmit}
            className="max-w-4xl"
          >
            <div className="space-y-10 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Monthly Impact Valuation (RWF) *"
                  type="number"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                  placeholder="Rate per temporal cycle"
                  icon={DollarSign}
                />
                <Select
                  label="Target Protocol (Lease) *"
                  value={editData.leaseId ? leasesOptions.find(o => o.value === editData.leaseId) : null}
                  options={leasesOptions}
                  onChange={(s) => setEditData({ ...editData, leaseId: s?.value || '' })}
                  placeholder="Select Protocol Ref..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Select
                  label="Gateway Mode *"
                  value={editData.paymentModeId ? paymentModesOptions.find(o => o.value === editData.paymentModeId) : null}
                  options={paymentModesOptions}
                  onChange={(s) => setEditData({ ...editData, paymentModeId: s?.value || '' })}
                  placeholder="Select Transfer Mode..."
                />
                <Input
                  label="Temporal Start Date *"
                  type="date"
                  value={editData.startDate}
                  onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                  icon={Calendar}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Temporal End Date *"
                  type="date"
                  value={editData.endDate}
                  onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                  icon={Calendar}
                />
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Signal Proof (Image Buffer)</label>
                  <div className="relative border-2 border-dashed border-gray-700/50 rounded-[1.5rem] p-4 group hover:border-teal-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex items-center gap-4 text-gray-500 italic">
                      <ImageIcon size={20} className="text-teal-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Aggregate Binary Data</span>
                    </div>
                  </div>
                </div>
              </div>

              {editData.amount && editData.startDate && editData.endDate && (
                (() => {
                  const months = getMonthsBetween(editData.startDate, editData.endDate);
                  const total = (Number(editData.amount) || 0) * months;
                  if (months <= 0) return null;
                  return (
                    <div className="p-8 bg-teal-500/5 rounded-[2.5rem] border border-teal-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <TrendingUp className="text-teal-500 animate-pulse" size={32} />
                        <div>
                          <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest italic">Calculated Throughput</p>
                          <p className="text-sm font-bold text-gray-400 italic mt-1 italic leading-relaxed">System projects <span className="font-black text-white uppercase">{months} temporal cycles</span> in this period.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-teal-400 italic tracking-tighter">{total.toLocaleString()} <span className="text-[10px]">RWF</span></p>
                        <p className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest">Total Valuation</p>
                      </div>
                    </div>
                  );
                })()
              )}

              {proofPreview && (
                <div className="relative group mt-4">
                  <img
                    src={proofPreview}
                    alt="preview"
                    className="w-full h-64 object-cover rounded-[1.5rem] shadow-2xl border border-gray-700"
                  />
                  <div className="absolute inset-0 bg-gray-900/40 rounded-[1.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-black text-white uppercase tracking-widest italic">Buffer Preview Active</span>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {proofModalOpen && (
          <Modal
            title="Revenue Signal Validation Buffer"
            onClose={() => setProofModalOpen(false)}
            hideSubmit
            className="max-w-4xl"
          >
            <div className="p-4 text-center">
              <img
                src={proofUrl}
                alt="Validation Proof"
                className="max-h-[600px] w-full object-contain mx-auto rounded-[1.5rem] shadow-2xl border border-gray-700"
              />
              <div className="mt-8">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic leading-none">Matrix Validation Image</span>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;