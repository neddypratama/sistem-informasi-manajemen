const http = require('http');

async function test() {
  const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });
  const loginRes = await new Promise((resolve) => {
    const req = http.request('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(loginData);
    req.end();
  });

  const token = loginRes.data?.access_token || loginRes.data?.accessToken || loginRes.access_token || loginRes.accessToken;
  console.log('Login token:', token ? 'Got Token!' : loginRes);

  http.get('http://localhost:4000/api/v1/transaksi?type=PENJUALAN&startDate=2026-10-01&endDate=2026-11-03&limit=5&status=SELESAI', {
    headers: { 'Authorization': `Bearer ${token}` }
  }, res => {
    let b = '';
    res.on('data', d => b += d);
    res.on('end', () => {
      const parsed = JSON.parse(b);
      console.log('API Status Code:', res.statusCode);
      const items = parsed.data?.items || parsed.items || parsed.data || [];
      const total = parsed.data?.meta?.total ?? parsed.meta?.total;
      console.log('Total Penjualan in Range (2026-10-01 s/d 2026-11-03):', total);
      console.log('Returned items count:', items.length);
      if (items.length > 0) {
        console.log('Sample item:', items[0].invoice, items[0].tanggal);
      }
    });
  });
}

test().catch(console.error);
