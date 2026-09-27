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
        Schema::create('stok_batch_usages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('detail_transaksi_id');
            $table->unsignedBigInteger('stok_batch_id');
            $table->decimal('qty', 15, 2);
            $table->decimal('harga', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->timestamps();

            $table->foreign('detail_transaksi_id')->references('id')->on('detail_transaksis')->cascadeOnDelete();
            $table->foreign('stok_batch_id')->references('id')->on('stok_batches')->cascadeOnDelete();
            $table->index('detail_transaksi_id');
            $table->index('stok_batch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stok_batch_usages');
    }
};
