<script setup>
import { computed, ref, watch } from 'vue';
import BaseBadge from './ui/BaseBadge.vue';
import BaseButton from './ui/BaseButton.vue';
import BaseInput from './ui/BaseInput.vue';
import BaseLabel from './ui/BaseLabel.vue';
import BaseModal from './ui/BaseModal.vue';
import BasePagination from './ui/BasePagination.vue';
import BaseSelect from './ui/BaseSelect.vue';
import BaseTable from './ui/BaseTable.vue';
import ConfirmDialog from './ui/ConfirmDialog.vue';
import CurrencyInput from './ui/CurrencyInput.vue';
import EmptyState from './ui/EmptyState.vue';
import PageHeader from './ui/PageHeader.vue';
import PageLoader from './ui/PageLoader.vue';
import TableBody from './ui/TableBody.vue';
import TableCell from './ui/TableCell.vue';
import TableHead from './ui/TableHead.vue';
import TableHeader from './ui/TableHeader.vue';
import TableRow from './ui/TableRow.vue';
import { invalidateQueries, useMutation, useQuery } from '../lib/query';

const props = defineProps({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    queryKey: { type: String, required: true },
    api: { type: Object, required: true },
    columns: { type: Array, required: true },
    fields: { type: Array, required: true },
    searchPlaceholder: { type: String, default: 'Cari...' },
    filters: { type: Array, default: () => [] },
});

const page = ref(1);
const search = ref('');
const editing = ref(null);
const open = ref(false);
const deleting = ref(null);
const form = ref({});
const sortKey = ref(props.columns.find((c) => c.sortable)?.key ?? '');
const sortOrder = ref('asc');
const filterValues = ref(Object.fromEntries(props.filters.map((f) => [f.key, ''])));

const { data, isLoading } = useQuery({
    queryKey: () => [
        props.queryKey,
        page.value,
        search.value,
        sortKey.value,
        sortOrder.value,
        filterValues.value,
    ],
    queryFn: () =>
        props.api.index({
            page: page.value,
            search: search.value || undefined,
            sort: sortKey.value || undefined,
            order: sortOrder.value,
            ...Object.fromEntries(
                Object.entries(filterValues.value).filter(([, v]) => v !== ''),
            ),
        }),
});

watch([search, filterValues], () => {
    // Reset hanya bila perlu, agar tidak memicu dua kali refetch.
    if (page.value !== 1) {
        page.value = 1;
    }
});

function toggleSort(key) {
    if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortOrder.value = 'asc';
    }
}

function sortIndicator(key) {
    if (sortKey.value !== key) return '';

    return sortOrder.value === 'asc' ? '\u25b2' : '\u25bc';
}

function resetFilters() {
    search.value = '';
    filterValues.value = Object.fromEntries(props.filters.map((f) => [f.key, '']));
    sortKey.value = props.columns.find((c) => c.sortable)?.key ?? '';
    sortOrder.value = 'asc';
}

const { mutate: save, isLoading: isSaving, error: saveError } = useMutation({
    mutationFn: (payload) =>
        editing.value?.id ? props.api.update(editing.value.id, payload) : props.api.store(payload),
    onSuccess: () => {
        invalidateQueries({ queryKey: [props.queryKey] });
        open.value = false;
        editing.value = null;
    },
});

const { mutate: remove, isLoading: isDeleting } = useMutation({
    mutationFn: (id) => props.api.destroy(id),
    onSuccess: () => {
        invalidateQueries({ queryKey: [props.queryKey] });
        deleting.value = null;
    },
});

const apiErrorMessage = computed(() => saveError.value?.response?.data?.message ?? '');

const deleteMessage = computed(() => {
    const row = deleting.value;
    const label = row?.nama || row?.nama_barang || row?.nama_jenis || '';

    return `Yakin ingin menghapus "${label}"?`;
});

function cellText(column, row) {
    if (column.render) {
        return column.render(row[column.key], row);
    }

    const value = row[column.key];

    return value == null || value === '' ? '-' : String(value);
}

function openCreate() {
    editing.value = null;
    form.value = {};
    open.value = true;
}

function openEdit(row) {
    editing.value = row;
    form.value = { ...row };
    open.value = true;
}

function fieldValue(field) {
    if (field.type === 'currency') {
        return form.value[field.name];
    }

    return form.value[field.name] ?? field.default ?? '';
}
</script>

