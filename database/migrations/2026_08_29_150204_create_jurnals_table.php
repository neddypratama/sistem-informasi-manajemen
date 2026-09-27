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
        Schema::create('jurnals', function (Blueprint $table) {
            $table->id();
            $table->string('nomor_jurnal')->unique();
            $table->date('tanggal');
            $table->unsignedBigInteger('kategori_id')->nullable();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->text('keterangan')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->nullableMorphs('journalable');
            $table->timestamps();

            $table->foreign('kategori_id')->references('id')->on('kategoris')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->index('tanggal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jurnals');
    }
};
