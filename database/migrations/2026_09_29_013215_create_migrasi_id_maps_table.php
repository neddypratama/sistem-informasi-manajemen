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
        Schema::create('migrasi_id_maps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('migrasi_run_id');
            $table->string('entitas', 40);
            $table->string('id_lama', 100);
            $table->unsignedBigInteger('id_baru');
            $table->string('kunci_bisnis')->nullable();
            $table->timestamps();

            $table->foreign('migrasi_run_id')->references('id')->on('migrasi_runs')->cascadeOnDelete();
            $table->unique(['migrasi_run_id', 'entitas', 'id_lama']);
            $table->index(['entitas', 'id_baru']);
            $table->index('kunci_bisnis');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('migrasi_id_maps');
    }
};
