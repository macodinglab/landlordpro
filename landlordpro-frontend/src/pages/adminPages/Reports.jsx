import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import { Card, Select, Button } from '../../components';
import {
  getAllProperties,
} from '../../services/propertyService';
import { getAllLocals } from '../../services/localService';
import leaseService from '../../services/leaseService';
import { getAllPayments } from '../../services/paymentService';
import { getAllExpenses } from '../../services/expenseService';
import { showError, showSuccess } from '../../utils/toastHelper';
import {
  Download,
  RefreshCw,
  BarChart2,
  DollarSign,
  Home,
  Activity,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  ShieldCheck,
  Zap,
  Layers,
  Archive,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Building
} from 'lucide-react';

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#ef4444'];

const RANGE_OPTIONS = [
  { label: 'Q1 Analytics (3M)', value: '3m' },
  { label: 'Semi-Annual Spectrum (6M)', value: '6m' },
  { label: 'Annual Longitudinal (12M)', value: '12m' },
];

const computeRange = (value) => {
  const end = new Date();
  const start = new Date(end);
  switch (value) {
    case '12m': start.setFullYear(end.getFullYear() - 1); break;
    case '6m': start.setMonth(end.getMonth() - 5); break;
    default: start.setMonth(end.getMonth() - 2);
  }
  start.setDate(1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const initMonthlySeries = (start, end) => {
  const cursor = new Date(start);
  const series = [];
  while (cursor <= end) {
    series.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      month: cursor.toLocaleString('default', { month: 'short', year: '2-digit' }),
      income: 0,
      expenses: 0,
      profit: 0,
      leases: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return series;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(value || 0);

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [properties, setProperties] = useState([]);
  const [locals, setLocals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [range, setRange] = useState('6m');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const { start, end } = useMemo(() => computeRange(range), [range]);

  const propertyOptions = useMemo(
    () => [{ label: 'Global Portfolio', value: '' }, ...properties.map((p) => ({ label: p.name || 'Unnamed node', value: String(p.id) }))],
    [properties]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [propertiesRes, localsRes, leasesRes, paymentsRes, expensesRes] = await Promise.all([
        getAllProperties(1, 1000),
        getAllLocals({ page: 1, limit: 2000 }),
        leaseService.getLeases(1, 1000),
        getAllPayments(),
        getAllExpenses({ page: 1, limit: 2000 }),
      ]);

      setProperties(propertiesRes?.properties || propertiesRes?.data || propertiesRes || []);
      setLocals(localsRes?.locals || localsRes?.data || localsRes || []);
      setPayments(paymentsRes?.data || paymentsRes || []);
      setExpenses(expensesRes?.data || expensesRes?.expenses || expensesRes || []);
    } catch (error) {
      showError('Failed to synchronize analytical streams.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const date = new Date(payment.endDate || payment.end_date || payment.created_at);
      if (Number.isNaN(date.getTime()) || date < start || date > end) return false;
      if (selectedPropertyId) return String(payment.propertyId || payment.property_id || '') === selectedPropertyId;
      return true;
    });
  }, [payments, start, end, selectedPropertyId]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = new Date(expense.due_date || expense.payment_date || expense.created_at);
      if (Number.isNaN(date.getTime()) || date < start || date > end) return false;
      if (selectedPropertyId) return String(expense.property_id || '') === selectedPropertyId;
      return true;
    });
  }, [expenses, start, end, selectedPropertyId]);

  const monthlySeries = useMemo(() => {
    const series = initMonthlySeries(start, end);
    const map = new Map(series.map((entry) => [entry.key, entry]));

    filteredPayments.forEach((p) => {
      const date = new Date(p.endDate || p.end_date || p.created_at);
      const entry = map.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (entry) { entry.income += Number(p.amount) || 0; entry.leases += 1; }
    });

    filteredExpenses.forEach((e) => {
      const date = new Date(e.due_date || e.payment_date || e.created_at);
      const entry = map.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (entry) entry.expenses += Number(e.amount) || 0;
    });

    return Array.from(map.values()).map((e) => ({
      ...e,
      income: Number(e.income.toFixed(2)),
      expenses: Number(e.expenses.toFixed(2)),
      profit: Number((e.income - e.expenses).toFixed(2)),
    }));
  }, [filteredPayments, filteredExpenses, start, end]);

  const expenseByCategory = useMemo(() => {
    const totals = new Map();
    filteredExpenses.forEach((e) => {
      const cat = e.category || 'uncategorised';
      totals.set(cat, (totals.get(cat) || 0) + (Number(e.amount) || 0));
    });
    return Array.from(totals.entries()).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const propertyPerformance = useMemo(() => {
    const map = new Map();
    filteredPayments.forEach((p) => {
      const pid = String(p.propertyId || p.property_id || '');
      if (!pid) return;
      const entry = map.get(pid) || { income: 0, expenses: 0 };
      entry.income += Number(p.amount) || 0;
      map.set(pid, entry);
    });
    filteredExpenses.forEach((e) => {
      const pid = String(e.property_id || '');
      if (!pid) return;
      const entry = map.get(pid) || { income: 0, expenses: 0 };
      entry.expenses += Number(e.amount) || 0;
      map.set(pid, entry);
    });
    return Array.from(map.entries()).map(([pid, e]) => ({
      property: properties.find((p) => String(p.id) === pid)?.name || 'Unknown',
      income: Number(e.income.toFixed(2)),
      expenses: Number(e.expenses.toFixed(2)),
      profit: Number((e.income - e.expenses).toFixed(2)),
    }));
  }, [filteredPayments, filteredExpenses, properties]);

  const totalIncome = useMemo(() => filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [filteredPayments]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [filteredExpenses]);
  const netResult = totalIncome - totalExpenses;

  const occupancyStats = useMemo(() => {
    const rel = selectedPropertyId ? locals.filter((l) => String(l.property_id || l.propertyId) === selectedPropertyId) : locals;
    const total = rel.length;
    const occupied = rel.filter((l) => l.status === 'occupied').length;
    const rate = total ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, rate };
  }, [locals, selectedPropertyId]);

  const handleRefresh = async () => { setRefreshing(true); await loadData(); showSuccess('Analytical pipelines refreshed.'); };

  const handleExport = () => {
    const payload = { range, propertyId: selectedPropertyId, totals: { income: totalIncome, expenses: totalExpenses, profit: netResult }, payments: filteredPayments, expenses: filteredExpenses };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `landlordpro-intel-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showSuccess('Biological data extracted to JSON terminal.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <Zap size={48} className="text-violet-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Interrogating Intel Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-12">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
              <Activity size={12} /> Strategic Intelligence Spectrum
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                Core <span className="text-violet-500">Reports</span>
              </h1>
              <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-violet-500" /> Aggregating longitudinal performance heuristics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="w-48">
              <Select
                options={RANGE_OPTIONS}
                value={RANGE_OPTIONS.find(o => o.value === range)}
                onChange={(o) => setRange(o.value)}
              />
            </div>
            <div className="w-64">
              <Select
                options={propertyOptions}
                value={propertyOptions.find(o => o.value === selectedPropertyId)}
                onChange={(o) => setSelectedPropertyId(o?.value || '')}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleRefresh} className="p-4 bg-gray-800/50 rounded-2xl text-violet-400 hover:bg-violet-500/10 transition-all border border-gray-700/50 shadow-xl">
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button onClick={handleExport} className="p-4 bg-violet-600 rounded-2xl text-white hover:bg-violet-500 transition-all shadow-xl shadow-violet-900/20">
                <Download size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Fiscal Inflow', val: formatCurrency(totalIncome), sub: `${filteredPayments.length} Signals`, icon: TrendingUp, color: 'emerald' },
            { label: 'Resource Outflow', val: formatCurrency(totalExpenses), sub: `${filteredExpenses.length} Impact Points`, icon: ArrowDownRight, color: 'rose' },
            { label: 'Net Yield', val: formatCurrency(netResult), sub: 'Portfolio Delta', icon: Target, color: 'violet' },
            { label: 'Occupancy Flow', val: `${occupancyStats.rate}%`, sub: `${occupancyStats.occupied}/${occupancyStats.total} Nodes`, icon: Home, color: 'sky' }
          ].map((kpi, idx) => (
            <Card key={idx} className="p-8 group relative overflow-hidden" hover={true}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                <kpi.icon size={48} className={`text-${kpi.color}-500`} />
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-500 uppercase italic tracking-widest">{kpi.label}</p>
                <div className="space-y-1">
                  <p className="text-3xl font-black italic tracking-tighter text-white leading-none">{kpi.val}</p>
                  <p className="text-[10px] font-black text-gray-500 uppercase italic">{kpi.sub}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Layer */}
        <Card className="p-10 border-gray-700/50" hover={false}>
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-800">
            <div>
              <h3 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-3 uppercase">
                <BarChart2 className="text-violet-500" /> Longitudinal Variance
              </h3>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] italic">Comparing inflow vs resource deletion vectors</p>
            </div>
            <div className="px-6 py-3 rounded-2xl bg-gray-900/50 border border-gray-800 text-[10px] font-black uppercase text-gray-400 tracking-widest italic">
              {start.toLocaleDateString()} — {end.toLocaleDateString()}
            </div>
          </div>

          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySeries}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748B' }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px', color: '#fff' }}
                />
                <Legend verticalAlign="top" height={50} align="right" />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorInc)" name="Inflow" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExp)" name="Outflow" />
                <Area type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorProf)" name="Net Yield" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-10 border-gray-700/50" hover={false}>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-10 flex items-center gap-3">
              <PieIcon size={24} className="text-pink-500" /> Drain Concentration
            </h3>
            <div className="h-[350px] flex items-center justify-center">
              {expenseByCategory.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={expenseByCategory} cx="50%" cy="50%" innerRadius={80} outerRadius={120} stroke="none" paddingAngle={8}>
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatCurrency(v)}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px', color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-600 font-black italic uppercase text-[10px] tracking-widest">No Signals Synthesized</p>}
            </div>
          </Card>

          <Card className="p-10 border-gray-700/50" hover={false}>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-10 flex items-center gap-3">
              <Layers size={24} className="text-violet-500" /> Node Performance Matrix
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={propertyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="property" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748B' }} />
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px', color: '#fff' }}
                  />
                  <Bar dataKey="income" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={20} name="Node Inflow" />
                  <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} name="Node Outflow" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;