import React, { useState, useEffect } from 'react';
import {
  Home,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Building,
  Activity,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { getFinancialSummary, getOccupancyStats } from '../../services/reportService';
import { getAllExpenses } from '../../services/expenseService';
import { getAllPayments } from '../../services/paymentService';
import { getAllTenants } from '../../services/tenantService';
import { getAllProperties } from '../../services/propertyService';
import { showError } from '../../utils/toastHelper';
import { Card, Button } from '../../components';

const COLORS = ['#0D9488', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6'];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const AdminDashboard = () => {
  const [range, setRange] = useState('6m');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dashboard Data State
  const [financialData, setFinancialData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    monthlyStats: []
  });
  const [stats, setStats] = useState({
    properties: 0,
    tenants: 0,
    paymentsCount: 0,
    expensesCount: 0,
    occupancyRate: 0,
    occupiedUnits: 0,
    totalUnits: 0
  });
  const [recentTenants, setRecentTenants] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [propertyPerformance, setPropertyPerformance] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);

  const [visibleLines, setVisibleLines] = useState({
    income: true,
    expenses: true,
    profit: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        financialRes,
        paymentsRes,
        expensesRes,
        tenantsRes,
        propertiesRes,
        occupancyRes
      ] = await Promise.allSettled([
        getFinancialSummary({ range }),
        getAllPayments(),
        getAllExpenses({ limit: 100 }),
        getAllTenants(1, 10),
        getAllProperties(1, 100),
        getOccupancyStats()
      ]);

      if (financialRes.status === 'fulfilled' && financialRes.value) {
        const data = financialRes.value;
        setFinancialData(prev => ({
          ...prev,
          totalIncome: data.totalIncome || 0,
          totalExpenses: data.totalExpense || 0,
          netProfit: data.netIncome || 0,
        }));

        if (data.expensesByCategory) {
          const categories = Object.entries(data.expensesByCategory).map(([name, value]) => ({
            name,
            value
          }));
          setExpenseCategories(categories);
        } else if (data.totalExpense > 0) {
          setExpenseCategories([{ name: 'Uncategorized', value: data.totalExpense }]);
        } else {
          setExpenseCategories([]);
        }
      }

      const allPayments = paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value)
        ? paymentsRes.value
        : [];
      const allExpenses = expensesRes.status === 'fulfilled' && expensesRes.value?.data && Array.isArray(expensesRes.value.data)
        ? expensesRes.value.data
        : [];

      setStats(prev => ({
        ...prev,
        paymentsCount: allPayments.length,
        expensesCount: allExpenses.length
      }));

      const monthsLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trendData = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        trendData.push({
          month: monthsLabel[d.getMonth()],
          monthIdx: d.getMonth(),
          year: d.getFullYear(),
          income: 0,
          expenses: 0,
          profit: 0
        });
      }

      allPayments.forEach(p => {
        const pDate = new Date(p.date || p.created_at);
        if (isNaN(pDate.getTime())) return;
        const monthSlot = trendData.find(m => m.monthIdx === pDate.getMonth() && m.year === pDate.getFullYear());
        if (monthSlot) monthSlot.income += Number(p.amount || 0);
      });

      allExpenses.forEach(e => {
        const eDate = new Date(e.payment_date || e.created_at);
        if (isNaN(eDate.getTime())) return;
        const monthSlot = trendData.find(m => m.monthIdx === eDate.getMonth() && m.year === eDate.getFullYear());
        if (monthSlot) monthSlot.expenses += (Number(e.amount || 0) + Number(e.vat_amount || 0));
      });

      trendData.forEach(m => m.profit = m.income - m.expenses);
      setFinancialData(prev => ({ ...prev, monthlyStats: trendData }));

      setRecentExpenses(allExpenses.slice(0, 5).map(e => ({
        id: e.id,
        description: e.description || 'Expense',
        category: e.category || 'General',
        amount: e.amount,
        date: e.payment_date || e.created_at || new Date().toISOString(),
        status: e.payment_status || 'pending'
      })));

      if (tenantsRes.status === 'fulfilled' && tenantsRes.value) {
        const { tenants, total } = tenantsRes.value;
        setStats(prev => ({ ...prev, tenants: total || (tenants ? tenants.length : 0) }));
        if (Array.isArray(tenants)) {
          setRecentTenants(tenants.slice(0, 5).map(t => ({
            id: t.id,
            name: t.name,
            unit: 'N/A',
            status: 'active'
          })));
        }
      }

      if (occupancyRes.status === 'fulfilled' && occupancyRes.value) {
        const o = occupancyRes.value;
        setStats(prev => ({
          ...prev,
          totalUnits: o.totalUnits || 0,
          occupiedUnits: o.occupiedUnits || 0,
          occupancyRate: o.occupancyRate || 0
        }));
      }

      if (propertiesRes.status === 'fulfilled' && propertiesRes.value) {
        const { properties } = propertiesRes.value;
        const props = Array.isArray(properties) ? properties : [];
        setStats(prev => ({ ...prev, properties: props.length }));

        const performance = props.slice(0, 5).map(p => {
          const propIncome = allPayments
            .filter(pay => pay.propertyId === p.id)
            .reduce((sum, pay) => sum + Number(pay.amount || 0), 0);

          const propExpenses = allExpenses
            .filter(exp => exp.property_id === p.id)
            .reduce((sum, exp) => sum + Number(exp.amount || 0) + Number(exp.vat_amount || 0), 0);

          return {
            property: p.name,
            income: propIncome,
            expenses: propExpenses
          };
        });

        setPropertyPerformance(performance);
      }

    } catch (error) {
      console.error("Dashboard fetch error:", error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const summaryCards = [
    {
      title: 'Total Income',
      value: formatCurrency(financialData.totalIncome),
      subtitle: `${stats.paymentsCount} payments`,
      icon: TrendingUp,
      change: 'Active',
      positive: true,
      color: 'teal'
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(financialData.totalExpenses),
      subtitle: `${stats.expensesCount} records`,
      icon: TrendingDown,
      change: 'Cash Out',
      positive: false,
      color: 'rose'
    },
    {
      title: 'Net Profit',
      value: formatCurrency(financialData.netProfit),
      subtitle: financialData.netProfit >= 0 ? 'Positive Flow' : 'Negative Flow',
      icon: DollarSign,
      change: financialData.netProfit >= 0 ? 'Profitable' : 'Loss',
      positive: financialData.netProfit >= 0,
      color: 'indigo'
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyRate}%`,
      subtitle: `${stats.occupiedUnits}/${stats.totalUnits} units`,
      icon: Home,
      change: 'Live',
      positive: true,
      color: 'violet'
    },
  ];

  if (loading && !refreshing && financialData.totalIncome === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <Card className="p-6 md:p-8 bg-gray-800/40 backdrop-blur-sm border-gray-700/50" hover={false}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase italic tracking-tighter">
                Admin <span className="text-teal-500">Dashboard</span>
              </h1>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic">
                Strategic Property Intelligence
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex rounded-[1rem] border border-gray-700 bg-gray-800/50 p-1">
                {['3m', '6m', '12m'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setRange(option)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-[0.8rem] transition-all italic ${range === option
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    {option === '3m' ? '90 Days' : option === '6m' ? '6 Months' : '1 Year'}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="lg:w-auto px-8"
              >
                <div className="flex items-center gap-2">
                  <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
                  <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
                </div>
              </Button>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {summaryCards.map((card) => (
            <Card
              key={card.title}
              className="p-6 bg-gray-800/40 backdrop-blur-sm border-gray-700/50"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-${card.color}-500/10 text-${card.color}-400`}>
                  <card.icon size={28} />
                </div>
                <span className={`text-[10px] font-black uppercase italic tracking-widest px-3 py-1 rounded-full border ${card.positive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                  }`}>
                  {card.change}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">{card.title}</p>
                <h3 className="text-2xl font-black text-white italic tracking-tight">{card.value}</h3>
                <p className="text-gray-400 text-xs font-bold italic">{card.subtitle}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Properties', value: stats.properties, icon: Building, color: 'teal' },
            { label: 'Tenants', value: stats.tenants, icon: Users, color: 'indigo' },
            { label: 'Avg Income', value: stats.properties ? formatCurrency(financialData.totalIncome / stats.properties) : formatCurrency(0), icon: Wallet, color: 'violet' },
            { label: 'Ratio', value: `${financialData.totalIncome ? ((financialData.totalExpenses / financialData.totalIncome) * 100).toFixed(1) : 0}%`, icon: Activity, color: 'rose' }
          ].map((item, idx) => (
            <Card key={idx} className="p-4 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl bg-${item.color}-500/10 text-${item.color}-400`}>
                <item.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{item.label}</p>
                <p className="text-xl font-black text-white italic tracking-tighter">{item.value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Financial Chart */}
        <Card className="p-6 md:p-8 bg-gray-800/40 backdrop-blur-sm border-gray-700/50" hover={false}>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-1">Financial Analysis</h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Node performance monitoring</p>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              {[
                { key: 'income', label: 'Income', color: 'bg-teal-500' },
                { key: 'expenses', label: 'Expenses', color: 'bg-rose-500' },
                { key: 'profit', label: 'Profit', color: 'bg-indigo-500' }
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setVisibleLines(prev => ({ ...prev, [m.key]: !prev[m.key] }))}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${visibleLines[m.key]
                    ? 'bg-gray-700/50 border-gray-600 shadow-lg'
                    : 'bg-transparent border-gray-800 opacity-40'
                    }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${m.color} shadow-[0_0_8px_rgba(0,0,0,0.5)]`}></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={financialData.monthlyStats}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#4B5563"
                  tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 900 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#4B5563"
                  tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 900 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '1.5rem',
                    padding: '20px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(12px)'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', marginBottom: '12px', fontSize: '10px' }}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                {visibleLines.income && (
                  <Area type="monotone" dataKey="income" stroke="#0D9488" strokeWidth={4} fill="url(#colorIncome)" />
                )}
                {visibleLines.expenses && (
                  <Area type="monotone" dataKey="expenses" stroke="#F43F5E" strokeWidth={4} fill="url(#colorExpenses)" />
                )}
                {visibleLines.profit && (
                  <Area type="monotone" dataKey="profit" stroke="#6366F1" strokeWidth={4} fill="url(#colorProfit)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Leases */}
          <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Active Leases</h2>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Synchronized registry</p>
              </div>
              <Button variant="outline" className="px-6 py-2.5 rounded-xl border-gray-700 text-[10px]">Registry</Button>
            </div>

            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="w-full hidden sm:table">
                <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">
                  <tr>
                    <th className="px-6 py-4 text-left">Entity</th>
                    <th className="px-6 py-4 text-left">Sector</th>
                    <th className="px-6 py-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  {recentTenants.map((tenant) => (
                    <tr key={tenant.id} className="group/row hover:bg-gray-700/20 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center text-xs font-black italic border border-teal-500/20 group-hover/row:scale-110 transition-transform">
                            {tenant.name.charAt(0)}
                          </div>
                          <span className="font-bold text-white text-sm italic">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-gray-400 bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-600/30 italic uppercase">
                          {tenant.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20 italic uppercase">
                          <Activity size={12} className="mr-1.5" />
                          {tenant.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Feed */}
              <div className="sm:hidden divide-y divide-gray-700/30">
                {recentTenants.map((tenant) => (
                  <div key={tenant.id} className="p-4 space-y-3 hover:bg-gray-700/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center text-[10px] font-black italic border border-teal-500/20">
                          {tenant.name.charAt(0)}
                        </div>
                        <span className="font-bold text-white text-xs italic">{tenant.name}</span>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-[8px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20 italic uppercase">
                        {tenant.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase italic text-gray-400">
                      <span>Sector Identity</span>
                      <span className="text-white">{tenant.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Recent Expenditure */}
          <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Expenditure Log</h2>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Capital outflow monitoring</p>
              </div>
              <Button variant="outline" className="px-6 py-2.5 rounded-xl border-gray-700 text-[10px]">Full Log</Button>
            </div>

            <div className="divide-y divide-gray-700/30">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="p-6 group/item hover:bg-gray-700/20 transition-all">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 group-hover/item:scale-110 transition-transform">
                        <TrendingDown size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm italic mb-1 truncate">{expense.description}</h4>
                        <div className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">
                          <span className="text-rose-400/80">{expense.category}</span>
                          <span>•</span>
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white mb-2 italic tracking-tight">-{formatCurrency(expense.amount)}</p>
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase italic tracking-widest ${expense.status === 'paid' || expense.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                        {expense.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;