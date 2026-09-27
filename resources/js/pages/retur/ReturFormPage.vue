<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '../../components/ui/BaseButton.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import ReturForm from '../../components/retur/ReturForm.vue';
import ReturRiwayat from '../../components/retur/ReturRiwayat.vue';
import { invalidateQueries } from '../../lib/query';

const route = useRoute();
const router = useRouter();

const isPembelian = computed(() => route.params.tipe === 'pembelian');
const tipe = computed(() => (isPembelian.value ? 'pembelian' : 'penjualan'));
const label = computed(() => (isPembelian.value ? 'Retur Pembelian' : 'Retur Penjualan'));

const tambahMode = ref(route.query.tambah === '1');

watch(() => route.query.tambah, (value) => {
    tambahMode.value = value === '1';
});

const pageTitle = computed(() =>
    tambahMode.value ? label.value : `Riwayat ${label.value}`,
);

const pageDescription = computed(() =>
    tambahMode.value
        ? 'Batalkan sebagian/seluruh barang dari transaksi sumber.'
        : 'Riwayat transaksi retur.',
);

function backToRiwayat() {
    invalidateQueries({ queryKey: ['retur'] });
    invalidateQueries({ queryKey: ['transaksi'] });
    invalidateQueries({ queryKey: ['dashboard'] });
    invalidateQueries({ queryKey: ['stok'] });
    router.replace({ query: {} });
}

function finish() {
    backToRiwayat();
}

function cancel() {
    backToRiwayat();
}
</script>

<template>
    <div>
        <PageHeader :title="pageTitle" :description="pageDescription">
            <template v-if="!tambahMode" #actions>
                <BaseButton @click="router.push({ query: { tambah: '1' } })">
                    ➕ Tambah {{ isPembelian ? 'Retur Pembelian' : 'Retur Penjualan' }}
                </BaseButton>
            </template>
        </PageHeader>

        <div v-if="!tambahMode" class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <ReturRiwayat :key="tipe" :tipe="tipe" />
        </div>
        <div v-else class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <ReturForm
                :key="tipe"
                :tipe="tipe"
                @success="finish"
                @cancel="cancel"
            />
        </div>
    </div>
</template>