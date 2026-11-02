const http = require('http');

const ENDPOINTS = [
  { page: 'Dashboard Analitik', path: '/api/v1/reports/dashboard-analytics' },
  { page: 'Modul Transaksi Telur', path: '/api/v1/transaksi?jenisIds=1,2,3,4,5,6,7&limit=5' },
  { page: 'Modul Transaksi Pakan', path: '/api/v1/transaksi?jenisIds=8,10&limit=5' },
  { page: 'Pakan Curah Transaksi', path: '/api/v1/transaksi?jenisIds=9&limit=5' },
  { page: 'Pakan Curah Summary', path: '/api/v1/transaksi/curah/summary' },
  { page: 'Modul Transaksi Obat', path: '/api/v1/transaksi?jenisIds=11&limit=5' },
  { page: 'Modul Transaksi Tray', path: '/api/v1/transaksi?jenisIds=12&limit=5' },
  { page: 'Stok Gudang (Inventory Summary)', path: '/api/v1/inventory/summary' },
  { page: 'Stok Opname', path: '/api/v1/inventory/opname?limit=5' },
  { page: 'Konversi Barang Racik', path: '/api/v1/inventory/konversi?limit=5' },
  { page: 'Laporan Kas & Bank', path: '/api/v1/reports/laporan-kas' },
  { page: 'Keuangan Hutang Usaha', path: '/api/v1/transaksi?module=HUTANG&limit=5' },
  { page: 'Keuangan Piutang Usaha', path: '/api/v1/transaksi?module=PIUTANG&limit=5' },
  { page: 'Keuangan Beban Operasional', path: '/api/v1/transaksi?module=BEBAN&limit=5' },
  { page: 'Keuangan Pendapatan Lain', path: '/api/v1/transaksi?module=PENDAPATAN_LAIN&limit=5' },
  { page: 'Keuangan Bon Titipan', path: '/api/v1/reports/bon-titipan' },
  { page: 'Laporan Laba Rugi', path: '/api/v1/reports/laba-rugi' },
  { page: 'Laporan Laba Rugi Curah', path: '/api/v1/reports/laba-rugi/curah' },
  { page: 'Laporan Jurnal Umum', path: '/api/v1/reports/jurnal-umum?limit=5' },
  { page: 'Laporan Neraca Saldo', path: '/api/v1/reports/neraca-saldo' },
  { page: 'Laporan Aset', path: '/api/v1/reports/aset' },
  { page: 'Master Data Barang', path: '/api/v1/master/barangs?limit=5' },
  { page: 'Master Data Client/Mitra', path: '/api/v1/master/clients?limit=5' },
  { page: 'Master Data Kategori', path: '/api/v1/master/kategoris?limit=5' },
  { page: 'Master Data Detail Kategori', path: '/api/v1/master/detail-kategoris?limit=5' },
  { page: 'Manajemen Pengguna (Users)', path: '/api/v1/users?limit=5' },
  { page: 'Manajemen Role', path: '/api/v1/roles' },
  { page: 'Katalog Hak Akses (Permissions)', path: '/api/v1/permissions' },
  { page: 'Log Aktivitas (Audit Trail)', path: '/api/v1/logs?limit=5' },
];

function request(options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function run() {
  console.log('🚀 Login sebagai admin untuk mendapatkan Bearer token...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    JSON.stringify({ username: 'admin', password: 'password' })
  );

  if (!loginRes.data?.data?.accessToken) {
    console.error('❌ Login gagal!', loginRes.data);
    process.exit(1);
  }

  const token = loginRes.data.data.accessToken;
  console.log('✅ Berhasil login! Menguji seluruh 29 endpoint backend halaman ERP...\n');

  let passed = 0;
  let failed = 0;

  for (const ep of ENDPOINTS) {
    try {
      const res = await request({
        hostname: 'localhost',
        port: 4000,
        path: ep.path,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status >= 200 && res.status < 300) {
        console.log(`  ✅ [${res.status}] ${ep.page.padEnd(30)} -> ${ep.path}`);
        passed++;
      } else {
        console.error(`  ❌ [${res.status}] ${ep.page.padEnd(30)} -> ${ep.path}`, res.data?.message || res.data);
        failed++;
      }
    } catch (err) {
      console.error(`  ❌ [ERR] ${ep.page.padEnd(30)} -> ${ep.path}`, err.message);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Total Halaman / Endpoint Diuji: ${ENDPOINTS.length}`);
  console.log(`Lulus (Status 2xx): ${passed}`);
  console.log(`Gagal: ${failed}`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
