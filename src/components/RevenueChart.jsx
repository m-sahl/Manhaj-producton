import { useMemo, useState } from 'react';
import { startOfMonth, subMonths, format, isSameMonth, parseISO } from 'date-fns';

export default function RevenueChart({ payments }) {
    if (!payments) return null;
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const chartData = useMemo(() => {
        const today = new Date();
        const data = [];

        // Generate LAST 6 months
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(today, i);

            // Filter payments for this month
            const monthlyTotal = payments
                .filter(p => isSameMonth(parseISO(p.date), date))
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            data.push({
                label: format(date, 'MMM'),
                fullLabel: format(date, 'MMMM yyyy'),
                value: monthlyTotal
            });
        }

        console.log('Chart Data:', data); // DEBUG
        return data;
    }, [payments]);

    const maxValue = Math.max(...chartData.map(d => d.value), 100);

    if (chartData.every(d => d.value === 0)) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-6">
                <h3 className="font-bold text-slate-900 dark:text-white">Revenue Trend</h3>
                <div className="h-48 flex items-center justify-center text-slate-400">
                    No revenue data for the last 6 months
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Revenue Trend</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Last 6 Months Performance</p>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-48 flex items-end justify-between gap-2 relative">
                {/* Y-Axis Guidelines (Optional) */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                    <div className="border-t border-slate-500 w-full h-0"></div>
                    <div className="border-t border-slate-500 w-full h-0"></div>
                    <div className="border-t border-slate-500 w-full h-0"></div>
                </div>

                {chartData.map((item, index) => {
                    const heightPercentage = Math.max((item.value / maxValue) * 100, 5); // Min 5% height

                    return (
                        <div
                            key={index}
                            className="flex-1 flex flex-col items-center group relative"
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Tooltip */}
                            {hoveredIndex === index && (
                                <div className="absolute -top-12 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-xl animate-fade-in z-10 whitespace-nowrap">
                                    {item.fullLabel}: ₹{item.value.toLocaleString()}
                                </div>
                            )}

                            {/* Bar */}
                            <div
                                className={`w-full max-w-[30px] rounded-t-lg transition-all duration-500 ease-out relative overflow-hidden ${index === 5
                                        ? 'bg-gradient-to-t from-blue-600 to-indigo-500' // Current month highlight
                                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-blue-300 dark:hover:bg-slate-600'
                                    }`}
                                style={{ height: `${heightPercentage}%` }}
                            >
                                {/* Active Month Glow */}
                                {index === 5 && (
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                )}
                            </div>

                            {/* X-Axis Label */}
                            <span className={`text-[10px] font-bold mt-2 ${index === 5 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                }`}>
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
