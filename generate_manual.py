#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator Buku Panduan Penggunaan Sistem (User Manual & SOP)
BIMA PRATAMA ERP 2.0
Menghasilkan 2 Format:
1. Microsoft Word (.docx)
2. PDF (.pdf) via Microsoft Edge Headless
"""

import os
import sys
import subprocess

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_callout(doc, text, title="TIPS PENTING", callout_type="tip"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    
    bg_color = "ECFDF5" if callout_type == "tip" else ("FFFBEB" if callout_type == "warning" else "F1F5F9")
    border_color = "059669" if callout_type == "tip" else ("D97706" if callout_type == "warning" else "475569")
    
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:left w:val="single" w:sz="36" w:space="0" w:color="{border_color}"/>'
        f'  <w:top w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run_title = p.add_run(f"📌 {title}: ")
    run_title.bold = True
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10)
    if callout_type == "tip":
        run_title.font.color.rgb = RGBColor(5, 150, 105)
    elif callout_type == "warning":
        run_title.font.color.rgb = RGBColor(217, 119, 6)
    else:
        run_title.font.color.rgb = RGBColor(71, 85, 105)
        
    run_text = p.add_run(text)
    run_text.font.name = "Calibri"
    run_text.font.size = Pt(9.5)
    run_text.font.color.rgb = RGBColor(30, 41, 59)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_table(tbl, col_widths, headers, data):
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header row
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "059669")
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=150, right=150)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.font.bold = True
            run.font.name = "Calibri"
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(255, 255, 255)
            
    # Data rows
    for r_idx, row_data in enumerate(data):
        row = tbl.add_row()
        bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.text = str(val)
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=90, bottom=90, left=130, right=130)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            for run in p.runs:
                run.font.name = "Calibri"
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(30, 41, 59)
                
    # Apply col widths
    for row in tbl.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = Inches(width)

def build_docx_manual(output_path):
    doc = Document()
    
    # Page setup
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        
    # Set default font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(10.5)
    font.color.rgb = RGBColor(30, 41, 59)
    
    # -------------------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------------------
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(40)
    
    p_badge = doc.add_paragraph()
    p_badge.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_badge = p_badge.add_run("BIMA PRATAMA ENTERPRISE RESOURCE PLANNING")
    r_badge.font.name = "Calibri"
    r_badge.font.size = Pt(11)
    r_badge.font.bold = True
    r_badge.font.color.rgb = RGBColor(5, 150, 105)
    
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(10)
    p_title.paragraph_format.space_after = Pt(10)
    r_title = p_title.add_run("PANDUAN LENGKAP PENGGUNAAN SISTEM\n(USER MANUAL & SOP OPERASIONAL)")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(15, 23, 42)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(30)
    r_sub = p_sub.add_run("Sistem Informasi Manajemen Terpadu & Akuntansi Double-Entry Komoditas Peternakan\nVersi 2.0 (Tahun 2026)")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(12)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(71, 85, 105)
    
    # Divider line
    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_line = p_line.add_run("━" * 45)
    r_line.font.color.rgb = RGBColor(5, 150, 105)
    
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_before = Pt(30)
    p_meta.paragraph_format.space_after = Pt(50)
    r_meta = p_meta.add_run(
        "Disusun untuk:\n"
        "Manajemen, Staff Operasional Kasir, Pengelola Gudang, dan Divisi Keuangan\n"
        "CV / UD BIMA PRATAMA\n\n"
        "Alamat Akses Sistem: https://sim.bimapratama.com\n"
        "Backend API: https://api.bimapratama.com/api/v1"
    )
    r_meta.font.name = "Calibri"
    r_meta.font.size = Pt(10)
    r_meta.font.color.rgb = RGBColor(51, 65, 85)
    
    doc.add_page_break()
    
    # -------------------------------------------------------------------------
    # DAFTAR ISI
    # -------------------------------------------------------------------------
    h_toc = doc.add_heading(level=1)
    r_toc = h_toc.add_run("DAFTAR ISI PANDUAN PENGGUNAAN")
    r_toc.font.color.rgb = RGBColor(5, 150, 105)
    
    toc_items = [
        ("BAB 1: PENDAHULUAN & ARSITEKTUR SISTEM", "3"),
        ("BAB 2: MANAJEMEN AKSES & KEAMANAN PENGGUNA", "4"),
        ("BAB 3: MEMAHAMI DASHBOARD UTAMA & ANALITIK", "6"),
        ("BAB 4: PENGELOLAAN MASTER DATA BISNIS", "8"),
        ("BAB 5: OPERASIONAL PEMBELIAN KOMODITAS (INFLOW)", "11"),
        ("BAB 6: OPERASIONAL PENJUALAN KOMODITAS (OUTFLOW)", "14"),
        ("BAB 7: MANAJEMEN GUDANG, SORTIR & STOK OPNAME", "17"),
        ("BAB 8: PENGELOLAAN KAS, BANK, BEBAN & PIUTANG/HUTANG", "20"),
        ("BAB 9: LAPORAN KEUANGAN & AKUNTANSI DOUBLE-ENTRY", "23"),
        ("BAB 10: SINKRONISASI, BACKUP DATA & TROUBLESHOOTING", "27"),
    ]
    
    toc_table = doc.add_table(rows=1, cols=2)
    format_table(toc_table, [5.5, 1.0], ["Bab / Bagian Panduan", "Halaman"], toc_items)
    
    doc.add_page_break()
    
    # -------------------------------------------------------------------------
    # BAB 1
    # -------------------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r1 = h1.add_run("BAB 1: PENDAHULUAN & ARSITEKTUR SISTEM")
    r1.font.color.rgb = RGBColor(5, 150, 105)
    
    p = doc.add_paragraph()
    p.add_run("Bima Pratama ERP 2.0 ").bold = True
    p.add_run(
        "adalah sistem informasi manajemen terintegrasi generasi terbaru yang dirancang khusus untuk memenuhi "
        "kebutuhan operasional industri perdagangan komoditas peternakan (Telur Ayam, Telur Bebek, Telur Puyuh, Telur Arab, "
        "Pakan Sentrat Pabrikan & Curah, Obat-obatan, dan EggTray). Sistem ini dibangun dengan fondasi teknologi modern "
        "(React 19, NestJS 11, dan MySQL 8 Enterprise) dengan keunggulan utama berupa otomatisasi akuntansi double-entry "
        "dan perhitungan harga pokok penjualan (HPP) berbasis First-In-First-Out (FIFO) yang presisi 1:1."
    )
    
    doc.add_heading(level=2).add_run("1.1. Keunggulan Utama ERP 2.0")
    keunggulan = [
        ("Otomatisasi Akuntansi Double-Entry Real-Time: ", "Setiap kali transaksi fisik disimpan (penjualan, pembelian, retur, beban, kas), sistem otomatis membukukan pasangan jurnal Debit dan Kredit yang pasti seimbang (balanced), tanpa perlu penjurnalan manual."),
        ("Algoritma Stok Batch FIFO: ", "Setiap pembelian membentuk batch persediaan dengan harga modal aslinya. Saat penjualan terjadi, sistem otomatis memotong stok dari batch tertua sehingga margin laba kotor selalu akurat mencerminkan fluktuasi harga komoditas."),
        ("Isolasi Opname & Klasifikasi Telur: ", "Mendukung pencatatan sortir fisik telur secara presisi: telur utuh, telur bentes (retak), telur ceplok (pecah), telur kotor, telur jumbo, dan telur prok/afkir."),
        ("Manajemen Mitra 360 Derajat: ", "Pelacakan kartu piutang toko/agen dan kartu hutang peternak yang langsung ter-update otomatis pada setiap faktur dan pelunasan."),
        ("Akses Cloud Multi-Perangkat: ", "Dapat diakses 24/7 melalui browser dari komputer kasir toko, laptop kantor, tablet gudang, maupun smartphone pemilik dari mana saja.")
    ]
    for bold_text, normal_text in keunggulan:
        p = doc.add_paragraph(style='List Bullet')
        r_b = p.add_run(bold_text)
        r_b.bold = True
        r_b.font.color.rgb = RGBColor(15, 23, 42)
        p.add_run(normal_text)
        
    doc.add_heading(level=2).add_run("1.2. Alamat Akses & Kebutuhan Teknis")
    p = doc.add_paragraph()
    p.add_run("Aplikasi dapat dibuka melalui peramban (browser) modern apa pun seperti Google Chrome, Microsoft Edge, Mozilla Firefox, atau Apple Safari pada alamat resmi:")
    
    add_callout(doc, "Alamat Web Aplikasi: https://sim.bimapratama.com\nBackend REST API: https://api.bimapratama.com/api/v1\nPastikan koneksi internet aktif dan menggunakan peramban versi terbaru untuk performa visual terbaik.", "ALAMAT RESMI SISTEM", "tip")
    
    # -------------------------------------------------------------------------
    # BAB 2
    # -------------------------------------------------------------------------
    h2 = doc.add_heading(level=1)
    r2 = h2.add_run("BAB 2: MANAJEMEN AKSES & KEAMANAN PENGGUNA")
    r2.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_heading(level=2).add_run("2.1. Prosedur Login Sistem")
    doc.add_paragraph("Untuk mulai menggunakan aplikasi, ikuti langkah-langkah berikut:")
    login_steps = [
        "Buka peramban (browser) dan ketik alamat: https://sim.bimapratama.com",
        "Sistem akan menampilkan halaman Login resmi Bima Pratama ERP 2.0.",
        "Masukkan Username atau Alamat Email Anda pada kolom yang tersedia.",
        "Masukkan Password akun Anda.",
        "Klik tombol 'Masuk ke Sistem' berwarna hijau.",
        "Jika kredensial valid, Anda akan langsung diarahkan ke Dashboard Utama."
    ]
    for idx, step in enumerate(login_steps, 1):
        p = doc.add_paragraph()
        r_num = p.add_run(f"{idx}. ")
        r_num.bold = True
        p.add_run(step)
        
    add_callout(doc, "Akun Administrator Standar:\nUsername: admin (atau admin@bimapratama.com)\nPassword Default: password\nSegera ubah kata sandi default setelah Anda pertama kali berhasil login demi menjaga keamanan data perusahaan.", "KREDENSIAL DEFAULT", "warning")
    
    doc.add_heading(level=2).add_run("2.2. Pembagian Peran & Hak Akses (Role Permission)")
    doc.add_paragraph("Sistem Bima Pratama ERP 2.0 menerapkan prinsip keamanan Role-Based Access Control (RBAC):")
    
    role_data = [
        ["Administrator", "Akses 100% penuh: Konfigurasi sistem, manajemen user, ekspor/impor database, audit log, persetujuan pembatalan transaksi, dan seluruh modul akuntansi."],
        ["Staff Keuangan / Akuntan", "Akses modul Akuntansi: Jurnal Umum, Buku Besar, Neraca Saldo, Laporan Laba Rugi, Kartu Piutang/Hutang, serta pencatatan Mutasi Kas & Biaya."],
        ["Staff Operasional / Kasir", "Akses modul Transaksi Harian: Input Penjualan, Pembelian Peternak, Cetak Nota/Invoice, Surat Jalan, dan pengecekan stok komoditas."],
        ["Staff Gudang / Logistik", "Akses modul Persediaan: Monitoring stok batch FIFO, pencatatan penerimaan fisik barang dari kandang, dan input formulir Stok Opname sortir telur."]
    ]
    role_tbl = doc.add_table(rows=1, cols=2)
    format_table(role_tbl, [2.0, 4.5], ["Peran (Role)", "Cakupan Hak Akses & Tanggung Jawab"], role_data)
    
    # -------------------------------------------------------------------------
    # BAB 3
    # -------------------------------------------------------------------------
    h3 = doc.add_heading(level=1)
    r3 = h3.add_run("BAB 3: MEMAHAMI DASHBOARD UTAMA & ANALITIK")
    r3.font.color.rgb = RGBColor(5, 150, 105)
    
    p = doc.add_paragraph()
    p.add_run("Halaman Dashboard adalah pusat komando visual yang menampilkan performa bisnis perusahaan secara waktu nyata (real-time). Informasi yang disajikan mencakup:")
    
    dash_items = [
        ("Kartu Omzet Penjualan: ", "Menampilkan total nilai nominal penjualan komoditas yang terealisasi hari ini dan akumulasi bulan berjalan."),
        ("Kartu Pembelian Peternak: ", "Menampilkan total pengeluaran untuk pembelian telur segar dan pakan ke mitra kandang."),
        ("Kartu Piutang Aktif Toko/Agen: ", "Menampilkan total saldo bon tagihan yang masih berada di pasar, dilengkapi informasi pelanggan yang mendekati tanggal jatuh tempo."),
        ("Kartu Hutang Usaha: ", "Menampilkan total kewajiban perusahaan kepada peternak dan supplier pakan/obat."),
        ("Estimasi Laba Kotor Berjalan: ", "Dihitung secara otomatis dari: Total Penjualan dikurangi Total HPP Batch FIFO."),
        ("Grafik Tren Penjualan Komoditas: ", "Visualisasi kurva penjualan per komoditas (Telur vs Pakan vs Obat vs Tray) untuk melihat tren permintaan pasar."),
        ("Widget Peringatan Stok Kritis: ", "Menampilkan daftar barang yang jumlah fisiknya berada di bawah batas minimum (stok minimum) agar bagian logistik segera melakukan pemesanan ulang.")
    ]
    for bold_text, normal_text in dash_items:
        p = doc.add_paragraph(style='List Bullet')
        r_b = p.add_run(bold_text)
        r_b.bold = True
        p.add_run(normal_text)
        
    # -------------------------------------------------------------------------
    # BAB 4
    # -------------------------------------------------------------------------
    h4 = doc.add_heading(level=1)
    r4 = h4.add_run("BAB 4: PENGELOLAAN MASTER DATA BISNIS")
    r4.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph("Master Data adalah acuan utama yang digunakan oleh seluruh transaksi. Sebelum mencatat transaksi operasional, pastikan Master Data berikut sudah terkonfigurasi dengan benar:")
    
    doc.add_heading(level=2).add_run("4.1. Master Barang & Komoditas")
    doc.add_paragraph("Menu: Navigasi Kiri > Master Data > Master Barang. Kolom formulir input terdiri atas:")
    
    barang_cols = [
        ["Kode Barang", "Otomatis di-generate sistem (misal: BRG-0001) atau kode manual barcode."],
        ["Nama Komoditas", "Nama spesifik barang (contoh: Telur Ayam Horn Grade A, Pakan Sentrat 511, Obat Vita-Stress, EggTray Karton 30 Butir)."],
        ["Jenis Barang", "Pilihan kategori fisik: Telur, Pakan, Obat-Obatan, EggTray, atau Perlengkapan."],
        ["Satuan Dasar", "Satuan ukur perdagangan: Kg (untuk telur/curah), Sak (pakan), Butir, Ikat, Pcs (tray), atau Botol."],
        ["Stok Minimum", "Ambang batas peringatan stok menipis (misal: minimal 500 Kg untuk telur horn)."],
        ["Harga Jual Standar", "Harga patokan per satuan untuk mempermudah kasir saat input penjualan."]
    ]
    barang_tbl = doc.add_table(rows=1, cols=2)
    format_table(barang_tbl, [2.0, 4.5], ["Kolom Input", "Penjelasan & Aturan Pengisian"], barang_cols)
    
    doc.add_heading(level=2).add_run("4.2. Master Mitra Bisnis (Client & Vendor)")
    doc.add_paragraph("Menu: Navigasi Kiri > Master Data > Master Mitra. Digunakan untuk mendata seluruh pihak eksternal yang bermitra dengan Bima Pratama:")
    
    client_types = [
        ["PETERNAK / KANDANG", "Pemasok telur utama. Transaksi pembelian dari mitra tipe ini akan meningkatkan saldo hutang (jika kredit)."],
        ["TOKO / AGEN / PEDAGANG", "Pelanggan pembeli partai/eceran. Transaksi penjualan kredit akan menambah saldo piutang mitra ini."],
        ["SUPPLIER PABRIKAN", "Pabrik pakan besar (misal: Pokphand, Japfa, Malindo) atau distributor obat dan eggtray."],
        ["KARYAWAN / TRUK", "Armada ekspedisi internal maupun sopir borongan pengambil telur dari kandang."]
    ]
    client_tbl = doc.add_table(rows=1, cols=2)
    format_table(client_tbl, [2.2, 4.3], ["Tipe Mitra", "Deskripsi Peran & Dampak Pembukuan"], client_types)
    
    # -------------------------------------------------------------------------
    # BAB 5
    # -------------------------------------------------------------------------
    h5 = doc.add_heading(level=1)
    r5 = h5.add_run("BAB 5: OPERASIONAL PEMBELIAN KOMODITAS (INFLOW)")
    r5.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph("Modul Pembelian digunakan untuk mencatat setiap kedatangan telur dari kandang peternak atau pembelian pakan/obat dari supplier.")
    
    doc.add_heading(level=2).add_run("5.1. Alur Transaksi Pembelian")
    beli_steps = [
        "Masuk ke Menu: Transaksi > Transaksi Pembelian > klik tombol '+ Tambah Pembelian'.",
        "Pilih Tanggal Transaksi: Sesuaikan dengan tanggal fisik telur diterima di gudang.",
        "Pilih Mitra / Peternak: Cari nama mitra peternak dari daftar searchable dropdown.",
        "Pilih Komoditas: Pilih item barang (misal: Telur Horn Super).",
        "Isi Kuantitas (Qty): Masukkan berat timbangan bersih (Kg).",
        "Isi Harga Satuan (Rp/Kg): Masukkan harga beli yang disepakati dengan peternak.",
        "Pilih Metode Pembayaran:\n  • TUNAI: Kas langsung keluar dari Kas Kecil Kasir.\n  • TRANSFER: Dibayar via Rekening Bank perusahaan.\n  • KREDIT / BON: Menjadi Hutang Dagang yang dicatat pada kartu hutang peternak.",
        "Klik tombol 'Simpan Pembelian'."
    ]
    for step in beli_steps:
        doc.add_paragraph(step, style='List Bullet')
        
    add_callout(doc, "Otomatisasi Sistem saat Pembelian Disimpan:\n1. Stok Batch FIFO baru otomatis tercipta dengan harga beli asli tersebut.\n2. Jurnal Umum otomatis terposting: [DEBIT] Persediaan Barang vs [KREDIT] Kas/Bank/Hutang Peternak.\n3. Saldo hutang peternak bertambah otomatis jika memilih metode Kredit.", "DAMPAK OTOMATISASI PEMBELIAN", "tip")
    
    # -------------------------------------------------------------------------
    # BAB 6
    # -------------------------------------------------------------------------
    h6 = doc.add_heading(level=1)
    r6 = h6.add_run("BAB 6: OPERASIONAL PENJUALAN KOMODITAS (OUTFLOW)")
    r6.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph("Modul Penjualan mencatat seluruh pelepasan komoditas ke toko, agen, pelanggan pasar, maupun peternak pembeli pakan.")
    
    doc.add_heading(level=2).add_run("6.1. Alur Transaksi Penjualan")
    jual_steps = [
        "Masuk ke Menu: Transaksi > Transaksi Penjualan > klik tombol '+ Tambah Penjualan'.",
        "Pilih Mitra / Toko: Tentukan pelanggan pembeli.",
        "Pilih Barang & Masukkan Kuantitas: Input berat timbangan atau jumlah sak yang dibeli.",
        "Tentukan Harga Jual & Diskon (jika ada): Sistem otomatis memunculkan harga patokan standar.",
        "Pilih Cara Pembayaran: Tunai, Transfer Bank, atau Bon Titipan / Kredit.",
        "Klik 'Simpan Penjualan'.",
        "Klik tombol 'Cetak Nota / Invoice' untuk mencetak bukti faktur penjualan rangkap."
    ]
    for step in jual_steps:
        doc.add_paragraph(step, style='List Bullet')
        
    doc.add_heading(level=2).add_run("6.2. Logika Pemotongan FIFO Otomatis & Penentuan HPP")
    doc.add_paragraph(
        "Sistem ERP 2.0 menggunakan algoritma FIFO (First-In, First-Out) murni. Ketika Anda menjual 1.000 Kg telur, "
        "sistem secara otomatis mencari batch stok pembelian tertua yang masih tersedia. Jika batch pertama hanya tersisa "
        "600 Kg seharga Rp 24.000/Kg dan batch kedua seharga Rp 24.500/Kg, sistem akan membagi HPP secara proporsional. "
        "Dengan metode ini, Laba Kotor yang tampil pada laporan keuangan 100% akurat dan tidak terdistorsi fluktuasi harga."
    )
    
    # -------------------------------------------------------------------------
    # BAB 7
    # -------------------------------------------------------------------------
    h7 = doc.add_heading(level=1)
    r7 = h7.add_run("BAB 7: MANAJEMEN GUDANG, SORTIR & STOK OPNAME")
    r7.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph("Di industri telur, telur segar yang datang dari kandang seringkali mengalami benturan, kotoran, atau ukuran tidak seragam. Modul Gudang ERP 2.0 mengakomodasi hal ini secara komprehensif.")
    
    doc.add_heading(level=2).add_run("7.1. Klasifikasi Sortir Telur")
    sortir_data = [
        ["Telur Utuh / Normal", "Telur kualitas standar siap jual dengan harga pasar normal."],
        ["Telur Bentes", "Telur dengan cangkang retak halus rambut tetapi selaput dalam tidak bocor (dijual harga diskon)."],
        ["Telur Kotor", "Telur dengan noda kotoran ayam pekat yang perlu dibersihkan/dijual terpisah."],
        ["Telur Ceplok", "Telur yang cangkangnya pecah basah dan harus segera diolah/dijual eceran hari itu juga."],
        ["Telur Jumbo / Super", "Telur berukuran di atas rata-rata yang memiliki segmen pasar khusus."],
        ["Telur Prok / Afkir", "Telur busuk/mati/rusak total yang harus dimusnahkan dan diakui sebagai kerugian penyusutan."]
    ]
    sortir_tbl = doc.add_table(rows=1, cols=2)
    format_table(sortir_tbl, [2.2, 4.3], ["Kategori Sortir", "Penjelasan & Penanganan Sistem"], sortir_data)
    
    doc.add_heading(level=2).add_run("7.2. Formulir Stok Opname Fisik")
    doc.add_paragraph(
        "Stok opname dilakukan secara rutin (harian atau mingguan) untuk mencocokkan stok fisik di gudang dengan catatan sistem. "
        "Buka menu Inventory > Stok Opname > Tambah Opname. Masukkan hasil hitung fisik. Jika terdapat selisih, sistem otomatis "
        "menghitung nilai rupiah selisih dan memposting jurnal penyesuaian persediaan ke beban penyusutan gudang."
    )
    
    # -------------------------------------------------------------------------
    # BAB 8
    # -------------------------------------------------------------------------
    h8 = doc.add_heading(level=1)
    r8 = h8.add_run("BAB 8: PENGELOLAAN KAS, BANK, BEBAN & PIUTANG/HUTANG")
    r8.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_heading(level=2).add_run("8.1. Pelunasan Piutang Toko / Agen")
    doc.add_paragraph("Saat pelanggan membayar bon kredit:")
    p_piutang = [
        "Masuk ke Menu: Transaksi > Penerimaan Kas / Piutang.",
        "Pilih nama Mitra/Pelanggan. Sistem otomatis memunculkan total saldo piutang tertunggak.",
        "Masukkan Jumlah Pembayaran yang diterima.",
        "Pilih Kas Penampung (Kas Kasir Toko atau Rekening Bank).",
        "Simpan transaksi. Saldo piutang mitra langsung berkurang seketika."
    ]
    for step in p_piutang:
        doc.add_paragraph(step, style='List Bullet')
        
    doc.add_heading(level=2).add_run("8.2. Pembayaran Hutang Peternak / Pemasok")
    doc.add_paragraph("Saat perusahaan mentransfer dana pelunasan telur ke peternak:")
    p_hutang = [
        "Masuk ke Menu: Transaksi > Pengeluaran Kas / Hutang.",
        "Pilih nama Peternak / Supplier.",
        "Masukkan nominal yang dibayarkan dan pilih rekening bank sumber dana.",
        "Simpan transaksi. Saldo hutang peternak langsung terpotong secara otomatis."
    ]
    for step in p_hutang:
        doc.add_paragraph(step, style='List Bullet')
        
    doc.add_heading(level=2).add_run("8.3. Pencatatan Biaya & Beban Operasional")
    doc.add_paragraph("Menu Transaksi > Kas & Beban digunakan untuk mencatat seluruh pengeluaran non-komoditas:")
    beban_items = [
        "Biaya Solar, E-Toll, dan Perawatan Armada Truk Ekspedisi.",
        "Gaji Karyawan Gudang, Kasir, dan Upah Sopir.",
        "Biaya Pembelian Karton Paking, Tali Rafia, dan Perlengkapan.",
        "Biaya Listrik Kantor/Gudang, Air, dan Internet."
    ]
    for item in beban_items:
        doc.add_paragraph(item, style='List Bullet')
        
    # -------------------------------------------------------------------------
    # BAB 9
    # -------------------------------------------------------------------------
    h9 = doc.add_heading(level=1)
    r9 = h9.add_run("BAB 9: LAPORAN KEUANGAN & AKUNTANSI DOUBLE-ENTRY")
    r9.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph(
        "Modul Laporan menyediakan laporan akuntansi komprehensif yang di-generate secara real-time "
        "berdasarkan standar PSAK / IFRS akuntansi double-entry seimbang:"
    )
    
    lap_data = [
        ["Jurnal Umum (General Journal)", "Menampilkan seluruh entri jurnal transaksi berpasangan (Debit dan Kredit). Setiap bundle invoice dipastikan 100% seimbang."],
        ["Buku Besar (Ledger)", "Mutasi pergerakan saldo per akun buku besar (Kas, Bank, Piutang, HPP, Persediaan, Ekuitas)."],
        ["Neraca Saldo (Trial Balance)", "Memverifikasi keseimbangan total saldo Debit dan Kredit seluruh akun pada periode berjalan."],
        ["Laporan Laba Rugi Komersial", "Menghitung Pendapatan Bersih - HPP Penjualan = Laba Kotor; dikurangi Beban Operasional = Laba Bersih Usaha."],
        ["Laba Rugi per Komoditas", "Analisis profitabilitas terpisah antara komoditas Telur, Pakan Pabrikan, Obat, dan Tray."],
        ["Neraca Keuangan (Balance Sheet)", "Posisi aset perusahaan (Kas + Bank + Piutang + Nilai Stok Gudang) vs Kewajiban (Hutang Dagang) + Modal Pemilik."],
        ["Laporan Arus Kas (Cash Flow)", "Arus kas masuk dan keluar dari aktivitas operasi, investasi, dan pendanaan."]
    ]
    lap_tbl = doc.add_table(rows=1, cols=2)
    format_table(lap_tbl, [2.2, 4.3], ["Nama Laporan", "Fungsi & Informasi yang Disajikan"], lap_data)
    
    add_callout(doc, "Seluruh laporan keuangan dapat diekspor langsung ke format Microsoft Excel (.xlsx) atau dicetak ke PDF dengan mengklik tombol 'Export' di sudut kanan atas setiap halaman laporan.", "EKSPOR LAPORAN", "tip")
    
    # -------------------------------------------------------------------------
    # BAB 10
    # -------------------------------------------------------------------------
    h10 = doc.add_heading(level=1)
    r10 = h10.add_run("BAB 10: SINKRONISASI, BACKUP DATA & TROUBLESHOOTING")
    r10.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_heading(level=2).add_run("10.1. Fitur Sinkronisasi & Migrasi SQL Sistem Lama")
    doc.add_paragraph(
        "Jika Anda memiliki backup database SQL dari sistem Bima Pratama lama, Anda dapat mengunggahnya secara langsung "
        "melalui antarmuka web di menu: Sinkronisasi & Migrasi > Upload File Backup Database (.SQL). Sistem akan otomatis "
        "menjalankan streaming engine lossless ETL untuk mentransformasikan data lama menjadi struktur ERP 2.0 lengkap dengan jurnal double-entry."
    )
    
    doc.add_heading(level=2).add_run("10.2. Pertanyaan Umum & Solusi Kendala (FAQ)")
    faqs = [
        ("T: Bagaimana jika kasir salah menginput kuantitas atau harga pada penjualan?", "J: Masuk ke daftar Transaksi Penjualan, cari nomor invoice terkait, lalu klik tombol 'Edit' (ikon pensil). Sistem akan otomatis menyesuaikan kembali stok batch FIFO dan jurnal akuntansinya."),
        ("T: Mengapa saldo piutang toko tidak berkurang setelah toko mentransfer uang?", "J: Pastikan Anda telah mencatat transaksi tersebut di menu 'Penerimaan Kas / Piutang' dengan memilih nama toko yang bersangkutan, bukan hanya mencatatnya di kas masuk umum."),
        ("T: Bagaimana jika terjadi mati lampu saat input transaksi?", "J: Data transaksi yang belum diklik tombol 'Simpan' tidak akan tersimpan ke database. Cukup buka kembali menu transaksi setelah komputer menyala dan lakukan penginputan ulang."),
        ("T: Bagaimana cara melakukan backup database secara mandiri?", "J: Masuk ke cPanel hosting Anda > buka menu phpMyAdmin > pilih database bimaprat_v2 > klik tab Export > pilih format Quick SQL > klik Export. Simpan file hasil download di tempat yang aman.")
    ]
    for q, a in faqs:
        p = doc.add_paragraph()
        r_q = p.add_run(f"{q}\n")
        r_q.bold = True
        r_q.font.color.rgb = RGBColor(5, 150, 105)
        p.add_run(a)
        p.paragraph_format.space_after = Pt(8)
        
    doc.save(output_path)
    print(f"✅ File Word (.docx) berhasil disimpan: {output_path}")

def build_html_for_pdf(html_path):
    html_content = """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Buku Panduan Penggunaan Sistem - Bima Pratama ERP 2.0</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @top-right {
      content: "Bima Pratama ERP 2.0 - User Manual";
      font-size: 8pt;
      color: #64748b;
    }
    @bottom-center {
      content: counter(page);
      font-size: 9pt;
      color: #64748b;
    }
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 10pt;
  }
  .cover {
    page-break-after: always;
    text-align: center;
    padding-top: 80px;
    padding-bottom: 60px;
  }
  .cover-badge {
    display: inline-block;
    background-color: #ecfdf5;
    color: #059669;
    padding: 6px 16px;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 10pt;
    letter-spacing: 1px;
    border: 1px solid #a7f3d0;
  }
  .cover-title {
    font-size: 26pt;
    font-weight: 800;
    color: #0f172a;
    margin: 20px 0 10px 0;
    line-height: 1.2;
  }
  .cover-subtitle {
    font-size: 13pt;
    color: #475569;
    margin-bottom: 40px;
  }
  .divider {
    height: 3px;
    background: linear-gradient(to right, #059669, #10b981, #059669);
    width: 200px;
    margin: 0 auto 40px auto;
    border-radius: 2px;
  }
  .cover-meta {
    margin-top: 50px;
    font-size: 10pt;
    color: #334155;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    display: inline-block;
    text-align: left;
    max-width: 500px;
  }
  h1 {
    color: #059669;
    font-size: 16pt;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 28px;
    margin-bottom: 12px;
    page-break-after: avoid;
  }
  h2 {
    color: #0f172a;
    font-size: 12pt;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }
  p {
    margin-top: 0;
    margin-bottom: 10px;
    text-align: justify;
  }
  ul, ol {
    margin-top: 0;
    margin-bottom: 12px;
    padding-left: 20px;
  }
  li {
    margin-bottom: 5px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9pt;
  }
  th {
    background-color: #059669;
    color: white;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #047857;
  }
  td {
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
  }
  tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .callout {
    background-color: #ecfdf5;
    border-left: 4px solid #059669;
    padding: 10px 14px;
    border-radius: 0 8px 8px 0;
    margin: 14px 0;
    font-size: 9.5pt;
  }
  .callout-warning {
    background-color: #fffbeb;
    border-left-color: #d97706;
  }
  .callout-title {
    font-weight: 700;
    color: #059669;
    margin-bottom: 3px;
  }
  .callout-warning .callout-title {
    color: #d97706;
  }
  .page-break {
    page-break-after: always;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-badge">BIMA PRATAMA ENTERPRISE RESOURCE PLANNING</div>
  <div class="cover-title">PANDUAN LENGKAP PENGGUNAAN SISTEM<br>(USER MANUAL & SOP OPERASIONAL)</div>
  <div class="cover-subtitle">Sistem Informasi Manajemen Terpadu & Akuntansi Double-Entry Komoditas Peternakan<br>Versi 2.0 (Tahun 2026)</div>
  <div class="divider"></div>
  <div class="cover-meta">
    <strong>Disusun untuk:</strong><br>
    Manajemen, Staff Operasional Kasir, Pengelola Gudang, dan Divisi Akuntansi<br>
    <strong>Perusahaan:</strong> CV / UD Bima Pratama<br><br>
    <strong>Akses Sistem:</strong> https://sim.bimapratama.com<br>
    <strong>Backend API:</strong> https://api.bimapratama.com/api/v1
  </div>
</div>

<!-- BAB 1 -->
<h1>BAB 1: PENDAHULUAN & ARSITEKTUR SISTEM</h1>
<p><strong>Bima Pratama ERP 2.0</strong> adalah sistem informasi manajemen terintegrasi generasi terbaru yang dirancang khusus untuk memenuhi kebutuhan operasional industri perdagangan komoditas peternakan (Telur Ayam, Telur Bebek, Telur Puyuh, Telur Arab, Pakan Sentrat Pabrikan & Curah, Obat-obatan, dan EggTray). Sistem ini dibangun dengan fondasi teknologi modern (React 19, NestJS 11, dan MySQL 8 Enterprise) dengan keunggulan utama berupa otomatisasi akuntansi double-entry dan perhitungan harga pokok penjualan (HPP) berbasis First-In-First-Out (FIFO) yang presisi 1:1.</p>

<h2>1.1. Keunggulan Utama ERP 2.0</h2>
<ul>
  <li><strong>Otomatisasi Akuntansi Double-Entry:</strong> Setiap transaksi fisik (penjualan, pembelian, retur, kas, beban) otomatis membukukan jurnal Debit dan Kredit seimbang.</li>
  <li><strong>Algoritma Stok Batch FIFO:</strong> Pelacakan batch kedatangan barang memastikan HPP penjualan dan margin laba kotor selalu akurat.</li>
  <li><strong>Isolasi Opname Fisik:</strong> Fitur pemisahan telur bentes, kotor, ceplok, jumbo, dan afkir secara rapi.</li>
  <li><strong>Manajemen Mitra 360°:</strong> Riwayat piutang agen dan hutang peternak ter-update seketika.</li>
  <li><strong>Akses Multi-Device:</strong> Kompatibel diakses dari PC kasir, laptop kantor, maupun smartphone.</li>
</ul>

<div class="callout">
  <div class="callout-title">📌 ALAMAT RESMI AKSES SISTEM</div>
  Aplikasi Web: <strong>https://sim.bimapratama.com</strong><br>
  Backend API: <strong>https://api.bimapratama.com/api/v1</strong>
</div>

<div class="page-break"></div>

<!-- BAB 2 -->
<h1>BAB 2: MANAJEMEN AKSES & KEAMANAN PENGGUNA</h1>
<h2>2.1. Prosedur Login Sistem</h2>
<ol>
  <li>Buka browser dan akses: <strong>https://sim.bimapratama.com</strong></li>
  <li>Masukkan Username / Email dan Password Anda.</li>
  <li>Klik tombol <strong>Masuk ke Sistem</strong>.</li>
</ol>

<div class="callout callout-warning">
  <div class="callout-title">⚠️ KREDENSIAL DEFAULT ADMINISTRATOR</div>
  Username: <strong>admin</strong> (atau admin@bimapratama.com)<br>
  Password Default: <strong>password</strong><br>
  <em>Segera ubah password default Anda pada menu Pengaturan Akun demi keamanan data.</em>
</div>

<h2>2.2. Pembagian Peran & Hak Akses (Role Permission)</h2>
<table>
  <thead>
    <tr><th style="width:28%">Peran (Role)</th><th>Cakupan Hak Akses & Wewenang</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Administrator</strong></td><td>Akses penuh 100%: Konfigurasi sistem, manajemen pengguna, modul akuntansi, master data, dan audit trail.</td></tr>
    <tr><td><strong>Staff Keuangan</strong></td><td>Akses modul Akuntansi: Jurnal Umum, Buku Besar, Neraca Saldo, Laporan Laba Rugi, Piutang/Hutang, dan Kas.</td></tr>
    <tr><td><strong>Staff Kasir / Operasional</strong></td><td>Akses transaksi harian: Input Penjualan, Pembelian dari Peternak, Cetak Nota/Invoice, dan Surat Jalan.</td></tr>
    <tr><td><strong>Staff Gudang</strong></td><td>Akses persediaan: Pengecekan stok batch FIFO dan input formulir sortir Stok Opname fisik.</td></tr>
  </tbody>
</table>

<!-- BAB 3 -->
<h1>BAB 3: MEMAHAMI DASHBOARD UTAMA & ANALITIK</h1>
<p>Dashboard utama memberikan gambaran performa perusahaan dalam hitungan detik:</p>
<ul>
  <li><strong>Kartu Omzet Penjualan:</strong> Nilai nominal omzet hari ini dan akumulasi bulan berjalan.</li>
  <li><strong>Kartu Pembelian Peternak:</strong> Total pengeluaran bahan komoditas telur dan pakan.</li>
  <li><strong>Kartu Piutang Aktif:</strong> Saldo tagihan toko/agen yang beredar di pasar.</li>
  <li><strong>Kartu Hutang Dagang:</strong> Kewajiban yang harus dibayarkan ke peternak dan supplier.</li>
  <li><strong>Estimasi Laba Kotor Berjalan:</strong> Dihitung langsung dari Penjualan dikurangi HPP FIFO.</li>
  <li><strong>Peringatan Stok Menipis:</strong> Daftar barang yang kuantitasnya di bawah stok minimum.</li>
</ul>

<div class="page-break"></div>

<!-- BAB 4 -->
<h1>BAB 4: PENGELOLAAN MASTER DATA BISNIS</h1>
<h2>4.1. Master Barang & Komoditas</h2>
<p>Menu: <strong>Master Data &gt; Master Barang</strong>. Formulir input meliputi:</p>
<table>
  <thead>
    <tr><th style="width:28%">Kolom Input</th><th>Keterangan Pengisian</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Kode Barang</strong></td><td>Kode unik otomatis sistem (misal: BRG-0001) atau kode barcode.</td></tr>
    <tr><td><strong>Nama Komoditas</strong></td><td>Nama spesifik (misal: Telur Horn Super, Pakan Sentrat 511, Tray Karton).</td></tr>
    <tr><td><strong>Jenis Barang</strong></td><td>Kategori fisik: Telur, Pakan, Obat-obatan, atau EggTray.</td></tr>
    <tr><td><strong>Satuan Dasar</strong></td><td>Satuan ukur: Kg (telur), Sak (pakan), Pcs (tray), Butir, Botol.</td></tr>
    <tr><td><strong>Stok Minimum</strong></td><td>Batas kuantitas untuk memicu peringatan restock di dashboard.</td></tr>
  </tbody>
</table>

<h2>4.2. Master Mitra Bisnis (Client & Vendor)</h2>
<p>Menu: <strong>Master Data &gt; Master Mitra</strong>. Klasifikasi mitra mencakup:</p>
<ul>
  <li><strong>PETERNAK:</strong> Pemasok telur dari kandang (transaksi pembelian menambah saldo hutang).</li>
  <li><strong>TOKO / AGEN:</strong> Pelanggan pembeli partai/eceran (penjualan bon menambah saldo piutang).</li>
  <li><strong>SUPPLIER PABRIKAN:</strong> Pemasok pakan pabrik, obat-obatan, dan eggtray.</li>
  <li><strong>KARYAWAN / TRUK:</strong> Sopir armada distribusi dan penjemput telur kandang.</li>
</ul>

<!-- BAB 5 -->
<h1>BAB 5: OPERASIONAL PEMBELIAN KOMODITAS (INFLOW)</h1>
<p>Setiap penerimaan telur atau pakan dicatat melalui menu <strong>Transaksi &gt; Pembelian</strong>:</p>
<ol>
  <li>Klik tombol <strong>+ Tambah Pembelian</strong>.</li>
  <li>Pilih tanggal transaksi dan pilih nama Peternak / Pemasok.</li>
  <li>Pilih jenis komoditas (misal: Telur Horn).</li>
  <li>Masukkan Kuantitas timbangan bersih (Kg) dan Harga Beli Satuan (Rp/Kg).</li>
  <li>Pilih Cara Bayar: <strong>TUNAI</strong>, <strong>TRANSFER</strong>, atau <strong>KREDIT / BON</strong>.</li>
  <li>Klik <strong>Simpan Pembelian</strong>.</li>
</ol>
<div class="callout">
  <div class="callout-title">💡 ENGINE FIFO OTOMATIS</div>
  Saat pembelian disimpan, sistem otomatis membuat ID Batch Stok baru dengan harga modal tersebut. Jurnal akuntansi berpasangan otomatis tercatat seimbang di Buku Besar.
</div>

<div class="page-break"></div>

<!-- BAB 6 -->
<h1>BAB 6: OPERASIONAL PENJUALAN KOMODITAS (OUTFLOW)</h1>
<p>Setiap penjualan telur dan sarana peternakan dicatat pada menu <strong>Transaksi &gt; Penjualan</strong>:</p>
<ol>
  <li>Klik tombol <strong>+ Tambah Penjualan</strong>.</li>
  <li>Pilih Toko / Agen / Pelanggan.</li>
  <li>Pilih komoditas yang dijual, masukkan kuantitas (Kg) dan harga jual satuan.</li>
  <li>Tentukan metode pembayaran: Tunai, Transfer Bank, atau Bon Titipan / Kredit.</li>
  <li>Klik <strong>Simpan Penjualan</strong> dan cetak faktur invoice.</li>
</ol>
<p><strong>Perhitungan Laba Kotor Real-Time:</strong> Sistem secara otomatis memotong stok dari batch pembelian tertua (FIFO). HPP dihitung langsung berdasarkan modal batch tersebut, sehingga margin laba bersih yang ditampilkan akurat tanpa distorsi.</p>

<!-- BAB 7 -->
<h1>BAB 7: MANAJEMEN GUDANG, SORTIR & STOK OPNAME</h1>
<h2>7.1. Klasifikasi Sortir Telur Fisik</h2>
<table>
  <thead>
    <tr><th style="width:28%">Kategori Sortir</th><th>Karakteristik & Penanganan</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Telur Utuh Normal</strong></td><td>Kualitas standar siap dipasarkan dengan harga penuh.</td></tr>
    <tr><td><strong>Telur Bentes</strong></td><td>Retak halus rambut, selaput tidak bocor; dijual diskon eceran.</td></tr>
    <tr><td><strong>Telur Kotor</strong></td><td>Tercemar kotoran kandang; dicuci atau dipisahkan.</td></tr>
    <tr><td><strong>Telur Ceplok</strong></td><td>Pecah basah; segera diolah atau dijual langsung ke pedagang kuliner.</td></tr>
    <tr><td><strong>Telur Jumbo</strong></td><td>Ukuran di atas rata-rata dengan harga jual premium.</td></tr>
    <tr><td><strong>Telur Prok / Afkir</strong></td><td>Busuk/mati; dimusnahkan dan dibukukan sebagai kerugian susut gudang.</td></tr>
  </tbody>
</table>

<!-- BAB 8 -->
<h1>BAB 8: PENGELOLAAN KAS, BANK, BEBAN & PIUTANG/HUTANG</h1>
<ul>
  <li><strong>Pelunasan Piutang Toko:</strong> Menu <em>Transaksi &gt; Penerimaan Kas</em>. Pilih pelanggan &gt; input nominal pembayaran &gt; saldo piutang otomatis berkurang.</li>
  <li><strong>Pembayaran Hutang Peternak:</strong> Menu <em>Transaksi &gt; Pengeluaran Kas</em>. Pilih peternak &gt; masukkan nominal transfer &gt; saldo hutang otomatis berkurang.</li>
  <li><strong>Beban Operasional:</strong> Pencatatan biaya solar truk, servis armada, gaji karyawan, konsumsi, listrik, dan kardus paking.</li>
</ul>

<div class="page-break"></div>

<!-- BAB 9 -->
<h1>BAB 9: LAPORAN KEUANGAN & AKUNTANSI DOUBLE-ENTRY</h1>
<p>Seluruh laporan di-generate otomatis dan dapat diekspor ke Microsoft Excel atau PDF:</p>
<table>
  <thead>
    <tr><th style="width:30%">Laporan</th><th>Fungsi Analisis</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Jurnal Umum</strong></td><td>Audit trail seluruh transaksi berpasangan Debit dan Kredit yang 100% balance.</td></tr>
    <tr><td><strong>Buku Besar (Ledger)</strong></td><td>Rincian pergerakan saldo kas, bank, persediaan, piutang, dan hutang.</td></tr>
    <tr><td><strong>Neraca Saldo</strong></td><td>Verifikasi keseimbangan saldo akun sebelum penutupan buku.</td></tr>
    <tr><td><strong>Laporan Laba Rugi</strong></td><td>Perhitungan Penjualan - HPP FIFO - Beban Operasional = Laba Bersih Usaha.</td></tr>
    <tr><td><strong>Laba Rugi per Komoditas</strong></td><td>Menganalisis margin keuntungan spesifik Telur vs Pakan vs Obat vs Tray.</td></tr>
    <tr><td><strong>Neraca Keuangan</strong></td><td>Posisi kesehatan Aset Lancar vs Total Hutang Usaha dan Ekuitas Pemilik.</td></tr>
  </tbody>
</table>

<!-- BAB 10 -->
<h1>BAB 10: SINKRONISASI, BACKUP DATA & TROUBLESHOOTING</h1>
<h2>10.1. Fitur Upload SQL Backup</h2>
<p>Melalui menu <strong>Sinkronisasi & Migrasi</strong>, Anda dapat mengunggah file <code>.sql</code> backup sistem lama secara langsung dari browser. Sistem akan mengeksekusi streaming engine in-memory tanpa memerlukan akses root server MySQL.</p>

<h2>10.2. Pertanyaan Umum (FAQ)</h2>
<p><strong>T: Bagaimana jika salah menginput kuantitas penjualan?</strong><br>
J: Buka menu Penjualan, cari invoice terkait, lalu klik Edit. Sistem akan mengembalikan dan memotong ulang stok FIFO serta merevisi jurnal otomatis.</p>
<p><strong>T: Bagaimana cara backup database rutin?</strong><br>
J: Masuk ke phpMyAdmin di cPanel &gt; klik database <code>bimaprat_v2</code> &gt; klik tab Export &gt; klik Export. Simpan file <code>.sql</code> di komputer Anda sebagai arsip aman.</p>

</body>
</html>
"""
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"✅ File HTML berhasil disimpan: {html_path}")

def convert_html_to_pdf(html_path, pdf_path):
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_path):
        print("❌ Microsoft Edge tidak ditemukan di path default.")
        return False
        
    abs_html = os.path.abspath(html_path)
    abs_pdf = os.path.abspath(pdf_path)
    
    cmd = [
        edge_path,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={abs_pdf}",
        abs_html
    ]
    
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
        print(f"✅ File PDF berhasil dibuat: {pdf_path} ({round(os.path.getsize(pdf_path)/1024, 1)} KB)")
        return True
    else:
        print("❌ Gagal membuat PDF via Edge headless.")
        return False

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    docx_file = os.path.join(base_dir, "BIMA_PRATAMA_ERP_PANDUAN_PENGGUNAAN.docx")
    html_file = os.path.join(base_dir, "BIMA_PRATAMA_ERP_PANDUAN_PENGGUNAAN.html")
    pdf_file = os.path.join(base_dir, "BIMA_PRATAMA_ERP_PANDUAN_PENGGUNAAN.pdf")
    
    print("🚀 Memulai pembuatan Dokumen Panduan...")
    build_docx_manual(docx_file)
    build_html_for_pdf(html_file)
    convert_html_to_pdf(html_file, pdf_file)
    print("🎉 SEMUA DOKUMEN PANDUAN BERHASIL DIBUAT DENGAN SEMPURNA!")
