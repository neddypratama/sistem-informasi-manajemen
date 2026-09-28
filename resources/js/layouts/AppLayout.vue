<script setup>
import { computed, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useMediaQuery, useStorage } from '@vueuse/core';
import SidebarBrand from './SidebarBrand.vue';
import SidebarMenuItem from './SidebarMenuItem.vue';
import SidebarSection from './SidebarSection.vue';
import { useAuthStore } from '../stores/auth';
import { cn } from '../lib/utils';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const isDesktop = useMediaQuery('(min-width: 1024px)');
const mobileOpen = ref(false);
const collapsed = useStorage('sim-sidebar-collapsed', false);
const openSections = ref(new Set());
const flyout = ref(null);

const effectiveCollapsed = computed(() => isDesktop.value && collapsed.value);

const roleName = computed(() => auth.user?.role?.name || '');

const isAdmin = computed(() => ['SuperAdmin', 'Admin'].includes(roleName.value));

/**
 * Selesaikan spesifikasi permission (string, array, atau fungsi(route)) menjadi daftar nama.
 * @returns {string[]}
 */
function resolvePermissions(spec) {
    if (typeof spec === 'function') {
        return resolvePermissions(spec(route));
    }
    if (Array.isArray(spec)) {
        return spec.flatMap(resolvePermissions);
    }
    return spec ? [spec] : [];
}

function hasAnyPermission(spec) {
    const list = resolvePermissions(spec).filter(Boolean);
    return list.length === 0 || list.some((permission) => auth.hasPermission(permission));
}

