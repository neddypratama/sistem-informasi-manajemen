<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '../../components/ui/BaseButton.vue';
import JurnalForm from '../../components/jurnal/JurnalForm.vue';
import JurnalJenisForm from '../../components/jurnal/JurnalJenisForm.vue';
import JurnalRiwayat from '../../components/jurnal/JurnalRiwayat.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import { invalidateQueries } from '../../lib/query';
import { useAuthStore } from '../../stores/auth';

const JENIS_TITLE = {
    kas: 'Entri Kas',
    hutang: 'Entri Hutang',
    piutang: 'Entri Piutang',
    beban: 'Entri Beban',
    pendapatan: 'Entri Pendapatan',
};

const JENIS_RIWAYAT = ['kas', 'beban', 'pendapatan'];

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const jurnalId = computed(() => route.params.id ?? null);
const jenis = computed(() => route.params.jenis ?? null);
const isJenisEntry = computed(() => Boolean(jenis.value) && !jurnalId.value);
const isRiwayatJenis = computed(() => isJenisEntry.value && JENIS_RIWAYAT.includes(jenis.value));

const tambahMode = ref(route.query.tambah === '1');

watch(() => route.query.tambah, (value) => {
    tambahMode.value = value === '1';
});

const isAdmin = computed(() => ['SuperAdmin', 'Admin'].includes(auth.user?.role?.name));
const shortLabel = computed(() => (jenis.value ? JENIS_TITLE[jenis.value].replace('Entri ', '') : ''));
const canTambahJenis = computed(() => (jenis.value === 'kas' ? isAdmin.value : true));

const tampilkanRiwayat = computed(() => isRiwayatJenis.value && !tambahMode.value);
const tampilkanForm = computed(() => isJenisEntry.value && tambahMode.value);

// Non-admin tidak boleh membuka form kas langsung lewat URL.
watch(
    [jenis, () => route.query.tambah, isAdmin],
    ([j, t, admin]) => {
        if (j === 'kas' && t === '1' && !admin) {
            router.replace({ query: {} });
        }
    },
    { immediate: true },
);

const pageTitle = computed(() => {
    if (tampilkanRiwayat.value) {
        return `Riwayat ${shortLabel.value}`;
    }

    if (isJenisEntry.value) {
        return JENIS_TITLE[jenis.value];
    }

    return jurnalId.value ? 'Ubah Jurnal' : 'Jurnal Umum Baru';
});

const pageDescription = computed(() =>
    tampilkanRiwayat.value
        ? `Riwayat jurnal ${shortLabel.value.toLowerCase()}.`
        : 'Catat transaksi secara manual.',
);

function backToRiwayat() {
    invalidateQueries({ queryKey: ['jurnal'] });
    invalidateQueries({ queryKey: ['kas'] });
    invalidateQueries({ queryKey: ['dashboard'] });
    router.replace({ query: {} });
}

function finish() {
    if (isRiwayatJenis.value) {
        backToRiwayat();
        return;
    }

    invalidateQueries({ queryKey: ['jurnal'] });
    invalidateQueries({ queryKey: ['kas'] });
    invalidateQueries({ queryKey: ['dashboard'] });
    router.push('/akuntansi/jurnal');
}

function cancel() {
    if (isRiwayatJenis.value) {
        backToRiwayat();
        return;
    }

    router.push('/akuntansi/jurnal');
}
</script>

<template>
    <div>
        <PageHeader :title="pageTitle" :description="pageDescription">
            <template v-if="tampilkanRiwayat" #actions>
                <BaseButton v-if="canTambahJenis" @click="router.push({ query: { tambah: '1' } })">
                    ➕ Tambah {{ shortLabel }}
                </BaseButton>
            </template>
        </PageHeader>

        <div v-if="tampilkanRiwayat" class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <JurnalRiwayat :key="jenis" :jenis="jenis" />
        </div>
        <div v-else class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <JurnalJenisForm
                v-if="tampilkanForm"
                :key="jenis"
                :jenis="jenis"
                @success="finish"
                @cancel="cancel"
            />
            <JurnalForm
                v-else
                :key="jurnalId ?? 'create'"
                :mode="jurnalId ? 'edit' : 'create'"
                :jurnal-id="jurnalId"
                @success="finish"
                @cancel="cancel"
            />
        </div>
    </div>
</template>