import { formatIDR } from './utils';

/** Format rupiah penuh dengan awalan "Rp". */
export function formatRp(value) {
    return `Rp ${formatIDR(value)}`;
}

/** Format ringkas rupiah: 12,45 M / 43,3 Jt / 250 Rb agar muat di kartu. */
export function formatRingkas(value) {
    const n = Number(value || 0);
    const sign = n < 0 ? '-' : '';
    const v = Math.abs(n);

    if (v >= 1e9) return `${sign}Rp ${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
    if (v >= 1e6) return `${sign}Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`;
    if (v >= 1e3) return `${sign}Rp ${(v / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Rb`;

    return `${sign}Rp ${formatIDR(v)}`;
}

/** Label sumbu grafik tanpa "Rp" agar tidak menumpuk. */
export function formatAxis(value) {
    const v = Number(value || 0);

    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })}Jt`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 })}Rb`;

    return v.toLocaleString('id-ID');
}

/** Persentase bertanda: +12,8% / -4,2%. */
export function formatDelta(value) {
    if (value === null || value === undefined) return null;
    const sign = value > 0 ? '+' : '';

    return `${sign}${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

export function growthHint(value) {
    const delta = formatDelta(value);
    if (delta === null) return 'Belum ada pembanding periode sebelumnya';

    return `${delta} vs periode sebelumnya`;
}

export function growthClass(value) {
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-rose-600';

    return 'text-slate-400';
}

/** Pembulatan nilai maksimum sumbu ke angka bulat yang enak dibaca. */
export function niceMax(value) {
    if (value <= 0) return 1;
    const exponent = Math.floor(Math.log10(value));
    const base = Math.pow(10, exponent);
    const scaled = value / base;
    const factor = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;

    return factor * base;
}

/** Jalur bezier halus antar titik untuk grafik area/line dashboard. */
export function smoothPath(points) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const cur = points[i];
        const midX = (prev.x + cur.x) / 2;
        d += ` C ${midX} ${prev.y}, ${midX} ${cur.y}, ${cur.x} ${cur.y}`;
    }

    return d;
}
