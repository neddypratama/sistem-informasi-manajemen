import { useAuthStore } from '../stores/auth';
import AppLayout from '../layouts/AppLayout.vue';

/**
 * Definisi rute terpisah dari pembuatan instance router: `createWebHistory()`
 * butuh `window`, sedangkan daftar rute ini murni data sehingga bisa dipakai
 * ulang di lingkungan tanpa DOM.
 *
 * `meta.permission` dapat berupa:
 * - string: nama permission tunggal, atau
 * - array:  salah satu permission yang dimiliki user, atau
 * - fungsi: menerima `route` dan mengembalikan string/array dinamis
 *   (misalkan mengikuti sub menu, lihat rute kategori transaksi).
 */
export const routes = [
    {
        path: '/login',
        name: 'login',
        component: () => import('../pages/LoginPage.vue'),
        meta: { guestOnly: true },
    },
    {
        path: '/',
        component: AppLayout,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                name: 'dashboard',
                component: () => import('../pages/DashboardPage.vue'),
            },

            // Master Data
            {
                path: 'jenis-barang',
                name: 'jenis-barang',
                component: () => import('../pages/master/JenisBarangPage.vue'),
                meta: { permission: 'menu.master.jenis_barang' },
            },
            {
                path: 'barang',
                name: 'barang',
                component: () => import('../pages/master/BarangPage.vue'),
                meta: { permission: 'menu.master.barang' },
            },
            {
                path: 'client',
                name: 'client',
                component: () => import('../pages/master/ClientPage.vue'),
                meta: { permission: 'menu.master.client' },
            },

            // Transaksi per kategori
            {
                path: 'transaksi/pembelian',
                redirect: '/transaksi/pembelian/telur',
            },
            {
                path: 'transaksi/penjualan',
                redirect: '/transaksi/penjualan/telur',
            },
            {
                path: 'transaksi/pembelian/:kategori(telur|pakan|obat|tray)',
                name: 'transaksi.pembelian.kategori',
                component: () => import('../pages/transaksi/TransaksiListPage.vue'),
                meta: {
                    permission: (r) => `menu.pembelian.${r.params.kategori}`,
                    tipe: 'pembelian',
                },
            },
            {
                path: 'transaksi/penjualan/:kategori(telur|pakan|obat|tray)',
                name: 'transaksi.penjualan.kategori',
                component: () => import('../pages/transaksi/TransaksiListPage.vue'),
                meta: {
                    permission: (r) => `menu.penjualan.${r.params.kategori}`,
                    tipe: 'penjualan',
                },
            },
            {
                path: 'transaksi/pembelian/:kategori(telur|pakan|obat|tray)/baru',
                name: 'transaksi.pembelian.create',
                component: () => import('../pages/transaksi/TransaksiFormPage.vue'),
                meta: {
                    permission: (r) => `menu.pembelian.${r.params.kategori}`,
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola pembelian kategori ini.',
                    tipe: 'pembelian',
                },
            },
            {
                path: 'transaksi/penjualan/:kategori(telur|pakan|obat|tray)/baru',
                name: 'transaksi.penjualan.create',
                component: () => import('../pages/transaksi/TransaksiFormPage.vue'),
                meta: {
                    permission: (r) => `menu.penjualan.${r.params.kategori}`,
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola penjualan kategori ini.',
                    tipe: 'penjualan',
                },
            },
            {
                path: 'transaksi/riwayat',
                name: 'transaksi.riwayat',
                component: () => import('../pages/transaksi/TransaksiListPage.vue'),
                meta: { permission: 'menu.transaksi.riwayat' },
            },
            {
                path: 'transaksi/:tipe(pembelian|penjualan)',
                name: 'transaksi.create',
                component: () => import('../pages/transaksi/TransaksiFormPage.vue'),
                meta: {
                    permission: [
                        'menu.pembelian.telur', 'menu.pembelian.pakan', 'menu.pembelian.obat', 'menu.pembelian.tray',
                        'menu.penjualan.telur', 'menu.penjualan.pakan', 'menu.penjualan.obat', 'menu.penjualan.tray',
                    ],
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola transaksi.',
                },
            },
            {
                path: 'transaksi/:id(\\d+)/ubah',
                name: 'transaksi.edit',
                component: () => import('../pages/transaksi/TransaksiFormPage.vue'),
                meta: {
                    permission: [
                        'menu.pembelian.telur', 'menu.pembelian.pakan', 'menu.pembelian.obat', 'menu.pembelian.tray',
                        'menu.penjualan.telur', 'menu.penjualan.pakan', 'menu.penjualan.obat', 'menu.penjualan.tray',
                    ],
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola transaksi.',
                },
            },
            {
                path: 'transaksi/:id(\\d+)',
                name: 'transaksi.show',
                component: () => import('../pages/transaksi/TransaksiShowPage.vue'),
                meta: {
                    permission: [
                        'menu.pembelian.telur', 'menu.pembelian.pakan', 'menu.pembelian.obat', 'menu.pembelian.tray',
                        'menu.penjualan.telur', 'menu.penjualan.pakan', 'menu.penjualan.obat', 'menu.penjualan.tray',
                        'menu.transaksi.riwayat',
                    ],
                },
            },

            // Retur
            {
                path: 'retur/:tipe(pembelian|penjualan)',
                name: 'retur.create',
                component: () => import('../pages/retur/ReturFormPage.vue'),
                meta: {
                    permission: (r) => `menu.retur.${r.params.tipe}`,
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola retur.',
                },
            },

            // Stok
            {
                path: 'stok',
                name: 'stok',
                component: () => import('../pages/stok/StokListPage.vue'),
                meta: { permission: 'menu.stok.barang' },
            },
            {
                path: 'stok/fifo',
                name: 'stok.fifo',
                component: () => import('../pages/stok/StokFifoPage.vue'),
                meta: { permission: 'menu.stok.fifo' },
            },
            {
                path: 'stok/opname',
                name: 'stok.opname',
                component: () => import('../pages/stok/StokOpnameListPage.vue'),
                meta: { permission: 'menu.stok.opname' },
            },
            {
                path: 'stok/opname/baru',
                name: 'stok.opname.create',
                component: () => import('../pages/stok/StokOpnameCreatePage.vue'),
                meta: {
                    permission: 'menu.stok.opname',
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola stok opname.',
                },
            },
            {
                path: 'stok/opname/:id(\\d+)',
                name: 'stok.opname.show',
                component: () => import('../pages/stok/StokOpnameShowPage.vue'),
                meta: { permission: 'menu.stok.opname' },
            },
            {
                path: 'stok/riwayat',
                name: 'stok.riwayat',
                component: () => import('../pages/stok/StokRiwayatListPage.vue'),
                meta: { permission: 'menu.stok.riwayat' },
            },
            {
                path: 'stok/riwayat/:id(\\d+)',
                name: 'stok.riwayat.show',
                component: () => import('../pages/stok/StokRiwayatDetailPage.vue'),
                meta: { permission: 'menu.stok.riwayat' },
            },
            {
                path: 'stok/laporan',
                name: 'stok.laporan',
                component: () => import('../pages/stok/StokLaporanPage.vue'),
                meta: { permission: 'menu.stok.laporan' },
            },

            // Akuntansi
            {
                path: 'akuntansi/saldo-client',
                name: 'tagihan',
                component: () => import('../pages/akuntansi/TagihanListPage.vue'),
                meta: { permission: 'menu.akuntansi.saldo_client' },
            },
            {
                path: 'akuntansi/saldo-client/:clientId(\\d+)',
                name: 'tagihan.show',
                component: () => import('../pages/akuntansi/TagihanShowPage.vue'),
                meta: { permission: 'menu.akuntansi.saldo_client' },
            },
            {
                path: 'akuntansi/hutang',
                name: 'hutang',
                component: () => import('../pages/akuntansi/HutangPage.vue'),
                meta: { permission: 'menu.akuntansi.hutang' },
            },
            {
                path: 'akuntansi/piutang',
                name: 'piutang',
                component: () => import('../pages/akuntansi/PiutangPage.vue'),
                meta: { permission: 'menu.akuntansi.piutang' },
            },
            {
                path: 'akuntansi/jurnal',
                name: 'jurnal',
                component: () => import('../pages/akuntansi/JurnalListPage.vue'),
                meta: { permission: 'menu.akuntansi.jurnal' },
            },
            {
                path: 'akuntansi/jurnal/baru',
                name: 'jurnal.create',
                component: () => import('../pages/akuntansi/JurnalFormPage.vue'),
                meta: {
                    permission: 'menu.akuntansi.jurnal',
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola jurnal.',
                },
            },
            {
                path: 'akuntansi/jurnal/:id(\\d+)/ubah',
                name: 'jurnal.edit',
                component: () => import('../pages/akuntansi/JurnalFormPage.vue'),
                meta: {
                    permission: 'menu.akuntansi.jurnal',
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola jurnal.',
                },
            },
            {
                path: 'akuntansi/jurnal/:id(\\d+)',
                name: 'jurnal.show',
                component: () => import('../pages/akuntansi/JurnalShowPage.vue'),
                meta: { permission: 'menu.akuntansi.jurnal' },
            },
            {
                path: 'akuntansi/kas',
                name: 'kas',
                component: () => import('../pages/akuntansi/KasMonitoringPage.vue'),
                meta: { permission: 'menu.akuntansi.kas' },
            },

            // Entri jurnal per jenis (kas, beban, pendapatan, hutang, piutang)
            {
                path: 'jurnal/:jenis(kas|hutang|piutang|beban|pendapatan)',
                name: 'jurnal.jenis',
                component: () => import('../pages/akuntansi/JurnalFormPage.vue'),
                meta: {
                    permission: (r) => {
                        const map = {
                            kas: 'menu.jurnal.kas',
                            beban: 'menu.jurnal.beban',
                            pendapatan: 'menu.jurnal.pendapatan',
                            hutang: 'menu.akuntansi.hutang',
                            piutang: 'menu.akuntansi.piutang',
                        };
                        return map[r.params.jenis];
                    },
                    permissionMessage: 'Anda tidak memiliki izin untuk mengelola jurnal.',
                },
            },

            // Akun & Kategori Akun
            {
                path: 'akun',
                name: 'akun',
                component: () => import('../pages/master/AkunPage.vue'),
                meta: { permission: 'menu.jurnal.akun' },
            },
            {
                path: 'kategori',
                name: 'kategori',
                component: () => import('../pages/master/KategoriPage.vue'),
                meta: { permission: 'menu.jurnal.kategori' },
            },

            // Laporan
            {
                path: 'laporan/buku-besar',
                name: 'laporan.buku-besar',
                component: () => import('../pages/laporan/BukuBesarPage.vue'),
                meta: { permission: 'menu.laporan.buku_besar' },
            },
            {
                path: 'laporan/neraca',
                name: 'laporan.neraca',
                component: () => import('../pages/laporan/NeracaPage.vue'),
                meta: { permission: 'menu.laporan.neraca' },
            },
            {
                path: 'laporan/laba-rugi',
                name: 'laporan.laba-rugi',
                component: () => import('../pages/laporan/LabaRugiPage.vue'),
                meta: { permission: 'menu.laporan.laba_rugi' },
            },
            {
                path: 'laporan/laba-rugi-curah',
                name: 'laporan.laba-rugi-curah',
                component: () => import('../pages/laporan/LabaRugiPakanCurahPage.vue'),
                meta: { permission: 'menu.laporan.laba_rugi_curah' },
            },

            // Akses
            {
                path: 'role',
                name: 'role',
                component: () => import('../pages/access/RoleListPage.vue'),
                meta: { permission: 'menu.akses.role' },
            },
            {
                path: 'user',
                name: 'user',
                component: () => import('../pages/access/UserListPage.vue'),
                meta: { permission: 'menu.akses.user' },
            },
            {
                path: 'akses/log-aktivitas',
                name: 'log-aktivitas',
                component: () => import('../pages/access/LogAktivitasPage.vue'),
                meta: { permission: 'menu.akses.log' },
            },
        ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
];

/**
 * Pasang guard autentikasi pada instance router.
 *
 * @param {import('vue-router').Router} instance
 */
export function pasangGuard(instance) {
    instance.beforeEach(async (to) => {
        const auth = useAuthStore();

        await auth.bootstrap();

        if (to.meta.requiresAuth && !auth.user) {
            return { name: 'login' };
        }

        if (to.meta.guestOnly && auth.user) {
            return { name: 'dashboard' };
        }

        return true;
    });

    return instance;
}