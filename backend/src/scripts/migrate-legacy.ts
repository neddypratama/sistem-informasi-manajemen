import mysql from 'mysql2/promise';

async function migrate() {
  console.log('🚀 Memulai ETL Migrasi Data dari bimapratama ke bimapratama_v2...');
  const startTime = Date.now();

  const sourceConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bimapratama',
  });

  const destConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bimapratama_v2',
  });

  try {
    // 0. Matikan sementara Foreign Key Checks agar batch insert cepat
    await destConn.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 1. Migrasi ROLES
    console.log('📦 1. Migrasi Roles...');
    const [roles] = await sourceConn.query<any[]>('SELECT * FROM roles');
    for (const r of roles) {
      await destConn.execute(
        `INSERT INTO roles (id, name, description, created_at) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
        [r.id, r.name, r.deskripsi || null, r.created_at || new Date()],
      );
    }
    console.log(`   ✅ Selesai: ${roles.length} roles.`);

    // 2. Migrasi USERS
    console.log('📦 2. Migrasi Users...');
    const [users] = await sourceConn.query<any[]>('SELECT * FROM users');
    for (const u of users) {
      const username = u.email ? u.email.split('@')[0] : `user_${u.id}`;
      await destConn.execute(
        `INSERT INTO users (id, name, username, email, password, role_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role_id = VALUES(role_id)`,
        [
          u.id,
          u.name || username,
          username,
          u.email || null,
          u.password || '$2b$10$EpRnTzVlqHNP0.fQbgsO7.2E5mN8qZf3V2E7zQ5V2E7zQ5V2E7zQ5', // fallback hash
          u.role_id || 1,
          u.is_active ?? 1,
          u.created_at || new Date(),
          u.updated_at || new Date(),
        ],
      );
    }
    console.log(`   ✅ Selesai: ${users.length} users.`);

    // 3. Migrasi JENIS BARANG
    console.log('📦 3. Migrasi Jenis Barang...');
    const [jenisBarangs] = await sourceConn.query<any[]>('SELECT * FROM jenis_barangs');
    for (const j of jenisBarangs) {
      await destConn.execute(
        `INSERT INTO jenis_barangs (id, name, created_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [j.id, j.name, j.created_at || new Date()],
      );
    }
    console.log(`   ✅ Selesai: ${jenisBarangs.length} jenis barang.`);

    // 4. Migrasi SATUANS
    console.log('📦 4. Inisialisasi Master Satuan...');
    const standardSatuans = [
      { id: 1, name: 'Kg' },
      { id: 2, name: 'Butir' },
      { id: 3, name: 'Sak' },
      { id: 4, name: 'Ikat' },
      { id: 5, name: 'Botol' },
      { id: 6, name: 'Pcs' },
    ];
    for (const s of standardSatuans) {
      await destConn.execute(
        `INSERT INTO satuans (id, name, created_at) VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [s.id, s.name],
      );
    }
    console.log(`   ✅ Selesai: Master satuan siap.`);

    // 5. Migrasi BARANGS
    console.log('📦 5. Migrasi Barangs...');
    const [barangs] = await sourceConn.query<any[]>('SELECT * FROM barangs');
    for (const b of barangs) {
      // Tentukan satuan default berdasarkan jenis
      let satuanId = 1; // Default Kg
      if (b.jenis_id === 6) satuanId = 6; // Tray -> Pcs
      else if (b.jenis_id === 7) satuanId = 5; // Obat -> Botol
      else if (b.jenis_id === 8) satuanId = 3; // Sentrat -> Sak
      else if (b.jenis_id === 3 && b.name.includes('Bj')) satuanId = 2; // Puyuh Bj -> Butir

      await destConn.execute(
        `INSERT INTO barangs (id, code, name, jenis_id, satuan_id, stok_minimum, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), jenis_id = VALUES(jenis_id), satuan_id = VALUES(satuan_id)`,
        [
          b.id,
          `BRG-${String(b.id).padStart(4, '0')}`,
          b.name,
          b.jenis_id,
          satuanId,
          0,
          b.is_active ?? 1,
          b.created_at || new Date(),
          b.updated_at || new Date(),
        ],
      );
    }
    console.log(`   ✅ Selesai: ${barangs.length} barang.`);

    // 6. Migrasi CLIENTS
    console.log('📦 6. Migrasi Clients...');
    const [clients] = await sourceConn.query<any[]>('SELECT * FROM clients');
    for (const c of clients) {
      let clientType = 'Peternak';
      if (c.type === 'Pedagang') clientType = 'Pedagang';
      else if (c.type === 'Supplier') clientType = 'Supplier';
      else if (c.type === 'Karyawan') clientType = 'Karyawan';
      else if (c.type === 'Truk') clientType = 'Truk';

      await destConn.execute(
        `INSERT INTO clients (id, code, name, type, alamat, keterangan, saldo_piutang, saldo_hutang, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), alamat = VALUES(alamat)`,
        [
          c.id,
          `CLI-${String(c.id).padStart(4, '0')}`,
          c.name,
          clientType,
          c.alamat || null,
          c.keterangan || null,
          c.created_at || new Date(),
          c.updated_at || new Date(),
        ],
      );
    }
    console.log(`   ✅ Selesai: ${clients.length} clients.`);

    // 7. Migrasi CHART OF ACCOUNTS (Kategoris & Detail Kategoris)
    console.log('📦 7. Migrasi Chart of Accounts (COA)...');
    const [kategoris] = await sourceConn.query<any[]>(`
      SELECT k.id, k.name, k.detail_kategori_id, dk.type, dk.name as group_name
      FROM kategoris k
      LEFT JOIN detail_kategoris dk ON k.detail_kategori_id = dk.id
    `);

    for (const k of kategoris) {
      let coaType = 'Aset';
      let normalBalance = 'DEBIT';
      if (k.type === 'Liabilitas') {
        coaType = 'Liabilitas';
        normalBalance = 'KREDIT';
      } else if (k.type === 'Ekuitas') {
        coaType = 'Ekuitas';
        normalBalance = 'KREDIT';
      } else if (k.type === 'Pendapatan') {
        coaType = 'Pendapatan';
        normalBalance = 'KREDIT';
      } else if (k.type === 'Pengeluaran' || k.type === 'Beban') {
        if (k.name.startsWith('HPP')) {
          coaType = 'HPP';
        } else {
          coaType = 'Beban';
        }
        normalBalance = 'DEBIT';
      }

      await destConn.execute(
        `INSERT INTO chart_of_accounts (id, code, name, type, normal_balance, parent_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, 1, NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), normal_balance = VALUES(normal_balance)`,
        [k.id, `ACC-${String(k.id).padStart(4, '0')}`, k.name, coaType, normalBalance],
      );
    }
    console.log(`   ✅ Selesai: ${kategoris.length} akun buku besar.`);

    // 8. Migrasi TRANSAKSIS (Batch Chunking 5000 rows per loop)
    console.log('📦 8. Migrasi Transaksis (83,000+ baris)...');
    const [txCountRes] = await sourceConn.query<any[]>('SELECT COUNT(*) as total FROM transaksis');
    const totalTx = txCountRes[0].total;
    const chunkSize = 5000;

    for (let offset = 0; offset < totalTx; offset += chunkSize) {
      const [txChunk] = await sourceConn.query<any[]>(`
        SELECT id, invoice, tanggal, name, type, user_id, client_id, total, status, created_at, updated_at
        FROM transaksis
        ORDER BY id ASC
        LIMIT ${chunkSize} OFFSET ${offset}
      `);

      if (txChunk.length === 0) break;

      const values = txChunk.map((t) => {
        let txType = 'PENJUALAN';
        if (t.invoice.includes('-UTG-') || t.invoice.includes('-MSK-') || t.name?.toLowerCase().includes('masuk')) {
          txType = 'PEMBELIAN';
        } else if (t.invoice.includes('-BON-') || t.invoice.includes('-TLR-') || t.invoice.includes('-KLR-')) {
          txType = 'PENJUALAN';
        } else if (t.invoice.includes('-TNI-') || t.name?.toLowerCase().includes('tunai')) {
          txType = t.type === 'Debit' ? 'KAS_MASUK' : 'KAS_KELUAR';
        } else if (t.invoice.includes('-TFR-') || t.name?.toLowerCase().includes('transfer')) {
          txType = t.type === 'Debit' ? 'KAS_MASUK' : 'KAS_KELUAR';
        }

        let txStatus = 'SELESAI';
        if (t.status === 'Batal') txStatus = 'BATAL';
        else if (t.status === 'Perbaikan') txStatus = 'DRAFT';

        let payMethod = 'TUNAI';
        if (t.invoice.includes('-BON-') || t.invoice.includes('-UTG-')) payMethod = 'KREDIT_BON';
        else if (t.invoice.includes('-TFR-')) payMethod = 'TRANSFER';

        return [
          t.id,
          t.invoice,
          t.tanggal,
          txType,
          txStatus,
          payMethod,
          t.client_id || null,
          t.user_id || 1,
          t.total || 0,
          0,
          t.total || 0,
          t.name || null,
          t.created_at || new Date(),
          t.updated_at || new Date(),
        ];
      });

      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatParams = values.flat();

      await destConn.query(
        `INSERT INTO transaksis (id, invoice, tanggal, type, status, payment_method, client_id, user_id, subtotal, diskon, total, keterangan, created_at, updated_at)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE status = VALUES(status), total = VALUES(total)`,
        flatParams,
      );

      console.log(`   ⏳ Transaksi termigrasi: ${Math.min(offset + chunkSize, totalTx)} / ${totalTx}`);
    }

    // 9. Migrasi DETAIL_TRANSAKSIS (Batch Chunking 5000 rows per loop)
    console.log('📦 9. Migrasi Detail Transaksis (115,000+ baris)...');
    const [dtCountRes] = await sourceConn.query<any[]>('SELECT COUNT(*) as total FROM detail_transaksis');
    const totalDt = dtCountRes[0].total;

    for (let offset = 0; offset < totalDt; offset += chunkSize) {
      const [dtChunk] = await sourceConn.query<any[]>(`
        SELECT id, transaksi_id, kategori_id, barang_id, value, kuantitas, sub_total, created_at
        FROM detail_transaksis
        ORDER BY id ASC
        LIMIT ${chunkSize} OFFSET ${offset}
      `);

      if (dtChunk.length === 0) break;

      const values = dtChunk.map((d) => [
        d.id,
        d.transaksi_id,
        d.barang_id || null,
        d.kategori_id || null,
        d.kuantitas || 0,
        d.value || 0,
        d.sub_total || 0,
        0, // hpp_satuan
        0, // total_hpp
        0, // telur_bentes
        0, // telur_kotor
        0, // telur_ceplok
        0, // telur_jumbo
        d.created_at || new Date(),
      ]);

      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatParams = values.flat();

      await destConn.query(
        `INSERT INTO detail_transaksis (id, transaksi_id, barang_id, kategori_id, qty, harga_satuan, subtotal, hpp_satuan, total_hpp, telur_bentes, telur_kotor, telur_ceplok, telur_jumbo, created_at)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE subtotal = VALUES(subtotal), qty = VALUES(qty)`,
        flatParams,
      );

      console.log(`   ⏳ Detail transaksi termigrasi: ${Math.min(offset + chunkSize, totalDt)} / ${totalDt}`);
    }

    // 10. Migrasi STOK_BATCHES & STOK_KELUAR_BATCHES
    console.log('📦 10. Migrasi Stok Batches (13,000+ baris)...');
    const [batches] = await sourceConn.query<any[]>('SELECT * FROM stok_batches');
    const batchValues = batches.map((b) => [
      b.id,
      b.barang_id,
      b.detail_transaksi_id || null,
      b.user_id || 1,
      b.tanggal,
      b.qty_masuk,
      b.qty_sisa,
      b.harga,
      b.created_at || new Date(),
      b.updated_at || new Date(),
    ]);

    if (batchValues.length > 0) {
      for (let i = 0; i < batchValues.length; i += 2000) {
        const slice = batchValues.slice(i, i + 2000);
        const placeholders = slice.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        await destConn.query(
          `INSERT INTO stok_batches (id, barang_id, detail_transaksi_id, user_id, tanggal, qty_masuk, qty_sisa, harga_beli, created_at, updated_at)
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE qty_sisa = VALUES(qty_sisa)`,
          slice.flat(),
        );
      }
    }
    console.log(`   ✅ Selesai: ${batches.length} stok batches.`);

    console.log('📦 11. Migrasi Stok Keluar Batches (22,000+ baris)...');
    const [keluarBatches] = await sourceConn.query<any[]>('SELECT * FROM stok_keluar_batches');
    const keluarValues = keluarBatches.map((k) => [
      k.id,
      k.detail_transaksi_id,
      k.stok_batch_id,
      k.qty,
      k.harga,
      k.returned_qty || 0,
      k.created_at || new Date(),
    ]);

    if (keluarValues.length > 0) {
      for (let i = 0; i < keluarValues.length; i += 2000) {
        const slice = keluarValues.slice(i, i + 2000);
        const placeholders = slice.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        await destConn.query(
          `INSERT INTO stok_keluar_batches (id, detail_transaksi_id, stok_batch_id, qty, harga_beli, returned_qty, created_at)
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE qty = VALUES(qty)`,
          slice.flat(),
        );
      }
    }
    console.log(`   ✅ Selesai: ${keluarBatches.length} stok keluar batches.`);

    // 12. Nyalakan kembali Foreign Key Checks
    await destConn.query('SET FOREIGN_KEY_CHECKS = 1;');

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 SELURUH PROSES MIGRASI DATA 1 TAHUN BERHASIL LENGKAP DALAM ${totalSeconds} DETIK!`);
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat migrasi:', error);
  } finally {
    await sourceConn.end();
    await destConn.end();
  }
}

migrate();
