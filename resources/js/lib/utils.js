import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Ambil seluruh attrs kecuali `class`, agar bisa di-`v-bind` tanpa menimpa hasil `cn()`.
 *
 * @param {Record<string, unknown>} attrs
 * @return {Record<string, unknown>}
 */
export function attrsWithoutClass(attrs) {
    const { class: _class, ...rest } = attrs;

    return rest;
}

// Format angka ke id-ID (ribuan "." , desimal ","). Contoh: 1234567.5 -> "1.234.567,5"
export function formatIDR(value) {
    const n = Number(value || 0);
    return n.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

/**
 * Parse input id-ID menjadi number: titik selalu pemisah ribuan, koma pemisah desimal.
 * Contoh: "1.234.567,5" -> 1234567.5, "1.234" -> 1234, "0,5" -> 0.5.
 *
 * @param {unknown} value
 * @return {number}
 */
export function parseMoney(value) {
    if (value == null || value === '') {
        return 0;
    }

    const cleaned = String(value).replace(/[^\d,.-]/g, '');

    if (!cleaned) {
        return 0;
    }

    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
}

export function formatTanggal(date) {
    if (!date) return '-';
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
    ).padStart(2, '0')}`;
}

/**
 * Gabungkan pesan validasi Laravel menjadi satu string siap tampil.
 *
 * @param {unknown} error
 * @param {string} fallback
 * @return {string}
 */
export function apiErrorMessage(error, fallback = 'Terjadi kesalahan.') {
    const data = error?.response?.data;

    let msg = '';
    if (data?.errors) {
        msg = Object.values(data.errors).flat().join('\n');
    } else {
        msg = data?.message || fallback;
    }

    if (/^validation\.[a-z_]+$/i.test(msg.trim())) {
        return fallback;
    }

    return msg;
}
