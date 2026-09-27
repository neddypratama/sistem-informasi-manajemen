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
import { roleApi, userApi } from '../../api';
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
const roleFilter = ref('');
const statusFilter = ref('');
const sortKey = ref('name');
const sortOrder = ref('asc');

const { data, isLoading } = useQuery({
    queryKey: () => ['user', page.value, search.value, roleFilter.value, statusFilter.value, sortKey.value, sortOrder.value],
    queryFn: () =>
        userApi.index({
            page: page.value,
            search: search.value || undefined,
            role_id: roleFilter.value || undefined,
            status: statusFilter.value || undefined,
            sort: sortKey.value || undefined,
            order: sortOrder.value,
        }),
});

watch([search, roleFilter, statusFilter], () => {
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

const { data: roles } = useQuery({
    queryKey: ['role-options'],
    queryFn: roleApi.options,
});

const { mutate: save, isLoading: isSaving } = useMutation({
    mutationFn: (payload) =>
        editing.value?.id ? userApi.update(editing.value.id, payload) : userApi.store(payload),
    onSuccess: () => {
        invalidateQueries({ queryKey: ['user'] });
        open.value = false;
        editing.value = null;
    },
    onError: (error) => {
        formError.value = apiErrorMessage(error, 'Gagal menyimpan user.');
    },
});

const { mutate: remove, isLoading: isDeleting } = useMutation({
    mutationFn: (id) => userApi.destroy(id),
    onSuccess: () => {
        invalidateQueries({ queryKey: ['user'] });
        deleting.value = null;
    },
    onError: (error) => {
        deleting.value = null;
        deleteError.value = apiErrorMessage(error, 'Gagal menghapus user.');
    },
});

const deleteMessage = computed(() => `Yakin ingin menghapus user "${deleting.value?.name}"?`);

function emptyForm() {
    return { name: '', username: '', email: '', password: '', role_id: '', status: 'active' };
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
        username: row.username,
        email: row.email,
        password: '',
        role_id: String(row.role_id ?? ''),
        status: row.status,
    };
    formError.value = '';
    open.value = true;
}
</script>

<template>
    <div>
        <PageHeader title="User" description="Kelola pengguna dan role.">
            <template #actions>
                <BaseButton @click="openCreate">+ User Baru</BaseButton>
            </template>
        </PageHeader>

        <ErrorAlert :message="deleteError" class="mb-4" />

        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseInput v-model="search" placeholder="Cari nama/user/email..." class="w-full sm:w-56" />
            <BaseSelect v-model="roleFilter" class="w-full sm:w-40">
                <option value="">Role: Semua</option>
                <option v-for="role in roles ?? []" :key="role.id" :value="String(role.id)">
                    {{ role.name }}
                </option>
            </BaseSelect>
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
                        <TableHead v-for="col in [
                            { key: 'name', label: 'Nama' },
                            { key: 'username', label: 'Username' },
                            { key: 'email', label: 'Email' },
                        ]" :key="col.key">
                            <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-emerald-700" @click="toggleSort(col.key)">
                                {{ col.label }}
                                <span v-if="sortKey === col.key" class="text-[10px]">{{ sortOrder === 'asc' ? '\u25b2' : '\u25bc' }}</span>
                            </button>
                        </TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="6"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="6"><EmptyState /></TableCell>
                    </TableRow>
                    <TableRow v-for="user in data.data" v-else :key="user.id">
                        <TableCell class="font-medium">{{ user.name }}</TableCell>
                        <TableCell>{{ user.username }}</TableCell>
                        <TableCell>{{ user.email }}</TableCell>
                        <TableCell>{{ user.role?.name || '-' }}</TableCell>
                        <TableCell>
                            <BaseBadge :variant="user.status === 'active' ? 'success' : 'danger'">
                                {{ user.status }}
                            </BaseBadge>
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end gap-1">
                                <BaseButton variant="outline" size="sm" @click="openEdit(user)">
                                    Ubah
                                </BaseButton>
                                <BaseButton variant="danger" size="sm" @click="deleting = user">
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
            :title="editing?.id ? 'Ubah User' : 'Tambah User'"
            @close="open = false"
        >
            <ErrorAlert :message="formError" class="mb-4" />
            <div class="space-y-4">
                <div>
                    <BaseLabel for="name">Nama</BaseLabel>
                    <BaseInput id="name" v-model="form.name" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <BaseLabel for="username">Username</BaseLabel>
                        <BaseInput id="username" v-model="form.username" />
                    </div>
                    <div>
                        <BaseLabel for="email">Email</BaseLabel>
                        <BaseInput id="email" v-model="form.email" type="email" />
                    </div>
                </div>
                <div>
                    <BaseLabel for="password">
                        Password {{ editing?.id ? '(kosongkan bila tidak diubah)' : '' }}
                    </BaseLabel>
                    <BaseInput
                        id="password"
                        v-model="form.password"
                        type="password"
                        :required="!editing?.id"
                    />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <BaseLabel for="role_id">Role</BaseLabel>
                        <BaseSelect id="role_id" v-model="form.role_id">
                            <option value="">-- Pilih --</option>
                            <option v-for="role in roles ?? []" :key="role.id" :value="String(role.id)">
                                {{ role.name }}
                            </option>
                        </BaseSelect>
                    </div>
                    <div>
                        <BaseLabel for="status">Status</BaseLabel>
                        <BaseSelect id="status" v-model="form.status">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </BaseSelect>
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
