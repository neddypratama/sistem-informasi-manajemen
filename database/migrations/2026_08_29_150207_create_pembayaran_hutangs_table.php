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
        Schema::create('pembayaran_hutangs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hutang_id');
            $table->date('tanggal');
            $table->decimal('jumlah', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('jurnal_id')->nullable();
            $table->timestamps();

            $table->foreign('hutang_id')->references('id')->on('hutangs')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('jurnal_id')->references('id')->on('jurnals')->nullOnDelete();
            $table->index('hutang_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pembayaran_hutangs');
    }
};
