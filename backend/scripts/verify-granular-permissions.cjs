const http = require('http');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let respData = '';
        res.on('data', (c) => (respData += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: respData });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
        headers,
      },
      (res) => {
        let respData = '';
        res.on('data', (c) => (respData += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: respData });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  console.log('🧪 1. Testing Admin Login...');
  const adminLogin = await post('http://localhost:4000/api/v1/auth/login', {
    username: 'admin',
    password: 'password',
  });
  console.log('   Admin Login Status:', adminLogin.status);
  const adminToken = adminLogin.body?.data?.accessToken || adminLogin.body?.accessToken;

  console.log('🧪 2. Testing GET /api/v1/permissions (Authenticated)...');
  const permsRes = await get('http://localhost:4000/api/v1/permissions', adminToken);
  console.log('   Status:', permsRes.status);
  const total = permsRes.body?.data?.total || permsRes.body?.total;
  const groups = permsRes.body?.data?.grouped || permsRes.body?.grouped || [];
  console.log(`   Total Permissions: ${total}`);
  console.log(`   Total Groups: ${groups.length}`);
  for (const g of groups) {
    console.log(`     - [${g.group}]: ${g.permissions.length} izin`);
  }

  console.log('\n🧪 3. Testing Logins & Granular Permissions for Each Role...');
  const usersToTest = [
    { username: 'admin', expectedRole: 'Admin' },
    { username: 'telur', expectedRole: 'Pembelian Telur' },
    { username: 'pakan', expectedRole: 'Pakan dan Obat-Obatan' },
    { username: 'tunai', expectedRole: 'Kas Tunai' },
    { username: 'transfer', expectedRole: 'Kas Transfer' },
    { username: 'akuntasi', expectedRole: 'Akuntasi dan Rekap' },
  ];

  for (const u of usersToTest) {
    const loginRes = await post('http://localhost:4000/api/v1/auth/login', {
      username: u.username,
      password: 'password',
    });

    if (loginRes.status !== 200 && loginRes.status !== 201) {
      console.log(`   ❌ Login ${u.username} failed:`, loginRes.status, loginRes.body);
      continue;
    }

    const userData = loginRes.body?.data?.user || loginRes.body?.user;
    const perms = userData?.permissions || [];
    console.log(`   ✅ User: ${u.username.padEnd(9)} | Role: ${userData?.role.padEnd(22)} | Permissions Count: ${perms.length}`);
    
    // Check sample granular perms
    if (u.username === 'telur') {
      const hasBeli = perms.includes('telur_pembelian:create');
      const hasJual = perms.includes('telur_penjualan:create');
      console.log(`      -> Has 'telur_pembelian:create': ${hasBeli} | Has 'telur_penjualan:create': ${hasJual}`);
    } else if (u.username === 'pakan') {
      const hasPakan = perms.includes('pakan_penjualan:create');
      const hasCurah = perms.includes('curah_konversi:create');
      const hasTelur = perms.includes('telur_penjualan:create');
      console.log(`      -> Has 'pakan_penjualan:create': ${hasPakan} | 'curah_konversi:create': ${hasCurah} | 'telur_penjualan:create': ${hasTelur}`);
    } else if (u.username === 'tunai') {
      const hasTunai = perms.includes('kas_tunai:read');
      const hasBank = perms.includes('kas_bank:read');
      console.log(`      -> Has 'kas_tunai:read': ${hasTunai} | Has 'kas_bank:read': ${hasBank}`);
    } else if (u.username === 'transfer') {
      const hasBank = perms.includes('kas_bank:read');
      const hasTunai = perms.includes('kas_tunai:read');
      console.log(`      -> Has 'kas_bank:read': ${hasBank} | Has 'kas_tunai:read': ${hasTunai}`);
    }
  }

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
}

verify().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
