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
        Schema::create('pembayaran_piutangs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('piutang_id');
            $table->date('tanggal');
            $table->decimal('jumlah', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('jurnal_id')->nullable();
            $table->timestamps();

            $table->foreign('piutang_id')->references('id')->on('piutangs')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('jurnal_id')->references('id')->on('jurnals')->nullOnDelete();
            $table->index('piutang_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pembayaran_piutangs');
    }
};
