<?php

declare(strict_types=1);

/**
 * Eksport data dari dump SQL sistem lama (bimaprat_sim2.sql) ke CSV.
 *
 * Master data (client, barang, jenis barang, kategori, akun) sudah dicakup
 * oleh seeder + JSON di database/seeders, sehingga file ini fokus pada data
 * transaksional yang belum ada jalur impornya. Master data tetap diekspor ke
 * csv_export/raw/ dalam bentuk polos (tanpa mapping) untuk keperluan diff.
 *
 * Pemakaian: php export_to_csv.php
 */
$sqlFile = __DIR__.'/bimaprat_sim2.sql';
$csvDir = __DIR__.'/csv_export';
$rawDir = $csvDir.'/raw';

foreach ([$csvDir, $rawDir] as $dir) {
    if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
        exit("Error: tidak dapat membuat direktori $dir\n");
    }
}

/**
 * Pemecah daftar kolom `a`, `b`, `c` menjadi nama kolom apa adanya.
 *
 * @return list<string>
 */
function parseFieldList(string $list): array
{
    $fields = [];
    $current = '';
    $inBacktick = false;

    for ($i = 0, $len = strlen($list); $i < $len; $i++) {
        $char = $list[$i];

        if ($char === '`') {
            $inBacktick = ! $inBacktick;

            continue;
        }

        if ($char === ',' && ! $inBacktick) {
            $fields[] = trim($current);
            $current = '';

            continue;
        }

        $current .= $char;
    }

    if (trim($current) !== '') {
        $fields[] = trim($current);
    }

    return $fields;
}

/**
 * Ubah literal SQL menjadi string PHP. NULL menjadi string kosong.
 */
function decodeSqlValue(string $value): string
{
    $value = trim($value);

    if ($value === '' || strcasecmp($value, 'NULL') === 0) {
        return '';
    }

    if ($value[0] !== "'" || ! str_ends_with($value, "'")) {
        return $value;
    }

    $inner = substr($value, 1, -1);

    if (str_contains($inner, '\\')) {
        $inner = strtr($inner, [
            "\\'" => "'",
            '\\"' => '"',
            '\\\\' => '\\',
            '\\n' => "\n",
            '\\r' => "\r",
            '\\t' => "\t",
            '\\0' => "\0",
            '\\Z' => "\x1A",
        ]);
    }

    return str_replace("''", "'", $inner);
}

/**
 * Pecah satu baris VALUES menjadi peta kolom => nilai.
 *
 * @param  list<string>  $columns
 * @return array<string, string>|null null bila jumlah nilai tidak sesuai kolom.
 */
function parseRow(string $row, array $columns): ?array
{
    $row = trim($row);

    if (! str_starts_with($row, '(') || ! str_ends_with($row, ')')) {
        return null;
    }

    $inner = substr($row, 1, -1);
    $values = [];
    $current = '';
    $inString = false;

    for ($i = 0, $len = strlen($inner); $i < $len; $i++) {
        $char = $inner[$i];

        if ($inString) {
            $current .= $char;

            if ($char === '\\' && $i + 1 < $len) {
                $current .= $inner[++$i];

                continue;
            }

            if ($char === "'") {
                if (($inner[$i + 1] ?? '') === "'") {
                    $current .= $inner[++$i];

                    continue;
                }

                $inString = false;
            }

            continue;
        }

        if ($char === "'") {
            $inString = true;
            $current .= $char;

            continue;
        }

        if ($char === ',') {
            $values[] = decodeSqlValue($current);
            $current = '';

            continue;
        }

        $current .= $char;
    }

    $values[] = decodeSqlValue($current);

    if (count($values) !== count($columns)) {
        return null;
    }

    return array_combine($columns, $values);
}

