import { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, isSameDay, isSameMonth, isWithinInterval, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO } from 'date-fns';
import { FileText, TrendingUp, Download, X, Calendar } from 'lucide-react';

export default function Reports() {
    const rawPayments = useQuery(api.payments.list) || [];
    const members = useQuery(api.members.list) || [];
    const [filter, setFilter] = useState('month'); // 'day', 'month', 'all'
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadRange, setDownloadRange] = useState('month'); // 'month', 'lastMonth', '3months', 'all', 'custom'
    const [customRange, setCustomRange] = useState({
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });

    const payments = useMemo(() => {
        return [...rawPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [rawPayments]);

    const getMemberName = (id) => {
        const m = members.find(m => m._id === id);
        return m ? m.name : 'Unknown';
    };

    const filtered = useMemo(() => {
        const now = new Date();
        return payments.filter(p => {
            const d = new Date(p.date);
            if (filter === 'day') return isSameDay(d, now);
            if (filter === 'month') return isSameMonth(d, now);
            return true;
        });
    }, [payments, filter]);

    const total = useMemo(() => {
        return filtered.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    }, [filtered]);

    const handleDownloadPDF = () => {
        let finalFilterData = [];
        let reportTitle = "";
        let dateSubtitle = "";
        const now = new Date();

        if (downloadRange === 'day') {
            finalFilterData = rawPayments.filter(p => isSameDay(new Date(p.date), now));
            reportTitle = "Daily Collection Report";
            dateSubtitle = format(now, 'dd MMMM yyyy');
        } else if (downloadRange === 'month') {
            finalFilterData = rawPayments.filter(p => isSameMonth(new Date(p.date), now));
            reportTitle = "Monthly Collection Report";
            dateSubtitle = format(now, 'MMMM yyyy');
        } else if (downloadRange === 'lastMonth') {
            const lastMonth = subMonths(now, 1);
            finalFilterData = rawPayments.filter(p => isSameMonth(new Date(p.date), lastMonth));
            reportTitle = "Previous Month Report";
            dateSubtitle = format(lastMonth, 'MMMM yyyy');
        } else if (downloadRange === '3months') {
            const threeMonthsAgo = subMonths(now, 3);
            finalFilterData = rawPayments.filter(p => new Date(p.date) >= threeMonthsAgo);
            reportTitle = "Quarterly Collection Report";
            dateSubtitle = `Last 3 Months (Since ${format(threeMonthsAgo, 'MMM yyyy')})`;
        } else if (downloadRange === 'all') {
            finalFilterData = rawPayments;
            reportTitle = "Comprehensive Collection Report";
            dateSubtitle = "All Historical Data";
        } else if (downloadRange === 'custom') {
            const start = startOfDay(new Date(customRange.start));
            const end = endOfDay(new Date(customRange.end));
            finalFilterData = rawPayments.filter(p => {
                const d = new Date(p.date);
                return isWithinInterval(d, { start, end });
            });
            reportTitle = "Custom Range Collection Report";
            dateSubtitle = `${format(start, 'dd MMM yyyy')} to ${format(end, 'dd MMM yyyy')}`;
        }

        if (finalFilterData.length === 0) {
            alert('No records to download for the selected range');
            return;
        }

        const sortedData = [...finalFilterData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalSum = sortedData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const transactionCount = sortedData.length;

        // Access jspdf from window
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Branding Header
        doc.setFillColor(79, 70, 229); // Indigo-600
        doc.rect(0, 0, 210, 40, 'F');

        doc.setFontSize(28);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("MANHAJ", 15, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("INSTITUTION MANAGEMENT SYSTEM", 15, 32);

        doc.setFontSize(14);
        doc.text(reportTitle.toUpperCase(), 195, 25, { align: 'right' });
        doc.setFontSize(10);
        doc.text(dateSubtitle, 195, 32, { align: 'right' });

        // 2. Executive Summary
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("EXECUTIVE SUMMARY", 15, 55);

        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.5);
        doc.line(15, 58, 195, 58);

        // Summary Statistics Cards (Simulated)
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.roundedRect(15, 65, 55, 25, 3, 3, 'F');
        doc.roundedRect(77, 65, 55, 25, 3, 3, 'F');
        doc.roundedRect(140, 65, 55, 25, 3, 3, 'F');

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text("TOTAL COLLECTION", 20, 72);
        doc.text("TRANSACTIONS", 82, 72);
        doc.text("GENERATED ON", 145, 72);

        doc.setFontSize(13);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text(`Rs. ${totalSum.toLocaleString()}`, 20, 82);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(`${transactionCount}`, 82, 82);
        doc.setFontSize(10);
        doc.text(format(new Date(), 'dd MMM yyyy HH:mm'), 145, 82);

        // 3. Transactions Table
        const tableColumn = ["Member Name", "Purpose", "Date", "Mode", "Amount"];
        const tableRows = sortedData.map(p => [
            getMemberName(p.memberId),
            p.forMonth ? `${p.forMonth} ${p.forYear}` : 'General',
            format(new Date(p.date), 'dd MMM yyyy'),
            p.mode || 'Payment',
            `Rs. ${parseFloat(p.amount).toLocaleString()}`
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 105,
            theme: 'striped',
            headStyles: {
                fillColor: [30, 41, 59], // Slate-800
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                cellPadding: 4
            },
            bodyStyles: {
                fontSize: 8.5,
                textColor: [51, 65, 85], // Slate-700
                valign: 'middle',
                cellPadding: 3
            },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [15, 23, 42] }, // Member Name
                1: { halign: 'center' }, // Purpose
                2: { halign: 'center' }, // Date
                3: { halign: 'center' }, // Mode
                4: { halign: 'right', fontStyle: 'bold', textColor: [79, 70, 229] } // Amount Indigo
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            margin: { left: 15, right: 15 },
            didDrawPage: function (data) {
                // Footer
                const str = "Page " + doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

                doc.setTextColor(148, 163, 184); // Slate-400
                doc.text(str, data.settings.margin.left, pageHeight - 10);
                doc.text("MANHAJ System Generated Finance Report", 195, pageHeight - 10, { align: 'right' });
            }
        });

        doc.save(`Manhaj_Report_${downloadRange}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        setShowDownloadModal(false);
    };



    return (
        <div className="animate-fade-in space-y-6 pb-20 max-w-md mx-auto px-1">
            {/* Filters */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {['day', 'month', 'all'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        {f === 'day' ? 'Today' : f === 'month' ? 'This Month' : 'All Time'}
                    </button>
                ))}
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <p className="text-violet-200 text-sm font-medium mb-1 flex items-center space-x-2">
                            <TrendingUp size={16} />
                            <span>Total Collected ({filter === 'day' ? 'Today' : filter === 'month' ? format(new Date(), 'MMMM') : 'Total'})</span>
                        </p>
                        <h2 className="text-4xl font-bold text-white mb-2">₹{total.toLocaleString()}</h2>
                        <p className="text-violet-200 text-xs">{filtered.length} transactions found</p>
                    </div>

                    <button
                        onClick={() => setShowDownloadModal(true)}
                        className="bg-white/20 hover:bg-white/30 p-3 rounded-xl text-white transition-all active:scale-90 border border-white/10 flex items-center space-x-2"
                        title="Download Report"
                    >
                        <Download size={20} />
                        <span className="text-xs font-black uppercase tracking-tighter hidden md:inline">Download PDF</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                <h3 className="text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider font-bold">Recent Transactions</h3>

                {filtered.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">No records found for this period.</div>
                ) : (
                    filtered.map(p => (
                        <div key={p._id} className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl flex justify-between items-center group active:scale-[0.99] transition-all shadow-sm dark:shadow-none">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${p.forMonth ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500'}`}>
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-slate-900 dark:text-white text-sm font-black">{getMemberName(p.memberId)}</p>
                                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                                        <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-tighter">
                                            {p.forMonth
                                                ? `${p.forMonth.slice(0, 3)} ${p.forYear}`
                                                : 'General'
                                            }
                                        </p>
                                    </div>
                                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium mt-0.5">
                                        {format(new Date(p.date), 'dd MMM yyyy • h:mm a')}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`font-black block ${p.forMonth ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400'}`}>₹{p.amount}</span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-tighter">{p.mode || 'Payment'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {/* Download Modal */}
            {showDownloadModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowDownloadModal(false)}
                    ></div>

                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-10 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Download Report</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">Select range for PDF generation</p>
                            </div>
                            <button
                                onClick={() => setShowDownloadModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-3 mb-8">
                            {[
                                { id: 'day', label: 'Today' },
                                { id: 'month', label: 'This Month' },
                                { id: 'lastMonth', label: 'Last Month' },
                                { id: '3months', label: 'Last 3 Months' },
                                { id: 'all', label: 'All Time' },
                                { id: 'custom', label: 'Custom Range' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setDownloadRange(opt.id)}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${downloadRange === opt.id
                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400'
                                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    <span className="font-bold">{opt.label}</span>
                                    {downloadRange === opt.id && (
                                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {downloadRange === 'custom' && (
                            <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-tighter text-slate-400 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={customRange.start}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-tighter text-slate-400 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={customRange.end}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleDownloadPDF}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
                        >
                            <Download size={20} />
                            <span>Prepare PDF</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
