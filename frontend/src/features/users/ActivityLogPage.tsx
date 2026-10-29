import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel } from '../../lib/export-utils';
import {
  History,
  Search,
  Calendar,
  Filter,
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  X,
} from 'lucide-react';

export const ActivityLogPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ['activityLogs', page, module, search, startDate, endDate],
    queryFn: async () => {
      let url = `/logs?limit=25&page=${page}`;
      if (module !== 'ALL') url += `&module=${module}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  const logs = Array.isArray(responseData?.data)
    ? responseData.data
    : Array.isArray(responseData)
    ? responseData
    : [];
  const meta = responseData?.meta || { total: 0, page: 1, limit: 25, totalPages: 1 };

  const formatTanggalWaktu = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getModuleBadgeColor = (mod: string) => {
    switch (mod) {
      case 'TRANSAKSI':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INVENTORY':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'AUTH':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MASTER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleExportExcel = async () => {
    let dataToExport = logs;
    try {
      if (meta?.total && meta.total > logs.length) {
        let url = `/logs?limit=1000&page=1`;
        if (module !== 'ALL') url += `&module=${module}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        const res: any = await apiClient.get(url);
        if (res?.data && Array.isArray(res.data)) dataToExport = res.data;
        else if (Array.isArray(res)) dataToExport = res;
      }
    } catch {
      // fallback
    }

    if (!dataToExport || dataToExport.length === 0) {
      alert('Tidak ada riwayat aktivitas untuk diekspor');
      return;
    }

    const rows = dataToExport.map((log: any) => ({
      waktu: formatTanggalWaktu(log.createdAt),
      userName: log.userName || 'Sistem',
      userRole: log.userRole || '-',
      module: log.module,
      action: log.action,
      description: log.description || '-',
    }));

    exportToExcel({
      filename: `Audit_Log_Aktivitas_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Audit Log',
      title: `RIWAYAT AKTIVITAS & AUDIT TRAIL PENGGUNA (${startDate || 'Awal'} s/d ${endDate || 'Kini'})`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Waktu Aktivitas', key: 'waktu', width: 22 },
        { header: 'Nama Pengguna', key: 'userName', width: 24 },
        { header: 'Role Jabatan', key: 'userRole', width: 16 },
        { header: 'Modul Sistem', key: 'module', width: 18 },
        { header: 'Tindakan / Aksi', key: 'action', width: 22 },
        { header: 'Rincian Aktivitas', key: 'description', width: 45 },
      ],
      data: rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <History className="w-7 h-7 text-blue-600" />
            <span>Riwayat Aktivitas Pengguna (Audit Trail)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Rekam jejak seluruh tindakan pengguna dalam sistem, pencatatan transaksi, pembaruan stok, dan otorisasi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButtonGroup onExportExcel={handleExportExcel} />

          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Aktivitas Tercatat</span>
              <p className="text-base font-extrabold text-slate-800 font-mono">
                {meta.total ? meta.total.toLocaleString('id-ID') : '...'} Tindakan
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama user, jenis aksi, atau keterangan aktivitas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs w-full lg:w-auto">
          {/* Module Filter */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={module}
              onChange={(e) => {
                setModule(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Modul</option>
              <option value="TRANSAKSI">Modul Transaksi</option>
              <option value="INVENTORY">Modul Inventory & Stok</option>
              <option value="AUTH">Modul Otorisasi & Login</option>
              <option value="MASTER">Modul Master Data</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
            />
            <span className="text-slate-400 font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4 w-48">Waktu & Tanggal</th>
                <th className="p-4 w-44">Pengguna</th>
                <th className="p-4 w-36">Modul & Aksi</th>
                <th className="p-4">Deskripsi Aktivitas</th>
                <th className="p-4 text-center w-28">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Memuat riwayat aktivitas pengguna...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Belum ada riwayat aktivitas yang tercatat untuk filter ini.
                  </td>
                </tr>
              ) : (
                logs.map((log: any, idx: number) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center font-mono text-slate-400 text-xs">
                      {(page - 1) * meta.limit + idx + 1}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-mono font-semibold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTanggalWaktu(log.createdAt)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                          {log.userName ? log.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs leading-tight">
                            {log.userName || 'Sistem Otomatis'}
                          </p>
                          <span className="text-[10px] text-slate-400">{log.userRole || 'Admin'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getModuleBadgeColor(
                            log.module
                          )}`}
                        >
                          {log.module}
                        </span>
                        <p className="text-[11px] font-mono font-medium text-slate-600 truncate max-w-[130px]">
                          {log.action}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {log.description}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Rincian</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Halaman <span className="font-bold text-slate-800">{meta.page}</span> dari{' '}
            <span className="font-bold text-slate-800">{meta.totalPages}</span> (Total{' '}
            {meta.total.toLocaleString('id-ID')} riwayat)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-bold text-slate-700">
              {page}
            </span>
            <button
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detail Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Rincian Log Aktivitas</h3>
                  <p className="text-xs text-slate-400">ID #{selectedLog.id} • {selectedLog.module}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1.5">
                <p className="text-slate-500">
                  <strong className="text-slate-700">Waktu:</strong> {formatTanggalWaktu(selectedLog.createdAt)}
                </p>
                <p className="text-slate-500">
                  <strong className="text-slate-700">Pengguna:</strong> {selectedLog.userName} ({selectedLog.userRole})
                </p>
                <p className="text-slate-500">
                  <strong className="text-slate-700">Aksi / Kode:</strong>{' '}
                  <span className="font-mono font-bold text-blue-700">{selectedLog.action}</span>
                </p>
                <p className="text-slate-500">
                  <strong className="text-slate-700">Keterangan:</strong> {selectedLog.description}
                </p>
              </div>

              {selectedLog.details && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Payload Metadata:</span>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ActivityLogPage;
