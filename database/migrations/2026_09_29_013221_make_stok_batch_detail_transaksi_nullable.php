<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Batch historis hasil migrasi SIM lama tidak selalu punya detail transaksi
     * asal (475 dari 13.018 batch pada dump sumber bernilai NULL). Tanpa kolom
     * yang bisa NULL, batch tersebut tidak dapat diimpor tanpa memalsukan
     * transaksi operasional.
     */
    public function up(): void
    {
        Schema::table('stok_batches', function (Blueprint $table) {
            $table->dropForeign(['detail_transaksi_id']);
            $table->unsignedBigInteger('detail_transaksi_id')->nullable()->change();
            $table->foreign('detail_transaksi_id')->references('id')->on('detail_transaksis')->nullOnDelete();
        });

        Schema::table('stok_batch_usages', function (Blueprint $table) {
            $table->dropForeign(['detail_transaksi_id']);
            $table->unsignedBigInteger('detail_transaksi_id')->nullable()->change();
            $table->foreign('detail_transaksi_id')->references('id')->on('detail_transaksis')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stok_batch_usages', function (Blueprint $table) {
            $table->dropForeign(['detail_transaksi_id']);
            $table->unsignedBigInteger('detail_transaksi_id')->nullable(false)->change();
            $table->foreign('detail_transaksi_id')->references('id')->on('detail_transaksis')->cascadeOnDelete();
        });

        Schema::table('stok_batches', function (Blueprint $table) {
            $table->dropForeign(['detail_transaksi_id']);
            $table->unsignedBigInteger('detail_transaksi_id')->nullable(false)->change();
            $table->foreign('detail_transaksi_id')->references('id')->on('detail_transaksis')->cascadeOnDelete();
        });
    }
};
