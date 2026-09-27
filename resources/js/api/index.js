import { client } from './client';
import { exportExcel } from '../lib/excel';

const wrap = {
    get: (url, cfg) => client.get(url, cfg).then((r) => r.data),
    post: (url, data) => client.post(url, data).then((r) => r.data),
    put: (url, data) => client.put(url, data).then((r) => r.data),
    del: (url) => client.delete(url).then((r) => r.data),
};

export const authApi = {
    login: (creds) => wrap.post('/login', creds),
    me: () => wrap.get('/me'),
    logout: () => wrap.post('/logout'),
};

export const dashboardApi = {
    index: (params) => wrap.get('/dashboard', { params }),
    stokPerJenis: (params) => wrap.get('/dashboard/stok', { params }),
};

export const jenisBarangApi = {
    index: (params) => wrap.get('/jenis-barang', { params }),
    options: () => wrap.get('/jenis-barang/options'),
    store: (data) => wrap.post('/jenis-barang', data),
    update: (id, data) => wrap.put(`/jenis-barang/${id}`, data),
    destroy: (id) => wrap.del(`/jenis-barang/${id}`),
};

export const barangApi = {
    index: (params) => wrap.get('/barang', { params }),
    options: () => wrap.get('/barang/options'),
    store: (data) => wrap.post('/barang', data),
    update: (id, data) => wrap.put(`/barang/${id}`, data),
    destroy: (id) => wrap.del(`/barang/${id}`),
};

export const clientApi = {
    index: (params) => wrap.get('/client', { params }),
    options: () => wrap.get('/client/options'),
    store: (data) => wrap.post('/client', data),
    update: (id, data) => wrap.put(`/client/${id}`, data),
    destroy: (id) => wrap.del(`/client/${id}`),
};

export const akunApi = {
    index: (params) => wrap.get('/akun', { params }),
    kategoriOptions: () => wrap.get('/akun/kategori-options'),
    kasBankOptions: () => wrap.get('/akun/kas-bank-options'),
    store: (data) => wrap.post('/akun', data),
    update: (id, data) => wrap.put(`/akun/${id}`, data),
    destroy: (id) => wrap.del(`/akun/${id}`),
};

export const kategoriApi = {
    index: (params) => wrap.get('/kategori', { params }),
    store: (data) => wrap.post('/kategori', data),
    update: (id, data) => wrap.put(`/kategori/${id}`, data),
    destroy: (id) => wrap.del(`/kategori/${id}`),
};

export const transaksiApi = {
    index: (params) => wrap.get('/transaksi', { params }),
    exportExcel: (params) => exportExcel('/transaksi/export-excel', params, 'transaksi.xlsx'),
    createData: (tipe, kategori) => wrap.get('/transaksi/create-data', { params: { tipe, kategori } }),
    editData: (id) => wrap.get(`/transaksi/${id}/edit-data`),
    show: (id) => wrap.get(`/transaksi/${id}`),
    store: (data) => wrap.post('/transaksi', data),
    update: (id, data) => wrap.put(`/transaksi/${id}`, data),
    destroy: (id) => wrap.del(`/transaksi/${id}`),
};

export const returApi = {
    index: (params) => wrap.get('/retur', { params }),
    createData: (tipe) => wrap.get('/retur/create-data', { params: { tipe } }),
    sumberItems: (sumberId) => wrap.get(`/retur/sumber/${sumberId}/items`),
    show: (id) => wrap.get(`/retur/${id}`),
    store: (data) => wrap.post('/retur', data),
    destroy: (id) => wrap.del(`/retur/${id}`),
};

export const stokApi = {
    index: (params) => wrap.get('/stok', { params }),
    exportExcel: (params) => exportExcel('/stok/export-excel', params, 'stok.xlsx'),
    fifo: (params) => wrap.get('/stok/fifo', { params }),
};

export const stokRiwayatApi = {
    index: (params) => wrap.get('/stok/riwayat', { params }),
    show: (id, params) => wrap.get(`/stok/riwayat/${id}`, { params }),
    exportExcel: (id, params) =>
        exportExcel(`/stok/riwayat/${id}/export-excel`, params, `riwayat-stok-${id}.xlsx`),
};

export const stokLaporanApi = {
    index: (params) => wrap.get('/stok/laporan', { params }),
    exportExcel: (params) => exportExcel('/stok/laporan/export-excel', params, 'laporan-stok.xlsx'),
};

export const stokOpnameApi = {
    createData: () => wrap.get('/stok-opname/create-data'),
    exportExcel: (params) => exportExcel('/stok-opname/export-excel', params, 'stok-opname.xlsx'),
    index: (params) => wrap.get('/stok-opname', { params }),
    show: (id) => wrap.get(`/stok-opname/${id}`),
    store: (data) => wrap.post('/stok-opname', data),
    destroy: (id) => wrap.del(`/stok-opname/${id}`),
};