/**
 * Kuras buffer baris VALUES menjadi baris-baris lengkap.
 *
 * Memperhatikan kurung di dalam string dan baris yang melintasi beberapa baris
 * teks. Mengembalikan true bila statement INSERT sudah habis.
 *
 * @param  list<string>  $columns
 * @param  callable(array<string, string>): void  $onRow
 */
function drainRows(string &$buffer, array $columns, callable $onRow): bool
{
    $len = strlen($buffer);
    $offset = 0;
    $ended = false;

    while ($offset < $len) {
        while ($offset < $len && ($buffer[$offset] === ',' || ctype_space($buffer[$offset]))) {
            $offset++;
        }

        if ($offset >= $len) {
            break;
        }

        if ($buffer[$offset] !== '(') {
            $end = strpos($buffer, ';', $offset);

            if ($end === false) {
                break;
            }

            $offset = $end + 1;
            $ended = true;

            break;
        }

        $complete = false;
        $depth = 0;
        $inString = false;
        $cursor = $offset;

        for (; $cursor < $len; $cursor++) {
            $char = $buffer[$cursor];

            if ($inString) {
                if ($char === '\\') {
                    $cursor++;
                } elseif ($char === "'") {
                    if (($buffer[$cursor + 1] ?? '') === "'") {
                        $cursor++;
                    } else {
                        $inString = false;
                    }
                }

                continue;
            }

            if ($char === "'") {
                $inString = true;
            } elseif ($char === '(') {
                $depth++;
            } elseif ($char === ')') {
                $depth--;

                if ($depth === 0) {
                    $cursor++;
                    $complete = true;

                    break;
                }
            }
        }

        if (! $complete) {
            break;
        }

        $parsed = parseRow(substr($buffer, $offset, $cursor - $offset), $columns);

        if ($parsed !== null) {
            $onRow($parsed);
        }

        $offset = $cursor;

        if (($buffer[$offset] ?? '') === ';') {
            $offset++;
            $ended = true;

            break;
        }
    }

    $buffer = substr($buffer, $offset);

    return $ended;
}

/**
 * Penulis CSV sederhana: BOM UTF-8 + header, lalu append per baris.
 */
final class CsvWriter
{
    /** @var resource */
    private $handle;

    private int $rows = 0;

    /**
     * @param  list<string>  $headers
     */
    public function __construct(string $path, private readonly array $headers)
    {
        $handle = fopen($path, 'w');

        if ($handle === false) {
            throw new RuntimeException("Gagal menulis $path");
        }

        $this->handle = $handle;
        fwrite($this->handle, "\xEF\xBB\xBF");
        fputcsv($this->handle, $this->headers);
    }

    /**
     * @param  array<int, string|null>  $values
     */
    public function write(array $values): void
    {
        fputcsv($this->handle, array_map(
            static fn ($value): string => $value === null ? '' : (string) $value,
            array_values($values),
        ));

        $this->rows++;
    }

    public function rows(): int
    {
        return $this->rows;
    }

    public function close(): void
    {
        fclose($this->handle);
    }
}

/**
 * Slug aman untuk kolom unique seperti users.username.
 */
function slug(string $value): string
{
    $value = strtolower(trim($value));
    $value = (string) preg_replace('/[^a-z0-9]+/', '-', $value);

    return trim($value, '-');
}

/**
 * Prefix kode akun mengikuti jenis kategorinya, mengikuti konvensi
 * database/seeders/AkunDetailSeeder.php.
 */
function kodeAkun(int $kategoriId, int $index): string
{
    $prefix = match (true) {
        $kategoriId <= 9 => '1',
        $kategoriId <= 18 => '2',
        $kategoriId <= 19 => '3',
        $kategoriId <= 27 => '4',
        default => '5',
    };

    return $prefix.'-'.str_pad((string) $index, 3, '0', STR_PAD_LEFT);
}

/**
 * Satuan barang disimpulkan dari nama, mengikuti BarangSeeder::inferSatuan.
 */
