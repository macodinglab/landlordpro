import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Select } from '../../components';
import {
  Edit3,
  Plus,
  Trash2,
  Search,
  RefreshCcw,
  User,
  Briefcase,
  DollarSign,
  Calendar,
  Download,
  FileText,
  Filter,
  Activity,
  ShieldCheck,
  Zap,
  Layers,
  TrendingUp,
  Users,
  Building,
  Mail,
  Phone,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  IdCard,
  Image as ImageIcon,
  Wallet
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { getAllStaff, createStaff, updateStaff, deleteStaff, restoreStaff } from '../../services/staffService';
import { uploadImage } from '../../services/uploadService';
import useCurrentUser from '../../hooks/useCurrentUser';
import { showSuccess, showError, showInfo } from '../../utils/toastHelper';

const StaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editData, setEditData] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    base_salary: '',
    allowance: '',
    currency: 'RWF',
    social_security_number: '',
    national_id: '',
    picture_url: '',
    hire_date: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});

  const { isAdmin } = useCurrentUser();

  const fetchStaff = React.useCallback(async (pageNumber = 1) => {
    try {
      setLoading(true);
      const includeDeleted = statusFilter !== 'active';
      const res = await getAllStaff(pageNumber, 10, searchTerm, includeDeleted);
      setStaff(res.staff || []);
      setTotalPages(res.totalPages || 1);
      setPage(res.page || pageNumber);
    } catch (err) {
      showError(err?.message || 'Failed to sync personnel matrix.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  // Salary calculations
  const baseSalaryNum = editData.base_salary ? Number(editData.base_salary) : 0;
  const allowanceNum = editData.allowance ? Number(editData.allowance) : 0;
  const grossSalary = baseSalaryNum + allowanceNum;
  const rssb = baseSalaryNum * 0.06;
  const tprNum = grossSalary * 0.05;
  const netSalary = grossSalary - rssb - tprNum;

  useEffect(() => {
    fetchStaff(page);
  }, [page, fetchStaff]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, departmentFilter, statusFilter]);

  // Combined search and filters
  const processedStaff = useMemo(() => {
    if (!Array.isArray(staff)) return [];

    return staff.filter((m) => {
      // Search
      const s = searchTerm.toLowerCase();
      const matchesSearch = !s ||
        (m.full_name || '').toLowerCase().includes(s) ||
        (m.email || '').toLowerCase().includes(s) ||
        (m.position || '').toLowerCase().includes(s) ||
        (m.department || '').toLowerCase().includes(s);

      // Department
      const matchesDept = departmentFilter === 'all' || (m.department || '') === departmentFilter;

      // Status
      const isDeleted = !!m.deleted_at;
      let matchesStatus = true;
      if (statusFilter === 'active' && isDeleted) matchesStatus = false;
      if (statusFilter === 'deleted' && !isDeleted) matchesStatus = false;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staff, searchTerm, departmentFilter, statusFilter]);

  const departments = useMemo(() => {
    const setDep = new Set();
    staff.forEach((m) => { if (m?.department) setDep.add(m.department); });
    return Array.from(setDep).sort();
  }, [staff]);

  const payrollSummary = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    const perDept = {};

    processedStaff.forEach((m) => {
      const gross = m.gross_salary ? Number(m.gross_salary) : 0;
      const net = m.net_salary ? Number(m.net_salary) : 0;
      const dep = m.department || 'Unassigned';
      totalGross += gross;
      totalNet += net;
      if (!perDept[dep]) perDept[dep] = { gross: 0, net: 0, count: 0 };
      perDept[dep].gross += gross;
      perDept[dep].net += net;
      perDept[dep].count += 1;
    });

    return { totalGross, totalNet, perDepartment: Object.entries(perDept).map(([dep, v]) => ({ dept: dep, ...v })) };
  }, [processedStaff]);

  const handleExportExcel = async () => {
    try {
      showInfo('Generating spreadsheet...');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Personnel Payroll Matrix');
      sheet.columns = [
        { header: 'Full Name', key: 'full_name', width: 25 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Department', key: 'department', width: 18 },
        { header: 'Position', key: 'position', width: 18 },
        { header: 'Hire Date', key: 'hire_date', width: 15 },
        { header: 'SSN', key: 'social_security_number', width: 22 },
        { header: 'Gross Salary', key: 'gross_salary', width: 15 },
        { header: 'Net Salary', key: 'net_salary', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ];
      processedStaff.forEach((m) => {
        sheet.addRow({
          full_name: m.full_name || '',
          email: m.email || '',
          phone: m.phone || '',
          department: m.department || '',
          position: m.position || '',
          hire_date: m.hire_date || '',
          social_security_number: m.social_security_number || '',
          gross_salary: m.gross_salary ? Number(m.gross_salary) : 0,
          net_salary: m.net_salary ? Number(m.net_salary) : 0,
          status: m.deleted_at ? 'Deleted' : (m.status || 'Active'),
        });
      });
      const buf = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buf]), `personnel_payroll_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showSuccess('Spreadsheet finalized.');
    } catch {
      showError('Export extraction failed.');
    }
  };

  const handleExportPdf = async () => {
    try {
      showInfo('Generating PDF report...');
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(18);
      doc.text('Personnel Payroll Infrastructure Report', 10, 20);
      doc.setFontSize(10);
      doc.text(`Total Personnel Aggregate Gross: ${payrollSummary.totalGross.toLocaleString()} RWF`, 10, 30);
      doc.text(`Total Personnel Aggregate Net: ${payrollSummary.totalNet.toLocaleString()} RWF`, 10, 36);
      doc.save(`payroll_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      showSuccess('PDF Report finalized.');
    } catch {
      showError('PDF generation failed.');
    }
  };

  const openCreateModal = () => {
    setSelectedStaff(null);
    setEditData({ full_name: '', email: '', phone: '', position: '', department: '', base_salary: '', allowance: '', currency: 'RWF', social_security_number: '', national_id: '', picture_url: '', hire_date: '', status: 'active' });
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedStaff(item);
    setEditData({
      full_name: item.full_name || '',
      email: item.email || '',
      phone: item.phone || '',
      position: item.position || '',
      department: item.department || '',
      base_salary: item.base_salary || '',
      allowance: item.allowance || '',
      currency: item.currency || 'RWF',
      social_security_number: item.social_security_number || '',
      national_id: item.national_id || '',
      picture_url: item.picture_url || '',
      hire_date: item.hire_date || '',
      status: item.status || 'active',
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedStaff(null);
    setEditData({
      full_name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      base_salary: '',
      allowance: '',
      currency: 'RWF',
      social_security_number: '',
      national_id: '',
      picture_url: '',
      hire_date: '',
      status: 'active',
    });
    setErrors({});
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!editData.full_name?.trim()) newErrors.full_name = 'Full name required.';
    if (!editData.position?.trim()) newErrors.position = 'Position designation required.';
    if (!editData.base_salary || Number(editData.base_salary) <= 0) newErrors.base_salary = 'Valid base salary required.';
    if (!editData.social_security_number?.trim()) newErrors.social_security_number = 'SSN signature required.';
    if (!editData.hire_date) newErrors.hire_date = 'Hire date required.';

    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    try {
      const payload = { ...editData, base_salary: Number(editData.base_salary), allowance: Number(editData.allowance || 0) };
      if (selectedStaff) {
        await updateStaff(selectedStaff.id, payload);
        showSuccess('Personnel node recalibrated.');
      } else {
        await createStaff(payload);
        showSuccess('New personnel node initialized.');
      }
      handleModalClose();
      fetchStaff(page);
    } catch (err) {
      showError(err?.message || 'Logic injection failed.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Neutralize personnel signal "${item.full_name}"?`)) return;
    try {
      await deleteStaff(item.id);
      showInfo('Signal neutralized.');
      fetchStaff(page);
    } catch {
      showError('Failed to neutralize signal.');
    }
  };

  const handleRestore = async (item) => {
    try {
      await restoreStaff(item.id);
      showSuccess('Signal restored to matrix.');
      fetchStaff(page);
    } catch {
      showError('Failed to restore signal.');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showInfo('Uploading image...');
      const url = await uploadImage(file);
      setEditData((prev) => ({ ...prev, picture_url: url }));
    } catch (error) {
      // Error handled in service
    }
  };

  const formatCurrency = (amt) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(amt);

  // Admin guard
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 bg-gray-800/40 backdrop-blur-sm border-rose-500/20 text-center space-y-6" hover={false}>
          <ShieldCheck size={64} className="mx-auto text-rose-500 animate-pulse" />
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
            <Users size={200} className="text-teal-500" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                <Activity size={12} /> Human Capital Intelligence
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Personnel <span className="text-teal-500">Hub</span>
                </h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] italic mt-4">
                  Workforce Governance // Payroll Infrastructure Monitoring
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportExcel} className="p-4 border-gray-700/50 text-emerald-400 hover:bg-emerald-500/10">
                  <Download size={18} />
                </Button>
                <Button variant="outline" onClick={handleExportPdf} className="p-4 border-gray-700/50 text-rose-400 hover:bg-rose-500/10">
                  <FileText size={18} />
                </Button>
              </div>
              <Button onClick={openCreateModal} className="px-8 flex-1 sm:flex-none">
                <div className="flex items-center gap-3">
                  <Plus size={18} />
                  <span>Recruit Agent</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-700/50">
            {[
              { label: 'Force Capacity', value: staff.length, icon: Users, color: 'teal' },
              { label: 'Active Matrix', value: staff.filter(s => !s.deleted_at).length, icon: Activity, color: 'indigo' },
              { label: 'Aggregate Net', value: formatCurrency(payrollSummary.totalNet), icon: Wallet, color: 'emerald' },
              { label: 'System Sync', value: 'Nominal', icon: Zap, color: 'amber' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1 group">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic group-hover:text-teal-500 transition-colors">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <stat.icon size={14} className={`text-${stat.color}-400`} />
                  <p className="text-xl md:text-2xl font-black text-white italic tracking-tighter truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-teal-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Query personnel registry by identity, role, or unit..."
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-bold italic placeholder-gray-500 outline-hidden transition-all shadow-inner focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="lg:col-span-3 relative">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Filter size={18} className="text-gray-500" />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-black uppercase text-[11px] tracking-widest italic outline-hidden transition-all shadow-inner appearance-none cursor-pointer focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
            >
              <option value="all">Global Array</option>
              {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
            </select>
            <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
              <ChevronRight size={14} className="text-gray-500 rotate-90" />
            </div>
          </div>
          <div className="lg:col-span-3 relative">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Activity size={18} className="text-gray-500" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-[1.5rem] text-white font-black uppercase text-[11px] tracking-widest italic outline-hidden transition-all shadow-inner appearance-none cursor-pointer focus:border-teal-500/30 focus:shadow-[0_0_20px_rgba(20,184,166,0.1)]"
            >
              <option value="active">Active Nodes Only</option>
              <option value="all">Full Spectrum</option>
            </select>
            <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
              <ChevronRight size={14} className="text-gray-500 rotate-90" />
            </div>
          </div>
        </div>

        <Card className="bg-gray-800/40 backdrop-blur-sm border-gray-700/50 overflow-hidden" hover={false}>
          {/* Mobile Feed */}
          <div className="xl:hidden divide-y divide-gray-700/30">
            {loading ? (
              <div className="p-20 text-center space-y-4 animate-pulse">
                <Zap size={40} className="mx-auto text-teal-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Interrogating Registry...</p>
              </div>
            ) : processedStaff.length === 0 ? (
              <div className="p-20 text-center italic text-gray-500 font-bold uppercase text-[10px] tracking-widest">No Sector Signals Captured.</div>
            ) : (
              processedStaff.map((agent) => (
                <div key={agent.id} className="p-6 space-y-6 hover:bg-gray-700/20 transition-all group/row">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover/row:scale-110 transition-transform shadow-lg overflow-hidden`}>
                        {agent.picture_url ? <img src={agent.picture_url} className="w-full h-full object-cover" /> : <User size={24} />}
                      </div>
                      <div>
                        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">{agent.full_name}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mt-1 flex items-center gap-2">
                          <Briefcase size={10} className="text-teal-500" /> {agent.position}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-[9px] font-black uppercase italic tracking-[0.2em] ${agent.deleted_at ? 'text-rose-500' : 'text-teal-500'}`}>
                      {agent.deleted_at ? 'Neutralized' : 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-700/30">
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase italic">Net Impact</p>
                      <p className="text-lg font-black text-white italic">{formatCurrency(agent.net_salary)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase italic">Department</p>
                      <span className="text-[9px] font-black text-gray-300 uppercase italic flex items-center gap-2 mt-1">
                        <Building size={10} className="text-teal-500" /> {agent.department || 'GLOBAL'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {!agent.deleted_at ? (
                        <>
                          <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => openEditModal(agent)}>
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(agent)}>
                            <Trash2 size={16} />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" className="px-6 py-2.5 rounded-xl border-gray-700 text-[10px] text-emerald-400 hover:bg-emerald-500 hover:text-white" onClick={() => handleRestore(agent)}>
                          RESTORE
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest italic border-b border-gray-700/50">
                <tr>
                  <th className="px-10 py-6">Agent Identity</th>
                  <th className="px-10 py-6">Corporate Node</th>
                  <th className="px-10 py-6">Spatial Position</th>
                  <th className="px-10 py-6 text-right">Net Valuation</th>
                  <th className="px-10 py-6 text-center">State Index</th>
                  <th className="px-10 py-6 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Zap size={48} className="text-teal-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Personnel Matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : processedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center italic text-gray-400 font-black uppercase tracking-widest text-[10px]">No personnel signals captured.</td>
                  </tr>
                ) : (
                  processedStaff.map((agent) => (
                    <tr key={agent.id} className="group hover:bg-gray-700/20 transition-all duration-300">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-[1.25rem] bg-teal-500/10 border border-teal-500/20 overflow-hidden group-hover:scale-110 transition-transform shadow-xl">
                            {agent.picture_url ? <img src={agent.picture_url} className="w-full h-full object-cover" /> : <User size={24} className="m-auto mt-4 text-teal-400" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-white italic uppercase tracking-tighter text-xl leading-none">{agent.full_name}</span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-2 flex items-center gap-2">
                              <Mail size={12} className="text-teal-500" /> {agent.email || 'NO_SIGNAL'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-3">
                          <Building size={16} className="text-teal-500/50" />
                          <span className="text-sm font-black uppercase tracking-widest italic text-gray-300">{agent.department || 'GLOBAL'}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col">
                          <span className="text-sm font-black italic tracking-tighter text-gray-300 mb-1">{agent.position}</span>
                          <span className="text-[10px] font-black text-gray-600 uppercase italic flex items-center gap-1.5 mt-1">
                            <IdCard size={10} /> {agent.social_security_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-black text-teal-400 italic tracking-tighter leading-none">{formatCurrency(agent.net_salary)}</span>
                          <span className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest mt-1 opacity-50">Gross: {formatCurrency(agent.gross_salary)}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic flex items-center justify-center gap-2 border ${agent.deleted_at ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-teal-500/10 text-teal-500 border-teal-500/20'}`}>
                          {agent.deleted_at ? 'Neutralized' : 'Active'}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <div className="flex items-center justify-end gap-3">
                          {!agent.deleted_at ? (
                            <>
                              <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-teal-400" onClick={() => openEditModal(agent)}>
                                <Edit3 size={16} />
                              </Button>
                              <Button variant="outline" className="p-2.5 rounded-xl border-gray-700 text-gray-400 hover:text-rose-400" onClick={() => handleDelete(agent)}>
                                <Trash2 size={16} />
                              </Button>
                            </>
                          ) : (
                            <Button variant="outline" className="px-6 py-2.5 rounded-xl border-gray-700 text-[10px] text-emerald-400 hover:bg-emerald-500 hover:text-white" onClick={() => handleRestore(agent)}>
                              RESTORE
                            </Button>
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
            title={selectedStaff ? `Edit Staff Protocol: ${selectedStaff.full_name}` : 'Recruit New Agent Signal'}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
            className="max-w-4xl"
          >
            <div className="space-y-10 py-4">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative group shrink-0">
                  <div className="w-32 h-32 rounded-[2rem] bg-gray-900 border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-teal-500/50">
                    {editData.picture_url ? (
                      <img src={editData.picture_url} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-gray-700 group-hover:text-teal-500/50 transition-colors" size={32} />
                    )}
                  </div>
                  <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="flex-1 w-full">
                  <Input
                    label="Agent Integrity Name *"
                    value={editData.full_name}
                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    placeholder="Enter full identity name..."
                    icon={User}
                    error={errors.full_name}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Signal Entry (Email)"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="agent@landlordpro.io"
                  icon={Mail}
                />
                <Input
                  label="Signal Terminal (Phone)"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="+250 XXX XXX XXX"
                  icon={Phone}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Mission Role (Position) *"
                  value={editData.position}
                  onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                  placeholder="Designate role..."
                  icon={Briefcase}
                  error={errors.position}
                />
                <Input
                  label="Corporate Node (Department)"
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  placeholder="Sector designation..."
                  icon={Building}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Input
                  label="Base Valuation *"
                  type="number"
                  value={editData.base_salary}
                  onChange={(e) => setEditData({ ...editData, base_salary: e.target.value })}
                  icon={Wallet}
                  error={errors.base_salary}
                />
                <Input
                  label="Incentive Buffer"
                  type="number"
                  value={editData.allowance}
                  onChange={(e) => setEditData({ ...editData, allowance: e.target.value })}
                  icon={TrendingUp}
                />
                <Input
                  label="Temporal Activation *"
                  type="date"
                  value={editData.hire_date}
                  onChange={(e) => setEditData({ ...editData, hire_date: e.target.value })}
                  icon={Calendar}
                  error={errors.hire_date}
                />
              </div>

              {baseSalaryNum > 0 && (
                <div className="p-8 bg-teal-500/5 rounded-[2.5rem] border border-teal-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Activity className="text-teal-500 animate-pulse" size={32} />
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest italic">Net Fiscal Simulation</p>
                      <p className="text-sm font-bold text-gray-400 italic mt-1 leading-relaxed">RSSB (6%) and TPR (5%) deductions projected.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-teal-400 italic tracking-tighter">
                      {formatCurrency(netSalary)}
                    </p>
                    <p className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest">Projected Liquid Net</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Protocol Sig (SSN) *"
                  value={editData.social_security_number}
                  onChange={(e) => setEditData({ ...editData, social_security_number: e.target.value })}
                  placeholder="RSSB-XXXXXXX"
                  icon={ShieldCheck}
                  error={errors.social_security_number}
                />
                <Input
                  label="Validation Sig (National ID)"
                  value={editData.national_id}
                  onChange={(e) => setEditData({ ...editData, national_id: e.target.value })}
                  placeholder="1 19XX 8 XXXX..."
                  icon={IdCard}
                />
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default StaffPage;
