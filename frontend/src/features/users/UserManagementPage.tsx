import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, formatDateIndo } from '../../lib/export-utils';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Key,
  Lock,
  Search,
  Edit2,
  Check,
  X,
  Save,
  CheckCircle2,
  CheckSquare,
  Square,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Tab: 'USERS' | 'ROLES'
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');

  // Filters (Users)
  const [searchUser, setSearchUser] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Selected Role for Permission Matrix
  const [selectedRoleId, setSelectedRoleId] = useState<number>(1);
  const [rolePermissionsState, setRolePermissionsState] = useState<number[]>([]);

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [editRole, setEditRole] = useState<any | null>(null);

  // User Form State (Add)
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleId, setFormRoleId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // User Form State (Edit)
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Role Form State
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');

  // 1. Fetch Users
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['usersList', searchUser, selectedRoleFilter, selectedStatusFilter, page],
    queryFn: async () => {
      let url = `/users?limit=25&page=${page}`;
      if (searchUser) url += `&search=${encodeURIComponent(searchUser)}`;
      if (selectedRoleFilter) url += `&roleId=${selectedRoleFilter}`;
      if (selectedStatusFilter) url += `&isActive=${selectedStatusFilter}`;
      const res: any = await apiClient.get(url);
      return res.data;
    },
  });

  // 2. Fetch Roles
  const { data: rolesData } = useQuery({
    queryKey: ['rolesList'],
    queryFn: async () => {
      const res: any = await apiClient.get('/roles');
      return res.data;
    },
  });

  // 3. Fetch Permissions
  const { data: permissionsData } = useQuery({
    queryKey: ['permissionsList'],
    queryFn: async () => {
      const res: any = await apiClient.get('/permissions');
      return res.data;
    },
  });

  // 4. Fetch Role Detail & Permissions
  const { data: selectedRoleDetail } = useQuery({
    queryKey: ['roleDetail', selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return null;
      const res: any = await apiClient.get(`/roles/${selectedRoleId}`);
      const data = res.data;
      setRolePermissionsState(data.permissionIds || []);
      return data;
    },
    enabled: !!selectedRoleId,
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      setIsAddUserOpen(false);
      setFormName('');
      setFormUsername('');
      setFormEmail('');
      setFormPassword('');
      setFormRoleId('');
      alert('Pengguna baru berhasil dibuat!');
    },
    onError: (err: any) => {
      alert(`Gagal membuat pengguna: ${err.response?.data?.message || err.message}`);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      apiClient.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      setEditUser(null);
      alert('Data pengguna berhasil diperbarui!');
    },
    onError: (err: any) => {
      alert(`Gagal mengubah pengguna: ${err.response?.data?.message || err.message}`);
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async (id: number) => apiClient.patch(`/users/${id}/toggle-active`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
    },
    onError: (err: any) => {
      alert(`Gagal mengubah status pengguna: ${err.response?.data?.message || err.message}`);
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/roles', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      setIsAddRoleOpen(false);
      setRoleFormName('');
      setRoleFormDesc('');
      alert('Role baru berhasil dibuat!');
    },
    onError: (err: any) => {
      alert(`Gagal membuat role: ${err.response?.data?.message || err.message}`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      apiClient.put(`/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      setEditRole(null);
      alert('Role berhasil diperbarui!');
    },
    onError: (err: any) => {
      alert(`Gagal memperbarui role: ${err.response?.data?.message || err.message}`);
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) =>
      apiClient.put(`/roles/${roleId}/permissions`, { permissionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleDetail', selectedRoleId] });
      queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      alert('Hak akses permission per role berhasil disimpan!');
    },
    onError: (err: any) => {
      alert(`Gagal memperbarui izin role: ${err.response?.data?.message || err.message}`);
    },
  });

  // Handlers
  const handleSubmitAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUsername || !formPassword || !formRoleId) {
      alert('Mohon isi nama, username, password, dan pilih role.');
      return;
    }
    createUserMutation.mutate({
      name: formName,
      username: formUsername,
      email: formEmail || undefined,
      password: formPassword,
      roleId: Number(formRoleId),
      isActive: formIsActive,
    });
  };

  const handleOpenEditUser = (user: any) => {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email || '');
    setEditPassword('');
    setEditRoleId(String(user.roleId));
    setEditIsActive(user.isActive);
  };

  const handleSubmitEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    updateUserMutation.mutate({
      id: Number(editUser.id),
      data: {
        name: editName,
        email: editEmail || undefined,
        roleId: Number(editRoleId),
        isActive: editIsActive,
        ...(editPassword ? { password: editPassword } : {}),
      },
    });
  };

  const handleTogglePermission = (pId: number) => {
    setRolePermissionsState((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const handleToggleGroupPermissions = (groupPermIds: number[]) => {
    const allSelected = groupPermIds.every((id) => rolePermissionsState.includes(id));
    if (allSelected) {
      // Uncheck all in group
      setRolePermissionsState((prev) => prev.filter((id) => !groupPermIds.includes(id)));
    } else {
      // Check all in group
      const newIds = new Set([...rolePermissionsState, ...groupPermIds]);
      setRolePermissionsState(Array.from(newIds));
    }
  };

  const handleGrantAll = () => {
    if (!permissionsData?.all) return;
    const allIds = permissionsData.all.map((p: any) => p.id);
    setRolePermissionsState(allIds);
  };

  const handleRevokeAll = () => {
    setRolePermissionsState([]);
  };

  const handleSavePermissions = () => {
    if (!selectedRoleId) return;
    updatePermissionsMutation.mutate({
      roleId: selectedRoleId,
      permissionIds: rolePermissionsState,
    });
  };

  const users = usersData?.items || [];
  const meta = usersData || { total: 0, page: 1, limit: 25, totalPages: 1 };
  const roles = rolesData || [];
  const permissionGroups = permissionsData?.grouped || [];

  const handleExportExcel = async () => {
    let dataToExport = users;
    try {
      if (meta?.total && meta.total > users.length) {
        let url = `/users?limit=500&page=1`;
        if (searchUser) url += `&search=${encodeURIComponent(searchUser)}`;
        if (selectedRoleFilter) url += `&roleId=${selectedRoleFilter}`;
        if (selectedStatusFilter) url += `&isActive=${selectedStatusFilter}`;
        const res: any = await apiClient.get(url);
        if (res?.data?.items && Array.isArray(res.data.items)) dataToExport = res.data.items;
        else if (Array.isArray(res?.data)) dataToExport = res.data;
      }
    } catch {
      // fallback
    }

    if (!dataToExport || dataToExport.length === 0) {
      alert('Tidak ada data pengguna untuk diekspor');
      return;
    }

    const rows = dataToExport.map((u: any) => ({
      name: u.name,
      username: u.username,
      email: u.email || '-',
      roleName: u.role?.name || '-',
      status: u.isActive ? 'Aktif' : 'Non-Aktif',
      createdAt: formatDateIndo(u.createdAt),
    }));

    exportToExcel({
      filename: `Data_Pengguna_ERP_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Pengguna',
      title: 'DATA PENGGUNA & HAK AKSES SISTEM ERP',
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Nama Lengkap', key: 'name', width: 28 },
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Role / Jabatan', key: 'roleName', width: 20 },
        { header: 'Status Akun', key: 'status', width: 14 },
        { header: 'Tanggal Dibuat', key: 'createdAt', width: 18 },
      ],
      data: rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            <span>Manajemen Pengguna, Role & Hak Akses (RBAC)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan akun personil, penugasan peran jabatan, dan konfigurasi hak akses modul sistem
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExportButtonGroup onExportExcel={handleExportExcel} />

          <button
            onClick={() => setIsAddRoleOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Tambah Role Baru</span>
          </button>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pengguna</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {meta.total} <span className="text-sm font-normal text-slate-400">Akun</span>
          </p>
          <span className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Personil Bima Pratama
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Role Terdaftar</span>
            <Shield className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-blue-900 font-mono mt-2">
            {roles.length} <span className="text-sm font-normal text-slate-400">Peran</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Tingkatan Hak Akses</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Katalog Hak Akses</span>
            <Key className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-800 font-mono mt-2">
            {permissionsData?.total || 37} <span className="text-sm font-normal text-slate-400">Izin</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">10 Modul Terstruktur</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Akses Penuh</span>
            <Lock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-purple-900 font-mono mt-2">
            Super Admin
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Proteksi Keamanan Sistem</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'USERS'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Pengguna ({meta.total})</span>
        </button>

        <button
          onClick={() => setActiveTab('ROLES')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'ROLES'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Role & Matriks Hak Akses ({roles.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: DAFTAR PENGGUNA (USERS)
      ========================================================================= */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama personil, username, atau email..."
                value={searchUser}
                onChange={(e) => {
                  setSearchUser(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedRoleFilter}
                onChange={(e) => {
                  setSelectedRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Semua Role Jabatan</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => {
                  setSelectedStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Semua Status</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>

              {(searchUser || selectedRoleFilter || selectedStatusFilter) && (
                <button
                  onClick={() => {
                    setSearchUser('');
                    setSelectedRoleFilter('');
                    setSelectedStatusFilter('');
                    setPage(1);
                  }}
                  className="px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Nama Personil</th>
                    <th className="py-3.5 px-4">Username & Email</th>
                    <th className="py-3.5 px-4">Role Jabatan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Terdaftar</th>
                    <th className="py-3.5 px-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Memuat data pengguna...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Tidak ada pengguna yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    users.map((u: any, idx: number) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                          {(meta.page - 1) * meta.limit + idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {u.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-slate-800 font-semibold">{u.username}</span>
                          {u.email && (
                            <span className="text-[11px] text-slate-400 block">{u.email}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {u.roleName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {u.createdAt ? u.createdAt.slice(0, 10) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              title="Edit Pengguna / Password"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {u.id !== 1 && (
                              <button
                                onClick={() => toggleUserMutation.mutate(u.id)}
                                title={u.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.isActive
                                    ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                                    : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                {u.isActive ? (
                                  <X className="w-3.5 h-3.5" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ROLE & PERMISSION PER ROLE
      ========================================================================= */}
      {activeTab === 'ROLES' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Roles List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Pilih Role Jabatan
            </h3>
            <div className="space-y-1.5">
              {roles.map((r: any) => {
                const isSelected = selectedRoleId === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{r.name}</p>
                      <p
                        className={`text-[11px] truncate max-w-[160px] mt-0.5 ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        {r.description || 'Tanpa deskripsi'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.permissionCount} Izin
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Permission Matrix for Selected Role */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Hak Akses: {selectedRoleDetail?.name || 'Pilih Role'}
                  </h3>
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    {rolePermissionsState.length} Terpilih
                  </span>
                  {selectedRoleDetail && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditRole(selectedRoleDetail);
                        setRoleFormName(selectedRoleDetail.name);
                        setRoleFormDesc(selectedRoleDetail.description || '');
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Nama / Deskripsi Role"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedRoleDetail?.description || 'Konfigurasi hak akses modul untuk role ini'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleGrantAll}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={handleRevokeAll}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cabut Semua
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={updatePermissionsMutation.isPending}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {updatePermissionsMutation.isPending ? 'Menyimpan...' : 'Simpan Izin'}
                  </span>
                </button>
              </div>
            </div>

            {/* Permission Groups */}
            <div className="space-y-4">
              {permissionGroups.map((grp: any) => {
                const groupPermIds = grp.permissions.map((p: any) => p.id);
                const allSelected = groupPermIds.every((id: number) =>
                  rolePermissionsState.includes(id)
                );

                return (
                  <div
                    key={grp.group}
                    className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/60">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                          {grp.group}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          ({grp.permissions.length} fungsi)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleGroupPermissions(groupPermIds)}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
                      >
                        {allSelected ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Batalkan Modul Ini</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Pilih Semua Modul Ini</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {grp.permissions.map((p: any) => {
                        const checked = rolePermissionsState.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                              checked
                                ? 'bg-white border-emerald-400 shadow-xs'
                                : 'bg-white/60 border-slate-200/80 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(p.id)}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <div className="text-xs">
                              <p className="font-bold text-slate-800 leading-tight">
                                {p.description || p.name}
                              </p>
                              <span className="text-[10px] font-mono text-slate-400">
                                {p.name}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: TAMBAH PENGGUNA BARU
      ========================================================================= */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Tambah Pengguna Baru</h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Contoh: budi_kasir"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="budi@bimapratama.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Role Jabatan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Pilih Role Jabatan --</option>
                  {roles.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.description || 'Akses Sistem'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Status Akun Aktif</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all"
                >
                  {createUserMutation.isPending ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT PENGGUNA
      ========================================================================= */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit Pengguna: {editUser.username}
              </h3>
              <button
                onClick={() => setEditUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ganti Password (Kosongkan jika tidak diganti)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Isi password baru jika ingin mengubah"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Role Jabatan
                </label>
                <select
                  required
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {roles.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Status Akun Aktif</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all"
                >
                  {updateUserMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: TAMBAH ROLE BARU
      ========================================================================= */}
      {isAddRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Tambah Role Baru</h3>
              <button
                onClick={() => setIsAddRoleOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!roleFormName) return;
                createRoleMutation.mutate({
                  name: roleFormName,
                  description: roleFormDesc,
                });
              }}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Role Jabatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  placeholder="Contoh: Staff Penjualan Telur"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Deskripsi Peran
                </label>
                <textarea
                  rows={3}
                  value={roleFormDesc}
                  onChange={(e) => setRoleFormDesc(e.target.value)}
                  placeholder="Deskripsi tugas dan tanggung jawab peran ini..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoleOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all"
                >
                  {createRoleMutation.isPending ? 'Menyimpan...' : 'Simpan Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: EDIT ROLE
      ========================================================================= */}
      {editRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit Role: {editRole.name}
              </h3>
              <button
                onClick={() => setEditRole(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!roleFormName || !editRole) return;
                updateRoleMutation.mutate({
                  id: editRole.id,
                  data: {
                    name: roleFormName,
                    description: roleFormDesc,
                  },
                });
              }}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Role Jabatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Deskripsi Peran
                </label>
                <textarea
                  rows={3}
                  value={roleFormDesc}
                  onChange={(e) => setRoleFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditRole(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all"
                >
                  {updateRoleMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
