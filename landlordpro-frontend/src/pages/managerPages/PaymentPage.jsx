import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Input, Select, Modal, Spinner } from '../../components';
import {
  Search,
  Eye,
  Plus,
  Upload,
  CreditCard,
  CalendarDays,
  Home,
  FileText,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  Coins,
  ArrowRight,
  TrendingUp,
  History,
  LayoutDashboard
} from 'lucide-react';
import useManagerPortfolio from '../../hooks/useManagerPortfolio';
import { getPaymentProofUrl, createPayment } from '../../services/paymentService';
import { getAllPaymentModes } from '../../services/paymentModeService';
import { showError, showSuccess, showInfo } from '../../utils/toastHelper';

const ManagerPaymentPage = () => {
  const { payments, leases, properties, propertyOptions, loading, refresh } = useManagerPortfolio();
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [proofModal, setProofModal] = useState({ open: false, url: '', name: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [paymentModes, setPaymentModes] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newPayment, setNewPayment] = useState({
    lease: null,
    paymentMode: null,
    amount: '',
    startDate: '',
    endDate: '',
    proof: null,
  });

  useEffect(() => {
    const loadPaymentModes = async () => {
      try {
        const response = await getAllPaymentModes(1, 100);
        const modes = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        setPaymentModes(
          modes.map((mode) => ({
            value: mode.id,
            label: mode.displayName || mode.code,
            requiresProof: mode.requiresProof,
          }))
        );
      } catch (error) {
        showError(error?.message || 'Failed to load payment modes');
      }
    };

    loadPaymentModes();
  }, []);

  const propertyNameMap = useMemo(
    () => new Map(properties.map((property) => [property.id, property.name || 'Unnamed Property'])),
    [properties]
  );

  const leaseMap = useMemo(
    () =>
      new Map(
        leases.map((lease) => [
          lease.id,
          {
            reference:
              lease.reference ||
              lease.referenceCode ||
              lease.local?.referenceCode ||
              lease.local?.reference_code ||
              `Lease ${lease.id}`,
            tenant: lease.tenant?.name || 'Unknown tenant',
            propertyId: lease.propertyId,
          },
        ])
      ),
    [leases]
  );

  const filteredPayments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return payments.filter((payment) => {
      const paymentPropertyId = payment.propertyId ? String(payment.propertyId) : '';
      if (selectedPropertyId && paymentPropertyId !== String(selectedPropertyId)) return false;

      if (!search) return true;

      const leaseInfo = leaseMap.get(payment.leaseId);
      const invoice = payment.invoiceNumber?.toLowerCase() || '';
      const tenantName = leaseInfo?.tenant?.toLowerCase() || '';
      const leaseRef = leaseInfo?.reference?.toLowerCase() || '';

      return invoice.includes(search) || tenantName.includes(search) || leaseRef.includes(search);
    });
  }, [payments, leaseMap, selectedPropertyId, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedPropertyId]);

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredPayments.slice(start, start + limit);
  }, [filteredPayments, page]);

  const totalPages = Math.ceil(filteredPayments.length / limit) || 1;

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const upcomingPayments = useMemo(() => {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setDate(now.getDate() + 30);
    return filteredPayments.filter((payment) => {
      const end = new Date(payment.endDate || payment.end_date || payment.created_at);
      if (Number.isNaN(end.getTime())) return false;
      return end >= now && end <= nextMonth;
    }).length;
  }, [filteredPayments]);

  const summaryCards = [
    {
      title: 'Current Liquidity',
      value: `RWF ${totalAmount.toLocaleString()}`,
      subtitle: 'Aggregated value of filtered nodes',
      icon: <Coins className="w-6 h-6 text-teal-400" />,
      color: 'teal'
    },
    {
      title: 'Active Protocols',
      value: filteredPayments.length,
      subtitle: `${payments.length} total across matrix`,
      icon: <ShieldCheck className="w-6 h-6 text-indigo-400" />,
      color: 'indigo'
    },
    {
      title: 'Critical Horizon',
      value: upcomingPayments,
      subtitle: 'Payments terminating in 30 cycles',
      icon: <History className="w-6 h-6 text-rose-400" />,
      color: 'rose'
    },
  ];

  const eligibleLeases = useMemo(
    () =>
      leases.filter((lease) => {
        if (!lease?.tenant?.id) return false;
        if (!selectedPropertyId) return true;
        return String(lease.propertyId) === String(selectedPropertyId);
      }),
    [leases, selectedPropertyId]
  );

  const leaseOptions = useMemo(
    () =>
      eligibleLeases.map((lease) => {
        const info = leaseMap.get(lease.id);
        return {
          value: lease.id,
          label: `${info?.reference || 'Lease'} • ${info?.tenant || 'Tenant'} (${propertyNameMap.get(
            lease.propertyId
          ) || '—'})`,
          propertyId: lease.propertyId,
        };
      }),
    [eligibleLeases, leaseMap, propertyNameMap]
  );

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

  const handleOpenCreateModal = () => {
    setNewPayment({ lease: null, paymentMode: null, amount: '', startDate: '', endDate: '', proof: null });
    setCreateModalOpen(true);
  };

  const handleCreatePayment = async () => {
    if (creating) return;

    if (!newPayment.lease) {
      showError('Please choose a lease');
      return;
    }

    if (!newPayment.paymentMode) {
      showError('Please choose a payment mode');
      return;
    }

    if (!newPayment.amount || Number(newPayment.amount) <= 0) {
      showError('Enter a valid amount');
      return;
    }

    if (!newPayment.startDate || !newPayment.endDate) {
      showError('Select the covered period');
      return;
    }

    if (new Date(newPayment.startDate) > new Date(newPayment.endDate)) {
      showError('Start date cannot be after end date');
      return;
    }

    const months = getMonthsBetween(newPayment.startDate, newPayment.endDate);
    if (months <= 0) {
      showError('Selected period must cover at least one month');
      return;
    }

    const requiresProof = newPayment.paymentMode?.requiresProof;
    if (requiresProof && !newPayment.proof) {
      showError('This payment mode requires an attachment');
      return;
    }

    try {
      setCreating(true);
      const monthlyAmount = Number(newPayment.amount);
      const totalAmount = monthlyAmount * months;
      await createPayment({
        leaseId: newPayment.lease.value,
        paymentModeId: newPayment.paymentMode.value,
        amount: totalAmount,
        startDate: newPayment.startDate,
        endDate: newPayment.endDate,
        proof: newPayment.proof || undefined,
        propertyId: newPayment.lease.propertyId,
      });
      showSuccess('Payment recorded successfully');
      setCreateModalOpen(false);
      setNewPayment({ lease: null, paymentMode: null, amount: '', startDate: '', endDate: '', proof: null });
      await refresh();
    } catch (error) {
      showError(error?.message || 'Failed to create payment');
    } finally {
      setCreating(false);
    }
  };

  const showProofModal = (payment) => {
    if (!payment?.proofUrl && !payment?.proofFilename) return;

    const url = payment.proofUrl?.startsWith('http')
      ? payment.proofUrl
      : payment.proofUrl?.startsWith('/uploads')
        ? `${import.meta.env.VITE_API_BASE_URL}${payment.proofUrl}`
        : payment.proofFilename
          ? getPaymentProofUrl(payment.id, payment.proofFilename)
          : '';

    if (!url) return;

    setProofModal({
      open: true,
      url,
      name: payment.proofFilename || payment.proofUrl?.split('/').pop() || 'proof',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 border-l border-gray-800/50">
        <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-500 font-extrabold uppercase tracking-widest italic text-xs">Synchronizing Payment Nexus...</p>
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
                <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                  <CreditCard size={12} /> Financial Operations
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Payment <span className="text-teal-500">Nexus</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Managing contractual revenue streams and transactional matrix
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleOpenCreateModal}
                disabled={!leases.length}
                className="flex items-center gap-3 bg-teal-600 hover:bg-teal-500 text-white shadow-2xl px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} /> Initiate Protocol
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {summaryCards.map((card) => (
              <Card
                key={card.title}
                className="p-8 bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-500 group relative overflow-hidden rounded-[2rem]"
                hover={true}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-teal-900/40 transition-colors duration-700 opacity-50" />
                <div className="relative z-10 space-y-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mb-1">{card.title}</h3>
                    <div className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{card.value}</div>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">{card.subtitle}</p>
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
          <div className="flex flex-col md:flex-row gap-4 max-w-4xl">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
              </div>
              <input
                type="text"
                className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                placeholder="Scan payment identifier, node, or occupant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative min-w-[300px]">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Shield size={18} className="text-gray-500" />
              </div>
              <select
                className="w-full pl-16 pr-10 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-black uppercase text-[11px] tracking-widest italic outline-hidden transition-all shadow-inner appearance-none cursor-pointer focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
              >
                <option value="" className="bg-gray-900">All Asset Matrices</option>
                {propertyOptions.map(p => (
                  <option key={p.value} value={p.value} className="bg-gray-900">{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
          {/* Mobile Feed */}
          <div className="md:hidden divide-y divide-gray-700/30 px-4">
            {filteredPayments.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Settlement Recorded.</div>
            ) : (
              paginatedPayments.map((payment) => {
                const leaseInfo = leaseMap.get(payment.leaseId);
                const propertyName = payment.propertyId ? propertyNameMap.get(payment.propertyId) : '—';
                const totalAmount = Number(payment.amount) || 0;

                return (
                  <div key={payment.id} className="py-6 space-y-4 group/row">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover/row:scale-110 transition-transform shadow-lg">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h3 className="font-black text-white italic uppercase tracking-tighter text-base">{payment.invoiceNumber || 'TXN-GENERIC'}</h3>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-1">{leaseInfo?.tenant || 'Unknown Occupant'}</p>
                        </div>
                      </div>
                      {payment.proofUrl || payment.proofFilename ? (
                        <button
                          className="px-3 py-1.5 bg-gray-900 border border-teal-500/20 text-[9px] font-black uppercase italic tracking-widest text-teal-400 rounded-xl"
                          onClick={() => showProofModal(payment)}
                        >
                          SCAN
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-gray-500/10 border border-gray-500/20 text-gray-500 text-[9px] font-black uppercase italic tracking-widest">VOID</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase italic tracking-widest">
                      <div>
                        <p className="text-gray-600 mb-1 font-black">Settlement Value</p>
                        <p className="text-white text-lg tracking-tighter font-black italic">RWF {totalAmount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600 mb-1 font-black">Asset Origin</p>
                        <p className="text-indigo-400 font-black italic">{propertyName}</p>
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
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Invoice / Node</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Asset Origin</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Settlement Value</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Temporal Cycle</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <div className="flex justify-center mb-6">
                        <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                          <Wallet className="w-12 h-12 text-gray-600" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Settlement Match</h3>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">No transaction nodes found in the current sector.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => {
                    const leaseInfo = leaseMap.get(payment.leaseId);
                    const propertyName = payment.propertyId ? propertyNameMap.get(payment.propertyId) : '—';
                    const periodStart = payment.startDate || payment.start_date;
                    const periodEnd = payment.endDate || payment.end_date;
                    const months = getMonthsBetween(periodStart, periodEnd);
                    const totalAmount = Number(payment.amount) || 0;
                    const monthlyAmount = months > 0 ? totalAmount / months : totalAmount;

                    return (
                      <tr key={payment.id} className="group transition-all hover:bg-gray-700/20">
                        <td className="px-6 py-6 min-w-[250px]">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700/50 text-indigo-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 font-black italic">
                              <FileText size={18} />
                            </div>
                            <div>
                              <div className="font-black text-white italic uppercase text-base tracking-tight group-hover:text-teal-400 transition-colors">{payment.invoiceNumber || 'TXN-GENERIC'}</div>
                              <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1 flex items-center gap-1">
                                <Shield size={10} /> {leaseInfo?.tenant || 'Unknown Occupant'} // <span className="text-indigo-500/50">{leaseInfo?.reference || 'Node'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase italic tracking-widest">
                            <Home className="w-3.5 h-3.5 text-gray-600" />
                            {propertyName}
                          </div>
                        </td>
                        <td className="px-6 py-6 font-mono text-sm">
                          <div className="font-black text-white italic text-base tracking-tight">RWF {totalAmount.toLocaleString()}</div>
                          {months > 0 && monthlyAmount > 0 && (
                            <div className="text-[9px] font-black text-teal-500 uppercase italic tracking-widest mt-1">
                              {months} CYC × {Math.round(monthlyAmount).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-6 font-mono text-[10px] text-gray-400">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-indigo-400 uppercase italic font-black tracking-widest">
                              <CalendarDays size={12} className="text-gray-600" /> {periodStart ? new Date(periodStart).toLocaleDateString() : '—'}
                            </div>
                            <div className="pl-5 text-gray-600 uppercase italic font-black tracking-widest">
                              PROX: {periodEnd ? new Date(periodEnd).toLocaleDateString() : '—'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          {payment.proofUrl || payment.proofFilename ? (
                            <button
                              className="px-6 py-2.5 bg-gray-900 border border-gray-700 text-[10px] font-black uppercase italic tracking-widest text-teal-400 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all shadow-xl rounded-xl"
                              onClick={() => showProofModal(payment)}
                            >
                              Scan Matrix
                            </button>
                          ) : (
                            <span className="px-4 py-1.5 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-500 text-[9px] font-black uppercase italic tracking-widest">
                              Void Proof
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredPayments.length > 0 && (
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

        {proofModal.open && (
          <Modal
            title={`SETTLEMENT PROOF: ${proofModal.name}`}
            onClose={() => setProofModal({ open: false, url: '', name: '' })}
            hideSubmit
          >
            <div className="text-center p-8 space-y-6">
              <div className="relative group inline-block">
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <img
                  src={proofModal.url}
                  alt="Payment proof"
                  className="relative max-h-[60vh] mx-auto rounded-xl shadow-2xl border border-gray-800"
                />
              </div>

              <div className="pt-4 border-t border-gray-800/50">
                <a
                  href={proofModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-3 bg-gray-950 border border-gray-800 rounded-xl text-[10px] font-black uppercase italic tracking-widest text-teal-400 hover:text-white hover:border-teal-500 transition-all shadow-2xl"
                >
                  Inspect Original Protocol <ArrowRight size={12} />
                </a>
              </div>
            </div>
          </Modal>
        )}

        {createModalOpen && (
          <Modal
            title="INITIALIZE SETTLEMENT PROTOCOL"
            onClose={() => setCreateModalOpen(false)}
            onSubmit={handleCreatePayment}
            submitDisabled={creating}
            submitText={creating ? 'Injecting Data...' : 'Finalize Settlement'}
          >
            <div className="space-y-6">
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6 flex gap-4">
                <ShieldCheck className="w-6 h-6 text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-teal-300 mb-1 uppercase tracking-widest italic">Compliance Verification</p>
                  <p className="text-[11px] font-black text-teal-400/80 uppercase italic leading-relaxed">Ensure all nodal data points correlate with the physical settlement receipt.</p>
                </div>
              </div>

              <Select
                label="Identify Contract Node"
                placeholder="Scan Hierarchy..."
                value={newPayment.lease}
                options={leaseOptions}
                onChange={(option) => setNewPayment((prev) => ({ ...prev, lease: option }))}
                isDisabled={!leaseOptions.length}
                required
                isSearchable
                className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
              />

              <Select
                label="Settlement Medium"
                placeholder="Select Terminal..."
                value={newPayment.paymentMode}
                options={paymentModes}
                onChange={(option) => setNewPayment((prev) => ({ ...prev, paymentMode: option }))}
                isDisabled={!paymentModes.length}
                required
                className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Standard Yield (RWF)"
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase italic tracking-widest block mb-1.5 ml-1">Evidence Capture</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setNewPayment((prev) => ({ ...prev, proof: e.target.files?.[0] || null }))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      id="file-upload"
                    />
                    <div className="w-full px-5 py-3.5 border-2 border-dashed border-gray-700 hover:border-teal-500/50 rounded-2xl bg-gray-900/50 flex items-center gap-3 text-xs font-black text-gray-500 italic uppercase transition-all overflow-hidden">
                      <Upload className="w-4 h-4 text-teal-500" />
                      <span className="truncate">{newPayment.proof ? newPayment.proof.name : 'Upload Matrix Proof...'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Temporal Genesis"
                  type="date"
                  value={newPayment.startDate}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                  className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
                />
                <Input
                  label="Temporal Prox"
                  type="date"
                  value={newPayment.endDate}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                  className="bg-gray-900 border-gray-700 text-white font-black uppercase italic text-xs"
                />
              </div>

              {newPayment.amount && newPayment.startDate && newPayment.endDate && (
                (() => {
                  const months = getMonthsBetween(newPayment.startDate, newPayment.endDate);
                  const monthlyAmount = Number(newPayment.amount) || 0;
                  const total = months > 0 ? monthlyAmount * months : 0;
                  if (months <= 0 || !monthlyAmount) return null;
                  return (
                    <div className="p-6 bg-gray-950 border border-gray-800 rounded-[1.5rem] flex justify-between items-center shadow-2xl overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-teal-500/20 transition-colors" />
                      <div className="relative z-10">
                        <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest italic mb-1">Total Settlement Aggregate</span>
                        <span className="text-[11px] font-black text-teal-400 uppercase italic">Covering {months} cycles in matrix</span>
                      </div>
                      <div className="text-right relative z-10">
                        <span className="block text-[22px] font-black text-white italic tracking-tighter">RWF {total.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default ManagerPaymentPage;
