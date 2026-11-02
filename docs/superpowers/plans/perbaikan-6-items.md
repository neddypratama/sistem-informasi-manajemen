# Plan: Perbaikan 6 Items ERP Bima Pratama

## Context
ERP Bima Pratama (NestJS backend + React/Vite frontend). 
- Backend: `c:\laragon\www\erp-bimapratama\backend\`
- Frontend: `c:\laragon\www\erp-bimapratama\frontend\`
- Backend API: http://localhost:4000/api/v1
- Frontend dev: http://localhost:3000

## Global Constraints
- Bahasa: Indonesia di semua UI label
- Build harus 100% lolos sebelum restart
- FIFO: alokasi stok keluar selalu mengikuti urutan tanggal batch
- Double-entry accounting: semua jurnal harus balance (debit = kredit)
- Tidak ada data loss: stok/jurnal rollback penuh jika error
- Soft delete: transaksi hanya status = 'BATAL', tidak dihapus
- PowerShell: gunakan `;` bukan `&&` untuk perintah berantai

## Tasks

### Task 1: Hilangkan Default Tanggal + Tambah Pagination

**Scope:** Frontend only

**Problem:**
- Semua halaman transaksi & keuangan/jurnal menggunakan `getTodayDateString()` sebagai default untuk `startDate` dan `endDate` states
- Beberapa halaman belum ada pagination

**Files to modify:**
1. `frontend/src/features/transaksi/CommodityTransactionPage.tsx`
   - state `startDate` dan `endDate` default → `''` (bukan `getTodayDateString()`)
   - state `monitoringDate` tidak perlu diubah (monitoring date tetap)
   - Tambah pagination jika belum ada

2. `frontend/src/features/keuangan/BebanPage.tsx`
   - state `startDate`, `endDate` → `''`
   - Pastikan ada pagination

3. `frontend/src/features/keuangan/HutangPage.tsx`
   - state `startDate`, `endDate` → `''`
   - Pastikan ada pagination

4. `frontend/src/features/keuangan/PiutangPage.tsx`
   - state `startDate`, `endDate` → `''`
   - Pastikan ada pagination

5. `frontend/src/features/keuangan/PendapatanLainPage.tsx`
   - state `startDate`, `endDate` → `''`
   - Pastikan ada pagination

6. `frontend/src/features/keuangan/LaporanKasPage.tsx`
   - state `startDate`, `endDate` default dari `todayStr` → `''`
   - Pastikan ada pagination

7. `frontend/src/features/reports/JurnalUmumPage.tsx`
   - Cek dan ubah default tanggal ke `''` jika ada
   - Pastikan ada pagination

8. `frontend/src/features/reports/LabaRugiPage.tsx`
   - Cek default tanggal → `''`
   - Pastikan ada pagination atau note jika tidak perlu

**Pagination component:** `frontend/src/components/Pagination.tsx` sudah ada.

**Pattern pagination (gunakan pattern yang konsisten):**
```tsx
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 20;
// ...
const paginatedData = filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
// ...
<Pagination
  currentPage={page}
  totalItems={filteredData.length}
  itemsPerPage={ITEMS_PER_PAGE}
  onPageChange={setPage}
/>
```
Reset `page` ke 1 ketika filter berubah.

**Output:** `task-1-report.md` di workspace SDD

---

### Task 2: Hapus Tombol "Cetak" dari Semua Halaman

**Scope:** Frontend only, mechanical

**Action:** Cari dan hapus semua tombol Cetak dari semua halaman TSX.

**Find files:** 
```
grep -rl "Cetak" frontend/src --include="*.tsx"
```

**What to remove:** Tombol/button yang berisi teks "Cetak" atau icon Printer yang berfungsi sebagai tombol cetak. Jangan hapus fungsi export Excel/PDF yang masih digunakan.

**Typical pattern to remove:**
```tsx
<button onClick={handlePrint}>
  <Printer ... />
  Cetak
