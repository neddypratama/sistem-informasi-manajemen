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
        Schema::create('stok_opname_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stok_opname_id');
            $table->unsignedBigInteger('barang_id');
            $table->decimal('stok_sistem', 15, 2)->default(0);
            $table->decimal('stok_fisik', 15, 2)->default(0);
            $table->decimal('selisih', 15, 2)->default(0);
            $table->decimal('harga_satuan', 15, 2)->default(0);
            $table->decimal('nilai_selisih', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('stok_opname_id')->references('id')->on('stok_opnames')->cascadeOnDelete();
            $table->foreign('barang_id')->references('id')->on('barangs')->restrictOnDelete();
            $table->index('barang_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stok_opname_details');
    }
};