const sections = computed(() => [
    {
        key: 'master',
        icon: '🗂️',
        title: 'Master Data',
        items: [
            { to: '/jenis-barang', icon: '🏷️', label: 'Jenis Barang', show: auth.hasPermission('menu.master.jenis_barang') },
            { to: '/barang', icon: '📦', label: 'Barang', show: auth.hasPermission('menu.master.barang') },
            { to: '/client', icon: '👥', label: 'Client', show: auth.hasPermission('menu.master.client') },
        ],
        show: auth.hasPermission('menu.master.jenis_barang')
            || auth.hasPermission('menu.master.barang')
            || auth.hasPermission('menu.master.client'),
    },
    {
        key: 'pembelian',
        icon: '🛒',
        title: 'Pembelian',
        items: [
            { to: '/transaksi/pembelian/telur', icon: '🥚', label: 'Pembelian Telur', show: auth.hasPermission('menu.pembelian.telur') },
            { to: '/transaksi/pembelian/pakan', icon: '🌾', label: 'Pembelian Pakan', show: auth.hasPermission('menu.pembelian.pakan') },
            { to: '/transaksi/pembelian/obat', icon: '💊', label: 'Pembelian Obat', show: auth.hasPermission('menu.pembelian.obat') },
            { to: '/transaksi/pembelian/tray', icon: '📦', label: 'Pembelian Tray', show: auth.hasPermission('menu.pembelian.tray') },
        ],
        show: auth.hasPermission('menu.pembelian.telur')
            || auth.hasPermission('menu.pembelian.pakan')
            || auth.hasPermission('menu.pembelian.obat')
            || auth.hasPermission('menu.pembelian.tray'),
    },
    {
        key: 'penjualan',
        icon: '🛍️',
        title: 'Penjualan',
        items: [
            { to: '/transaksi/penjualan/telur', icon: '🥚', label: 'Penjualan Telur', show: auth.hasPermission('menu.penjualan.telur') },
            { to: '/transaksi/penjualan/pakan', icon: '🌾', label: 'Penjualan Pakan', show: auth.hasPermission('menu.penjualan.pakan') },
            { to: '/transaksi/penjualan/obat', icon: '💊', label: 'Penjualan Obat', show: auth.hasPermission('menu.penjualan.obat') },
            { to: '/transaksi/penjualan/tray', icon: '📦', label: 'Penjualan Tray', show: auth.hasPermission('menu.penjualan.tray') },
        ],
        show: auth.hasPermission('menu.penjualan.telur')
            || auth.hasPermission('menu.penjualan.pakan')
            || auth.hasPermission('menu.penjualan.obat')
            || auth.hasPermission('menu.penjualan.tray'),
    },
    {
        key: 'transaksi-lain',
        icon: '🧾',
        title: 'Retur & Riwayat',
        items: [
            {
                to: '/retur/penjualan',
                icon: '↪️',
                label: 'Retur Penjualan',
                show: auth.hasPermission('menu.retur.penjualan'),
            },
            {
                to: '/retur/pembelian',
                icon: '↩️',
                label: 'Retur Pembelian',
                show: auth.hasPermission('menu.retur.pembelian'),
            },
            {
                to: '/transaksi/riwayat',
                icon: '⏱️',
                label: 'Riwayat Transaksi',
                show: isAdmin.value && auth.hasPermission('menu.transaksi.riwayat'),
            },
        ],
        show: auth.hasPermission('menu.retur.penjualan')
            || auth.hasPermission('menu.retur.pembelian')
            || (isAdmin.value && auth.hasPermission('menu.transaksi.riwayat')),
    },
    {
        key: 'stok',
        icon: '🗃️',
        title: 'Stok',
        items: [
            { to: '/stok', icon: '📊', label: 'Stok Barang', show: auth.hasPermission('menu.stok.barang') },
            { to: '/stok/fifo', icon: '🧮', label: 'FIFO', show: auth.hasPermission('menu.stok.fifo') },
            { to: '/stok/opname', icon: '📋', label: 'Stok Opname', show: auth.hasPermission('menu.stok.opname') },
            { to: '/stok/laporan', icon: '📑', label: 'Laporan Stok', show: auth.hasPermission('menu.stok.laporan') },
        ],
        show: auth.hasPermission('menu.stok.barang')
            || auth.hasPermission('menu.stok.fifo')
            || auth.hasPermission('menu.stok.opname')
            || auth.hasPermission('menu.stok.laporan'),
    },
    {
        key: 'akuntansi',
        icon: '💹',
        title: 'Akuntansi',
        items: [
            { to: '/akuntansi/saldo-client', icon: '↔️', label: 'Saldo Per Client', show: auth.hasPermission('menu.akuntansi.saldo_client') },
            { to: '/akuntansi/hutang', icon: '💸', label: 'Hutang', show: auth.hasPermission('menu.akuntansi.hutang') },
            { to: '/akuntansi/piutang', icon: '💰', label: 'Piutang', show: auth.hasPermission('menu.akuntansi.piutang') },
            { to: '/akuntansi/jurnal', icon: '📒', label: 'Jurnal Umum', show: auth.hasPermission('menu.akuntansi.jurnal') },
            { to: '/akuntansi/kas', icon: '👛', label: 'Monitoring Kas', show: auth.hasPermission('menu.akuntansi.kas') },
        ],
        show: auth.hasPermission('menu.akuntansi.saldo_client')
            || auth.hasPermission('menu.akuntansi.hutang')
            || auth.hasPermission('menu.akuntansi.piutang')
            || auth.hasPermission('menu.akuntansi.jurnal')
            || auth.hasPermission('menu.akuntansi.kas'),
    },
    {
        key: 'entri-jurnal',
        icon: '📝',
        title: 'Entri Jurnal',
        items: [
            { to: '/jurnal/kas', icon: '💵', label: 'Kas', show: auth.hasPermission('menu.jurnal.kas') },
            { to: '/jurnal/beban', icon: '📉', label: 'Beban', show: auth.hasPermission('menu.jurnal.beban') },
            { to: '/jurnal/pendapatan', icon: '📈', label: 'Pendapatan', show: auth.hasPermission('menu.jurnal.pendapatan') },
            { to: '/akun', icon: '🏦', label: 'Akun', show: auth.hasPermission('menu.jurnal.akun') },
            { to: '/kategori', icon: '🏷️', label: 'Kategori Akun', show: auth.hasPermission('menu.jurnal.kategori') },
        ],
        show: auth.hasPermission('menu.jurnal.kas')
            || auth.hasPermission('menu.jurnal.beban')
            || auth.hasPermission('menu.jurnal.pendapatan')
            || auth.hasPermission('menu.jurnal.akun')
            || auth.hasPermission('menu.jurnal.kategori'),
    },
    {
        key: 'laporan',
        icon: '📊',
        title: 'Laporan',
        items: [
            { to: '/laporan/buku-besar', icon: '📘', label: 'Buku Besar', show: auth.hasPermission('menu.laporan.buku_besar') },
            { to: '/laporan/neraca', icon: '⚖️', label: 'Neraca', show: auth.hasPermission('menu.laporan.neraca') },
            { to: '/laporan/laba-rugi', icon: '📊', label: 'Laba Rugi', show: auth.hasPermission('menu.laporan.laba_rugi') },
            { to: '/laporan/laba-rugi-curah', icon: '🌾', label: 'Laba Rugi Pakan Curah', show: auth.hasPermission('menu.laporan.laba_rugi_curah') },
        ],
        show: auth.hasPermission('menu.laporan.buku_besar')
            || auth.hasPermission('menu.laporan.neraca')
            || auth.hasPermission('menu.laporan.laba_rugi')
            || auth.hasPermission('menu.laporan.laba_rugi_curah'),
    },
    {
        key: 'akses',
        icon: '🔐',
        title: 'Akses',
        items: [
            { to: '/role', icon: '🛡️', label: 'Role Permission', show: auth.hasPermission('menu.akses.role') },
            { to: '/user', icon: '👤', label: 'User', show: auth.hasPermission('menu.akses.user') },
            { to: '/akses/log-aktivitas', icon: '🧾', label: 'Log Aktivitas', show: auth.hasPermission('menu.akses.log') },
        ],
        show: auth.hasPermission('menu.akses.role')
            || auth.hasPermission('menu.akses.user')
            || auth.hasPermission('menu.akses.log'),
    },
]);

