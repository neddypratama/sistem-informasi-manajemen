<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE clients MODIFY COLUMN tipe ENUM('Peternak', 'Supplier', 'Pedagang', 'Karyawan', 'Truk') NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE clients MODIFY COLUMN tipe ENUM('Peternak', 'Supplier', 'Pedagang', 'Karyawan') NOT NULL");
        }
    }
};