const SATUAN_PRIORITAS = ['sak', 'dus', 'bks', 'kp', 'ml', 'gr', 'kg', 'bj', 'ltr', 'lt', 'pcs', 'pes'];

function inferSatuan(string $nama, string $kelompok): string
{
    foreach (SATUAN_PRIORITAS as $satuan) {
        if (preg_match('/\b(?:[0-9]*\s*)?'.$satuan.'\b/i', $nama) === 1) {
            return $satuan;
        }
    }

    return match ($kelompok) {
        'telur', 'pakan' => 'kg',
        'obat' => 'gr',
        default => 'pes',
    };
}

/** kelompok jenis barang mengikuti kolom kategori_id di sumber. */
const KELOMPOK_BY_KATEGORI_ID = [
    59 => 'telur',
    60 => 'pakan',
    61 => 'obat',
    62 => 'tray',
];

/** Pemetaan jenis kategori lama ke enum jenis pada tabel kategoris. */
const JENIS_KATEGORI = [
    'Pendapatan' => 'pendapatan',
    'Pengeluaran' => 'beban',
    'Aset' => 'aset',
    'Liabilitas' => 'liabilitas',
    'Ekuitas' => 'ekuitas',
];

$stats = [
    'malformed' => [],
    'reject' => [],
    'unmapped' => [],
];

/**
 * Definition ekspor. Key = nama file (tanpa .csv), `source` = tabel asal.
 *
 * Setiap definisi boleh memiliki `reject` untuk memisahkan baris yang tidak
 * bisa diimpor apa adanya, dan `raw` untuk ekspor polos tanpa mapping.
 */
