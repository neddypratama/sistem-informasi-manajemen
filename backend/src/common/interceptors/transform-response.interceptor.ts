import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

export interface StandardResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method ? req.method.toUpperCase() : 'GET';
    const url = (req.originalUrl || req.url || '').toLowerCase();

    return next.handle().pipe(
      map((res) => {
        // 1. Jika respons sudah merupakan objek StandardResponse lengkap
        if (
          res &&
          typeof res === 'object' &&
          'success' in res &&
          'message' in res &&
          'data' in res
        ) {
          return res;
        }

        // 2. Jika respons memiliki success + message tanpa properti data
        if (
          res &&
          typeof res === 'object' &&
          'success' in res &&
          'message' in res
        ) {
          return {
            success: Boolean(res.success),
            message: String(res.message),
            data: res.data ?? null,
            meta: res.meta,
          };
        }

        // 3. Ekstrak pesan kustom jika disediakan di dalam res
        const customMessage =
          res && typeof res === 'object' && 'message' in res
            ? String(res.message)
            : undefined;

        // 4. Jika respons adalah data berpaginasi (items & meta/total)
        if (
          res &&
          typeof res === 'object' &&
          'items' in res &&
          ('meta' in res || 'total' in res)
        ) {
          const meta =
            res.meta || {
              page: res.page || 1,
              limit: res.limit || 25,
              total: res.total || res.items.length,
              totalPages: res.totalPages || Math.ceil((res.total || 1) / (res.limit || 25)),
            };

          return {
            success: true,
            message: customMessage || 'Data berhasil dimuat',
            data: res.items,
            meta,
          };
        }

        // 5. Pesan umpan balik kontekstual berdasarkan rute endpoint & HTTP Method
        const feedbackMessage = customMessage || this.resolveFeedbackMessage(method, url);

        // Bersihkan dataPayload jika hanya memuat properti 'message'
        let dataPayload = res;
        if (res && typeof res === 'object' && 'message' in res && 'data' in res) {
          dataPayload = res.data;
        } else if (
          res &&
          typeof res === 'object' &&
          'message' in res &&
          Object.keys(res).length === 1
        ) {
          dataPayload = null;
        }

        return {
          success: true,
          message: feedbackMessage,
          data: dataPayload,
        };
      }),
    );
  }

  private resolveFeedbackMessage(method: string, url: string): string {
    switch (method) {
      case 'GET':
        return 'Data berhasil dimuat';

      case 'POST':
        if (url.includes('/auth/login')) return 'Login berhasil. Selamat datang di Bima Pratama ERP!';
        if (url.includes('/master/barangs')) return 'Data barang berhasil ditambahkan';
        if (url.includes('/master/clients')) return 'Data klien berhasil ditambahkan';
        if (url.includes('/master/kategoris')) return 'Kategori akun berhasil ditambahkan';
        if (url.includes('/master/detail-kategoris')) return 'Detail kategori akun berhasil ditambahkan';
        if (url.includes('/transaksi/penjualan')) return 'Transaksi penjualan berhasil disimpan';
        if (url.includes('/transaksi/pembelian')) return 'Transaksi pembelian berhasil disimpan';
        if (url.includes('/transaksi/retur-penjualan')) return 'Transaksi retur penjualan berhasil dicatat';
        if (url.includes('/transaksi/retur-pembelian')) return 'Transaksi retur pembelian berhasil dicatat';
        if (url.includes('/transaksi/beban')) return 'Biaya operasional berhasil dicatat';
        if (url.includes('/transaksi/pendapatan-lain')) return 'Pendapatan lain-lain berhasil dicatat';
        if (url.includes('/transaksi/hutang')) return 'Mutasi hutang berhasil dicatat';
        if (url.includes('/transaksi/piutang')) return 'Mutasi piutang berhasil dicatat';
        if (url.includes('/transaksi/kas-mutasi')) return 'Mutasi kas/bank berhasil dicatat';
        if (url.includes('/inventory/opname')) return 'Stok opname berhasil disimpan';
        if (url.includes('/users')) return 'Pengguna baru berhasil didaftarkan';
        if (url.includes('/roles')) return 'Role hak akses berhasil dibuat';
        if (url.includes('/migration/upload-sql')) return 'File SQL berhasil diimpor dan diproses';
        if (url.includes('/migration/run-clean')) return 'Migrasi data berhasil diselesaikan';
        return 'Data baru berhasil disimpan';

      case 'PUT':
      case 'PATCH':
        if (url.includes('/master/barangs')) return 'Data barang berhasil diperbarui';
        if (url.includes('/master/clients')) return 'Data klien berhasil diperbarui';
        if (url.includes('/master/kategoris')) return 'Kategori akun berhasil diperbarui';
        if (url.includes('/master/detail-kategoris')) return 'Detail kategori akun berhasil diperbarui';
        if (url.includes('/transaksi')) return 'Transaksi berhasil diperbarui';
        if (url.includes('/users') && url.includes('toggle-active')) return 'Status aktif pengguna berhasil diubah';
        if (url.includes('/users')) return 'Data pengguna berhasil diperbarui';
        if (url.includes('/roles') && url.includes('permissions')) return 'Hak akses role berhasil diperbarui';
        if (url.includes('/roles')) return 'Data role berhasil diperbarui';
        return 'Perubahan data berhasil disimpan';

      case 'DELETE':
        if (url.includes('/master/barangs')) return 'Data barang berhasil dinonaktifkan';
        if (url.includes('/master/clients')) return 'Data klien berhasil dihapus';
        if (url.includes('/master/kategoris')) return 'Kategori berhasil dinonaktifkan';
        if (url.includes('/master/detail-kategoris')) return 'Detail kategori berhasil dinonaktifkan';
        if (url.includes('/roles')) return 'Role berhasil dihapus';
        if (url.includes('/transaksi')) return 'Transaksi berhasil dibatalkan';
        return 'Data berhasil dihapus';

      default:
        return 'Permintaan berhasil diproses';
    }
  }
}
