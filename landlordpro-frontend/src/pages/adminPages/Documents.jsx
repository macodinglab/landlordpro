import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getAllExpenses } from '../../services/expenseService';
import { getAllPayments, getPaymentProofUrl } from '../../services/paymentService';
import { getAllProperties } from '../../services/propertyService';
import { Button, Input, Card, Select, Modal } from '../../components';
import {
  Download,
  Printer,
  FileText,
  Paperclip,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  Archive,
  ClipboardList,
  Calendar,
  Building,
  Eye
} from 'lucide-react';
import { showError, showSuccess } from '../../utils/toastHelper';

const Documents = () => {
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const [showFilters, setShowFilters] = useState(false);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterProperty, filterStatus, dateFrom, dateTo, activeTab]);

  const escapeHtml = (text) => {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  };

  const getFullPaymentProofUrl = (payment) => {
    if (!payment) return null;
    const proofField = payment.proof || payment.proofUrl || payment.proofFilename || payment.attachment || payment.proof_url;
    if (!proofField) return null;
    if (typeof proofField === 'string' && proofField.startsWith('http')) return proofField;
    if (typeof proofField === 'string' && proofField.startsWith('/uploads')) return `${import.meta.env.VITE_API_BASE_URL}${proofField}`;
    if (payment.id && typeof proofField === 'string') {
      try {
        return getPaymentProofUrl(payment.id, proofField);
      } catch (error) {
        return null;
      }
    }
    return null;
  };

  const getFullExpenseProofUrl = (expense) => {
    if (!expense || !expense.proof) return null;
    if (expense.proof.startsWith('http')) return expense.proof;
    if (expense.proof.startsWith('/uploads')) return `${import.meta.env.VITE_API_BASE_URL}${expense.proof}`;
    return `${import.meta.env.VITE_API_BASE_URL}/api/expenses/${expense.id}/proof/${expense.proof}`;
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllPayments(searchTerm);
      let filteredData = Array.isArray(data) ? data : [];
      if (dateFrom) filteredData = filteredData.filter(p => new Date(p.startDate) >= new Date(dateFrom));
      if (dateTo) filteredData = filteredData.filter(p => new Date(p.endDate) <= new Date(dateTo));
      setPayments(filteredData);
    } catch (err) {
      showError('Failed to sync payment signals.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, dateFrom, dateTo]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllExpenses({ page: 1, limit: 1000, propertyId: filterProperty, search: searchTerm });
      let filteredData = Array.isArray(res?.data) ? res.data : [];
      if (filterStatus) filteredData = filteredData.filter(e => e.payment_status === filterStatus);
      if (dateFrom) filteredData = filteredData.filter(e => new Date(e.date) >= new Date(dateFrom));
      if (dateTo) filteredData = filteredData.filter(e => new Date(e.date) <= new Date(dateTo));
      setExpenses(filteredData);
    } catch (err) {
      showError('Failed to sync expense spectrum.');
    } finally {
      setLoading(false);
    }
  }, [filterProperty, searchTerm, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    const fetchProps = async () => {
      try {
        const { properties: props } = await getAllProperties();
        setProperties(Array.isArray(props) ? props : []);
      } catch (err) {
        showError('Failed to load property nodes.');
      }
    };
    fetchProps();
  }, []);

  useEffect(() => {
    if (activeTab === 'expenses') fetchExpenses();
    else fetchPayments();
  }, [activeTab, fetchExpenses, fetchPayments]);

  const handleViewProof = (url) => {
    if (!url) {
      showError('No validation proof isolated for this node.');
      return;
    }
    setProofUrl(url);
    setProofModalOpen(true);
  };

  const generateExpenseInvoice = (expense) => {
    const property = properties.find(p => p.id === expense.property_id);
    const total = parseFloat(expense.amount || 0);
    const vatAmount = total - (total / 1.18);
    const subtotal = total - vatAmount;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Expense Invoice - ${escapeHtml(expense.reference_number || expense.id)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; padding: 40px; background: #fff; color: #1e293b; }
          .header { border-bottom: 4px solid #0f172a; padding-bottom: 30px; margin-bottom: 40px; display: flex; justify-content: space-between; }
          .title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1.5px; italic; }
          .meta { text-align: right; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 10px; }
          .content { font-size: 14px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { padding: 15px; background: #f8fafc; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
          td { padding: 15px; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
          .totals { margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .grand-total { border-top: 3px solid #0f172a; padding-top: 15px; font-size: 18px; font-weight: 900; }
          .footer { margin-top: 80px; text-align: center; font-size: 10px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
             <div class="section-title">Corporate Unit</div>
             <div class="title">Expenditure Invoice</div>
          </div>
          <div class="meta">
            <div>Ref: ${escapeHtml(expense.reference_number || expense.id?.substring(0, 8))}</div>
            <div>Date: ${expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}</div>
          </div>
        </div>
        <div class="grid">
          <div>
            <div class="section-title">Origin Node (Property)</div>
            <div class="content">${property ? escapeHtml(property.name) : 'GLOBAL_ARRAY'}</div>
            <div class="content" style="color: #64748b; font-size: 12px; margin-top: 4px;">${property?.address || '-'}</div>
          </div>
          <div>
            <div class="section-title">Destination Entity (Vendor)</div>
            <div class="content">${escapeHtml(expense.vendor_name || 'UNDEFINED')}</div>
            <div class="content" style="color: #64748b; font-size: 12px; margin-top: 4px;">${expense.vendor_contact || '-'}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th style="text-align: right">Valuation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(expense.description || 'Corporate Expense')}</td>
              <td>${escapeHtml(expense.category || 'N/A')}</td>
              <td style="text-align: right">FRW ${subtotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="total-row">
            <span class="section-title">Base Load</span>
            <span class="content">FRW ${subtotal.toLocaleString()}</span>
          </div>
          <div class="total-row">
            <span class="section-title">VAT (18%)</span>
            <span class="content">FRW ${vatAmount.toLocaleString()}</span>
          </div>
          <div class="total-row grand-total">
             <span class="section-title" style="color: #0f172a">Net Aggregate</span>
             <span style="color: #0f172a">FRW ${total.toLocaleString()}</span>
          </div>
        </div>
        <div class="footer">
          Computerized Logic Output • No physical signature required • Authenticated by LandlordPro Matrix
        </div>
      </body>
      </html>
    `;
  };

  const generatePaymentReceipt = (payment) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Payment Receipt - ${payment.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; padding: 60px; background: #fff; color: #1e293b; }
          .header { border-left: 8px solid #0f172a; padding-left: 30px; margin-bottom: 60px; }
          .title { font-size: 40px; font-weight: 900; text-transform: uppercase; letter-spacing: -2px; }
          .meta { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
          .amount-hero { background: #f8fafc; padding: 40px; border-radius: 20px; text-align: center; margin-bottom: 40px; border: 1px solid #e2e8f0; }
          .amount-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; color: #64748b; margin-bottom: 10px; }
          .amount-value { font-size: 48px; font-weight: 900; color: #0f172a; letter-spacing: -2px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
          .info-block { border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
          .label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 5px; }
          .value { font-size: 14px; font-weight: 700; color: #1e293b; }
          .footer { margin-top: 100px; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 9px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Fiscal Receipt</div>
          <div class="meta">Node Identification: ${payment.id?.substring(0, 8)?.toUpperCase()} • ${new Date().toLocaleDateString()}</div>
        </div>
        <div class="amount-hero">
           <div class="amount-label">Verified Credit Vector</div>
           <div class="amount-value">FRW ${parseFloat(payment.amount || 0).toLocaleString()}</div>
        </div>
        <div class="grid">
           <div class="info-block">
              <div class="label">Temporal Range</div>
              <div class="value">${new Date(payment.startDate).toLocaleDateString()} — ${new Date(payment.endDate).toLocaleDateString()}</div>
           </div>
           <div class="info-block">
              <div class="label">Origin Lease</div>
              <div class="value">SIGNAL_${payment.leaseId?.substring(0, 8)?.toUpperCase()}</div>
           </div>
           <div class="info-block">
              <div class="label">Gateway Protocol</div>
              <div class="value">${payment.paymentMode?.name || 'GENERIC'}</div>
           </div>
           <div class="info-block">
              <div class="label">Injection Time</div>
              <div class="value">${new Date(payment.createdAt).toLocaleString()}</div>
           </div>
        </div>
        <div class="footer">
           Authenticated Transaction • Non-Repudiation Guaranteed • LandlordPro Financial Grid
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = (item, type) => {
    const printWindow = window.open('', '_blank');
    const html = type === 'expense' ? generateExpenseInvoice(item) : generatePaymentReceipt(item);
    if (!printWindow) {
      showError('Interface blocked by popup security. Enable popups for document output.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  const handleDownload = (item, type) => {
    const html = type === 'expense' ? generateExpenseInvoice(item) : generatePaymentReceipt(item);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${item.reference_number || item.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess('Binary document extracted to local storage.');
  };

  const currentItems = activeTab === 'expenses' ? expenses : payments;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = currentItems.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amt) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amt);

  return (
    <div className="space-y-8">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Hero Section */}
        <Card className="p-6 md:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden relative" hover={false}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Archive size={200} className="text-sky-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Document Intelligence Matrix
              </div>
              <div className="flex flex-col md:flex-row md:items-end gap-10">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Archival <span className="text-sky-500">Nodes</span>
                </h1>
                <div className="flex bg-gray-900/50 p-2 rounded-2xl border border-gray-700/50">
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all ${activeTab === 'expenses' ? 'bg-sky-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Expenses
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all ${activeTab === 'payments' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Payments
                  </button>
                </div>
              </div>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                <ClipboardList size={14} className="text-sky-400" /> Synthesizing financial manifestations and verification proofs
              </p>
            </div>

            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest mb-1">Total Manifests</p>
                <p className="text-3xl font-black text-white italic tracking-tighter">{currentItems.length}</p>
              </div>
              <div className="h-12 w-px bg-gray-700"></div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest mb-1">Aggregate Valuation</p>
                <p className="text-3xl font-black text-sky-400 italic tracking-tighter">{formatCurrency(currentItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0))}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-sky-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Query archival matrix for specific signatures or descriptors..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-sky-500/30 focus:shadow-[0_0_20px_rgba(14,165,233,0.1)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className={`px-8 rounded-[1.5rem] border-gray-700/50 transition-all ${showFilters ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'text-gray-400'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} className="mr-2" /> {showFilters ? 'Lock Filters' : 'Unlock Gates'}
          </Button>
        </div>

        {showFilters && (
          <Card className="p-8 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-slide-up" hover={false}>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic ml-1 flex items-center gap-2"><Building size={12} /> Property Node</label>
              <Select
                options={[{ value: '', label: 'Global Array' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
                value={filterProperty ? { value: filterProperty, label: properties.find(p => p.id === filterProperty)?.name } : { value: '', label: 'Global Array' }}
                onChange={(v) => setFilterProperty(v?.value || '')}
              />
            </div>
            {activeTab === 'expenses' && (
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic ml-1 flex items-center gap-2"><Activity size={12} /> Payment State</label>
                <Select
                  options={[{ value: '', label: 'All States' }, { value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }]}
                  value={filterStatus ? { value: filterStatus, label: filterStatus.toUpperCase() } : { value: '', label: 'All States' }}
                  onChange={(v) => setFilterStatus(v?.value || '')}
                />
              </div>
            )}
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic ml-1 flex items-center gap-2"><Calendar size={12} /> Temporal Start</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-6 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-xs font-black text-white italic outline-hidden focus:border-sky-500/50 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic ml-1 flex items-center gap-2"><Calendar size={12} /> Temporal End</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-6 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-xs font-black text-white italic outline-hidden focus:border-sky-500/50 transition-all" />
            </div>
          </Card>
        )}

        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {/* Desktop Table */}
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-10 py-6">Temporal Signature</th>
                  <th className="px-10 py-6">Reference UID</th>
                  <th className="px-10 py-6">Descriptor Content</th>
                  <th className="px-10 py-6 text-right">Fiscal Load</th>
                  <th className="px-10 py-6 text-center">Verification</th>
                  <th className="px-10 py-6 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Zap size={48} className="text-sky-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Interrogating Archival spectrum...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No manifest signals captured in this filter.</td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const isExpense = activeTab === 'expenses';
                    const proofUrl = isExpense ? getFullExpenseProofUrl(item) : getFullPaymentProofUrl(item);
                    return (
                      <tr key={item.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-sky-500/50" />
                            <span className="text-xs font-black text-white italic uppercase">{new Date(isExpense ? item.date : item.startDate).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <span className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-xl text-[9px] font-black text-gray-400 uppercase tracking-widest italic">
                            {isExpense ? (item.reference_number || item.id?.substring(0, 8)) : item.id?.substring(0, 8)?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <p className="text-[11px] font-bold text-gray-400 italic truncate max-w-[200px] group-hover:max-w-none group-hover:whitespace-normal transition-all">
                            {isExpense ? item.description : `Protocol execution for lease SIGNAL_${item.leaseId?.substring(0, 8)?.toUpperCase()}`}
                          </p>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <span className={`text-xl font-black italic tracking-tighter ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {formatCurrency(item.amount)}
                          </span>
                        </td>
                        <td className="px-10 py-8 text-center">
                          {proofUrl ? (
                            <button onClick={() => handleViewProof(proofUrl)} className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white transition-all shadow-lg border border-sky-500/20">
                              <Paperclip size={16} />
                            </button>
                          ) : <span className="text-[9px] font-black text-gray-600 uppercase italic">VOID</span>}
                        </td>
                        <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => handlePrint(item, isExpense ? 'expense' : 'payment')} className="p-3 rounded-2xl bg-gray-900 text-gray-400 hover:text-sky-400 border border-gray-700 shadow-xl transition-all">
                              <Printer size={16} />
                            </button>
                            <button onClick={() => handleDownload(item, isExpense ? 'expense' : 'payment')} className="p-3 rounded-2xl bg-gray-900 text-gray-400 hover:text-emerald-400 border border-gray-700 shadow-xl transition-all">
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Feed */}
          <div className="xl:hidden divide-y divide-gray-700/30">
            {paginatedItems.map((item) => {
              const isExpense = activeTab === 'expenses';
              const proofUrl = isExpense ? getFullExpenseProofUrl(item) : getFullPaymentProofUrl(item);
              return (
                <div key={item.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-sky-400 uppercase italic tracking-widest">{new Date(isExpense ? item.date : item.startDate).toLocaleDateString()}</p>
                      <p className="text-xl font-black text-white italic uppercase tracking-tighter">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-[9px] font-black text-gray-500 tracking-widest italic">
                      ID: {isExpense ? (item.reference_number || item.id?.substring(0, 8)) : item.id?.substring(0, 8)?.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-gray-400 italic">
                    {isExpense ? item.description : `Signal from lease ${item.leaseId?.substring(0, 8)}`}
                  </p>

                  <div className="flex items-center justify-between">
                    {proofUrl ? (
                      <button onClick={() => handleViewProof(proofUrl)} className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl text-[10px] font-black uppercase italic">
                        <Paperclip size={14} /> View Proof
                      </button>
                    ) : <div />}
                    <div className="flex gap-2">
                      <button onClick={() => handlePrint(item, isExpense ? 'expense' : 'payment')} className="p-3 bg-gray-900 rounded-xl text-gray-400 border border-gray-700"> <Printer size={16} /> </button>
                      <button onClick={() => handleDownload(item, isExpense ? 'expense' : 'payment')} className="p-3 bg-gray-900 rounded-xl text-gray-400 border border-gray-700"> <Download size={16} /> </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Pagination */}
        <div className="flex justify-between items-center py-6">
          <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-[0.2em]">
            Index <span className="text-sky-400 font-black">{currentPage}</span> // Matrix <span className="text-white font-black">{totalPages}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage <= 1}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${currentPage <= 1
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'text-gray-400 hover:text-sky-400 hover:bg-gray-800'
                }`}
            >
              Retreat
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${currentPage >= totalPages
                ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                : 'bg-sky-600 text-white shadow-xl hover:bg-sky-500 hover:scale-105 active:scale-95'
                }`}
            >
              Advance
            </button>
          </div>
        </div>

        {/* Proof Modal */}
        {proofModalOpen && (
          <Modal
            title="Manifest Validation Proof"
            onClose={() => setProofModalOpen(false)}
            hideSubmit
            className="max-w-4xl"
          >
            <div className="p-6 space-y-8 text-center animate-fade-in">
              <div className="relative group mx-auto bg-gray-950 rounded-[2rem] p-4 border border-gray-700 shadow-inner overflow-hidden min-h-[400px] flex items-center justify-center">
                <img
                  src={proofUrl}
                  alt="Binary Proof"
                  className="max-w-full max-h-[70vh] rounded-xl shadow-2xl group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="none"><path d="M0 0h400v400H0z"/><text x="50%" y="50%" text-anchor="middle" font-family="monospace" font-weight="900" font-size="20" fill="gray">MANIFEST_NULL_ERROR</text></svg>';
                  }}
                />
              </div>

              <div className="flex justify-center gap-4">
                <Button onClick={() => window.open(proofUrl, '_blank')} className="px-10">
                  <Eye size={18} className="mr-2" /> Open Source
                </Button>
                <Button variant="outline" onClick={() => setProofModalOpen(false)} className="px-10 text-gray-400 border-gray-700">
                  <X size={18} className="mr-2" /> Close Terminal
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Documents;