$definitions = [
    // ---------------------------------------------------------------- raw
    'raw/clients' => [
        'source' => 'clients',
        'raw' => true,
    ],
    'raw/barangs' => [
        'source' => 'barangs',
        'raw' => true,
    ],
    'raw/jenis_barangs' => [
        'source' => 'jenis_barangs',
        'raw' => true,
    ],
    'raw/detail_kategoris' => [
        'source' => 'detail_kategoris',
        'raw' => true,
    ],
    'raw/kategoris' => [
        'source' => 'kategoris',
        'raw' => true,
    ],
    'raw/roles' => [
        'source' => 'roles',
        'raw' => true,
    ],
    'raw/users' => [
        'source' => 'users',
        'raw' => true,
    ],

    // ------------------------------------------------- tabel master (mapping)
    'clients' => [
        'source' => 'clients',
        'headers' => ['id', 'nama', 'alamat', 'no_telepon', 'tipe', 'keterangan', 'status', 'created_at', 'updated_at'],
        'transform' => static fn (array $r): array => [
            $r['id'],
            trim($r['name']),
            trim($r['alamat']),
            '',
            $r['type'],
            $r['keterangan'],
            'aktif',
            $r['created_at'],
            $r['updated_at'],
        ],
        'reject' => static function (array $r): ?string {
            $tipe = ['Peternak', 'Supplier', 'Pedagang', 'Karyawan', 'Truk'];

            return in_array($r['type'], $tipe, true) ? null : "tipe client '{$r['type']}' di luar enum";
        },
    ],

    'jenis_barang' => [
        'source' => 'jenis_barangs',
        'headers' => ['id', 'nama', 'kelompok', 'keterangan', 'status', 'created_at', 'updated_at'],
        'transform' => static fn (array $r): array => [
            $r['id'],
            trim($r['name']),
            KELOMPOK_BY_KATEGORI_ID[(int) $r['kategori_id']] ?? '',
            $r['deskripsi'],
            'aktif',
            $r['created_at'],
            $r['updated_at'],
        ],
        'reject' => static fn (array $r): ?string => isset(KELOMPOK_BY_KATEGORI_ID[(int) $r['kategori_id']])
            ? null
            : "kategori_id {$r['kategori_id']} tidak dipetakan ke kelompok",
    ],

    'barangs' => [
        'source' => 'barangs',
        'headers' => ['id', 'jenis_barang_id', 'kode_barang', 'nama_barang', 'satuan', 'status', 'created_at', 'updated_at'],
        'transform' => static function (array $r): array {
            $nama = trim($r['name']);

            return [
                $r['id'],
                $r['jenis_id'],
                sprintf('BRG-%05d', (int) $r['id']),
                $nama,
                inferSatuan($nama, 'kg'),
                'aktif',
                $r['created_at'],
                $r['updated_at'],
            ];
        },
    ],

    'roles' => [
        'source' => 'roles',
        'headers' => ['id', 'name', 'description', 'status', 'created_at', 'updated_at'],
        'transform' => static fn (array $r): array => [
            $r['id'],
            trim($r['name']),
            $r['deskripsi'],
            'active',
            $r['created_at'],
            $r['updated_at'],
        ],
    ],

    'users' => [
        'source' => 'users',
        'headers' => ['id', 'name', 'username', 'email', 'email_verified_at', 'password', 'role_id', 'status', 'remember_token', 'deleted_at', 'created_at', 'updated_at'],
        'transform' => static fn (array $r): array => [
            $r['id'],
            trim($r['name']),
            slug($r['name']),
            $r['email'],
            $r['email_verified_at'],
            $r['password'],
            $r['role_id'],
            'active',
            $r['remember_token'],
            '',
            $r['created_at'],
            $r['updated_at'],
        ],
        'reject' => static fn (array $r): ?string => trim($r['name']) === '' ? 'nama kosong' : null,
    ],

    // ------------------------------------------------------------- akuntansi
    'kategoris' => [
        'source' => 'detail_kategoris',
        'headers' => ['id', 'nama', 'jenis', 'keterangan', 'status', 'created_at', 'updated_at'],
        'transform' => static fn (array $r): array => [
            $r['id'],
            trim($r['name']),
            JENIS_KATEGORI[$r['type']] ?? '',
            $r['deskripsi'],
            'aktif',
            $r['created_at'],
            $r['updated_at'],
        ],
        'reject' => static fn (array $r): ?string => isset(JENIS_KATEGORI[$r['type']])
            ? null
            : "tipe kategori '{$r['type']}' di luar enum jenis",
    ],

    'akuns' => [
        'source' => 'kategoris',
        'headers' => ['id', 'kode', 'nama', 'kategori_id', 'saldo_normal', 'system_code', 'status', 'created_at', 'updated_at'],
        'transform' => static function (array $r, array $ctx): array {
            $kategoriId = (int) $r['detail_kategori_id'];
            $jenis = $ctx['kategoriJenis'][$kategoriId] ?? '';

            return [
                $r['id'],
                kodeAkun($kategoriId, (int) $r['id']),
                trim($r['name']),
                $kategoriId,
                in_array($jenis, ['pendapatan', 'liabilitas', 'ekuitas'], true) ? 'kredit' : 'debit',
                '',
                'aktif',
                $r['created_at'],
                $r['updated_at'],
            ];
        },
    ],

    // ----------------------------------------------------------- transaksional
    'transaksi_header' => [
        'source' => 'transaksis',
        'headers' => ['id', 'nomor_transaksi', 'tanggal', 'tipe_transaksi', 'client_id', 'total', 'keterangan', 'created_by', 'created_at', 'updated_at'],
        'transform' => static function (array $r): array {
            $tipe = match (true) {
                str_starts_with($r['name'], 'Hutang') => 'pembelian',
                str_starts_with($r['name'], 'Piutang') => 'penjualan',
                default => '',
            };

            return [
                $r['id'],
                $r['invoice'],
                substr($r['tanggal'], 0, 10),
                $tipe,
                $r['client_id'],
                $r['total'],
                $r['name'],
                $r['user_id'],
                $r['created_at'],
                $r['updated_at'],
            ];
        },
        'reject' => static function (array $r): ?string {
            if ($r['client_id'] === '') {
                return 'client_id NULL (kolom target NOT NULL)';
            }

            if ($r['user_id'] === '') {
                return 'user_id NULL (created_by NOT NULL)';
            }

            $tipe = match (true) {
                str_starts_with($r['name'], 'Hutang') => 'pembelian',
                str_starts_with($r['name'], 'Piutang') => 'penjualan',
                default => '',
            };

            if ($tipe === '') {
                return "nama transaksi '{$r['name']}' tidak memetakan ke tipe pembelian/penjualan";
            }

            return null;
        },
    ],

    'transaksi_detail' => [
        'source' => 'detail_transaksis',
        'headers' => ['id', 'transaksi_id', 'barang_id', 'kuantitas', 'harga', 'subtotal', 'created_at', 'updated_at'],
        'transform' => static fn (array $r): array => [
            $r['id'],
            $r['transaksi_id'],
            $r['barang_id'],
            $r['kuantitas'] === '' ? '0' : $r['kuantitas'],
            $r['value'] === '' ? '0' : $r['value'],
            $r['sub_total'],
            $r['created_at'],
            $r['updated_at'],
        ],
        'reject' => static fn (array $r): ?string => $r['barang_id'] === ''
            ? 'barang_id NULL (baris akun/jurnal, bukan baris item)'
            : null,
    ],

    'stok_batches' => [
        'source' => 'stok_batches',
        'headers' => ['id', 'barang_id', 'detail_transaksi_id', 'tanggal', 'qty_masuk', 'qty_sisa', 'harga_beli', 'created_at', 'updated_at'],
        'transform' => static fn (array $r): array => [
            $r['id'],
            $r['barang_id'],
            $r['detail_transaksi_id'],
            substr($r['tanggal'], 0, 10),
            $r['qty_masuk'],
            $r['qty_sisa'],
            $r['harga'],
            $r['created_at'],
            $r['updated_at'],
        ],
        'reject' => static fn (array $r): ?string => $r['detail_transaksi_id'] === ''
            ? 'detail_transaksi_id NULL (kolom target NOT NULL)'
            : null,
    ],

    'stok_keluar_batches' => [
        'source' => 'stok_keluar_batches',
        'headers' => ['id', 'detail_transaksi_id', 'stok_batch_id', 'qty', 'harga', 'subtotal', 'created_at', 'updated_at'],
        'transform' => static fn (array $r): array => [
            $r['id'],
            $r['detail_transaksi_id'],
            $r['stok_batch_id'],
            $r['qty'],
            $r['harga'],
            number_format((float) $r['qty'] * (float) $r['harga'], 2, '.', ''),
            $r['created_at'],
            $r['updated_at'],
        ],
    ],
];

