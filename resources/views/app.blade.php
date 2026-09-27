<!DOCTYPE html>
<html lang="id" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name', 'SIM Stok') }}</title>
    @vite(['resources/css/app.css', 'resources/js/spa.js'])
</head>
<body class="h-full bg-slate-100 text-slate-900 antialiased">
    <div id="app"></div>
</body>
</html>
