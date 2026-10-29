import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Scale,
} from 'lucide-react';

export interface MonthlyTrendData {
  bulan: string;
  label: string;
  omzet: number;
  pendapatan: number;
  pendapatanLain: number;
  hpp: number;
  beban: number;
  pengeluaranBeban: number;
  totalPengeluaran: number;
  grossProfit: number;
  netProfit: number;
  kasMasuk: number;
  kasKeluar: number;
}

interface IncomeExpenseLineChartProps {
  data: MonthlyTrendData[];
  isLoading?: boolean;
}

type ChartMode = 'OPERASIONAL' | 'KONSOLIDASI' | 'ARUS_KAS' | 'PROFIT';

export const IncomeExpenseLineChart: React.FC<IncomeExpenseLineChartProps> = ({
  data = [],
  isLoading = false,
}) => {
  const [mode, setMode] = useState<ChartMode>('OPERASIONAL');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatRupiahCompact = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 1_000_000_000) {
      return `Rp ${(val / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
    }
    if (abs >= 1_000_000) {
      return `Rp ${(val / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Jt`;
    }
    if (abs >= 1_000) {
      return `Rp ${(val / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Rb`;
    }
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  // Determine series configuration based on selected mode
  const seriesConfig = useMemo(() => {
    switch (mode) {
      case 'OPERASIONAL':
        return {
          title: 'Alur Pendapatan Penjualan vs Beban Operasional',
          desc: 'Perbandingan omzet penjualan usaha dengan beban pengeluaran operasional (Opex)',
          seriesA: {
            key: 'omzet',
            name: 'Pendapatan Penjualan',
            color: '#10B981', // Emerald 500
            fillColor: '#34D399',
            badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            dotBg: 'bg-emerald-500',
          },
          seriesB: {
            key: 'beban',
            name: 'Beban Operasional',
            color: '#F43F5E', // Rose 500
            fillColor: '#FB7185',
            badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
            dotBg: 'bg-rose-500',
          },
          diffLabel: 'Laba Operasional Usaha',
          ratioLabel: 'Rasio Beban / Omzet',
        };
      case 'KONSOLIDASI':
        return {
          title: 'Konsolidasi Total Pendapatan vs Total Pengeluaran',
          desc: 'Total seluruh penerimaan (Omzet + Lainnya) dibandingkan total biaya (HPP + Beban)',
          seriesA: {
            key: 'pendapatan',
            name: 'Total Pendapatan',
            color: '#0D9488', // Teal 600
            fillColor: '#2DD4BF',
            badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
            dotBg: 'bg-teal-600',
          },
          seriesB: {
            key: 'totalPengeluaran',
            name: 'Total Beban (HPP + Opex)',
            color: '#E11D48', // Rose 600
            fillColor: '#F43F5E',
            badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
            dotBg: 'bg-rose-600',
          },
          diffLabel: 'Laba Bersih Konsolidasian',
          ratioLabel: 'Rasio Biaya / Pendapatan',
        };
      case 'ARUS_KAS':
        return {
          title: 'Arus Kas Masuk vs Kas Keluar Riil',
          desc: 'Mutasi riil penerimaan dan pengeluaran dana melalui 8 akun Kas & Bank',
          seriesA: {
            key: 'kasMasuk',
            name: 'Arus Kas Masuk',
            color: '#0284C7', // Sky 600
            fillColor: '#38BDF8',
            badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
            dotBg: 'bg-sky-600',
          },
          seriesB: {
            key: 'kasKeluar',
            name: 'Arus Kas Keluar',
            color: '#7C3AED', // Violet 600
            fillColor: '#A78BFA',
            badgeBg: 'bg-violet-50 text-violet-800 border-violet-200',
            dotBg: 'bg-violet-600',
          },
          diffLabel: 'Arus Kas Bersih (Net Cashflow)',
          ratioLabel: 'Rasio Kas Keluar / Masuk',
        };
      case 'PROFIT':
        return {
          title: 'Trajektori Pertumbuhan Laba Bersih (Net Profit)',
          desc: 'Keuntungan bersih usaha setelah dikurangi HPP dan seluruh beban operasional',
          seriesA: {
            key: 'netProfit',
            name: 'Laba Bersih (Net Profit)',
            color: '#059669', // Emerald 600
            fillColor: '#34D399',
            badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            dotBg: 'bg-emerald-600',
          },
          seriesB: {
            key: 'grossProfit',
            name: 'Laba Kotor Komoditas',
            color: '#3B82F6', // Blue 500
            fillColor: '#93C5FD',
            badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
            dotBg: 'bg-blue-500',
          },
          diffLabel: 'Efisiensi Beban Usaha',
          ratioLabel: 'Margin Laba Bersih',
        };
    }
  }, [mode]);

  // Aggregate stats for KPI summary
  const summaryStats = useMemo(() => {
    if (!data.length) {
      return {
        avgA: 0,
        avgB: 0,
        totalA: 0,
        totalB: 0,
        netTotal: 0,
        ratio: 0,
      };
    }

    const totalA = data.reduce((acc, d: any) => acc + (d[seriesConfig.seriesA.key] || 0), 0);
    const totalB = data.reduce((acc, d: any) => acc + (d[seriesConfig.seriesB.key] || 0), 0);
    const avgA = totalA / data.length;
    const avgB = totalB / data.length;
    const netTotal = totalA - totalB;
    const ratio = totalA > 0 ? (totalB / totalA) * 100 : 0;

    return {
      avgA,
      avgB,
      totalA,
      totalB,
      netTotal,
      ratio,
    };
  }, [data, seriesConfig]);

  // SVG Chart Dimensions & Spline Coordinates Calculation
  const chartLayout = useMemo(() => {
    const width = 860;
    const height = 320;
    const padLeft = 85;
    const padRight = 35;
    const padTop = 25;
    const padBottom = 45;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    if (!data || data.length === 0) {
      return {
        width,
        height,
        padLeft,
        padRight,
        padTop,
        padBottom,
        plotWidth,
        plotHeight,
        pointsA: [],
        pointsB: [],
        pathA: '',
        areaA: '',
        pathB: '',
        areaB: '',
        yTicks: [],
        xTicks: [],
        maxY: 100,
      };
    }

    // Find min and max across all series
    let rawMax = 0;
    data.forEach((d: any) => {
      const vA = d[seriesConfig.seriesA.key] || 0;
      const vB = d[seriesConfig.seriesB.key] || 0;
      if (vA > rawMax) rawMax = vA;
      if (vB > rawMax) rawMax = vB;
    });

    // Provide a neat round ceiling for Y axis
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax || 1)));
    const factor = (rawMax / magnitude) || 1;
    let roundFactor = Math.ceil(factor * 1.15);
    let maxY = roundFactor * magnitude;
    if (maxY === 0) maxY = 1000000;

    // Generate 5 Y-axis ticks
    const tickCount = 5;
    const yTicks = Array.from({ length: tickCount + 1 }).map((_, i) => {
      const val = (maxY / tickCount) * i;
      const yPos = padTop + plotHeight - (val / maxY) * plotHeight;
      return {
        value: val,
        y: yPos,
        label: formatRupiahCompact(val),
      };
    });

    // Compute coordinate points for series
    const n = data.length;
    const stepX = n > 1 ? plotWidth / (n - 1) : plotWidth;

    const pointsA = data.map((d: any, i) => {
      const v = d[seriesConfig.seriesA.key] || 0;
      const x = padLeft + i * stepX;
      const y = padTop + plotHeight - (Math.max(0, v) / maxY) * plotHeight;
      return { x, y, value: v, label: d.label || d.bulan };
    });

    const pointsB = data.map((d: any, i) => {
      const v = d[seriesConfig.seriesB.key] || 0;
      const x = padLeft + i * stepX;
      const y = padTop + plotHeight - (Math.max(0, v) / maxY) * plotHeight;
      return { x, y, value: v, label: d.label || d.bulan };
    });

    // Generate smooth Bézier curves
    const buildBezierSpline = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) / 5;
        const cp1y = p1.y + (p2.y - p0.y) / 5;
        const cp2x = p2.x - (p3.x - p1.x) / 5;
        const cp2y = p2.y - (p3.y - p1.y) / 5;

        path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return path;
    };

    const pathA = buildBezierSpline(pointsA);
    const pathB = buildBezierSpline(pointsB);

    const baselineY = padTop + plotHeight;
    const areaA = pointsA.length > 0
      ? `${pathA} L ${pointsA[pointsA.length - 1].x} ${baselineY} L ${pointsA[0].x} ${baselineY} Z`
      : '';
    const areaB = pointsB.length > 0
      ? `${pathB} L ${pointsB[pointsB.length - 1].x} ${baselineY} L ${pointsB[0].x} ${baselineY} Z`
      : '';

    const xTicks = data.map((d: any, i) => {
      return {
        x: padLeft + i * stepX,
        label: d.label || d.bulan,
      };
    });

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotWidth,
      plotHeight,
      pointsA,
      pointsB,
      pathA,
      areaA,
      pathB,
      areaB,
      yTicks,
      xTicks,
      maxY,
    };
  }, [data, seriesConfig]);

  const activePointA = hoveredIdx !== null ? chartLayout.pointsA[hoveredIdx] : null;
  const activeMonthData = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Grafik Alur Pendapatan & Pengeluaran
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{seriesConfig.desc}</p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('OPERASIONAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'OPERASIONAL'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Penjualan vs Beban
          </button>
          <button
            type="button"
            onClick={() => setMode('KONSOLIDASI')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'KONSOLIDASI'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Konsolidasi (Total)
          </button>
          <button
            type="button"
            onClick={() => setMode('ARUS_KAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'ARUS_KAS'
                ? 'bg-white text-sky-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Arus Kas Masuk/Keluar
          </button>
          <button
            type="button"
            onClick={() => setMode('PROFIT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'PROFIT'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tren Laba Bersih
          </button>
        </div>
      </div>

      {/* KPI Summary Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Rata-rata {seriesConfig.seriesA.name}</span>
            <div className={`w-2.5 h-2.5 rounded-full ${seriesConfig.seriesA.dotBg}`} />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {formatRupiahCompact(summaryStats.avgA)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Total: {formatRupiahCompact(summaryStats.totalA)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Rata-rata {seriesConfig.seriesB.name}</span>
            <div className={`w-2.5 h-2.5 rounded-full ${seriesConfig.seriesB.dotBg}`} />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {formatRupiahCompact(summaryStats.avgB)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Total: {formatRupiahCompact(summaryStats.totalB)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{seriesConfig.diffLabel}</span>
            {summaryStats.netTotal >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
            )}
          </div>
          <div
            className={`text-base sm:text-lg font-black font-mono ${
              summaryStats.netTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatRupiahCompact(summaryStats.netTotal)}
          </div>
          <p className="text-[11px] text-slate-400">
            {summaryStats.netTotal >= 0 ? 'Surplus Operasional' : 'Defisit Terdeteksi'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{seriesConfig.ratioLabel}</span>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-800 font-mono">
            {summaryStats.ratio.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">
            {summaryStats.ratio <= 100 ? 'Terkendali (< 100%)' : 'Pengeluaran melebihi pemasukan'}
          </p>
        </div>
      </div>

      {/* Interactive Line Chart Canvas */}
      <div className="relative border border-slate-100 rounded-2xl p-2 sm:p-4 bg-gradient-to-b from-slate-50/50 to-white overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            Memuat kalkulasi kurva grafik...
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            Data tren belum tersedia untuk periode ini.
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${chartLayout.width} ${chartLayout.height}`}
              className="w-full h-auto overflow-visible select-none"
              style={{ maxHeight: '380px' }}
            >
              <defs>
                {/* Area Gradient for Series A */}
                <linearGradient id="areaGradientA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesConfig.seriesA.color} stopOpacity="0.32" />
                  <stop offset="85%" stopColor={seriesConfig.seriesA.color} stopOpacity="0.02" />
                  <stop offset="100%" stopColor={seriesConfig.seriesA.color} stopOpacity="0.0" />
                </linearGradient>

                {/* Area Gradient for Series B */}
                <linearGradient id="areaGradientB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesConfig.seriesB.color} stopOpacity="0.22" />
                  <stop offset="85%" stopColor={seriesConfig.seriesB.color} stopOpacity="0.02" />
                  <stop offset="100%" stopColor={seriesConfig.seriesB.color} stopOpacity="0.0" />
                </linearGradient>

                {/* Drop shadow filter for active point glow */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Horizontal Grid lines and Y-axis scale */}
              {chartLayout.yTicks.map((t, idx) => (
                <g key={idx}>
                  <line
                    x1={chartLayout.padLeft}
                    y1={t.y}
                    x2={chartLayout.width - chartLayout.padRight}
                    y2={t.y}
                    stroke="#E2E8F0"
                    strokeDasharray={idx === 0 ? 'none' : '3 4'}
                    strokeWidth="1"
                  />
                  <text
                    x={chartLayout.padLeft - 12}
                    y={t.y + 3.5}
                    textAnchor="end"
                    className="fill-slate-400 font-mono text-[10px]"
                  >
                    {t.label}
                  </text>
                </g>
              ))}

              {/* X-axis Month Labels */}
              {chartLayout.xTicks.map((xt, idx) => (
                <text
                  key={idx}
                  x={xt.x}
                  y={chartLayout.height - 12}
                  textAnchor="middle"
                  className={`font-mono text-[11px] transition-colors ${
                    hoveredIdx === idx ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                  }`}
                >
                  {xt.label}
                </text>
              ))}

              {/* Series Areas (Fill) */}
              {chartLayout.areaA && (
                <path d={chartLayout.areaA} fill="url(#areaGradientA)" className="transition-all duration-300" />
              )}
              {chartLayout.areaB && (
                <path d={chartLayout.areaB} fill="url(#areaGradientB)" className="transition-all duration-300" />
              )}

              {/* Series Lines (Stroke) */}
              {chartLayout.pathA && (
                <path
                  d={chartLayout.pathA}
                  fill="none"
                  stroke={seriesConfig.seriesA.color}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {chartLayout.pathB && (
                <path
                  d={chartLayout.pathB}
                  fill="none"
                  stroke={seriesConfig.seriesB.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover Guideline */}
              {hoveredIdx !== null && activePointA && (
                <g>
                  <line
                    x1={activePointA.x}
                    y1={chartLayout.padTop}
                    x2={activePointA.x}
                    y2={chartLayout.padTop + chartLayout.plotHeight}
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                </g>
              )}

              {/* Regular Data Points Dots */}
              {chartLayout.pointsA.map((p, idx) => (
                <circle
                  key={`ptA-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIdx === idx ? 6.5 : 4}
                  fill="#FFFFFF"
                  stroke={seriesConfig.seriesA.color}
                  strokeWidth={hoveredIdx === idx ? 3.5 : 2.5}
                  className="transition-all duration-150 cursor-pointer"
                  filter={hoveredIdx === idx ? 'url(#glow)' : undefined}
                />
              ))}

              {chartLayout.pointsB.map((p, idx) => (
                <circle
                  key={`ptB-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIdx === idx ? 6.5 : 4}
                  fill="#FFFFFF"
                  stroke={seriesConfig.seriesB.color}
                  strokeWidth={hoveredIdx === idx ? 3.5 : 2.5}
                  className="transition-all duration-150 cursor-pointer"
                  filter={hoveredIdx === idx ? 'url(#glow)' : undefined}
                />
              ))}

              {/* Invisible interactive vertical touch columns for responsive hover */}
              {data.map((_, idx) => {
                const step = chartLayout.plotWidth / Math.max(1, data.length - 1);
                const colWidth = step;
                const colX = chartLayout.padLeft + idx * step - colWidth / 2;
                return (
                  <rect
                    key={`hit-${idx}`}
                    x={colX}
                    y={chartLayout.padTop}
                    width={colWidth}
                    height={chartLayout.plotHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                  />
                );
              })}
            </svg>

            {/* Interactive Floating Tooltip */}
            {hoveredIdx !== null && activeMonthData && activePointA && (
              <div
                className="absolute z-20 pointer-events-none transition-all duration-150 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 text-xs w-64"
                style={{
                  left: `${Math.min(
                    Math.max(
                      15,
                      (activePointA.x / chartLayout.width) * 100
                    ),
                    70
                  )}%`,
                  top: '12px',
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                  <span className="font-extrabold text-slate-100 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    {activeMonthData.label || activeMonthData.bulan}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Bulan Ke-{hoveredIdx + 1}</span>
                </div>

                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-[11px] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${seriesConfig.seriesA.dotBg}`} />
                      {seriesConfig.seriesA.name}:
                    </span>
                    <span className="font-bold text-white text-[11px]">
                      {formatRupiah((activeMonthData as any)[seriesConfig.seriesA.key] || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-[11px] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${seriesConfig.seriesB.dotBg}`} />
                      {seriesConfig.seriesB.name}:
                    </span>
                    <span className="font-bold text-white text-[11px]">
                      {formatRupiah((activeMonthData as any)[seriesConfig.seriesB.key] || 0)}
                    </span>
                  </div>

                  <div className="border-t border-slate-700/80 pt-1.5 mt-1.5 flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Selisih:</span>
                    {(() => {
                      const diff =
                        ((activeMonthData as any)[seriesConfig.seriesA.key] || 0) -
                        ((activeMonthData as any)[seriesConfig.seriesB.key] || 0);
                      return (
                        <span
                          className={`font-extrabold ${
                            diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {diff >= 0 ? '+' : ''}
                          {formatRupiah(diff)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Multi-Month Mini Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-t border-slate-100">
        {/* Dynamic Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: seriesConfig.seriesA.color }}
            />
            <span className="font-bold text-slate-800">{seriesConfig.seriesA.name}</span>
          </div>

          <div className="flex items-center space-x-2">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: seriesConfig.seriesB.color }}
            />
            <span className="font-bold text-slate-800">{seriesConfig.seriesB.name}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
            <span>• Klik atau arahkan kursor ke titik kurva untuk inspeksi detail</span>
          </div>
        </div>

        {/* Quick Month Selectors */}
        <div className="flex flex-wrap items-center gap-1.5">
          {data.map((d: any, idx: number) => (
            <button
              key={idx}
              type="button"
              onClick={() => setHoveredIdx(idx === hoveredIdx ? null : idx)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                hoveredIdx === idx
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d.label || d.bulan}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default IncomeExpenseLineChart;