echo "Membaca $sqlFile\n";

if (! is_readable($sqlFile)) {
    exit("Error: file SQL tidak bisa dibaca\n");
}

// Peta id detail_kategoris -> jenis, dipakai untuk menentukan saldo_normal akun.
$kategoriJenis = [];
$sourceTablesLookup = [];

foreach ($definitions as $name => $definition) {
    $sourceTablesLookup[$definition['source']][] = $name;
}

/**
 * Baca seluruh statement INSERT dari file dan alirkan baris per tabel.
 *
 * @param  array<string, true>  $tables
 * @param  callable(string, array<string, string>): void  $onRow
 */
function streamInsertRows(string $path, array $tables, callable $onRow): void
{
    $handle = fopen($path, 'r');

    if ($handle === false) {
        throw new RuntimeException("Gagal membuka $path");
    }

    $table = null;
    $columns = [];
    $buffer = '';

    while (($line = fgets($handle)) !== false) {
        if ($table === null) {
            if (preg_match('/^INSERT INTO `([^`]+)`\s*\((.+)\)\s*VALUES\s*$/i', trim($line), $matches) !== 1) {
                continue;
            }

            $table = $matches[1];

            if (! isset($tables[$table])) {
                $table = null;

                continue;
            }

            $columns = parseFieldList($matches[2]);
            $buffer = '';
            $onRow($table, ['__columns__' => $columns]);

            continue;
        }

        $buffer .= $line;

        if (drainRows($buffer, $columns, static fn (array $row) => $onRow($table, $row))) {
            $table = null;
            $columns = [];
            $buffer = '';
        }
    }

    fclose($handle);
}

