<script setup>
import { computed, ref, watch } from 'vue';
import BaseBadge from '../../components/ui/BaseBadge.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseModal from '../../components/ui/BaseModal.vue';
import BasePagination from '../../components/ui/BasePagination.vue';
import BaseSelect from '../../components/ui/BaseSelect.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import ErrorAlert from '../../components/ui/ErrorAlert.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { roleApi } from '../../api';
import { invalidateQueries, useMutation, useQuery } from '../../lib/query';
import { apiErrorMessage } from '../../lib/utils';

const page = ref(1);
const editing = ref(null);
const open = ref(false);
const deleting = ref(null);
const deleteError = ref('');
const formError = ref('');
const form = ref(emptyForm());
const search = ref('');
const statusFilter = ref('');
const sortKey = ref('name');
const sortOrder = ref('asc');

const { data, isLoading } = useQuery({
    queryKey: () => ['role', page.value, search.value, statusFilter.value, sortKey.value, sortOrder.value],
    queryFn: () =>
        roleApi.index({
            page: page.value,
            search: search.value || undefined,
            status: statusFilter.value || undefined,
            sort: sortKey.value || undefined,
            order: sortOrder.value,
        }),
});

watch([search, statusFilter], () => {
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

const { data: permissions } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: roleApi.permissions,
});

const { mutate: save, isLoading: isSaving } = useMutation({
    mutationFn: (payload) =>
        editing.value?.id ? roleApi.update(editing.value.id, payload) : roleApi.store(payload),
    onSuccess: () => {
        invalidateQueries({ queryKey: ['role'] });
        open.value = false;
        editing.value = null;
    },
    onError: (error) => {
        formError.value = apiErrorMessage(error, 'Gagal menyimpan role.');
    },
});

const { mutate: remove, isLoading: isDeleting } = useMutation({
    mutationFn: (id) => roleApi.destroy(id),
    onSuccess: () => {
        invalidateQueries({ queryKey: ['role'] });
        deleting.value = null;
    },
    onError: (error) => {
        deleting.value = null;
        deleteError.value = apiErrorMessage(error, 'Gagal menghapus role.');
    },
});

const isSuperAdmin = computed(
    () => editing.value?.name === 'SuperAdmin' || form.value.name === 'SuperAdmin',
);

const deleteMessage = computed(() => `Yakin ingin menghapus role "${deleting.value?.name}"?`);

function emptyForm() {
    return { name: '', description: '', status: 'active', permissions: [] };
}

function openCreate() {
    editing.value = null;
    form.value = emptyForm();
    formError.value = '';
    open.value = true;
}

function openEdit(row) {
    editing.value = row;
    form.value = {
        name: row.name,
        description: row.description || '',
        status: row.status,
        permissions: row.permissions?.map((permission) => permission.id) ?? [],
    };
    formError.value = '';
    open.value = true;
}

function togglePermission(id) {
    const current = form.value.permissions ?? [];

    form.value.permissions = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
}
</script>

<template>
    <div>
        <PageHeader title="Role Permission" description="Atur hak akses menu dan fitur untuk setiap role.">
            <template #actions>
                <BaseButton @click="openCreate">+ Role Baru</BaseButton>
            </template>
        </PageHeader>

        <ErrorAlert :message="deleteError" class="mb-4" />

        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseInput v-model="search" placeholder="Cari nama role..." class="w-full sm:w-56" />
            <BaseSelect v-model="statusFilter" class="w-full sm:w-36">
                <option value="">Status: Semua</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </BaseSelect>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-emerald-700" @click="toggleSort('name')">
                                Nama
                                <span v-if="sortKey === 'name'" class="text-[10px]">{{ sortOrder === 'asc' ? '\u25b2' : '\u25bc' }}</span>
                            </button>
                        </TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead class="text-center">Jumlah User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="5"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="5"><EmptyState /></TableCell>
                    </TableRow>
                    <TableRow v-for="role in data.data" v-else :key="role.id">
                        <TableCell class="font-medium">{{ role.name }}</TableCell>
                        <TableCell class="max-w-sm truncate">{{ role.description || '-' }}</TableCell>
                        <TableCell class="text-center">{{ role.users_count }}</TableCell>
                        <TableCell>
                            <BaseBadge :variant="role.status === 'active' ? 'success' : 'danger'">
                                {{ role.status }}
                            </BaseBadge>
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end gap-1">
                                <BaseButton variant="outline" size="sm" @click="openEdit(role)">
                                    Ubah
                                </BaseButton>
                                <BaseButton
                                    v-if="role.name !== 'SuperAdmin'"
                                    variant="danger"
                                    size="sm"
                                    @click="deleting = role"
                                >
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
            :title="editing?.id ? 'Ubah Role' : 'Tambah Role'"
            @close="open = false"
        >
            <ErrorAlert :message="formError" class="mb-4" />
            <div class="space-y-4">
                <div>
                    <BaseLabel for="name">Nama Role</BaseLabel>
                    <BaseInput id="name" v-model="form.name" :disabled="isSuperAdmin" />
                </div>
                <div>
                    <BaseLabel for="description">Deskripsi</BaseLabel>
                    <BaseInput id="description" v-model="form.description" />
                </div>
                <div>
                    <BaseLabel for="status">Status</BaseLabel>
                    <BaseSelect id="status" v-model="form.status" :disabled="isSuperAdmin">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </BaseSelect>
                </div>

                <div>
                    <BaseLabel>Hak Akses Menu & Feature Permission</BaseLabel>
                    <p v-if="!permissions?.length" class="text-sm text-slate-400">
                        Belum ada permission terdaftar.
                    </p>
                    <div
                        v-else
                        class="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3"
                    >
                        <label
                            v-for="permission in permissions"
                            :key="permission.id"
                            class="flex cursor-pointer items-start gap-2.5 rounded p-1.5 hover:bg-slate-50"
                        >
                            <input
                                type="checkbox"
                                class="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                :checked="(form.permissions ?? []).includes(permission.id)"
                                @change="togglePermission(permission.id)"
                            >
                            <div>
                                <div class="font-mono text-xs font-semibold text-slate-800">{{ permission.name }}</div>
                                <div class="text-xs text-slate-500">{{ permission.description || '-' }}</div>
                            </div>
                        </label>
                    </div>
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
