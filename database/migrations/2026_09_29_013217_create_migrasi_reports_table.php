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
        Schema::create('migrasi_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('migrasi_run_id');
            $table->string('jenis', 40)->index();
            $table->string('judul');
            $table->json('payload');
            $table->timestamps();

            $table->foreign('migrasi_run_id')->references('id')->on('migrasi_runs')->cascadeOnDelete();
            $table->unique(['migrasi_run_id', 'jenis']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('migrasi_reports');
    }
};