const isItemActive = (to) => route.path === to || route.path.startsWith(`${to}/`);

const visibleSections = computed(() =>
    sections.value
        .filter((section) => section.show)
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.show ?? true),
            hasActive: section.items.some((item) => isItemActive(item.to)),
        })),
);

watch(
    () => route.path,
    () => {
        mobileOpen.value = false;
        const next = new Set(openSections.value);
        let changed = false;

        visibleSections.value.forEach((section) => {
            if (section.hasActive && !next.has(section.key)) {
                next.add(section.key);
                changed = true;
            }
        });

        if (changed) {
            openSections.value = next;
        }
    },
    { immediate: true },
);

const asideClasses = computed(() =>
    cn(
        'fixed inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 lg:static lg:z-auto',
        mobileOpen.value ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        'w-72 max-w-[85vw]',
        effectiveCollapsed.value ? 'lg:w-16' : 'lg:w-64',
    ),
);

const initial = computed(() => (auth.user?.name || 'G').charAt(0).toUpperCase());

/** Tampilkan pesan larangan alih-alih redirect, mengikuti perilaku sebelumnya. */
const deniedMessage = computed(() => {
    const permission = route.meta.permission;

    if (!permission || hasAnyPermission(permission)) {
        return null;
    }

    return route.meta.permissionMessage ?? 'Anda tidak memiliki izin untuk mengakses halaman ini.';
});

function toggleSection(key) {
    if (effectiveCollapsed.value) {
        flyout.value = flyout.value === key ? null : key;

        return;
    }

    const next = new Set(openSections.value);

    if (next.has(key)) {
        next.delete(key);
    } else {
        next.add(key);
    }

    openSections.value = next;
}

function toggleCollapsed() {
    if (!isDesktop.value) {
        mobileOpen.value = false;
        return;
    }

    collapsed.value = !collapsed.value;
    flyout.value = null;
}

async function handleLogout() {
    await auth.logout();
    window.location.href = '/login';
}
</script>

<template>
    <div class="flex h-screen overflow-hidden bg-slate-100">
        <!-- Mobile backdrop -->
        <div
            v-if="mobileOpen"
            class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
            @click="mobileOpen = false"
        />

        <aside :class="asideClasses">
            <SidebarBrand
                :collapsed="effectiveCollapsed"
                :mobile="!isDesktop"
                @toggle="toggleCollapsed"
            />

            <nav class="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
                <SidebarMenuItem
                    to="/"
                    exact
                    icon="🏠"
                    label="Dashboard"
                    :collapsed="effectiveCollapsed"
                    @select="mobileOpen = false"
                />
                <SidebarSection
                    v-for="section in visibleSections"
                    :key="section.key"
                    :section="section"
                    :collapsed="effectiveCollapsed"
                    :open="openSections.has(section.key)"
                    :flyout-open="flyout === section.key"
                    @toggle="toggleSection(section.key)"
                    @select="flyout = null; mobileOpen = false"
                />
            </nav>

            <div class="shrink-0 border-t border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
                {{ effectiveCollapsed ? 'v1.0' : 'SIM Stok v1.0' }}
            </div>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
            <header
                class="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6"
            >
                <div class="flex items-center gap-3">
                    <button
                        type="button"
                        class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
                        aria-label="Buka menu"
                        @click="mobileOpen = true"
                    >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div class="hidden text-sm text-slate-500 md:block">
                        Selamat datang, <span class="font-semibold text-slate-800">{{ auth.user?.name }}</span>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2">
                        <div
                            class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white"
                        >
                            {{ initial }}
                        </div>
                        <div class="hidden leading-tight sm:block">
                            <div class="text-sm font-medium text-slate-800">{{ auth.user?.name }}</div>
                            <div class="text-xs text-slate-400">{{ auth.user?.role?.name || '-' }}</div>
                        </div>
                    </div>
                    <button
                        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                        @click="handleLogout"
                    >
                        Keluar
                    </button>
                </div>
            </header>

            <main class="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
                <div
                    v-if="deniedMessage"
                    class="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                    {{ deniedMessage }}
                </div>
                <RouterView v-else />
            </main>
        </div>
    </div>
</template>
