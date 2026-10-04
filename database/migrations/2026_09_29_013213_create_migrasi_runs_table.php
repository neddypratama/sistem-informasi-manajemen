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
        Schema::create('migrasi_runs', function (Blueprint $table) {
            $table->id();
            $table->string('nama_file')->nullable();
            $table->string('path_file');
            $table->unsignedBigInteger('ukuran_byte');
            $table->string('sha256', 64);
            $table->enum('status', [
                'menunggu',
                'menganalisis',
                'selesai_analisis',
                'memvalidasi',
                'selesai_validasi',
                'dry_run',
                'siap_impor',
                'mengimpor',
                'selesai',
                'gagal',
            ])->default('menunggu')->index();
            $table->json('ringkasan')->nullable();
            $table->json('pilihan')->nullable();
            $table->boolean('dry_run')->default(false);
            $table->unsignedTinyInteger('progres')->default(0);
            $table->text('pesan_error')->nullable();
            $table->timestamp('mulai_analisis')->nullable();
            $table->timestamp('selesai_analisis')->nullable();
            $table->timestamp('mulai_impor')->nullable();
            $table->timestamp('selesai_impor')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('migrasi_runs');
    }
};
