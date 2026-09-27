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
        $tables = ['hutangs', 'piutangs', 'pembayaran_hutangs', 'pembayaran_piutangs'];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('akun_pembayaran_id')
                    ->nullable()
                    ->after('keterangan')
                    ->constrained('akuns')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $tables = ['hutangs', 'piutangs', 'pembayaran_hutangs', 'pembayaran_piutangs'];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['akun_pembayaran_id']);
                $table->dropColumn('akun_pembayaran_id');
            });
        }
    }
};
