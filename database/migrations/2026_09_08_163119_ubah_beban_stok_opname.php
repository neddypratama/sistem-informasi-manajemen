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
            $table->dropConstrainedForeignId('akun_beban_id');
        });

        Schema::create('stok_opname_bebans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stok_opname_detail_id');
            $table->unsignedBigInteger('akun_beban_id');
            $table->decimal('jumlah', 15, 2);
            $table->decimal('nilai', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('stok_opname_detail_id')->references('id')->on('stok_opname_details')->cascadeOnDelete();
            $table->foreign('akun_beban_id')->references('id')->on('akuns')->restrictOnDelete();
            $table->index('akun_beban_id');
        });

        Schema::table('pengembalian_stoks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('stok_opname_detail_id');
            $table->after('akun_beban_id', function (Blueprint $table): void {
                $table->unsignedBigInteger('stok_opname_beban_id')->nullable();
            });
            $table->foreign('stok_opname_beban_id')->references('id')->on('stok_opname_bebans')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pengembalian_stoks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('stok_opname_beban_id');
            $table->unsignedBigInteger('stok_opname_detail_id')->nullable();
            $table->foreign('stok_opname_detail_id')->references('id')->on('stok_opname_details')->cascadeOnDelete();
        });

        Schema::dropIfExists('stok_opname_bebans');

        Schema::table('stok_opname_details', function (Blueprint $table) {
            $table->unsignedBigInteger('akun_beban_id')->nullable();
            $table->foreign('akun_beban_id')->references('id')->on('akuns')->nullOnDelete();
        });
    }
};
