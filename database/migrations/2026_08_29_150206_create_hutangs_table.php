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
        Schema::create('hutangs', function (Blueprint $table) {
            $table->id();
            $table->string('no_hutang')->unique();
            $table->date('tanggal');
            $table->unsignedBigInteger('client_id');
            $table->decimal('total', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->enum('status', ['belum_lunas', 'lunas'])->default('belum_lunas');
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('jurnal_id')->nullable();
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->restrictOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('jurnal_id')->references('id')->on('jurnals')->nullOnDelete();
            $table->index('client_id');
            $table->index('status');
            $table->index('tanggal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hutangs');
    }
};
