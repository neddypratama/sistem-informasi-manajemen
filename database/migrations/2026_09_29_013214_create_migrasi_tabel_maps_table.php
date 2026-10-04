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
        Schema::create('migrasi_tabel_maps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('migrasi_run_id');
            $table->string('tabel_sumber');
            $table->string('tabel_tujuan');
            $table->json('pemetaan_kolom');
            $table->unsignedBigInteger('jumlah_sumber')->default(0);
            $table->unsignedBigInteger('jumlah_diimpor')->default(0);
            $table->unsignedBigInteger('jumlah_dilewati')->default(0);
            $table->unsignedBigInteger('jumlah_gagal')->default(0);
            $table->unsignedBigInteger('jumlah_konflik')->default(0);
            $table->boolean('dipilih')->default(false);
            $table->timestamps();

            $table->foreign('migrasi_run_id')->references('id')->on('migrasi_runs')->cascadeOnDelete();
            $table->unique(['migrasi_run_id', 'tabel_sumber']);
            $table->index('tabel_tujuan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('migrasi_tabel_maps');
    }
};
