<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '../../components/ui/PageHeader.vue';
import PelunasanForm from '../../components/pelunasan/PelunasanForm.vue';
import { pelunasanApi } from '../../api';
import { invalidateQueries } from '../../lib/query';

const route = useRoute();
const router = useRouter();

const isHutang = computed(() => route.params.tipe === 'hutang');
const tipe = computed(() => (isHutang.value ? 'hutang' : 'piutang'));

function finish() {
    ['pelunasan', 'tagihan', 'jurnal', 'kas', 'dashboard'].forEach((key) => {
        invalidateQueries({ queryKey: [key] });
    });
    router.push('/akuntansi/saldo-client');
}
</script>

<template>
    <div>
        <PageHeader
            :title="isHutang ? 'Bayar Hutang' : 'Terima Piutang'"
            :description="
                isHutang ? 'Catat pembayaran kepada supplier.' : 'Catat pembayaran dari customer.'
            "
        />
        <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <PelunasanForm
                :key="tipe"
                :tipe="tipe"
                :api="pelunasanApi"
                @success="finish"
                @cancel="router.push('/akuntansi/saldo-client')"
            />
        </div>
    </div>
</template>
