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
        Schema::create('migrasi_errors', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('migrasi_run_id');
            $table->string('tahap', 30)->index();
            $table->string('entitas', 40)->nullable();
            $table->string('id_lama', 100)->nullable();
            $table->enum('kategori', ['gagal', 'dilewati', 'konflik', 'peringatan'])->index();
            $table->string('kode');
            $table->text('pesan');
            $table->json('konteks')->nullable();
            $table->timestamps();

            $table->foreign('migrasi_run_id')->references('id')->on('migrasi_runs')->cascadeOnDelete();
            $table->index(['migrasi_run_id', 'kategori']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('migrasi_errors');
    }
};