</button>
```
atau `window.print()` calls yang terkait tombol ini.

Juga hapus import `Printer` dari lucide-react jika tidak dipakai lagi setelah penghapusan.

**Output:** `task-2-report.md` di workspace SDD

---

### Task 3: Hapus Tab "Laba Rugi Curah & Sisa Stok Gudang" dari Portal Pak Pri

**Scope:** Frontend only, single file

**File:** `frontend/src/features/curah/CurahPakPriPage.tsx`

**Action:**
- Hapus tab "LABA_RUGI" (atau "SISA_STOK") dari navigasi tab
- Hapus konten JSX untuk tab tersebut
- Hapus state/query yang hanya dipakai di tab tersebut
- Jika `activeTab` default adalah tab yang dihapus, ubah ke tab pertama yang valid

Pertahankan tab: OPERASIONAL, KAS_AUDIT, KONVERSI (jika ada).

**Output:** `task-3-report.md` di workspace SDD

---

### Task 4: Fix Konversi Barang - Tidak Bisa Simpan + Label Salah

**Scope:** Frontend + Backend

**Files:**
- `frontend/src/features/inventory/KonversiBarangPage.tsx`
- `backend/src/modules/inventory/inventory.service.ts` (fungsi `createKonversi`)
- `backend/src/modules/inventory/inventory.controller.ts` (endpoint POST /inventory/konversi)
- `backend/src/modules/inventory/dto/create-konversi.dto.ts` (atau sejenis)

**Problems:**
1. **Tidak bisa simpan**: Investigasi payload yang dikirim ke endpoint `POST /inventory/konversi`. Verifikasi field yang dikirim cocok dengan DTO backend. Fix form state / payload mapping jika tidak cocok.
2. **Label salah**: Ubah label `"Total Nilai Modal / Nominal Uang (Rp)"` menjadi label yang bermakna untuk harga satuan barang hasil konversi, misalnya `"Harga Modal Barang Hasil (Rp/unit)"`

**Steps to diagnose save issue:**
1. Baca `KonversiBarangPage.tsx` untuk melihat state form dan payload yang dikirim
2. Baca `inventory.controller.ts` dan `inventory.service.ts` untuk melihat endpoint dan DTO
3. Identifikasi mismatch dan fix
4. Pastikan setelah simpan, list konversi di-refresh (invalidate query)

**Important:** Bug input angka sebelumnya: input `20000` menjadi `2,00` — ini biasanya karena ada pembagian tidak sengaja atau format parsing. Cari dan fix jika masih ada.

**Output:** `task-4-report.md` di workspace SDD

---

### Task 5: Edit Transaksi + Barang Baru → FIFO Fix

**Scope:** Backend only

**File:** `backend/src/modules/transaksi/transaksi.service.ts`

**Problem:** Saat user mengedit transaksi PENJUALAN dan menambah barang BARU (item tanpa `detailId` lama), FIFO allocation tidak berjalan dengan benar untuk barang baru tersebut.

**Root cause analysis:**
Baca fungsi `update()` di `transaksi.service.ts`, khususnya blok `else if (existingTx.type === 'PENJUALAN')`.

Alur yang benar:
1. Kumpulkan `oldDetailIds` (detail transaksi yang sudah ada sebelum edit)
2. Rollback SEMUA `stokKeluarBatch` yang terkait `oldDetailIds` (kembalikan `qtySisa` ke stokBatch)
3. Hapus `detailTransaksi` yang tidak ada di request edit (item yang dihapus user dari modal)
4. Update `detailTransaksi` yang masih ada (item lama yang dipertahankan/diubah qty-nya)
5. Create `detailTransaksi` BARU untuk item baru yang ditambahkan
6. Panggil `fifoService.allocateFifoStock()` untuk SEMUA item (lama + baru), update `hppSatuan`, `totalHpp`
7. Recalculate `total`, `subtotal`, update transaksi

**Verify:** Pastikan `hppSatuan` dan `totalHpp` di `detailTransaksi` di-update dari hasil `fifoResult`.

**Output:** `task-5-report.md` di workspace SDD

---

### Task 6: Hak Akses Per Tab

**Scope:** Frontend + Backend (jika diperlukan)

**Context:**
- Sistem sudah ada role-based access control
- Backend: `backend/src/modules/users/` (cek model Role, Permission)
- Frontend: cek `useAuth()` atau `AuthContext` di `frontend/src/`

**Goal:** Setiap tab di halaman-halaman utama dibatasi berdasarkan role pengguna.

**Role mapping yang disepakati:**
- **ADMIN**: Akses semua tab
- **KEUANGAN/FINANCE**: Akses tab jurnal, laporan, keuangan; tidak akses tab stok/operasional
- **GUDANG/STOK**: Akses tab stok, pembelian; tidak akses tab jurnal/keuangan sensitif  
- **KASIR/PENJUALAN**: Akses tab penjualan; tidak akses tab laporan keuangan mendalam

**Note:** Jika mapping role belum pasti, implementasikan helper function `canAccessTab(userRole, tabName)` yang mudah dikonfigurasi, dan terapkan di tab-tab kritis:
- `CommodityTransactionPage.tsx`: tab STOK hanya ADMIN+GUDANG; tab PENJUALAN semua bisa
- `CurahPakPriPage.tsx`: tab KAS_AUDIT hanya ADMIN+KEUANGAN
- `JurnalUmumPage.tsx`: hanya ADMIN+KEUANGAN
- `LabaRugiPage.tsx`: hanya ADMIN+KEUANGAN

**Implementation approach:**
1. Baca cara frontend mendapatkan user/role saat ini
2. Buat helper `hasTabAccess(role: string, tabKey: string): boolean` di file utils
3. Wrap tab buttons dengan kondisi `{hasTabAccess(user.role, 'TAB_KEY') && <button>Tab</button>}`
4. Jika user tidak punya akses ke activeTab, redirect ke tab pertama yang boleh diakses

**Output:** `task-6-report.md` di workspace SDD

---

## Build & Deploy Instructions

Setelah semua task selesai:
```powershell
# Build backend
cd backend; npm run build

# Build frontend  
cd frontend; npm run build
```

Jika build berhasil, restart backend server (kill task yang running lalu jalankan ulang).
