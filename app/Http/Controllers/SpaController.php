<?php

namespace App\Http\Controllers;

use Illuminate\View\View;

class SpaController extends Controller
{
    /**
     * Mengembalikan shell SPA Vue yang memuat seluruh aplikasi.
     */
    public function index(): View
    {
        return view('app');
    }
}