export const jurnalApi = {
    index: (params) => wrap.get('/jurnal', { params }),
    exportExcel: (params) => exportExcel('/jurnal/export-excel', params, 'jurnal.xlsx'),
    show: (id) => wrap.get(`/jurnal/${id}`),
    createData: () => wrap.get('/jurnal/create-data'),
    editData: (id) => wrap.get(`/jurnal/${id}/edit-data`),
    store: (data) => wrap.post('/jurnal', data),
    storeJenis: (data) => wrap.post('/jurnal/jenis', data),
    update: (id, data) => wrap.put(`/jurnal/${id}`, data),
    destroy: (id) => wrap.del(`/jurnal/${id}`),
};

export const kasApi = {
    index: (params) => wrap.get('/kas', { params }),
    exportExcel: (params) => exportExcel('/kas/export-excel', params, 'kas-bank.xlsx'),
};

export const tagihanApi = {
    index: () => wrap.get('/tagihan'),
    exportExcel: () => exportExcel('/tagihan/export-excel', {}, 'saldo-client.xlsx'),
    show: (clientId) => wrap.get(`/tagihan/${clientId}`),
};

export const hutangApi = {
    index: (params) => wrap.get('/hutang', { params }),
    exportExcel: (params) => exportExcel('/hutang/export-excel', params, 'hutang.xlsx'),
    createData: () => wrap.get('/hutang/create-data'),
    storeTambah: (data) => wrap.post('/hutang/tambah', data),
    storeBayar: (data) => wrap.post('/hutang/bayar', data),
};

export const piutangApi = {
    index: (params) => wrap.get('/piutang', { params }),
    exportExcel: (params) => exportExcel('/piutang/export-excel', params, 'piutang.xlsx'),
    createData: () => wrap.get('/piutang/create-data'),
    storeTambah: (data) => wrap.post('/piutang/tambah', data),
    storeBayar: (data) => wrap.post('/piutang/bayar', data),
};

export const pelunasanApi = {
    hutang: () => wrap.get('/pelunasan/hutang'),
    bayarHutang: (data) => wrap.post('/pelunasan/hutang', data),
    hapusHutang: (id) => wrap.del(`/pelunasan/hutang/${id}`),
    piutang: () => wrap.get('/pelunasan/piutang'),
    terimaPiutang: (data) => wrap.post('/pelunasan/piutang', data),
    hapusPiutang: (id) => wrap.del(`/pelunasan/piutang/${id}`),
};

export const laporanApi = {
    bukuBesar: (params) => wrap.get('/laporan/buku-besar', { params }),
    exportBukuBesar: (params) => exportExcel('/laporan/buku-besar/export-excel', params, 'buku-besar.xlsx'),
    neraca: (params) => wrap.get('/laporan/neraca', { params }),
    exportNeraca: (params) => exportExcel('/laporan/neraca/export-excel', params, 'neraca.xlsx'),
    labaRugi: (params) => wrap.get('/laporan/laba-rugi', { params }),
    exportLabaRugi: (params) => exportExcel('/laporan/laba-rugi/export-excel', params, 'laba-rugi.xlsx'),
    labaRugiPakanCurah: (params) => wrap.get('/laporan/laba-rugi-curah', { params }),
    exportLabaRugiPakanCurah: (params) =>
        exportExcel('/laporan/laba-rugi-curah/export-excel', params, 'laba-rugi-pakan-curah.xlsx'),
};

export const roleApi = {
    index: (params) => wrap.get('/role', { params }),
    options: () => wrap.get('/role/options'),
    permissions: () => wrap.get('/role/permissions'),
    store: (data) => wrap.post('/role', data),
    update: (id, data) => wrap.put(`/role/${id}`, data),
    destroy: (id) => wrap.del(`/role/${id}`),
};

export const permissionApi = {
    index: (params) => wrap.get('/permission', { params }),
    store: (data) => wrap.post('/permission', data),
    update: (id, data) => wrap.put(`/permission/${id}`, data),
    destroy: (id) => wrap.del(`/permission/${id}`),
};

export const userApi = {
    index: (params) => wrap.get('/user', { params }),
    store: (data) => wrap.post('/user', data),
    update: (id, data) => wrap.put(`/user/${id}`, data),
    destroy: (id) => wrap.del(`/user/${id}`),
};

export const logAktivitasApi = {
    index: (params) => wrap.get('/log-aktivitas', { params }),
    userOptions: () => wrap.get('/log-aktivitas/users'),
};
