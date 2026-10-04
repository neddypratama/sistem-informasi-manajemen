<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('jurnals', 'entitas_type')) {
            Schema::table('jurnals', function (Blueprint $table) {
                $table->enum('entitas_type', ['hutang', 'piutang'])->nullable()->after('journalable_id');
                $table->index('entitas_type');
            });
        }

        // Migrate hutangs data to jurnals entitas_type
        if (Schema::hasTable('hutangs')) {
            $hutangs = DB::table('hutangs')->get();
            foreach ($hutangs as $h) {
                if ($h->jurnal_id) {
                    DB::table('jurnals')->where('id', $h->jurnal_id)->update([
                        'entitas_type' => 'hutang',
                    ]);
                }
            }
        }

        // Migrate piutangs data to jurnals entitas_type
        if (Schema::hasTable('piutangs')) {
            $piutangs = DB::table('piutangs')->get();
            foreach ($piutangs as $p) {
                if ($p->jurnal_id) {
                    DB::table('jurnals')->where('id', $p->jurnal_id)->update([
                        'entitas_type' => 'piutang',
                    ]);
                }
            }
        }

        // Migrate pembayaran_hutangs to link to main invoice jurnal
        if (Schema::hasTable('pembayaran_hutangs')) {
            $pembayarans = DB::table('pembayaran_hutangs')->get();
            foreach ($pembayarans as $p) {
                if ($p->jurnal_id && $p->hutang_id) {
                    $hutang = DB::table('hutangs')->where('id', $p->hutang_id)->first();
                    if ($hutang && $hutang->jurnal_id) {
                        DB::table('jurnals')->where('id', $p->jurnal_id)->update([
                            'journalable_type' => 'App\Models\Jurnal',
                            'journalable_id' => $hutang->jurnal_id,
                        ]);
                    }
                }
            }
        }

        // Migrate pembayaran_piutangs to link to main invoice jurnal
        if (Schema::hasTable('pembayaran_piutangs')) {
            $pembayarans = DB::table('pembayaran_piutangs')->get();
            foreach ($pembayarans as $p) {
                if ($p->jurnal_id && $p->piutang_id) {
                    $piutang = DB::table('piutangs')->where('id', $p->piutang_id)->first();
                    if ($piutang && $piutang->jurnal_id) {
                        DB::table('jurnals')->where('id', $p->jurnal_id)->update([
                            'journalable_type' => 'App\Models\Jurnal',
                            'journalable_id' => $piutang->jurnal_id,
                        ]);
                    }
                }
            }
        }

        // Drop foreign keys and tables
        Schema::dropIfExists('pembayaran_hutangs');
        Schema::dropIfExists('pembayaran_piutangs');
        Schema::dropIfExists('hutangs');
        Schema::dropIfExists('piutangs');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('jurnals', 'entitas_type')) {
            Schema::table('jurnals', function (Blueprint $table) {
                $table->dropIndex(['entitas_type']);
                $table->dropColumn('entitas_type');
            });
        }
    }
};
