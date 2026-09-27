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
        Schema::create('stok_batches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barang_id');
            $table->unsignedBigInteger('detail_transaksi_id');
            $table->date('tanggal');
            $table->decimal('qty_masuk', 15, 2);
            $table->decimal('qty_sisa', 15, 2);
            $table->decimal('harga_beli', 15, 2);
            $table->timestamps();

            $table->foreign('barang_id')->references('id')->on('barangs')->restrictOnDelete();
            $table->foreign('detail_transaksi_id')->references('id')->on('detail_transaksis')->cascadeOnDelete();
            $table->index('barang_id');
            $table->index(['barang_id', 'tanggal']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stok_batches');
    }
};
