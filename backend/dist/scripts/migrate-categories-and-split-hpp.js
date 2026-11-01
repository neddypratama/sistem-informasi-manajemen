import mysql from 'mysql2/promise';
async function run() {
    console.log('🚀 Starting Category Migration & HPP/Stok Split...');
    const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'bimapratama_v2',
    });
    try {
        console.log('1. Membuat tabel detail_kategoris...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS detail_kategoris (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        deskripsi TEXT NULL,
        type VARCHAR(191) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('2. Membuat tabel kategoris...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS kategoris (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NULL,
        name VARCHAR(191) NOT NULL,
        deskripsi TEXT NULL,
        detail_kategori_id BIGINT NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_kategoris_detail_kategori (detail_kategori_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('3. Menyalin 34 detail_kategoris dari sistem lama...');
        const sourceConn = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'bimapratama',
        });
        const [srcDk] = await sourceConn.query('SELECT * FROM detail_kategoris');
        for (const dk of srcDk) {
            await conn.execute(`INSERT INTO detail_kategoris (id, name, deskripsi, type, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), deskripsi=VALUES(deskripsi)`, [dk.id, dk.name, dk.deskripsi, dk.type, dk.is_active ?? 1, dk.created_at || new Date(), dk.updated_at || new Date()]);
        }
        const newDetailKategoris = [
            { id: 35, name: 'HPP Telur', deskripsi: 'HPP Komoditas Telur', type: 'Pengeluaran' },
            { id: 36, name: 'HPP Pakan', deskripsi: 'HPP Pakan Sentrat & Kucing', type: 'Pengeluaran' },
            { id: 37, name: 'HPP Curah', deskripsi: 'HPP Pakan Curah', type: 'Pengeluaran' },
            { id: 38, name: 'HPP Obat', deskripsi: 'HPP Obat-Obatan', type: 'Pengeluaran' },
            { id: 39, name: 'HPP EggTray', deskripsi: 'HPP Egg Tray', type: 'Pengeluaran' },
            { id: 40, name: 'Stok Curah', deskripsi: 'Persediaan Pakan Curah', type: 'Aset' },
        ];
        for (const ndk of newDetailKategoris) {
            await conn.execute(`INSERT INTO detail_kategoris (id, name, deskripsi, type, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), deskripsi=VALUES(deskripsi)`, [ndk.id, ndk.name, ndk.deskripsi, ndk.type]);
        }
        console.log('   ✅ detail_kategoris siap.');
        console.log('4. Menyalin 88 kategoris dari sistem lama...');
        const [srcK] = await sourceConn.query('SELECT * FROM kategoris');
        for (const k of srcK) {
            await conn.execute(`INSERT INTO kategoris (id, code, name, deskripsi, detail_kategori_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), detail_kategori_id=VALUES(detail_kategori_id)`, [
                k.id,
                `KTG-${String(k.id).padStart(4, '0')}`,
                k.name,
                k.deskripsi,
                k.detail_kategori_id,
                k.is_active ?? 1,
                k.created_at || new Date(),
                k.updated_at || new Date(),
            ]);
        }
        console.log('5. Menambahkan kategori HPP per komoditas & Stok Curah...');
        const newKategoris = [
            { id: 89, code: 'KTG-0089', name: 'Stok Curah', detail_kategori_id: 40, deskripsi: 'Stok Fisik Pakan Curah' },
            { id: 90, code: 'KTG-0090', name: 'HPP Telur Horn', detail_kategori_id: 35, deskripsi: 'HPP Penjualan Telur Horn' },
            { id: 91, code: 'KTG-0091', name: 'HPP Telur Bebek', detail_kategori_id: 35, deskripsi: 'HPP Penjualan Telur Bebek' },
            { id: 92, code: 'KTG-0092', name: 'HPP Telur Puyuh', detail_kategori_id: 35, deskripsi: 'HPP Penjualan Telur Puyuh' },
            { id: 93, code: 'KTG-0093', name: 'HPP Telur Arab', detail_kategori_id: 35, deskripsi: 'HPP Penjualan Telur Arab' },
            { id: 94, code: 'KTG-0094', name: 'HPP Telur Asin', detail_kategori_id: 35, deskripsi: 'HPP Penjualan Telur Asin' },
            { id: 95, code: 'KTG-0095', name: 'HPP Pakan Sentrat/Pabrikan', detail_kategori_id: 36, deskripsi: 'HPP Penjualan Pakan Sentrat' },
            { id: 96, code: 'KTG-0096', name: 'HPP Pakan Curah', detail_kategori_id: 37, deskripsi: 'HPP Penjualan Pakan Curah' },
            { id: 97, code: 'KTG-0097', name: 'HPP Pakan Kucing', detail_kategori_id: 36, deskripsi: 'HPP Penjualan Pakan Kucing' },
            { id: 98, code: 'KTG-0098', name: 'HPP Obat-Obatan', detail_kategori_id: 38, deskripsi: 'HPP Penjualan Obat-Obatan' },
            { id: 99, code: 'KTG-0099', name: 'HPP EggTray', detail_kategori_id: 39, deskripsi: 'HPP Penjualan EggTray' },
            { id: 100, code: 'KTG-0100', name: 'HPP Perlengkapan Lain', detail_kategori_id: 16, deskripsi: 'HPP Barang Perlengkapan Lain' },
        ];
        for (const nk of newKategoris) {
            await conn.execute(`INSERT INTO kategoris (id, code, name, deskripsi, detail_kategori_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name=VALUES(name), detail_kategori_id=VALUES(detail_kategori_id), deskripsi=VALUES(deskripsi)`, [nk.id, nk.code, nk.name, nk.deskripsi, nk.detail_kategori_id]);
        }
        console.log('   ✅ Kategori baru berhasil dibuat.');
        for (const nk of newKategoris) {
            let coaType = 'HPP';
            let normalBalance = 'DEBIT';
            if (nk.id === 89) {
                coaType = 'Aset';
            }
            await conn.execute(`INSERT INTO chart_of_accounts (id, code, name, type, normal_balance, parent_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, 1, NOW())
         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type)`, [nk.id, `ACC-${String(nk.id).padStart(4, '0')}`, nk.name, coaType, normalBalance]);
        }
        console.log('6. Memecah 12.845 baris HPP historis ke masing-masing komoditas...');
        const hppMapping = {
            2: 90,
            1: 91,
            3: 92,
            4: 93,
            5: 94,
            8: 95,
            9: 96,
            10: 97,
            7: 98,
            6: 99,
        };
        for (const [jenisId, targetKategoriId] of Object.entries(hppMapping)) {
            const [res] = await conn.execute(`
        UPDATE detail_transaksis dt
        JOIN barangs b ON dt.barang_id = b.id
        SET dt.kategori_id = ?
        WHERE dt.kategori_id = 38 AND b.jenis_id = ?
      `, [targetKategoriId, jenisId]);
            console.log(`   👉 Updated jenis_id ${jenisId} -> kategori ${targetKategoriId}: ${res.affectedRows} baris`);
        }
        console.log('7. Memecah Stok Curah dari Stok Pakan...');
        const [curahRes] = await conn.execute(`
      UPDATE detail_transaksis dt
      JOIN barangs b ON dt.barang_id = b.id
      SET dt.kategori_id = 89
      WHERE dt.kategori_id = 60 AND b.jenis_id = 9
    `);
        console.log(`   👉 Updated Stok Pakan Curah -> Stok Curah (89): ${curahRes.affectedRows} baris`);
        console.log('🎉 Migrasi Kategori, Pemecahan HPP & Stok Curah SELESAI DENGAN SUKSES!');
        await sourceConn.end();
    }
    catch (err) {
        console.error('❌ Error during category migration:', err);
    }
    finally {
        await conn.end();
    }
}
run();
//# sourceMappingURL=migrate-categories-and-split-hpp.js.map