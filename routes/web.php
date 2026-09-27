<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

Route::get('/login', [SpaController::class, 'index'])->name('login');
Route::get('/', [SpaController::class, 'index'])->name('dashboard');

// Deep link & refresh pada rute vue-router dilayani shell SPA yang sama.
// Prefix api/sanctum/up serta permintaan aset (mengandung titik) dikecualikan
// agar tetap mengembalikan JSON atau 404.
Route::get('/{path}', [SpaController::class, 'index'])
    ->where('path', '(?!api|sanctum|up|build|storage)[^.]*')
    ->name('spa');
