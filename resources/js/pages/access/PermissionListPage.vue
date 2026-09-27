<script setup>
import { computed, ref } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseModal from '../../components/ui/BaseModal.vue';
import BasePagination from '../../components/ui/BasePagination.vue';
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
import { permissionApi } from '../../api';
import { invalidateQueries, useMutation, useQuery } from '../../lib/query';
import { apiErrorMessage } from '../../lib/utils';

const page = ref(1);
const editing = ref(null);
const open = ref(false);
const deleting = ref(null);
const deleteError = ref('');
const formError = ref('');
const form = ref(emptyForm());

const { data, isLoading } = useQuery({
    queryKey: () => ['permission', page.value],
    queryFn: () => permissionApi.index({ page: page.value }),
});

const { mutate: save, isLoading: isSaving } = useMutation({
    mutationFn: (payload) =>
        editing.value?.id ? permissionApi.update(editing.value.id, payload) : permissionApi.store(payload),
    onSuccess: () => {
        invalidateQueries({ queryKey: ['permission'] });
        open.value = false;
        editing.value = null;
    },
    onError: (error) => {
        formError.value = apiErrorMessage(error, 'Gagal menyimpan permission.');
    },
});

const { mutate: remove, isLoading: isDeleting } = useMutation({
    mutationFn: (id) => permissionApi.destroy(id),
    onSuccess: () => {
        invalidateQueries({ queryKey: ['permission'] });
        deleting.value = null;
    },
    onError: (error) => {
        deleting.value = null;
        deleteError.value = apiErrorMessage(error, 'Gagal menghapus permission.');
    },
});

const deleteMessage = computed(() => `Yakin ingin menghapus permission "${deleting.value?.name}"?`);

function emptyForm() {
    return { name: '', description: '' };
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
    };
    formError.value = '';
    open.value = true;
}

function handleSubmit() {
    formError.value = '';
    save(form.value);
}

function handleDelete() {
    if (deleting.value) {
        remove(deleting.value.id);
    }
}
</script>

<template>
    <div>
        <PageHeader title="Manajemen Permission" description="Kelola daftar hak akses permission sistem.">
            <template #actions>
                <BaseButton @click="openCreate">➕ Tambah Permission</BaseButton>
            </template>
        </PageHeader>

        <ErrorAlert :message="deleteError" class="mb-4" />

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama Permission</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="3"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="3">
                            <EmptyState message="Belum ada permission." />
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="permission in data.data" v-else :key="permission.id">
                        <TableCell class="font-mono text-xs font-semibold text-slate-800">{{ permission.name }}</TableCell>
                        <TableCell class="text-slate-600">{{ permission.description || '-' }}</TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end gap-2">
                                <BaseButton variant="outline" size="sm" @click="openEdit(permission)">
                                    Ubah
                                </BaseButton>
                                <BaseButton
                                    variant="danger"
                                    size="sm"
                                    @click="deleting = permission"
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
            :title="editing ? 'Ubah Permission' : 'Tambah Permission Baru'"
            @close="open = false"
        >
            <form class="space-y-4" @submit.prevent="handleSubmit">
                <ErrorAlert :message="formError" />

                <div>
                    <BaseLabel for="perm-name">Nama Permission</BaseLabel>
                    <BaseInput
                        id="perm-name"
                        v-model="form.name"
                        placeholder="contoh: menu.laporan.buku_besar"
                        required
                    />
                </div>

                <div>
                    <BaseLabel for="perm-desc">Deskripsi</BaseLabel>
                    <BaseInput
                        id="perm-desc"
                        v-model="form.description"
                        placeholder="Keterangan fungsi permission..."
                    />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <BaseButton type="button" variant="outline" @click="open = false">Batal</BaseButton>
                    <BaseButton type="submit" :disabled="isSaving">
                        {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
                    </BaseButton>
                </div>
            </form>
        </BaseModal>

        <ConfirmDialog
            :open="Boolean(deleting)"
            title="Hapus Permission"
            :message="deleteMessage"
            :confirm-loading="isDeleting"
            @confirm="handleDelete"
            @cancel="deleting = null"
        />
    </div>
</template>
