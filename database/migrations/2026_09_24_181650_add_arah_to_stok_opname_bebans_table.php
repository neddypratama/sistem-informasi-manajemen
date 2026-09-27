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
        Schema::table('stok_opname_bebans', function (Blueprint $table) {
            $table->string('arah', 10)->default('kurang')->after('akun_beban_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stok_opname_bebans', function (Blueprint $table) {
            $table->dropColumn('arah');
        });
    }
};
