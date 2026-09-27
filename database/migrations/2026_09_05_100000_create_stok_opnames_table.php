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
        Schema::create('stok_opnames', function (Blueprint $table) {
            $table->id();
            $table->string('no_opname')->unique();
            $table->date('tanggal');
            $table->text('keterangan')->nullable();
            $table->enum('status', ['draft', 'selesai'])->default('draft');
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('jurnal_id')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('jurnal_id')->references('id')->on('jurnals')->nullOnDelete();
            $table->index('tanggal');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stok_opnames');
    }
};
