<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('jurnals', function (Blueprint $table) {
            $table->index(['entitas_type', 'client_id'], 'idx_jurnals_entitas_client');
            $table->index(['entitas_type', 'tanggal'], 'idx_jurnals_entitas_tanggal');
            $table->index(['journalable_type', 'journalable_id'], 'idx_jurnals_journalable');
            $table->index(['created_by'], 'idx_jurnals_created_by');
        });

        Schema::table('jurnal_details', function (Blueprint $table) {
            $table->index(['jurnal_id', 'akun_id'], 'idx_jurnal_details_jurnal_akun');
            $table->index(['akun_id', 'jurnal_id'], 'idx_jurnal_details_akun_jurnal');
        });

        Schema::table('stok_batches', function (Blueprint $table) {
            $table->index(['barang_id', 'qty_sisa'], 'idx_stok_batches_barang_sisa');
            $table->index(['qty_sisa'], 'idx_stok_batches_qty_sisa');
        });

        Schema::table('transaksis', function (Blueprint $table) {
            $table->index(['tipe_transaksi', 'tanggal'], 'idx_transaksis_tipe_tanggal');
            $table->index(['created_by'], 'idx_transaksis_created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jurnals', function (Blueprint $table) {
            $table->dropIndex('idx_jurnals_entitas_client');
            $table->dropIndex('idx_jurnals_entitas_tanggal');
            $table->dropIndex('idx_jurnals_journalable');
            $table->dropIndex('idx_jurnals_created_by');
        });

        Schema::table('jurnal_details', function (Blueprint $table) {
            $table->dropIndex('idx_jurnal_details_jurnal_akun');
            $table->dropIndex('idx_jurnal_details_akun_jurnal');
        });

        Schema::table('stok_batches', function (Blueprint $table) {
            $table->dropIndex('idx_stok_batches_barang_sisa');
            $table->dropIndex('idx_stok_batches_qty_sisa');
        });

        Schema::table('transaksis', function (Blueprint $table) {
            $table->dropIndex('idx_transaksis_tipe_tanggal');
            $table->dropIndex('idx_transaksis_created_by');
        });
    }
};
