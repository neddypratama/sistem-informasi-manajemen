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
        Schema::table('transaksis', function (Blueprint $table) {
            $table->enum('tipe_transaksi', ['pembelian', 'penjualan', 'pembelian_retur', 'penjualan_retur'])
                ->change();

            $table->unsignedBigInteger('retur_dari_id')->nullable()->after('client_id');

            $table->foreign('retur_dari_id')
                ->references('id')
                ->on('transaksis')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transaksis', function (Blueprint $table) {
            $table->dropForeign(['retur_dari_id']);
            $table->dropColumn('retur_dari_id');

            $table->enum('tipe_transaksi', ['pembelian', 'penjualan'])->change();
        });
    }
};