echo "Mengumpulkan jenis kategori...\n";

streamInsertRows($sqlFile, ['detail_kategoris' => true], static function (string $table, array $row) use (&$kategoriJenis): void {
    if (isset($row['__columns__'])) {
        return;
    }

    $kategoriJenis[(int) $row['id']] = JENIS_KATEGORI[$row['type']] ?? '';
});

echo 'Kategori ditemukan: '.count($kategoriJenis)."\n";

$writers = [];
$rejectWriters = [];
$rawWriters = [];
$counter = [];
$stats = ['reject' => []];

$processRow = static function (string $table, array $row) use (&$definitions, &$writers, &$rejectWriters, &$rawWriters, &$counter, &$stats, &$kategoriJenis, $csvDir, $rawDir): void {
    if (isset($row['__columns__'])) {
        $columns = $row['__columns__'];

        foreach ($definitions as $name => $definition) {
            if ($definition['source'] === $table && ($definition['raw'] ?? false) === true) {
                $rawWriters[$name] ??= new CsvWriter($rawDir.'/'.basename($name).'.csv', $columns);
            }
        }

        return;
    }

    foreach ($definitions as $name => $definition) {
        if ($definition['source'] !== $table || ($definition['raw'] ?? false) === true) {
            continue;
        }

        $reject = $definition['reject'] ?? null;
        $alasan = $reject === null ? null : $reject($row, $kategoriJenis);

        if ($alasan !== null) {
            $counter[$name]['reject']++;
            $stats['reject'][$name][$alasan] = ($stats['reject'][$name][$alasan] ?? 0) + 1;
            $rejectWriters[$name] ??= new CsvWriter($csvDir.'/'.$name.'_reject.csv', ['alasan', 'data_sumber']);
            $rejectWriters[$name]->write([$alasan, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);

            continue;
        }

        $writers[$name] ??= new CsvWriter($csvDir.'/'.$name.'.csv', $definition['headers']);
        $writers[$name]->write(($definition['transform'])($row, $kategoriJenis));
        $counter[$name]['ok']++;
    }

    foreach ($definitions as $name => $definition) {
        if ($definition['source'] === $table && ($definition['raw'] ?? false) === true) {
            $rawWriters[$name]?->write(array_values($row));
        }
    }
};

foreach (array_keys($definitions) as $name) {
    $counter[$name] = ['ok' => 0, 'reject' => 0];
}

echo "Mengalirkan statement INSERT...\n";

streamInsertRows($sqlFile, array_fill_keys(array_keys($sourceTablesLookup), true), $processRow);

foreach ($writers as $writer) {
    $writer?->close();
}

foreach ($rejectWriters as $writer) {
    $writer?->close();
}

foreach ($rawWriters as $writer) {
    $writer?->close();
}

echo "\n=== Ringkasan ===\n";
printf("%-24s %10s %10s\n", 'File', 'Diekspor', 'Ditolak');
echo str_repeat('-', 46)."\n";

foreach ($counter as $name => $count) {
    printf("%-24s %10d %10d\n", $name.'.csv', $count['ok'], $count['reject']);
}

if ($stats['reject'] !== []) {
    echo "\nAlasan penolakan:\n";

    foreach ($stats['reject'] as $name => $reasons) {
        echo "  $name:\n";

        foreach ($reasons as $reason => $total) {
            printf("    %-70s %d\n", $reason, $total);
        }
    }
}

echo "\nSelesai. File tersimpan di $csvDir\n";
