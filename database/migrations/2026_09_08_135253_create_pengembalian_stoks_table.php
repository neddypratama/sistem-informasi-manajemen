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
        Schema::table('stok_opname_details', function (Blueprint $table) {
            $table->after('nilai_selisih', function (Blueprint $table): void {
                $table->unsignedBigInteger('akun_beban_id')->nullable();
            });

            $table->foreign('akun_beban_id')->references('id')->on('akuns')->nullOnDelete();
        });

        Schema::create('pengembalian_stoks', function (Blueprint $table) {
            $table->id();
            $table->date('tanggal');
            $table->unsignedBigInteger('stok_opname_detail_id');
            $table->unsignedBigInteger('akun_beban_id');
            $table->decimal('jumlah', 15, 2);
            $table->decimal('harga_satuan', 15, 2);
            $table->decimal('nilai', 15, 2);
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('jurnal_id')->nullable();
            $table->timestamps();

            $table->foreign('stok_opname_detail_id')->references('id')->on('stok_opname_details')->cascadeOnDelete();
            $table->foreign('akun_beban_id')->references('id')->on('akuns')->restrictOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('jurnal_id')->references('id')->on('jurnals')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pengembalian_stoks');

        Schema::table('stok_opname_details', function (Blueprint $table) {
            $table->dropConstrainedForeignId('akun_beban_id');
        });
    }
};
