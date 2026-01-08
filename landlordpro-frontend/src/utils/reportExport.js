import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

export const exportFinancialPDF = (data, period) => {
    const doc = new jsPDF();
    const title = "Financial Statement";
    const dateStr = `${period?.startDate || 'Start'} to ${period?.endDate || 'End'}`;

    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text(title, 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Period: ${dateStr}`, 105, 30, { align: "center" });

    doc.line(20, 35, 190, 35);

    let y = 50;

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Executive Summary", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Total Income: ${formatCurrency(data.totalIncome)}`, 20, y);
    y += 7;
    doc.text(`Total Expenses: ${formatCurrency(data.totalExpense)}`, 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const netIncome = data.totalIncome - data.totalExpense;
    doc.setTextColor(netIncome >= 0 ? 34 : 220, netIncome >= 0 ? 197 : 38, netIncome >= 0 ? 94 : 38); // Green or Red
    doc.text(`Net Income: ${formatCurrency(netIncome)}`, 20, y);

    // Expense Breakdown
    y += 20;
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(14);
    doc.text("Expense Breakdown", 20, y);
    y += 10;

    doc.setFontSize(11);
    Object.entries(data.expensesByCategory || {}).forEach(([cat, amount]) => {
        doc.text(`${cat}: ${formatCurrency(amount)}`, 20, y);
        y += 7;
    });

    doc.save("financial_statement.pdf");
};

export const exportRentRollExcel = async (rentRollData) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rent Roll');

    sheet.columns = [
        { header: 'Property', key: 'property', width: 20 },
        { header: 'Unit', key: 'unit', width: 15 },
        { header: 'Tenant', key: 'tenantName', width: 25 },
        { header: 'Monthly Rent', key: 'monthlyRent', width: 15 },
        { header: 'Lease Start', key: 'leaseStart', width: 15 },
        { header: 'Lease End', key: 'leaseEnd', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
    ];

    sheet.addRows(rentRollData);

    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Rent_Roll.xlsx');
};

const formatCurrency = (val) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(val);
