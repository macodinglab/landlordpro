import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Input, Select, Spinner, Button } from '../../components';
import { getAllExpenses } from '../../services/expenseService';
import useAccessibleProperties from '../../hooks/useAccessibleProperties';
import {
  Building2,
  Receipt,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  PieChart,
  Shield,
  ShieldCheck,
  TrendingDown,
  Activity,
  ArrowRight,
  Filter,
  Layers,
  Flame
} from 'lucide-react';
import { showError, showSuccess, showInfo } from '../../utils/toastHelper';

const ManagerExpensePage = () => {
  const {
    isManager,
    properties,
    propertyOptions,
    accessiblePropertyIds,
  } = useAccessibleProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;

  const propertyNameMap = useMemo(
    () =>
      new Map(properties.map((property) => [property.id, property.name || 'Unnamed Property'])),
    [properties]
  );

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [];

      if (selectedPropertyId) {
        requests.push(getAllExpenses({ page: 1, limit: 500, propertyId: selectedPropertyId }));
      } else if (isManager && accessiblePropertyIds.length > 0) {
        accessiblePropertyIds.forEach((propertyId) => {
          requests.push(getAllExpenses({ page: 1, limit: 500, propertyId }));
        });
      } else {
        requests.push(getAllExpenses({ page: 1, limit: 500 }));
      }

      const responses = await Promise.all(requests);
      const combined = responses.flatMap((response) => {
        if (Array.isArray(response?.data?.expenses)) return response.data.expenses;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.expenses)) return response.expenses;
        if (Array.isArray(response)) return response;
        return [];
      });

      const deduped = Array.from(
        new Map(combined.filter(Boolean).map((expense) => [expense.id, expense])).values()
      );

      setExpenses(deduped);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      showError(error?.message || 'Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [accessiblePropertyIds, isManager, selectedPropertyId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedPropertyId]);

  const filteredExpenses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (selectedPropertyId && expense.property_id !== selectedPropertyId) return false;

      if (!search) return true;

      const description = expense.description?.toLowerCase() || '';
      const category = expense.category?.toLowerCase() || '';
      const vendor = expense.vendor?.toLowerCase() || '';
      return (
        description.includes(search) ||
        category.includes(search) ||
        vendor.includes(search) ||
        expense.invoice_number?.toLowerCase().includes(search)
      );
    });
  }, [expenses, searchTerm, selectedPropertyId]);

  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredExpenses.slice(start, start + limit);
  }, [filteredExpenses, page]);

  const totalPages = Math.ceil(filteredExpenses.length / limit) || 1;

  const totals = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    filteredExpenses.forEach((expense) => {
      const amount = Number(expense.amount) || 0;
      const status = expense.payment_status || 'pending';

      total += amount;
      if (status === 'paid') paid += amount;
      else if (status === 'overdue') overdue += amount;
      else pending += amount;
    });

    return {
      total,
      paid,
      pending,
      overdue,
    };
  }, [filteredExpenses]);

  const summaryCards = [
    {
      title: 'Aggregate Outflow',
      value: `RWF ${totals.total.toLocaleString()}`,
      subtitle: `${filteredExpenses.length} nodes recorded`,
      icon: <PieChart className="w-6 h-6 text-rose-400" />,
      color: 'rose'
    },
    {
      title: 'Settled Protocols',
      value: `RWF ${totals.paid.toLocaleString()}`,
      subtitle: 'Verified liquidations',
      icon: <CheckCircle2 className="w-6 h-6 text-teal-400" />,
      color: 'teal'
    },
    {
      title: 'Pending Liability',
      value: `RWF ${totals.pending.toLocaleString()}`,
      subtitle: 'Awaiting execution',
      icon: <Clock className="w-6 h-6 text-indigo-400" />,
      color: 'indigo'
    },
    {
      title: 'Critical Overdue',
      value: `RWF ${totals.overdue.toLocaleString()}`,
      subtitle: 'Protocol violation',
      icon: <Flame className="w-6 h-6 text-rose-500" />,
      color: 'rose'
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 border-l border-gray-800/50">
        <div className="animate-spin w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-500 font-extrabold uppercase tracking-widest italic text-xs">Auditing Expense Matrix...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 border-l border-gray-800/50 pb-12">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-rose-950 via-slate-950 to-teal-950 text-white border-b border-gray-800/50">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-rose-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-16 space-y-12 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                  <Activity size={12} /> Resource Allocation
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Expense <span className="text-rose-500">Analytics</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Monitoring operational overhead and capital expenditure nodes
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => {
                  setSelectedPropertyId('');
                  setSearchTerm('');
                }}
                className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-gray-700 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all group active:scale-95"
              >
                <Layers size={18} className="text-rose-500 group-hover:rotate-12 transition-transform" /> Reset Matrix
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryCards.map((card) => (
              <Card
                key={card.title}
                className="p-8 bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-500 group relative overflow-hidden rounded-[2rem]"
                hover={true}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-rose-900/40 transition-colors duration-700 opacity-50" />
                <div className="relative z-10 space-y-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mb-1">{card.title}</h3>
                    <div className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none truncate">{card.value}</div>
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
                <Search size={18} className="text-gray-500 group-focus-within:text-rose-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Scan expense descriptor, vendor node, or invoice..."
                className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-rose-500/30 focus:shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative min-w-[300px]">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Filter size={18} className="text-gray-500" />
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

        {/* Expenses Table */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
          {/* Mobile Feed */}
          <div className="md:hidden divide-y divide-gray-700/30 px-4">
            {paginatedExpenses.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Sector Signals Captured.</div>
            ) : (
              paginatedExpenses.map((expense) => {
                const status = expense.payment_status || 'pending';
                const isPaid = status === 'paid';
                const isOverdue = status === 'overdue';
                return (
                  <div key={expense.id} className="py-6 space-y-4 group/row">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 group-hover/row:scale-110 transition-transform shadow-lg overflow-hidden">
                          {expense.invoice_number ? <Receipt size={20} /> : <DollarSign size={20} />}
                        </div>
                        <div>
                          <h3 className="font-black text-white italic uppercase tracking-tighter text-base truncate max-w-[180px]">{expense.description}</h3>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-1">
                            {expense.category || 'General'} // {propertyNameMap.get(expense.property_id) || 'Unlinked Asset'}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase italic tracking-widest ${isPaid ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : isOverdue ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                        {status}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase italic">Settlement Value</p>
                        <p className="text-lg font-black text-white italic tracking-tighter">RWF {Number(expense.amount || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-600 uppercase italic">Due Date</p>
                        <p className="text-[10px] font-black text-gray-400 italic">{expense.due_date ? new Date(expense.due_date).toLocaleDateString() : 'Continuous'}</p>
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
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Descriptor / Node</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Asset Context</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Category</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Protocol Status</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Settlement Value</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">Temporal Horizon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="flex justify-center mb-6">
                        <div className="p-6 bg-gray-900 rounded-2xl border border-gray-700/50">
                          <Receipt className="w-12 h-12 text-gray-600" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2 pr-2">Zero Outflow Match</h3>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">No transaction records found in the current sector.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((expense) => {
                    const status = expense.payment_status || 'pending';
                    const isPaid = status === 'paid';
                    const isOverdue = status === 'overdue';

                    return (
                      <tr key={expense.id} className="group transition-all hover:bg-gray-700/20">
                        <td className="px-6 py-6 min-w-[250px]">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700/50 text-rose-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 font-black italic text-xs">
                              {expense.invoice_number ? <Receipt size={18} /> : expense.description?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-white italic uppercase text-base tracking-tight group-hover:text-rose-400 transition-colors truncate max-w-[200px]">{expense.description}</div>
                              {expense.vendor && (
                                <div className="text-[9px] font-black text-gray-600 uppercase italic tracking-widest mt-1">
                                  Vendor Node: <span className="text-rose-500/50">{expense.vendor}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase italic tracking-widest truncate max-w-[150px]">
                            <Building2 className="w-3.5 h-3.5 text-gray-600" />
                            {propertyNameMap.get(expense.property_id) || 'Unlinked Asset'}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className="px-3 py-1 bg-gray-900 border border-gray-700 text-[9px] font-black text-gray-500 uppercase italic tracking-[0.1em] rounded-lg">
                            {expense.category || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase italic tracking-widest ${isPaid ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' :
                            isOverdue ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                              'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                            }`}>
                            {isPaid ? <CheckCircle2 size={12} /> : isOverdue ? <Flame size={12} /> : <Clock size={12} />}
                            {status}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right font-mono">
                          <div className="font-black text-white italic text-base tracking-tight group-hover:text-rose-400 transition-colors">
                            RWF {Number(expense.amount || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right font-mono text-[10px] text-gray-400 uppercase italic font-black tracking-widest">
                          {expense.due_date ? new Date(expense.due_date).toLocaleDateString() : 'Continuous'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredExpenses.length > 0 && (
          <div className="flex justify-between items-center py-6">
            <div className="text-[10px] font-black text-gray-500 uppercase italic tracking-[0.2em]">
              Index <span className="text-rose-400 font-black">{page}</span> // Matrix <span className="text-white font-black">{totalPages}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${page <= 1
                  ? 'text-gray-700 cursor-not-allowed bg-gray-800/20'
                  : 'text-gray-400 hover:text-rose-400 hover:bg-gray-800'
                  }`}
              >
                Reverse
              </button>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
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
        )}
      </div>
    </div>
  );
};

export default ManagerExpensePage;

