// src/pages/ManagerDashboard.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spinner, Button } from '../../components';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Home,
  Users,
  CalendarCheck,
  RefreshCcw,
  Building2,
  CreditCard,
  LayoutDashboard,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import useManagerPortfolio from '../../hooks/useManagerPortfolio';

const COLORS = ['#14b8a6', '#6366f1', '#3b82f6', '#0ea5e9', '#f59e0b', '#ef4444'];

const buildMonthlySeries = (items, getDate, getValue, months = 6) => {
  const now = new Date();
  const series = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    series.push({
      key,
      month: date.toLocaleString('default', { month: 'short' }),
      amount: 0,
      count: 0,
    });
  }

  items.forEach((item) => {
    const date = getDate(item);
    if (!date || Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const entry = series.find((item) => item.key === key);
    if (entry) {
      entry.amount += Number(getValue(item)) || 0;
      entry.count += 1;
    }
  });

  return series.map(({ month, amount, count }) => ({
    month,
    payments: Number(amount.toFixed(2)),
    leases: count,
  }));
};

const ManagerDashboard = () => {
  const {
    properties,
    locals,
    leases,
    payments,
    floors,
    loading,
    refresh,
  } = useManagerPortfolio();

  const navigate = useNavigate();

  const propertyNameMap = useMemo(
    () =>
      new Map(properties.map((property) => [property.id, property.name || 'Unnamed Property'])),
    [properties]
  );

  const localMap = useMemo(
    () =>
      new Map(
        locals.map((local) => [
          local.id,
          {
            ...local,
            reference: local.reference_code || local.referenceCode || 'Unknown Unit',
          },
        ])
      ),
    [locals]
  );

  const totalProperties = properties.length;
  const totalUnits = locals.length;
  const totalFloors = floors?.length || 0;
  const occupiedUnits = locals.filter((local) => local.status === 'occupied').length;
  const availableUnits = locals.filter((local) => local.status === 'available').length;
  const maintenanceUnits = totalUnits - occupiedUnits - availableUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const uniqueTenantCount = useMemo(() => {
    const tenantIds = new Set();
    leases.forEach((lease) => {
      if (lease?.tenant?.id) tenantIds.add(lease.tenant.id);
    });
    return tenantIds.size;
  }, [leases]);

  const upcomingPayments = useMemo(() => {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setDate(now.getDate() + 30);
    return payments.filter((payment) => {
      const end = new Date(payment.endDate || payment.end_date || payment.created_at);
      if (Number.isNaN(end.getTime())) return false;
      return end >= now && end <= nextMonth;
    }).length;
  }, [payments]);

  const paymentTrend = useMemo(
    () =>
      buildMonthlySeries(
        payments,
        (payment) => new Date(payment.endDate || payment.end_date || payment.created_at),
        (payment) => payment.amount
      ),
    [payments]
  );

  const occupancyData = useMemo(
    () => [
      { name: 'Occupied', value: occupiedUnits },
      { name: 'Available', value: availableUnits },
      { name: 'Maintenance', value: maintenanceUnits },
    ],
    [occupiedUnits, availableUnits, maintenanceUnits]
  );

  const recentTenants = useMemo(() => {
    const sorted = [...leases].sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.startDate || a.created_at || 0).getTime();
      const bDate = new Date(b.updatedAt || b.startDate || b.created_at || 0).getTime();
      return bDate - aDate;
    });

    return sorted.slice(0, 8).map((lease) => {
      const localInfo = lease.localId ? localMap.get(lease.localId) : null;
      const propertyName = lease.propertyId ? propertyNameMap.get(lease.propertyId) : '—';
      return {
        id: lease.id,
        tenant: lease.tenant?.name || 'Unknown tenant',
        unit: localInfo?.reference || lease.local?.referenceCode || '—',
        property: propertyName || '—',
        endDate: lease.endDate || lease.end_date,
        status: lease.status || 'active',
      };
    });
  }, [leases, localMap, propertyNameMap]);

  const totalPaymentAmount = payments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );

  const formatCurrency = (val) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(val);

  const metricCards = [
    {
      title: 'Properties',
      value: totalProperties,
      subtitle: `${totalUnits} managed units`,
      icon: Home,
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
    {
      title: 'Floors',
      value: totalFloors,
      subtitle: 'Total levels managed',
      icon: Building2,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Tenants',
      value: uniqueTenantCount,
      subtitle: `${leases.length} active leases`,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      title: 'Monthly Inflow',
      value: formatCurrency(totalPaymentAmount),
      subtitle: `${upcomingPayments} upcoming payments`,
      icon: CreditCard,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold uppercase tracking-widest italic text-[10px]">Aggregating Matrix Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-teal-950 via-indigo-950 to-slate-950 text-white rounded-[2rem] border border-gray-800/50 mt-8">
        {/* Abstract shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[1600px] mx-auto px-8 py-12 space-y-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                  <LayoutDashboard size={12} /> Live Matrix Feed
                </div>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Portfolio <span className="text-teal-500">Pulse</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Real-time synchronization of assigned assets
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800 text-white backdrop-blur border border-gray-700/50 transition-all font-black uppercase text-[10px] tracking-widest italic px-6 py-4 rounded-xl shadow-2xl"
                onClick={refresh}
              >
                <RefreshCcw className="w-4 h-4" />
                Resync Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric) => (
          <div key={metric.title} className="bg-gray-800/40 backdrop-blur-sm p-6 rounded-[1.5rem] shadow-2xl border border-gray-700/50 flex flex-col justify-between h-40 group hover:border-teal-500/30 transition-all duration-500">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest italic">{metric.title}</span>
              <div className={`p-3 rounded-xl bg-gray-900 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                <metric.icon size={20} className="text-teal-500" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black tracking-tighter text-white italic truncate pr-2 uppercase">{metric.value}</div>
              <div className="text-[10px] font-black text-gray-600 mt-1 uppercase italic tracking-wider">{metric.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="bg-gray-800/40 backdrop-blur-sm p-8 rounded-[2rem] shadow-2xl border border-gray-700/50 xl:col-span-2">
          <h2 className="text-sm font-black text-white italic uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 rounded-lg">
              <TrendingUp size={18} className="text-teal-400" />
            </div>
            Node Performance Velocity
          </h2>
          {paymentTrend.length > 0 ? (
            <div className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={paymentTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900 }} tickFormatter={(val) => `${val / 1000}k`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900 }} />
                  <Tooltip
                    cursor={{ stroke: '#14b8a6', strokeWidth: 2 }}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)' }}
                    itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic' }}
                  />
                  <Legend iconType="circle" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="payments"
                    name="Payments (FRW)"
                    stroke="#14b8a6"
                    strokeWidth={4}
                    dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="leases"
                    name="New Leases"
                    stroke="#6366f1"
                    strokeWidth={4}
                    dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 italic font-black uppercase text-[10px] tracking-widest bg-gray-900 shadow-inner rounded-xl border border-gray-800">No activity detected within current matrix.</div>
          )}
        </div>

        {/* Occupancy Chart */}
        <div className="bg-gray-800/40 backdrop-blur-sm p-8 rounded-[2rem] shadow-2xl border border-gray-700/50">
          <h2 className="text-sm font-black text-white italic uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Building2 size={18} className="text-indigo-400" />
            </div>
            Occupancy Matrix
          </h2>
          {totalUnits > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={occupancyData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {occupancyData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 text-center">
                <p className="text-5xl font-black text-white italic tracking-tighter mb-4">{occupancyRate}%</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-[9px] font-black italic px-3 py-1.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20 uppercase tracking-widest">{occupiedUnits} Occupied</span>
                  <span className="text-[9px] font-black italic px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 uppercase tracking-widest">{availableUnits} Available</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 italic font-black uppercase text-[10px] tracking-widest bg-gray-900 shadow-inner rounded-xl border border-gray-800">No unit information detected.</div>
          )}
        </div>
      </div>

      {/* Recent Tenants Table */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-[2rem] shadow-2xl border border-gray-700/50 overflow-hidden">
        <div className="p-8 border-b border-gray-700/30 flex justify-between items-center bg-gray-900/40">
          <h2 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Users size={18} className="text-emerald-400" />
            </div>
            Resident Identity Stream
          </h2>
          <Button
            variant="ghost"
            className="text-[10px] font-black text-teal-400 uppercase italic tracking-widest hover:bg-teal-500/10 flex items-center gap-2"
            onClick={() => navigate('/manager/tenants')}
          >
            Expand History <ArrowRight size={14} />
          </Button>
        </div>

        {recentTenants.length > 0 ? (
          <div className="overflow-hidden">
            {/* Mobile Feed */}
            <div className="md:hidden divide-y divide-gray-700/30 px-6">
              {recentTenants.map((tenant) => (
                <div key={tenant.id} className="py-6 space-y-4 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-white italic uppercase tracking-tighter text-sm group-hover:text-teal-400 transition-colors uppercase">{tenant.tenant}</h3>
                      <p className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest mt-1 uppercase">{tenant.property}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[8px] font-black uppercase italic tracking-widest ${tenant.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                    >
                      {tenant.status === 'active' ? 'Operational' : 'Expiring'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black italic tracking-widest uppercase">
                    <div className="text-gray-400 bg-gray-900 shadow-inner px-3 py-1.5 rounded-lg border border-gray-800">UNIT: {tenant.unit}</div>
                    <div className="text-gray-600">END: {tenant.endDate ? new Date(tenant.endDate).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Identity</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Node Unit</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Asset Property</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Termination</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  {recentTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-700/20 transition-all group border-l-2 border-transparent hover:border-teal-500">
                      <td className="px-8 py-5">
                        <div className="font-black text-white italic uppercase text-xs tracking-tight group-hover:text-teal-400 transition-colors uppercase">{tenant.tenant}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-black text-gray-400 bg-gray-900 px-3 py-1.5 rounded-lg inline-block text-[10px] italic tracking-widest uppercase border border-gray-800 shadow-inner">
                          {tenant.unit}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase italic tracking-widest truncate max-w-[150px]">{tenant.property}</td>
                      <td className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase italic tracking-widest">
                        {tenant.endDate
                          ? new Date(tenant.endDate).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase italic tracking-widest ${tenant.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)] ${tenant.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                          {tenant.status === 'active' ? 'Operational' : 'Expiring'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-24 text-center text-gray-600 italic font-black uppercase text-[10px] tracking-widest">No resident data synchronized.</div>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;


