<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TransaksiForm from '../../components/transaksi/TransaksiForm.vue';
import { transaksiApi } from '../../api';
import { invalidateQueries, useQuery } from '../../lib/query';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const isAdmin = computed(() => ['SuperAdmin', 'Admin'].includes(auth.user?.role?.name));

const transaksiId = computed(() => route.params.id ?? null);
const mode = computed(() => (transaksiId.value ? 'edit' : 'create'));

const { data, isLoading } = useQuery({
    queryKey: () => ['transaksi', transaksiId.value],
    queryFn: () => transaksiApi.show(transaksiId.value),
    enabled: () => Boolean(transaksiId.value),
});

const pageKategori = computed(() => route.params.kategori || '');

const effectiveTipe = computed(() => {
    if (route.meta.tipe) {
        return route.meta.tipe;
    }
    if (transaksiId.value) {
        return data.value?.transaksi?.tipe_transaksi || 'pembelian';
    }

    return route.params.tipe || 'pembelian';
});

const typeLabel = computed(() => (effectiveTipe.value === 'penjualan' ? 'Penjualan' : 'Pembelian'));

const kategoriLabel = computed(() => {
    if (!pageKategori.value) return '';
    return pageKategori.value.charAt(0).toUpperCase() + pageKategori.value.slice(1);
});

const title = computed(() =>
    mode.value === 'edit'
        ? `Ubah Transaksi ${typeLabel.value}`
        : `${typeLabel.value} ${kategoriLabel.value} Baru`,
);

const description = computed(() =>
    mode.value === 'edit'
        ? `No. ${data.value?.transaksi?.nomor_transaksi ?? ''}`
        : `Catat transaksi ${typeLabel.value.toLowerCase()} ${kategoriLabel.value.toLowerCase()} secara kredit.`,
);

function backTarget() {
    const tipe = effectiveTipe.value;
    const kategori = pageKategori.value || data.value?.transaksi?.kategori || '';

    if ((tipe === 'pembelian' || tipe === 'penjualan') && kategori) {
        return `/transaksi/${tipe}/${kategori}`;
    }

    return isAdmin.value ? '/transaksi/riwayat' : `/transaksi/${tipe}`;
}

function finish() {
    invalidateQueries({ queryKey: ['transaksi'] });
    invalidateQueries({ queryKey: ['dashboard'] });
    invalidateQueries({ queryKey: ['stok'] });

    router.push(backTarget());
}
</script>

<template>
    <PageLoader v-if="mode === 'edit' && isLoading" />
    <div v-else>
        <PageHeader :title="title" :description="description" />
        <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <TransaksiForm
                :key="`${mode}-${transaksiId ?? effectiveTipe}-${pageKategori}`"
                :tipe="effectiveTipe"
                :kategori="pageKategori"
                :mode="mode"
                :transaksi-id="transaksiId"
                :api="transaksiApi"
                @success="finish"
                @cancel="router.push(backTarget())"
            />
        </div>
    </div>
</template>