<template>
    <div>
        <PageHeader :title="title" :description="description">
            <template #actions>
                <BaseButton @click="openCreate">+ Baru</BaseButton>
            </template>
        </PageHeader>

        <div class="mb-4 space-y-3">
            <div class="flex flex-wrap items-center gap-3">
                <BaseInput v-model="search" :placeholder="searchPlaceholder" class="w-full sm:w-auto sm:max-w-xs" />
                <template v-for="filter in filters" :key="filter.key">
                    <BaseSelect
                        v-model="filterValues[filter.key]"
                        class="w-full sm:w-auto sm:min-w-40 text-sm"
                    >
                        <option value="">{{ filter.label }}: Semua</option>
                        <option v-for="option in filter.options" :key="option.value" :value="String(option.value)">
                            {{ option.label }}
                        </option>
                    </BaseSelect>
                </template>
            </div>
            <div v-if="sortKey || Object.values(filterValues).some(Boolean)" class="flex items-center gap-2 text-xs text-slate-400">
                <span>
                    Urut: <span class="font-medium text-slate-600">{{ sortKey }} ({{ sortOrder }})</span>
                </span>
                <button
                    type="button"
                    class="text-emerald-600 hover:text-emerald-700 hover:underline"
                    @click="resetFilters"
                >
                    Reset
                </button>
            </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead v-for="column in columns" :key="column.key">
                            <button
                                v-if="column.sortable"
                                type="button"
                                class="inline-flex items-center gap-1 font-semibold hover:text-emerald-700"
                                @click="toggleSort(column.key)"
                            >
                                {{ column.label }}
                                <span class="text-[10px]">{{ sortIndicator(column.key) }}</span>
                            </button>
                            <template v-else>{{ column.label }}</template>
                        </TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell :colspan="columns.length + 1">
                            <PageLoader />
                        </TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell :colspan="columns.length + 1">
                            <EmptyState />
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="row in data.data" v-else :key="row.id">
                        <TableCell v-for="column in columns" :key="column.key">
                            <BaseBadge
                                v-if="column.status"
                                :variant="row[column.key] === 'aktif' ? 'success' : 'danger'"
                            >
                                {{ row[column.key] }}
                            </BaseBadge>
                            <template v-else>{{ cellText(column, row) }}</template>
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end gap-1">
                                <BaseButton variant="outline" size="sm" @click="openEdit(row)">
                                    Ubah
                                </BaseButton>
                                <BaseButton variant="danger" size="sm" @click="deleting = row">
                                    Hapus
                                </BaseButton>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>

        <BaseModal
            :open="open"
            :title="editing?.id ? `Ubah ${title}` : `Tambah ${title}`"
            @close="open = false"
        >
            <div
                v-if="apiErrorMessage"
                class="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700"
            >
                {{ apiErrorMessage }}
            </div>
            <div class="space-y-4">
                <div v-for="field in fields" :key="field.name">
                    <BaseLabel :for="field.name">{{ field.label }}</BaseLabel>
                    <BaseSelect
                        v-if="field.type === 'select'"
                        :id="field.name"
                        :model-value="fieldValue(field)"
                        @update:model-value="form[field.name] = $event"
                    >
                        <option v-for="option in field.options" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </BaseSelect>
                    <CurrencyInput
                        v-else-if="field.type === 'currency'"
                        :id="field.name"
                        :model-value="fieldValue(field)"
                        @update:model-value="form[field.name] = $event"
                    />
                    <BaseInput
                        v-else
                        :id="field.name"
                        :model-value="fieldValue(field)"
                        :type="field.type === 'number' ? 'text' : field.type || 'text'"
                        :inputmode="field.type === 'number' ? 'numeric' : undefined"
                        @update:model-value="form[field.name] = $event"
                    />
                </div>
            </div>

            <template #footer>
                <BaseButton variant="outline" @click="open = false">Batal</BaseButton>
                <BaseButton :disabled="isSaving" @click="save(form)">
                    {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
                </BaseButton>
            </template>
        </BaseModal>

        <ConfirmDialog
            :open="Boolean(deleting)"
            :loading="isDeleting"
            :message="deleteMessage"
            @close="deleting = null"
            @confirm="remove(deleting.id)"
        />
    </div>
</template>
