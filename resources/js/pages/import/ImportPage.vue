<script setup>
import { ref } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseSelect from '../../components/ui/BaseSelect.vue';
import CardContent from '../../components/ui/CardContent.vue';
import CardHeader from '../../components/ui/CardHeader.vue';
import CardTitle from '../../components/ui/CardTitle.vue';
import ErrorAlert from '../../components/ui/ErrorAlert.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import { importApi } from '../../api';
import { apiErrorMessage } from '../../lib/utils';

const MODUL_OPTIONS = [
    { value: 'client', label: '1. Master Client (Supplier, Customer, Peternak, dll)' },
    { value: 'barang', label: '2. Master Barang & Stok Awal' },
    { value: 'akun', label: '3. Master Akun (Chart of Accounts)' },
    { value: 'hutang_piutang', label: '4. Saldo Awal Hutang & Piutang' },
    { value: 'jurnal', label: '5. Jurnal Umum' },
    { value: 'pembelian', label: '6. Transaksi Pembelian' },
    { value: 'penjualan', label: '7. Transaksi Penjualan' },
    { value: 'retur', label: '8. Transaksi Retur (Pembelian / Penjualan)' },
];

const selectedModul = ref('client');
const fileInput = ref(null);
const selectedFile = ref(null);
const isUploading = ref(false);
const errorMsg = ref('');
const resultReport = ref(null);

function handleModulChange() {
    selectedFile.value = null;
    resultReport.value = null;
    errorMsg.value = '';
    if (fileInput.value) {
        fileInput.value.value = '';
    }
}

function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFile.value = file;
    }
}

function handleDownloadTemplate() {
    importApi.downloadTemplate(selectedModul.value);
}

async function handleUpload() {
    if (!selectedFile.value) {
        errorMsg.value = 'Silakan pilih file Excel terlebih dahulu.';
        return;
    }

    errorMsg.value = '';
    resultReport.value = null;
    isUploading.value = true;

    const formData = new FormData();
    formData.append('file', selectedFile.value);

    try {
        const response = await importApi.importData(selectedModul.value, formData);
        resultReport.value = response;
    } catch (e) {
        errorMsg.value = apiErrorMessage(e, 'Gagal memproses file impor.');
    } finally {
        isUploading.value = false;
    }
}
</script>

<template>
    <div>
        <PageHeader
            title="Import Data Excel"
            description="Unggah file Excel untuk mengisi data massal ke database SIM V2."
        />

        <ErrorAlert :message="errorMsg" class="mb-4" />

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Langkah 1 & 2: Pilih Modul & Download Format -->
            <BaseCard class="lg:col-span-1">
                <CardHeader>
                    <CardTitle class="text-base font-semibold text-slate-800">1. Pilih Modul & Format</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div>
                        <BaseLabel for="modul-select">Pilih Data yang Ingin Diimpor</BaseLabel>
                        <BaseSelect
                            id="modul-select"
                            v-model="selectedModul"
                            class="w-full mt-1"
                            @change="handleModulChange"
                        >
                            <option
                                v-for="opt in MODUL_OPTIONS"
                                :key="opt.value"
                                :value="opt.value"
                            >
                                {{ opt.label }}
                            </option>
                        </BaseSelect>
                    </div>

                    <div class="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                        <p class="font-semibold text-slate-700 mb-1">Panduan Pengisian:</p>
                        <ul class="list-disc pl-4 space-y-1">
                            <li>Unduh format Excel resmi di bawah ini.</li>
                            <li>Isi data sesuai petunjuk pada header kolom.</li>
                            <li>Jangan mengubah urutan header pada baris pertama.</li>
                        </ul>
                    </div>

                    <BaseButton
                        variant="outline"
                        class="w-full flex items-center justify-center gap-2"
                        @click="handleDownloadTemplate"
                    >
                        📥 Download Format Excel (.xlsx)
                    </BaseButton>
                </CardContent>
            </BaseCard>

            <!-- Langkah 3: Upload File & Impor -->
            <BaseCard class="lg:col-span-2">
                <CardHeader>
                    <CardTitle class="text-base font-semibold text-slate-800">2. Unggah File Excel &amp; Impor</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div>
                        <BaseLabel for="file-excel">Pilih File Excel / CSV (.xlsx, .xls, .csv)</BaseLabel>
                        <input
                            id="file-excel"
                            ref="fileInput"
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            class="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            @change="handleFileChange"
                        />
                    </div>

                    <div class="pt-2">
                        <BaseButton
                            :disabled="!selectedFile || isUploading"
                            class="w-full sm:w-auto"
                            @click="handleUpload"
                        >
                            {{ isUploading ? 'Memproses Impor Data...' : '🚀 Mulai Impor Data' }}
                        </BaseButton>
                    </div>

                    <!-- Hasil / Laporan Impor -->
                    <div v-if="resultReport" class="mt-6 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span class="font-semibold text-slate-800">Laporan Hasil Impor</span>
                            <span class="text-xs text-slate-500">{{ resultReport.message }}</span>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-emerald-800">
                                <span class="block text-xs text-emerald-600">Berhasil Diimpor</span>
                                <span class="text-xl font-bold">{{ resultReport.sukses }} Baris</span>
                            </div>
                            <div class="rounded-lg bg-rose-50 p-3 border border-rose-200 text-rose-800">
                                <span class="block text-xs text-rose-600">Gagal / Dilewati</span>
                                <span class="text-xl font-bold">{{ resultReport.gagal }} Baris</span>
                            </div>
                        </div>

                        <!-- Daftar Error jika ada -->
                        <div v-if="resultReport.errors && resultReport.errors.length > 0" class="mt-3">
                            <span class="block text-xs font-semibold text-rose-700 mb-1">Catatan Error:</span>
                            <div class="max-h-48 overflow-y-auto rounded-lg bg-rose-50/50 p-3 border border-rose-200 text-xs text-rose-700 space-y-1">
                                <div v-for="(err, idx) in resultReport.errors" :key="idx">
                                    • {{ err }}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </BaseCard>
        </div>
    </div>
</template>
