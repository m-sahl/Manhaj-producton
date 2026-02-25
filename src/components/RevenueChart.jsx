import { useMemo, useState } from 'react';
import { startOfMonth, subMonths, format, isSameMonth, startOfDay, eachDayOfInterval, endOfMonth, isSameDay } from 'date-fns';

export default function RevenueChart({ payments }) {
    if (!payments) return null;
    const [timeRange, setTimeRange] = useState('6M');
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const chartData = useMemo(() => {
        const today = new Date();
        const data = [];

        if (timeRange === '1D') {
            // Daily breakdown for THIS month
            const start = startOfMonth(today);
            const end = endOfMonth(today);
            const days = eachDayOfInterval({ start, end });

            days.forEach(date => {
                const dailyTotal = payments
                    .filter(p => {
                        if (!p.date) return false;
                        const paymentDate = new Date(p.date);
                        return isSameDay(paymentDate, date);
                    })
                    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                data.push({
                    label: format(date, 'd'),
                    fullLabel: format(date, 'do MMM'),
                    value: dailyTotal
                });
            });
        } else if (timeRange === '1M') {
            // Monthly breakdown for THIS year
            for (let i = 11; i >= 0; i--) {
                const date = subMonths(today, i);
                if (date.getFullYear() !== today.getFullYear()) continue;

                const monthlyTotal = payments
                    .filter(p => {
                        if (!p.date) return false;
                        const paymentDate = new Date(p.date);
                        return isSameMonth(paymentDate, date);
                    })
                    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                data.push({
                    label: format(date, 'MMM'),
                    fullLabel: format(date, 'MMMM yyyy'),
                    value: monthlyTotal
                });
            }
        } else {
            // Trend view (6M)
            for (let i = 5; i >= 0; i--) {
                const date = subMonths(today, i);
                const monthlyTotal = payments
                    .filter(p => {
                        if (!p.date) return false;
                        const paymentDate = new Date(p.date);
                        return isSameMonth(paymentDate, date);
                    })
                    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                data.push({
                    label: format(date, 'MMM'),
                    fullLabel: format(date, 'MMMM yyyy'),
                    value: monthlyTotal
                });
            }
        }

        return data;
    }, [payments, timeRange]);

    const maxValue = Math.max(...chartData.map(d => d.value), 100);

    const pointsArray = chartData.map((d, i) => {
        const x = (i / (chartData.length - 1)) * 100;
        const y = 100 - ((d.value / maxValue) * 85);
        return { x, y };
    });

    const getSmoothPath = (points) => {
        if (points.length < 2) return '';
        let path = `M${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[0];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i < points.length - 2 ? points[i + 2] : points[points.length - 1];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
        }
        return path;
    };

    const smoothLinePath = getSmoothPath(pointsArray);
    const areaPath = `M0,100 L${pointsArray.map(p => `${p.x},${p.y}`).join(' L')} L100,100 Z`;

    const isEmpty = chartData.every(d => d.value === 0);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Revenue Trend</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {timeRange === '1D' ? 'Daily breakdown (This Month)' : timeRange === '1M' ? 'Monthly Performance (This Year)' : '6-Month Trend Overview'}
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                    {[
                        { id: '1D', label: 'Day' },
                        { id: '1M', label: 'Month' },
                        { id: '6M', label: '6M' }
                    ].map((range) => (
                        <button
                            key={range.id}
                            onClick={() => setTimeRange(range.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${timeRange === range.id
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-48 w-full relative group cursor-crosshair px-2">
                {isEmpty ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs italic">
                        No revenue data for this period
                    </div>
                ) : (
                    <>
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {[0, 25, 50, 75, 100].map(y => (
                                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeOpacity="0.05" className="text-slate-500" vectorEffect="non-scaling-stroke" />
                            ))}

                            <path d={areaPath} fill="url(#chartGradient)" />

                            <path
                                d={smoothLinePath}
                                fill="none"
                                stroke="#4F46E5"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                                className="drop-shadow-lg"
                            />
                        </svg>

                        <div className="absolute inset-x-2 inset-y-0">
                            {chartData.map((item, index) => {
                                const xPercent = (index / (chartData.length - 1)) * 100;
                                const yPercent = 100 - ((item.value / maxValue) * 85);

                                // Optimization: Only show every few labels on Daily view to avoid overlap
                                const shouldShowLabel = timeRange !== '1D' || index === 0 || index === chartData.length - 1 || index % 5 === 0;

                                return (
                                    <div
                                        key={index}
                                        className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col justify-end items-center group/point cursor-pointer"
                                        style={{ left: `${xPercent}%` }}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        <div
                                            className={`absolute w-3 h-3 rounded-full border-2 border-white bg-blue-600 shadow-lg transition-all duration-200 z-10 ${hoveredIndex === index ? 'scale-125 opacity-100' : 'scale-0 opacity-0'}`}
                                            style={{
                                                top: `${yPercent}%`,
                                                transform: 'translateY(-50%)'
                                            }}
                                        ></div>

                                        {hoveredIndex === index && (
                                            <div className={`absolute -top-12 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-xl animate-fade-in z-20 whitespace-nowrap pointer-events-none ${index < 3 ? 'left-0' : index > chartData.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                                                {item.fullLabel}: ₹{item.value.toLocaleString()}
                                            </div>
                                        )}

                                        {shouldShowLabel && (
                                            <span className={`absolute -bottom-6 text-[10px] font-bold transition-colors ${hoveredIndex === index ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {item.label}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
            <div className="h-4"></div>
        </div>
    );
}
