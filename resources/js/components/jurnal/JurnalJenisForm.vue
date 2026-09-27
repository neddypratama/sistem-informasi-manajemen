<script setup>
import { computed, ref, watch } from 'vue';
import BaseButton from '../ui/BaseButton.vue';
import BaseInput from '../ui/BaseInput.vue';
import BaseLabel from '../ui/BaseLabel.vue';
import BaseSelect from '../ui/BaseSelect.vue';
import BaseSearchableSelect from '../ui/BaseSearchableSelect.vue';
import CurrencyInput from '../ui/CurrencyInput.vue';
import ErrorAlert from '../ui/ErrorAlert.vue';
import PageLoader from '../ui/PageLoader.vue';
import { jurnalApi } from '../../api';
import { useQuery } from '../../lib/query';
import { apiErrorMessage, formatIDR, today } from '../../lib/utils';

const props = defineProps({
    jenis: { type: String, required: true },
});

const emit = defineEmits(['success', 'cancel']);

const JENIS_LABEL = {
    kas: 'Entri Kas',
    hutang: 'Entri Hutang',
    piutang: 'Entri Piutang',
    beban: 'Entri Beban',
    pendapatan: 'Entri Pendapatan',
};

const tanggal = ref(today());
const clientId = ref('');
const keterangan = ref('');
const jumlah = ref(0);
const arah = ref('masuk');
const akunFixed = ref('');
const akunLawan = ref('');
const error = ref('');
const saving = ref(false);

const { data, isLoading } = useQuery({
    queryKey: ['jurnal-jenis-data'],
    queryFn: jurnalApi.createData,
});

const options = computed(() => data.value?.jenisOptions?.[props.jenis] ?? { fixed: [], lawan: [] });
const clients = computed(() => data.value?.clients ?? []);
const label = computed(() => JENIS_LABEL[props.jenis] ?? 'Entri Jurnal');

/** Pilih otomatis bila hanya tersedia satu akun tetap. */
watch(options, (value) => {
    if (!akunFixed.value && value.fixed?.length === 1) {
        akunFixed.value = String(value.fixed[0].id);
    }
}, { immediate: true });

async function handleSubmit() {
    error.value = '';
    saving.value = true;

    try {
        await jurnalApi.storeJenis({
            jenis: props.jenis,
            tanggal: tanggal.value,
            client_id: clientId.value || null,
            keterangan: keterangan.value || null,
            jumlah: jumlah.value,
            arah: arah.value,
            akun_fixed: akunFixed.value,
            akun_lawan: akunLawan.value || null,
        });

        emit('success');
    } catch (e) {
        error.value = apiErrorMessage(e, 'Terjadi kesalahan saat menyimpan jurnal.');
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <PageLoader v-if="isLoading" />
    <form v-else class="space-y-4" @submit.prevent="handleSubmit">
        <ErrorAlert :message="error" />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
                <BaseLabel for="tanggal">Tanggal</BaseLabel>
                <BaseInput id="tanggal" v-model="tanggal" type="date" />
            </div>
            <div>
                <BaseLabel for="client">Client (opsional)</BaseLabel>
                <BaseSearchableSelect
                    id="client"
                    v-model="clientId"
                    :options="clients"
                    label-key="nama"
                    placeholder="-- Tidak ada --"
                    search-placeholder="Cari client..."
                    clearable
                />
            </div>
            <div v-if="jenis === 'kas'">
                <BaseLabel for="arah">Arah Kas</BaseLabel>
                <BaseSelect id="arah" v-model="arah">
                    <option value="masuk">Kas Masuk</option>
                    <option value="keluar">Kas Keluar</option>
                </BaseSelect>
            </div>
        </div>

        <div>
            <BaseLabel for="keterangan">Keterangan</BaseLabel>
            <BaseInput id="keterangan" v-model="keterangan" />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
                <BaseLabel>{{ jenis === 'kas' ? 'Akun Kas/Bank' : `${label} &mdash; Akun` }}</BaseLabel>
                <BaseSearchableSelect
                    v-model="akunFixed"
                    :options="options.fixed"
                    label-key="nama"
                    placeholder="-- Pilih --"
                    search-placeholder="Cari akun..."
                />
            </div>
            <div>
                <BaseLabel>Akun Lawan</BaseLabel>
                <BaseSearchableSelect
                    v-if="options.lawan.length > 0"
                    v-model="akunLawan"
                    :options="options.lawan"
                    label-key="nama"
                    placeholder="-- Pilih --"
                    search-placeholder="Cari akun..."
                />
                <BaseInput v-else model-value="Kas (otomatis)" disabled />
            </div>
            <div>
                <BaseLabel for="jumlah">Jumlah</BaseLabel>
                <CurrencyInput id="jumlah" v-model="jumlah" />
            </div>
        </div>

        <div class="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span class="text-sm text-slate-600">Nilai masuk jurnal:</span>
            <span class="text-lg font-bold text-emerald-700">{{ formatIDR(jumlah) }}</span>
        </div>

        <div class="flex justify-end gap-2">
            <BaseButton type="button" variant="outline" @click="emit('cancel')">Batal</BaseButton>
            <BaseButton type="submit" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan Jurnal' }}
            </BaseButton>
        </div>
    </form>
</template>
