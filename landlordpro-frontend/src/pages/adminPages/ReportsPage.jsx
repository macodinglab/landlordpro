import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    FileText, Download, TrendingUp, TrendingDown, DollarSign, Users, RefreshCw,
    PieChart as PieChartIcon
} from 'lucide-react';
import { getFinancialSummary, getOccupancyStats, getRentRoll, getArrearsReport, getLeaseExpirations, getVacancyReport } from '../../services/reportService';
import { exportFinancialPDF, exportRentRollExcel } from '../../utils/reportExport';
import { showError } from '../../utils/toastHelper';
import { AlertCircle, Clock, List, Home, Activity, Zap, CalendarCheck } from 'lucide-react';
import { Card } from '../../components';

const COLORS = ['#14b8a6', '#6366f1', '#f43f5e', '#ec4899', '#f59e0b', '#06b6d4'];

const ReportsPage = ({ propertyId: initialPropertyId = null, propertyOptions = [] }) => {
    const [loading, setLoading] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId);
    const [financialData, setFinancialData] = useState(null);
    const [occupancyData, setOccupancyData] = useState(null);
    const [rentRollData, setRentRollData] = useState([]);
    const [arrearsData, setArrearsData] = useState([]);
    const [expiryData, setExpiryData] = useState([]);
    const [vacancyData, setVacancyData] = useState([]);

    // Date Filters - Default to current month
    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchAllData();
    }, [startDate, endDate, selectedPropertyId]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const fin = await getFinancialSummary({ startDate, endDate, propertyId: selectedPropertyId });
            const occ = await getOccupancyStats(selectedPropertyId);
            const rr = await getRentRoll(selectedPropertyId);
            const arr = await getArrearsReport(selectedPropertyId);
            const exp = await getLeaseExpirations(selectedPropertyId, 90); // Next 90 days
            const vac = await getVacancyReport(selectedPropertyId);

            setFinancialData(fin);
            setOccupancyData(occ);
            setRentRollData(rr);
            setArrearsData(arr);
            setExpiryData(exp);
            setVacancyData(vac);
        } catch (err) {
            console.error(err);
            showError('Failed to load some report data');
        } finally {
            setLoading(false);
        }
    };

    const setDateRange = (range) => {
        const today = new Date();
        let start, end = today;

        switch (range) {
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'thisYear':
                start = new Date(today.getFullYear(), 0, 1);
                break;
            case 'last30Days':
                start = new Date();
                start.setDate(today.getDate() - 30);
                break;
            default:
                return;
        }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(val);
    const formattedDate = (date) => new Date(date).toLocaleDateString();

    const expenseData = financialData?.expensesByCategory
        ? Object.entries(financialData.expensesByCategory).map(([name, value]) => ({ name, value }))
        : [];

    const incomeVsExpenseData = [
        { name: 'Income', amount: financialData?.totalIncome || 0 },
        { name: 'Expenses', amount: financialData?.totalExpense || 0 },
    ];

    return (
        <div className="space-y-12">
            <div className="max-w-[1600px] mx-auto space-y-12">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                            <Activity size={12} /> Executive Intelligence Portal
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                                Tactical <span className="text-teal-500">Reports</span>
                            </h1>
                            <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                                Real-time financial and operational manifestations
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 w-full md:w-auto">
                        {/* Property Filter (if options provided) */}
                        {propertyOptions.length > 0 && (
                            <div className="relative group max-w-sm md:ml-auto w-full">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                    <Home size={16} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
                                </div>
                                <select
                                    value={selectedPropertyId || ''}
                                    onChange={(e) => setSelectedPropertyId(e.target.value || null)}
                                    className="w-full h-14 pl-14 pr-10 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest text-white appearance-none focus:outline-none focus:border-teal-500/30 transition-all cursor-pointer italic shadow-inner"
                                >
                                    <option value="" className="bg-gray-950">GLOBAL PORTFOLIO</option>
                                    {propertyOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value} className="bg-gray-950">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 justify-end">
                            {['thisMonth', 'lastMonth', 'thisYear'].map((rangeKey) => (
                                <button
                                    key={rangeKey}
                                    onClick={() => setDateRange(rangeKey)}
                                    className="px-6 py-3 rounded-xl bg-gray-800/40 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 border border-gray-700/50 transition-all italic"
                                >
                                    {rangeKey.replace(/([A-Z])/g, ' $1').trim()}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-4 items-center bg-gray-800/40 p-4 rounded-[1.5rem] border border-gray-700/50 justify-end shadow-2xl">
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl group focus-within:border-teal-500/30 transition-all">
                                <CalendarCheck size={16} className="text-gray-600 group-focus-within:text-teal-500" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-transparent border-none text-white font-black italic text-[11px] outline-none w-32 uppercase"
                                />
                            </div>
                            <span className="text-gray-700 font-black text-[10px] italic">TO</span>
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl group focus-within:border-teal-500/30 transition-all">
                                <CalendarCheck size={16} className="text-gray-600 group-focus-within:text-teal-500" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent border-none text-white font-black italic text-[11px] outline-none w-32 uppercase"
                                />
                            </div>
                            <button
                                onClick={fetchAllData}
                                className="p-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-2xl transition-all active:scale-95 ml-2"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Layer */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { title: 'Net Signal', value: formatCurrency(financialData?.netIncome || 0), color: 'teal', icon: DollarSign },
                        { title: 'Total Inflow', value: formatCurrency(financialData?.totalIncome || 0), color: 'indigo', icon: TrendingUp },
                        { title: 'Total Outflow', value: formatCurrency(financialData?.totalExpense || 0), color: 'rose', icon: TrendingDown },
                        { title: 'Sector Reach', value: `${occupancyData?.occupancyRate || 0}%`, sub: `${occupancyData?.vacantUnits || 0} Vacant`, color: 'teal', icon: Users },
                    ].map((kpi, idx) => {
                        const colorClass = kpi.color === 'teal' ? 'text-teal-500' : kpi.color === 'indigo' ? 'text-indigo-500' : 'text-rose-500';
                        return (
                            <Card key={idx} className="p-8 border-gray-700/50 relative overflow-hidden group" hover={true}>
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                                    <kpi.icon size={48} className={colorClass} />
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase italic tracking-widest">{kpi.title}</p>
                                    <div className="space-y-1">
                                        <p className={`text-2xl font-black italic tracking-tighter text-white leading-none`}>
                                            <span className={colorClass}>{kpi.value.split(' ')[0]}</span> {kpi.value.split(' ')[1]}
                                        </p>
                                        {kpi.sub && <p className="text-[10px] font-black text-gray-500 uppercase italic">{kpi.sub}</p>}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Risk & Critical Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Arrears Report */}
                    <Card className="p-8 border-rose-500/20 bg-rose-500/5" hover={false}>
                        <div className="flex justify-between items-center mb-8 border-b border-rose-500/10 pb-4">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                <AlertCircle size={24} className="text-rose-500" />
                                Arrears Critical Alert
                            </h3>
                            <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full">{arrearsData.length}</span>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {arrearsData.length > 0 ? arrearsData.map((item) => (
                                <div key={item.leaseId} className="p-5 rounded-2xl bg-gray-950/50 border border-rose-500/10 flex justify-between items-center group/item hover:bg-rose-500/5 transition-all">
                                    <div>
                                        <p className="font-black text-white italic uppercase text-sm tracking-tight">{item.tenantName}</p>
                                        <p className="text-[10px] font-black text-gray-500 uppercase mt-1">{item.property} // Unit {item.unit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-rose-500 italic tracking-tighter leading-none">{formatCurrency(item.monthlyRent)}</p>
                                        <p className="text-[9px] font-black text-rose-400 uppercase mt-1 italic animate-pulse">{item.daysLate} DAYS LATE</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-20 text-center space-y-4 opacity-30">
                                    <Zap size={48} className="mx-auto text-emerald-500" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Financial Matrix Nominal // No Arrears</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Expirations */}
                    <Card className="p-8 border-teal-500/20 bg-teal-500/5" hover={false}>
                        <div className="flex justify-between items-center mb-8 border-b border-teal-500/10 pb-4">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                <Clock size={24} className="text-teal-500" />
                                Lease Use-By Dates
                            </h3>
                            <span className="bg-teal-500 text-white text-[10px] font-black px-3 py-1 rounded-full">{expiryData.length}</span>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border-teal-500/5">
                            {expiryData.length > 0 ? expiryData.map((item) => (
                                <div key={item.leaseId} className="p-5 rounded-2xl bg-gray-950/50 border border-teal-500/10 flex justify-between items-center group/item hover:bg-teal-500/5 transition-all">
                                    <div>
                                        <p className="font-black text-white italic uppercase text-sm tracking-tight">{item.tenantName}</p>
                                        <p className="text-[10px] font-black text-gray-500 uppercase mt-1">{item.property} // Unit {item.unit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-teal-500 italic tracking-tighter leading-none">{item.daysRemaining} Days Left</p>
                                        <p className="text-[9px] font-black text-gray-500 uppercase mt-1 italic">EXPIRES {formattedDate(item.expiryDate)}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-20 text-center space-y-4 opacity-30">
                                    <Clock size={48} className="mx-auto text-gray-500" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">No expirations detected in 90D range</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Visual Data Layer */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="p-10 border-gray-700/50" hover={false}>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-10 flex items-center gap-3">
                            <TrendingUp size={24} className="text-teal-500" />
                            Financial Performance spectrum
                        </h3>
                        <div className="h-[400px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={incomeVsExpenseData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(51, 65, 85, 0.4)' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px', color: '#fff' }}
                                    />
                                    <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
                                        {incomeVsExpenseData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-10 border-gray-700/50" hover={false}>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-10 flex items-center gap-3">
                            <PieChartIcon size={24} className="text-pink-500" />
                            Expense Node Distribution
                        </h3>
                        <div className="h-[400px] w-full flex items-center justify-center min-w-0">
                            {expenseData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <PieChart>
                                        <Pie
                                            data={expenseData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={130}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {expenseData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(15, 23, 42, 0.5)" strokeWidth={4} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(val) => formatCurrency(val)}
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px', color: '#fff' }}
                                        />
                                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="text-gray-600 font-black italic uppercase text-[10px] tracking-widest">No signals synthesized</p>}
                        </div>
                    </Card>
                </div>

                {/* Operations Layer */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
                    <Card className="p-8 border-gray-700/50" hover={false}>
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                <List size={24} className="text-teal-500" />
                                Global Rent Roll
                            </h3>
                        </div>

                        {/* Mobile Feed */}
                        <div className="md:hidden divide-y divide-gray-700/30">
                            {rentRollData.length === 0 ? (
                                <div className="py-10 text-center italic text-gray-500 font-black uppercase text-[10px]">No records found</div>
                            ) : (
                                rentRollData.map((lease) => (
                                    <div key={lease.leaseId} className="py-4 space-y-2 group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-black text-white italic text-sm">{lease.unit}</p>
                                                <p className="text-[9px] font-black text-gray-500 uppercase">{lease.property}</p>
                                            </div>
                                            <p className="text-lg font-black text-emerald-400 italic tracking-tighter leading-none">{formatCurrency(lease.monthlyRent)}</p>
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase italic truncate">{lease.tenantName}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="hidden md:block overflow-x-auto max-h-[500px] custom-scrollbar">
                            <table className="w-full text-left table-auto">
                                <thead className="bg-gray-950/50 text-[9px] font-black text-gray-500 uppercase tracking-widest italic sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Node Unit</th>
                                        <th className="px-6 py-4">Entity</th>
                                        <th className="px-6 py-4 text-right">Valuation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/30">
                                    {rentRollData.map((lease) => (
                                        <tr key={lease.leaseId} className="hover:bg-gray-800/20 transition-all border-l-2 border-transparent hover:border-violet-500">
                                            <td className="px-6 py-5">
                                                <p className="font-black text-white italic text-sm">{lease.unit}</p>
                                                <p className="text-[9px] font-black text-gray-500 uppercase">{lease.property}</p>
                                            </td>
                                            <td className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase italic">{lease.tenantName}</td>
                                            <td className="px-6 py-5 text-right font-black text-emerald-400 italic text-lg">{formatCurrency(lease.monthlyRent)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="p-8 border-amber-500/20 bg-amber-500/5" hover={false}>
                        <div className="flex justify-between items-center mb-8 border-b border-amber-500/10 pb-4">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                <Home size={24} className="text-amber-500" />
                                Vacancy Manifest
                            </h3>
                        </div>

                        {/* Mobile Feed */}
                        <div className="md:hidden divide-y divide-amber-500/10">
                            {vacancyData.length === 0 ? (
                                <div className="py-10 text-center italic text-gray-400 font-black uppercase text-[10px]">No vacancies detected</div>
                            ) : (
                                vacancyData.map((unit) => (
                                    <div key={unit.localId} className="py-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-black text-white italic text-sm">{unit.unit}</p>
                                                <p className="text-[9px] font-black text-gray-500 uppercase">{unit.property}</p>
                                            </div>
                                            <p className="text-lg font-black text-gray-400 italic tracking-tighter leading-none">{formatCurrency(unit.price)}</p>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase italic">
                                            <span className="text-amber-400">{unit.daysVacant} DAYS VACANT</span>
                                            <span className="text-gray-500">{unit.size} M²</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="hidden md:block overflow-x-auto max-h-[500px] custom-scrollbar">
                            <table className="w-full text-left table-auto">
                                <thead className="bg-amber-950/20 text-[9px] font-black text-amber-500/50 uppercase tracking-widest italic sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Sector Hub</th>
                                        <th className="px-6 py-4">Duration</th>
                                        <th className="px-6 py-4 text-right">Potential Load</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-500/10">
                                    {vacancyData.map((unit) => (
                                        <tr key={unit.localId} className="hover:bg-amber-500/5 transition-all border-l-2 border-transparent hover:border-amber-500">
                                            <td className="px-6 py-5">
                                                <p className="font-black text-white italic text-sm">{unit.unit}</p>
                                                <p className="text-[9px] font-black text-gray-500 uppercase">{unit.property}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[11px] font-black text-amber-400 uppercase italic leading-none">{unit.daysVacant} DAYS VACANT</p>
                                                <p className="text-[9px] font-black text-gray-500 mt-1 uppercase">{unit.size} M²</p>
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-gray-400 italic text-lg">{formatCurrency(unit.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Export Command Center */}
                <div className="bg-gradient-to-r from-teal-600 to-indigo-700 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                        <Download size={150} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Command Extraction</h2>
                            <p className="text-teal-100/70 font-black text-[10px] uppercase tracking-widest italic">Deploying professional intelligence artifacts for stakeholders</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => exportFinancialPDF(financialData, { startDate, endDate })}
                                disabled={!financialData}
                                className="px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest text-white shadow-2xl transition-all active:scale-95 disabled:opacity-30 group/btn"
                            >
                                <FileText size={18} className="inline mr-2 group-hover/btn:scale-125 transition-transform" /> Financial Terminal PDF
                            </button>
                            <button
                                onClick={() => exportRentRollExcel(rentRollData)}
                                disabled={!rentRollData.length}
                                className="px-10 py-5 bg-white text-teal-950 hover:bg-teal-50 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-30 group/btn"
                            >
                                <Download size={18} className="inline mr-2 group-hover/btn:translate-y-1 transition-transform" /> Rent Roll Matrix Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
