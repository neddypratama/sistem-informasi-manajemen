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
        Schema::table('detail_transaksis', function (Blueprint $table) {
            $table->unsignedBigInteger('detail_sumber_id')->nullable()->after('transaksi_id');

            $table->foreign('detail_sumber_id')
                ->references('id')
                ->on('detail_transaksis')
                ->nullOnDelete();

            $table->index('detail_sumber_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('detail_transaksis', function (Blueprint $table) {
            $table->dropForeign(['detail_sumber_id']);
            $table->dropColumn('detail_sumber_id');
        });
    }
};
