import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  restoreExpense,
  approveExpense,
  bulkUpdatePaymentStatus,
  getExpenseSummary,
  downloadProof,
  calculateVAT
} from '../../services/expenseService';
import { getAllProperties } from '../../services/propertyService';
import { getAllLocals } from '../../services/localService';
import { Button, Modal, Input, Card, Select } from '../../components';
import {
  Edit3,
  Plus,
  Trash2,
  Search,
  RefreshCcw,
  DollarSign,
  Calendar,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Activity,
  ArrowRight,
  User,
  Building,
  Tag,
  Clock,
  Briefcase,
  Layers,
  Wallet,
  Image as ImageIcon
} from 'lucide-react';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';

const ExpensePage = () => {
  // State management
  const [expenses, setExpenses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [locals, setLocals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    vatRate: '',
    vatAmount: '',
    category: '',
    paymentStatus: 'pending',
    paymentDate: '',
    paymentMethod: '',
    dueDate: '',
    propertyId: '',
    localId: '',
    currency: 'RWF',
    vendor: '',
    invoiceNumber: '',
    proofFile: null,
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    paymentStatus: '',
    propertyId: '',
    localId: '',
    currency: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Admin guard based on Redux user slice (with localStorage fallback)
  const reduxUser = useSelector((state) => state.user?.user);
  const storedUser = JSON.parse(localStorage.getItem('user')) || {};
  const currentUser = reduxUser || storedUser || {};
  const isAdminUser = currentUser.role === 'admin';

  // Constants
  const categoryOptions = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'taxes', label: 'Taxes' },
    { value: 'repairs', label: 'Repairs' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'security', label: 'Security' },
    { value: 'other', label: 'Other' },
  ];

  const paymentStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const currencyOptions = [
    { value: 'RWF', label: 'RWF' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
  ];

  const paymentMethodOptions = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'check', label: 'Check' },
    { value: 'credit_card', label: 'Credit Card' },
  ];

  // Fetch data
  const fetchExpenses = async (pageNumber = page) => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const result = await getAllExpenses({ page: pageNumber, limit, ...filters }, controller.signal);
      setExpenses(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setPage(result.pagination?.page || pageNumber);
    } catch (err) {
      if (err.name !== 'AbortError') {
        showError(err?.message || 'Failed to sync expense matrix.');
        setExpenses([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await getExpenseSummary(filters);
      setSummary(data);
    } catch (err) {
      console.error('Summary fetch error:', err);
    }
  };

  const fetchProperties = async () => {
    try {
      const data = await getAllProperties(1, 100);
      setProperties(data.properties || []);
    } catch (err) {
      setProperties([]);
    }
  };

  const fetchLocals = async () => {
    try {
      const data = await getAllLocals({ page: 1, limit: 1000 });
      setLocals(data.data || data.locals || []);
    } catch (err) {
      setLocals([]);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
    fetchProperties();
    fetchLocals();
  }, []);

  useEffect(() => {
    if (Object.values(filters).some(v => v)) {
      fetchExpenses(1);
      fetchSummary();
    }
  }, [filters]);

  const handleAmountChange = (value) => {
    const amount = parseFloat(value) || 0;
    setFormData(prev => {
      const vatRate = parseFloat(prev.vatRate) || 0;
      const vatAmount = vatRate > 0 ? calculateVAT(amount, vatRate) : 0;
      return { ...prev, amount: value, vatAmount: vatAmount.toFixed(2) };
    });
  };

  const handleVatRateChange = (value) => {
    const vatRate = parseFloat(value) || 0;
    setFormData(prev => {
      const amount = parseFloat(prev.amount) || 0;
      const vatAmount = amount > 0 && vatRate > 0 ? calculateVAT(amount, vatRate) : 0;
      return { ...prev, vatRate: value, vatAmount: vatAmount.toFixed(2) };
    });
  };

  const handleEditClick = (expense) => {
    setSelectedExpense(expense);
    setFormData({
      description: expense.description || '',
      amount: expense.amount || '',
      vatRate: expense.vat_rate || '',
      vatAmount: expense.vat_amount || '',
      category: expense.category || '',
      paymentStatus: expense.payment_status || 'pending',
      paymentDate: expense.payment_date?.split('T')[0] || '',
      paymentMethod: expense.payment_method || '',
      dueDate: expense.due_date?.split('T')[0] || '',
      propertyId: expense.property_id || '',
      localId: expense.local_id || '',
      currency: expense.currency || 'RWF',
      vendor: expense.vendor || '',
      invoiceNumber: expense.invoice_number || '',
      proofFile: null,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!formData.description?.trim()) return showError('Description required for entry.');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return showError('Valid valuation required.');
    if (!formData.category) return showError('Category classification required.');
    if (!formData.propertyId) return showError('Property node selection required.');

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'proofFile') {
          if (value) formDataToSend.append('proof', value);
        } else {
          formDataToSend.append(key, value);
        }
      });

      if (selectedExpense) {
        await updateExpense(selectedExpense.id, formDataToSend, (p) => setUploadProgress(p));
        showSuccess('Expense entry recalibrated.');
      } else {
        await createExpense(formDataToSend, (p) => setUploadProgress(p));
        showSuccess('New expense signal initiated.');
        setPage(1);
      }

      await fetchExpenses(selectedExpense ? page : 1);
      await fetchSummary();
      handleModalClose();
    } catch (err) {
      showError(err?.message || 'Failed to sync expense signal.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Neutralize expense signal "${expense.description}"?`)) return;
    try {
      await deleteExpense(expense.id);
      showInfo('Signal neutralized.');
      await fetchExpenses(page);
      await fetchSummary();
    } catch (err) {
      showError(err?.message || 'Failed to neutralize signal.');
    }
  };

  const handleRestore = async (expense) => {
    try {
      await restoreExpense(expense.id);
      showSuccess('Signal restored to matrix.');
      await fetchExpenses(page);
      await fetchSummary();
    } catch (err) {
      showError(err?.message || 'Failed to restore signal.');
    }
  };

  const handleBulkUpdate = async (status, date, method) => {
    if (selectedExpenses.length === 0) return showError('No records isolated.');
    try {
      await bulkUpdatePaymentStatus({ expenseIds: selectedExpenses, paymentStatus: status, paymentDate: date, paymentMethod: method });
      showSuccess(`${selectedExpenses.length} nodes updated.`);
      setSelectedExpenses([]);
      setBulkModalOpen(false);
      await fetchExpenses(page);
      await fetchSummary();
    } catch (err) {
      showError(err?.message || 'Failed to update nodes.');
    }
  };

  const handleDownloadProof = async (expense) => {
    if (!expense.proof_file_name) return showError('No buffer available.');
    try {
      await downloadProof(expense.id, expense.proof_file_name);
      showSuccess('Binary data extracted.');
    } catch (err) {
      showError(err?.message || 'Extraction failed.');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedExpense(null);
    setFormData({
      description: '', amount: '', vatRate: '', vatAmount: '',
      category: '', paymentStatus: 'pending', paymentDate: '',
      paymentMethod: '', dueDate: '', propertyId: '',
      localId: '', currency: 'RWF', vendor: '',
      invoiceNumber: '', proofFile: null,
    });
    setUploadProgress(0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return showError('File exceeds 5MB architecture limit.');
      setFormData(prev => ({ ...prev, proofFile: file }));
    }
  };

  const toggleExpenseSelection = (expenseId) => {
    setSelectedExpenses(prev => prev.includes(expenseId) ? prev.filter(id => id !== expenseId) : [...prev, expenseId]);
  };

  const toggleAllSelection = () => {
    setSelectedExpenses(selectedExpenses.length === expenses.length ? [] : expenses.map(e => e.id));
  };

  const propertyOptions = useMemo(() => properties.map(p => ({ value: p.id, label: p.name })), [properties]);
  const localOptions = useMemo(() => {
    if (!formData.propertyId) return [];
    return locals.filter(l => l.property_id === formData.propertyId).map(l => ({ value: l.id, label: l.reference_code }));
  }, [locals, formData.propertyId]);

  const getPropertyName = (propertyId) => properties.find(p => p.id === propertyId)?.name || '-';

  const formatCurrency = (amount, currency = 'RWF') => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: currency }).format(amount);
  };

  const StatusBadge = ({ status, deleted }) => {
    if (deleted) return <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase italic tracking-widest border border-rose-500/20">Terminated</span>;
    const styles = {
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      overdue: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return <span className={`px-3 py-1 rounded-lg ${styles[status] || styles.cancelled} text-[9px] font-black uppercase italic tracking-widest border`}>{status}</span>;
  };

  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 bg-gray-800/40 backdrop-blur-sm border-rose-500/20 text-center space-y-6" hover={false}>
          <AlertCircle size={64} className="mx-auto text-rose-500 animate-pulse" />
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-rose-500 uppercase italic tracking-tighter">Access Inhibited</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Administrative Clearance Level Required</p>
          </div>
          <Button variant="outline" className="w-full border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white" onClick={() => window.history.back()}>
            Withdraw
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <TrendingDown size={200} className="text-rose-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Capital Outbound Monitor
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Expense <span className="text-rose-500">Matrix</span>
                </h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4">
                  Resource Depletion Tracking // Fiscal Interrogation Terminal
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              {selectedExpenses.length > 0 && (
                <Button variant="outline" onClick={() => setBulkModalOpen(true)} className="px-8 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white">
                  <div className="flex items-center gap-3">
                    <Layers size={18} />
                    <span>Process {selectedExpenses.length} nodes</span>
                  </div>
                </Button>
              )}
              <Button onClick={() => setModalOpen(true)} className="px-8 border-rose-500 bg-rose-500 hover:bg-rose-600">
                <div className="flex items-center gap-3">
                  <Plus size={18} />
                  <span>Incise Record</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Total Deficit', value: summary ? formatCurrency(summary.total || 0) : '0', icon: TrendingDown, color: 'rose' },
              { label: 'Liquidated', value: summary ? formatCurrency(summary.paid || 0) : '0', icon: CheckCircle, color: 'emerald' },
              { label: 'Pending Nodes', value: summary ? formatCurrency(summary.pending || 0) : '0', icon: Clock, color: 'amber' },
              { label: 'Breach Value', value: summary ? formatCurrency(summary.overdue || 0) : '0', icon: AlertCircle, color: 'rose' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1 group min-w-0">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic group-hover:text-rose-500 transition-colors truncate">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <stat.icon size={14} className={`text-${stat.color}-400 shrink-0`} />
                  <p className="text-xl md:text-2xl font-black text-white italic tracking-tighter truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col md:flex-row gap-6 animate-fade-in group">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-rose-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Query expense registry by description, vendor or invoice..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-rose-500/30 focus:shadow-[0_0_20px_rgba(244,63,94,0.1)]"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="flex gap-4 shrink-0">
            <Button variant="outline" onClick={() => setFilterModalOpen(true)} className="px-6 rounded-[1.5rem] border-gray-700/50 h-full text-gray-400">
              <Filter size={18} className="mr-2" /> Gates
            </Button>
            <Button variant="outline" className="px-6 rounded-[1.5rem] border-gray-700/50 h-full text-gray-400">
              <Download size={18} className="mr-2" /> Export
            </Button>
          </div>
        </div>

        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {/* Mobile Feed */}
          <div className="xl:hidden divide-y divide-gray-700/30">
            {loading ? (
              <div className="p-20 text-center space-y-4 animate-pulse">
                <Activity size={40} className="mx-auto text-rose-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Interrogating Registry...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-20 text-center italic text-gray-400 font-black uppercase text-[10px] tracking-widest">No Sector Signals Captured.</div>
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${e.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} flex items-center justify-center border group-hover/row:scale-110 transition-transform shadow-lg`}>
                        <TrendingDown size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{e.description}</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic flex items-center gap-2 mt-1">
                          <Building size={10} className="text-rose-500" /> {getPropertyName(e.property_id)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={e.payment_status} deleted={!!e.deleted_at} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-700/30">
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase italic">Valuation</p>
                      <p className="text-lg font-black text-white italic">{formatCurrency(e.amount, e.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase italic">Category</p>
                      <span className="text-[9px] font-black text-gray-400 uppercase italic bg-gray-800/50 px-2 py-1 rounded border border-gray-700">{e.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {!e.deleted_at ? (
                        <>
                          <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleEditClick(e)}>
                            <Edit3 size={16} />
                          </Button>
                          {e.proof_file_name && (
                            <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-emerald-400" onClick={() => handleDownloadProof(e)}>
                              <Download size={16} />
                            </Button>
                          )}
                          <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(e)}>
                            <Trash2 size={16} />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" className="px-6 py-2.5 rounded-xl border-gray-700 text-[10px] text-emerald-400 hover:bg-emerald-500 hover:text-white" onClick={() => handleRestore(e)}>
                          RESTORE
                        </Button>
                      )}
                    </div>
                    <p className="text-[9px] font-black text-gray-600 uppercase italic">ID: {e.id.toString().slice(0, 8)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden xl:block overflow-x-auto scrollbar-thin scrollbar-thumb-rose-500/20 scrollbar-track-transparent">
            <table className="w-full text-left table-auto min-w-[1000px]">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-6 w-16">
                    <div
                      onClick={toggleAllSelection}
                      className={`w-5 h-5 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${selectedExpenses.length === expenses.length ? 'bg-rose-500 border-rose-500' : 'bg-transparent border-gray-700 group-hover:border-rose-500/50'}`}
                    >
                      {selectedExpenses.length === expenses.length && <Activity className="text-white" size={10} />}
                    </div>
                  </th>
                  <th className="px-6 py-6 font-black uppercase">Descriptor Signature</th>
                  <th className="px-6 py-6 font-black uppercase">Node Context</th>
                  <th className="px-6 py-6 font-black uppercase">Classification</th>
                  <th className="px-6 py-6 text-right font-black uppercase">Valuation Matrix</th>
                  <th className="px-6 py-6 text-center font-black uppercase">Status Index</th>
                  <th className="px-6 py-6 text-right font-black uppercase">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Activity size={48} className="text-rose-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Expense Registry Matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No signals captured in current sector.</td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                      <td className="px-6 py-8">
                        <div
                          onClick={() => toggleExpenseSelection(e.id)}
                          className={`w-5 h-5 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${selectedExpenses.includes(e.id) ? 'bg-rose-500 border-rose-500' : 'bg-gray-900 border-gray-700 group-hover:border-rose-500/50'}`}
                        >
                          {selectedExpenses.includes(e.id) && <Activity className="text-white" size={10} />}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="max-w-[200px]">
                          <p className="font-black text-white italic uppercase tracking-tighter text-lg leading-none truncate">{e.description}</p>
                          {e.vendor && (
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-2 flex items-center gap-2 truncate">
                              <User size={12} className="text-rose-500 shrink-0" /> {e.vendor}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <Building size={14} className="text-rose-500/50 shrink-0" />
                          <span className="text-sm font-black uppercase tracking-widest italic text-gray-300 truncate max-w-[150px] inline-block">{getPropertyName(e.property_id)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1.5 bg-gray-900/50 border border-gray-700/50 rounded-lg text-[9px] font-black text-gray-400 uppercase italic tracking-widest w-fit flex items-center gap-2 whitespace-nowrap">
                          <Tag size={12} className="text-rose-500" /> {e.category}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-black text-rose-500 italic tracking-tighter leading-none">{formatCurrency(e.amount, e.currency)}</span>
                          {parseFloat(e.vat_amount) > 0 && (
                            <span className="text-[9px] font-black text-gray-500 uppercase italic mt-1 tracking-widest">VAT {formatCurrency(e.vat_amount, e.currency)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center whitespace-nowrap"><StatusBadge status={e.payment_status} deleted={!!e.deleted_at} /></td>
                      <td className="px-6 py-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          {!e.deleted_at ? (
                            <>
                              <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleEditClick(e)}>
                                <Edit3 size={14} />
                              </Button>
                              {e.proof_file_name && (
                                <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-emerald-400" onClick={() => handleDownloadProof(e)}>
                                  <Download size={14} />
                                </Button>
                              )}
                              {isAdminUser && (
                                <Button variant="outline" className="p-2 rounded-lg border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(e)}>
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </>
                          ) : (
                            isAdminUser && (
                              <Button variant="outline" className="px-6 py-2 rounded-lg border-gray-700 text-[9px] font-black text-emerald-400 hover:bg-emerald-500 hover:text-white" onClick={() => handleRestore(e)}>
                                RESTORE NODE
                              </Button>
                            )
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

        <div className="flex justify-between items-center py-6">
          <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-[0.2em]">
            Index <span className="text-rose-400 font-black">{page}</span> // Matrix <span className="text-white font-black">{totalPages}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchExpenses(Math.max(page - 1, 1))}
              disabled={page <= 1}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page <= 1
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'text-gray-400 hover:text-rose-400 hover:bg-gray-800'
                }`}
            >
              Retreat
            </button>
            <button
              onClick={() => fetchExpenses(Math.min(page + 1, totalPages))}
              disabled={page >= totalPages}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page >= totalPages
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'bg-rose-600 text-white shadow-xl hover:bg-rose-500 hover:scale-105 active:scale-95'
                }`}
            >
              Advance
            </button>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {modalOpen && (
          <Modal
            title={selectedExpense ? `Override Expense Node: ${selectedExpense.description}` : 'Initialize Expense Logic Injection'}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
            className="max-w-4xl"
          >
            <div className="space-y-10 py-4">
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-[1.5rem] animate-pulse">
                  <div className="flex justify-between items-center mb-2 text-[10px] font-black uppercase text-rose-400 italic">
                    <span>Migrating Binary Buffer</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              <Input
                label="Strategic Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Structural Maintenance Alpha-9"
                icon={Activity}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Fiscal Magnitude *"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="Valuation value"
                  icon={DollarSign}
                />
                <Select
                  label="Tax Metric (VAT %)"
                  value={formData.vatRate ? { value: formData.vatRate, label: `${formData.vatRate}%` } : null}
                  options={[0, 5, 10, 15, 18, 20].map(v => ({ value: v, label: `${v}%` }))}
                  onChange={(s) => handleVatRateChange(s.value)}
                  placeholder="Allocate VAT..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Select
                  label="Classification Target *"
                  value={categoryOptions.find(o => o.value === formData.category)}
                  options={categoryOptions}
                  onChange={(s) => setFormData({ ...formData, category: s.value })}
                  placeholder="Classify Sector..."
                />
                <Select
                  label="Target Asset Node *"
                  value={propertyOptions.find(o => o.value === formData.propertyId)}
                  options={propertyOptions}
                  onChange={(s) => setFormData({ ...formData, propertyId: s.value, localId: '' })}
                  placeholder="Allocate Property..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Select
                  label="Architectural Node (Unit)"
                  value={localOptions.find(o => o.value === formData.localId)}
                  options={localOptions}
                  onChange={(s) => setFormData({ ...formData, localId: s.value })}
                  placeholder="Select Local..."
                  isDisabled={!formData.propertyId}
                />
                <Input
                  label="Exclusion Date (Due) *"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  icon={Calendar}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Vendor Signature"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Identify Recipient..."
                  icon={User}
                />
                <Input
                  label="Invoice Protocol ID"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="Protocol Reference..."
                  icon={FileText}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Select
                  label="Liquidation State"
                  value={paymentStatusOptions.find(o => o.value === formData.paymentStatus)}
                  options={paymentStatusOptions}
                  onChange={(s) => setFormData({ ...formData, paymentStatus: s.value })}
                />
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Binary Validation Proof (Max 5MB)</label>
                  <div className="relative border-2 border-dashed border-gray-700/50 rounded-[1.5rem] p-4 group hover:border-rose-500 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex items-center gap-4 text-gray-500 italic">
                      <ImageIcon size={20} className="text-rose-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {formData.proofFile ? formData.proofFile.name : 'Aggregate Buffer Data'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {formData.amount > 0 && (
                <div className="p-8 bg-rose-500/5 rounded-[2.5rem] border border-rose-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Wallet className="text-rose-500 animate-pulse" size={32} />
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest italic">Net Fiscal Impact</p>
                      <p className="text-sm font-bold text-gray-400 italic mt-1 leading-relaxed">Commitment of this signal will deplete architectural reserves.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-rose-400 italic tracking-tighter">
                      {formatCurrency(parseFloat(formData.amount) + (parseFloat(formData.vatAmount) || 0), formData.currency)}
                    </p>
                    <p className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest">Total Liability (incl. VAT)</p>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Filter Modal */}
        {filterModalOpen && (
          <Modal
            title="Registry Filter Configuration"
            onClose={() => setFilterModalOpen(false)}
            onSubmit={() => { fetchExpenses(1); fetchSummary(); setFilterModalOpen(false); }}
            className="max-w-3xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <Select
                label="Sector Category"
                value={categoryOptions.find(o => o.value === filters.category)}
                options={[{ value: '', label: 'Full Spectrum' }, ...categoryOptions]}
                onChange={(s) => setFilters({ ...filters, category: s.value })}
              />
              <Select
                label="Liquidation Status"
                value={paymentStatusOptions.find(o => o.value === filters.paymentStatus)}
                options={[{ value: '', label: 'Full Spectrum' }, ...paymentStatusOptions]}
                onChange={(s) => setFilters({ ...filters, paymentStatus: s.value })}
              />
              <Input
                label="Temporal Origin"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                icon={Calendar}
              />
              <Input
                label="Temporal Termination"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                icon={Calendar}
              />
            </div>
            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                className="flex-1 border-gray-700"
                onClick={() => setFilters({ search: '', category: '', paymentStatus: '', propertyId: '', localId: '', currency: '', startDate: '', endDate: '', minAmount: '', maxAmount: '' })}
              >
                PURGE FILTERS
              </Button>
            </div>
          </Modal>
        )}

        {/* Bulk Update Modal */}
        {bulkModalOpen && (
          <Modal
            title={`Batch Override: ${selectedExpenses.length} Nodes`}
            onClose={() => setBulkModalOpen(false)}
            onSubmit={() => {
              const status = document.getElementById('bulk-status').value;
              const date = document.getElementById('bulk-date').value;
              const method = document.getElementById('bulk-method').value;
              handleBulkUpdate(status, date, method);
            }}
            className="max-w-2xl"
          >
            <div className="space-y-8 py-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Override Status</label>
                <select id="bulk-status" className="w-full pl-6 pr-6 py-5 bg-gray-800 border-2 border-gray-700 rounded-[1.5rem] text-white font-black uppercase italic text-[11px] tracking-widest">
                  {paymentStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Liquidation Date</label>
                <input id="bulk-date" type="date" className="w-full pl-6 pr-6 py-5 bg-gray-800 border-2 border-gray-700 rounded-[1.5rem] text-white font-black uppercase italic text-[11px] tracking-widest" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Gateway Method</label>
                <select id="bulk-method" className="w-full pl-6 pr-6 py-5 bg-gray-800 border-2 border-gray-700 rounded-[1.5rem] text-white font-black uppercase italic text-[11px] tracking-widest">
                  {paymentMethodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[1.5rem] flex items-center gap-4">
                <AlertCircle className="text-rose-500" size={24} />
                <p className="text-[10px] font-black text-gray-400 uppercase italic leading-none">Warning: Batch override is an atomic operation and cannot be reversed easily.</p>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default ExpensePage;