#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator Buku Panduan Penggunaan Sistem (User Manual & SOP Operasional)
BIMA PRATAMA ERP 2.0 (Edisi Diperbarui 2026)
Menghasilkan 3 Format Resmi:
1. Microsoft Word (.docx)
2. Format Web (.html)
3. Adobe PDF (.pdf) via Microsoft Edge Headless
Dan otomatis menyinkronkan file ke direktori root dan /docs.
"""

import os
import sys
import shutil
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
from docx.enum.table import WD_TABLE_ALIGNMENT
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
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        
    # Default font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(10.5)
    font.color.rgb = RGBColor(30, 41, 59)
    
    # -------------------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------------------
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(35)
    
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
    r_title = p_title.add_run("BUKU PANDUAN PENGGUNAAN SISTEM\n(USER MANUAL & SOP OPERASIONAL)")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(15, 23, 42)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(25)
    r_sub = p_sub.add_run(
        "Sistem Informasi Manajemen Terpadu & Akuntansi Double-Entry Komoditas Peternakan\n"
        "Edisi Pembaruan 2.0 (November 2026)\n"
        "Dilengkapi Hak Akses Granular CRUD, Search Select Retur, dan Modul Terpadu Pakan Curah"
    )
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(71, 85, 105)
    
    # Divider line
    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_line = p_line.add_run("━" * 48)
    r_line.font.color.rgb = RGBColor(5, 150, 105)
    
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_before = Pt(25)
    p_meta.paragraph_format.space_after = Pt(45)
    r_meta = p_meta.add_run(
        "Disusun untuk:\n"
        "Dewan Manajemen, Staff Operasional Kasir, Pengelola Gudang, dan Divisi Keuangan\n"
        "CV / UD BIMA PRATAMA\n\n"
        "Portal Web Aplikasi: https://sim.bimapratama.com\n"
        "Backend REST Service: https://api.bimapratama.com/api/v1"
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
        ("BAB 1: PENDAHULUAN & ARSITEKTUR SISTEM ERP 2.0", "3"),
        ("BAB 2: MANAJEMEN PENGGUNA & HAK AKSES GRANULAR (CRUD)", "5"),
        ("BAB 3: MEMAHAMI DASHBOARD UTAMA & ANALITIK REALTIME", "8"),
        ("BAB 4: PENGELOLAAN MASTER DATA BISNIS (BARANG, MITRA, COA)", "10"),
        ("BAB 5: OPERASIONAL PEMBELIAN KOMODITAS & RETUR PEMBELIAN", "13"),
        ("BAB 6: OPERASIONAL PENJUALAN KOMODITAS & RETUR PENJUALAN", "16"),
        ("BAB 7: MODUL KHUSUS PAKAN CURAH & REKONSILIASI KEUANGAN PAK PRI", "19"),
        ("BAB 8: MANAJEMEN GUDANG, SORTIR TELUR & KONVERSI BARANG", "22"),
        ("BAB 9: PENGELOLAAN KAS, BANK, BON TITIPAN (PIUTANG) & HUTANG", "25"),
        ("BAB 10: LAPORAN KEUANGAN & AKUNTANSI DOUBLE-ENTRY", "28"),
        ("BAB 11: SINKRONISASI, BACKUP DATA & PANDUAN TROUBLESHOOTING (FAQ)", "31"),
    ]
    
    toc_table = doc.add_table(rows=1, cols=2)
    format_table(toc_table, [5.5, 1.0], ["Bab / Bagian Panduan", "Halaman"], toc_items)
    
    doc.add_page_break()
    
    # -------------------------------------------------------------------------
    # BAB 1
    # -------------------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r1 = h1.add_run("BAB 1: PENDAHULUAN & ARSITEKTUR SISTEM ERP 2.0")
    r1.font.color.rgb = RGBColor(5, 150, 105)
    
    p = doc.add_paragraph()
    p.add_run("Bima Pratama ERP 2.0 ").bold = True
    p.add_run(
        "adalah sistem informasi manajemen terintegrasi enterprise yang dirancang khusus untuk memenuhi seluruh "
        "kebutuhan operasional industri perdagangan komoditas peternakan (Telur Ayam, Telur Bebek, Telur Puyuh, Telur Arab, "
        "Pakan Pabrikan Sentrat, Pakan Curah, Obat-obatan, dan EggTray). Sistem ini dibangun dengan fondasi teknologi modern "
        "(React 19, NestJS 11, TypeScript, dan MySQL 8 Enterprise) dengan keunggulan utama berupa otomatisasi akuntansi double-entry "
        "dan perhitungan harga pokok penjualan (HPP) berbasis First-In-First-Out (FIFO) yang presisi 1:1."
    )
    
    doc.add_heading(level=2).add_run("1.1. Keunggulan Utama Pembaruan Sistem")
    keunggulan = [
        ("Otomatisasi Akuntansi Double-Entry Real-Time: ", "Setiap kali transaksi fisik disimpan (penjualan, pembelian, retur, beban, kas), sistem otomatis membukukan pasangan jurnal Debit dan Kredit yang pasti seimbang (balanced), tanpa perlu penjurnalan manual."),
        ("Algoritma Stok Batch FIFO: ", "Setiap pembelian membentuk batch persediaan dengan harga modal aslinya. Saat penjualan terjadi, sistem otomatis memotong stok dari batch tertua sehingga margin laba kotor selalu akurat mencerminkan fluktuasi harga komoditas."),
        ("Hak Akses Granular Per Sub-Fitur (CRUD): ", "Setiap fitur dan sub-fitur diatur hak aksesnya secara mandiri per aksi: Create (Tambah), Read (Lihat), Update (Edit), dan Delete (Hapus/Batal) untuk memastikan keamanan operasional."),
        ("Pemisahan Menu Komoditas Terfokus: ", "Menu navigasi dipilah secara spesifik: Menu Telur, Pakan Pabrikan (Sentrat), Pakan Curah (Pak Pri), Menu Obat, dan Menu Tray untuk mempercepat pekerjaan kasir dan staf gudang."),
        ("Fitur Retur Pintar Berbasis Search Select: ", "Pencarian faktur transaksi asal saat retur barang menggunakan komponen Search Select interaktif yang dapat mencari berdasarkan nomor nota, nama mitra/pelanggan, maupun nama produk dalam faktur."),
        ("Rekonsiliasi Terpadu Pakan Curah & Kas Pak Pri: ", "Menyediakan pemantauan saldo talangan, mutasi kas tunai laci toko, transfer bank, belanja bahan, dan konversi racik pakan curah."),
    ]
    for bold_text, normal_text in keunggulan:
        p = doc.add_paragraph(style='List Bullet')
        r_b = p.add_run(bold_text)
        r_b.bold = True
        r_b.font.color.rgb = RGBColor(15, 23, 42)
        p.add_run(normal_text)
        
    add_callout(doc, "Alamat Web Aplikasi: https://sim.bimapratama.com\nBackend REST API: https://api.bimapratama.com/api/v1\nSistem mendukung akses multi-device dari komputer kasir toko, laptop kantor, maupun tablet/smartphone.", "AKSES RESMI SISTEM", "tip")

    # -------------------------------------------------------------------------
    # BAB 2
    # -------------------------------------------------------------------------
    h2 = doc.add_heading(level=1)
    r2 = h2.add_run("BAB 2: MANAJEMEN PENGGUNA & HAK AKSES GRANULAR (CRUD)")
    r2.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_heading(level=2).add_run("2.1. Arsitektur Hak Akses Granular")
    doc.add_paragraph(
        "Pada versi 2.0, hak akses tidak lagi bersifat umum per modul, melainkan dipecah secara detail (granular) "
        "berdasarkan sub-fitur dan jenis tindakan (Create, Read, Update, Delete). Hal ini memberikan kebebasan penuh "
        "bagi manajemen untuk menentukan siapa yang boleh melihat data, menginput faktur baru, mengubah harga, atau membatalkan nota."
    )
    
    perm_table_data = [
        ["Komoditas Telur", "telur:pembelian:{create,read,update,delete}\ntelur:penjualan:{create,read,update,delete}\ntelur:retur-pembelian:{create,read,update,delete}\ntelur:retur-penjualan:{create,read,update,delete}\ntelur:monitoring:{create,read,update,delete}", "Pengendalian penuh transaksi telur segar, retur, dan monitoring harian."],
        ["Pakan Pabrikan", "pakan:pembelian:{c,r,u,d}, pakan:penjualan:{c,r,u,d}\npakan:retur-pembelian:{c,r,u,d}, pakan:retur-penjualan:{c,r,u,d}\npakan:monitoring:{c,r,u,d}", "Operasional pakan kemasan sak pabrik (Pokphand, Japfa, dll)."],
        ["Pakan Curah (Pak Pri)", "curah:transaksi:{c,r,u,d}, curah:kas:{c,r,u,d}\ncurah:konversi:{c,r,u,d}", "Akses operasional kasir Mbak Pakan, audit kas, dan racik bahan curah."],
        ["Obat & EggTray", "obat:* dan tray:* ({create,read,update,delete})", "Pengelolaan komoditas obat peternakan dan rak telur karton/plastik."],
        ["Stok & Gudang", "stok:read, stok:opname:{create,read,update,delete}\nstok:konversi:{create,read,update,delete}", "Monitoring stok fisik global, stok opname sortir, dan reproses barang."],
        ["Keuangan & Kas", "keuangan:kas-masuk:{c,r,u,d}, keuangan:kas-keluar:{c,r,u,d}\nkeuangan:piutang:{c,r,u,d}, keuangan:hutang:{c,r,u,d}", "Pengelolaan mutasi kasir laci toko, bank, penagihan bon, dan pembayaran peternak."],
        ["Akuntansi & Laporan", "laporan:jurnal:{r,u,d}, laporan:buku-besar:read\nlaporan:laba-rugi:read, laporan:neraca:read", "Hak inspeksi laporan akuntansi resmi, jurnal umum, dan audit keuangan."],
        ["Master Data & Admin", "master:barang:{c,r,u,d}, master:mitra:{c,r,u,d}\nmaster:akun:{c,r,u,d}, users:manage", "Konfigurasi data induk barang, klien/vendor, bagan akun COA, dan user."]
    ]
    perm_table = doc.add_table(rows=1, cols=3)
    format_table(perm_table, [1.5, 3.2, 2.0], ["Modul / Sub-Fitur", "Permission Key Granular", "Cakupan Fungsional"], perm_table_data)
    
    doc.add_heading(level=2).add_run("2.2. Mengatur Hak Akses Pengguna")
    doc.add_paragraph("Langkah-langkah menetapkan hak akses staf pada menu Pengaturan Pengguna:")
    user_steps = [
        "Masuk ke Menu Navigasi Kiri > Pengaturan & Keamanan > Manajemen Pengguna (/users).",
        "Klik tombol '+ Tambah Pengguna' untuk staf baru, atau klik ikon Edit (Pensil) pada pengguna yang sudah ada.",
        "Pilih Peran Utama (Role): Administrator, Staff Keuangan, Staff Kasir/Operasional, atau Staff Gudang.",
        "Pada bagian 'Matriks Hak Akses Granular', centang izin aksi spesifik (Create, Read, Update, Delete) sesuai tupoksi staf tersebut.",
        "Klik 'Simpan Pengguna'. Izin baru langsung aktif secara instan pada sesi login pengguna bersangkutan."
    ]
    for step in user_steps:
        doc.add_paragraph(step, style='List Bullet')
        
    add_callout(doc, "Prinsip Keamanan Least Privilege:\nBerikan hak 'Delete' dan 'Update' hanya kepada Supervisor atau Administrator. Kasir operasional idealnya hanya memiliki hak 'Create' dan 'Read' agar nota yang telah tercetak tidak dapat diubah sepihak tanpa otorisasi.", "KEBIJAKAN KEAMANAN AKSES", "warning")

    # -------------------------------------------------------------------------
    # BAB 3
    # -------------------------------------------------------------------------
    h3 = doc.add_heading(level=1)
    r3 = h3.add_run("BAB 3: MEMAHAMI DASHBOARD UTAMA & ANALITIK REALTIME")
    r3.font.color.rgb = RGBColor(5, 150, 105)
    
    p = doc.add_paragraph()
    p.add_run("Dashboard Utama adalah pusat komando visual pimpinan yang menyajikan indikator kinerja utama (KPI) bisnis secara langsung:")
    
    dash_items = [
        ("Kartu Omzet Penjualan: ", "Menampilkan total nilai nominal penjualan komoditas yang terealisasi hari ini dan akumulasi bulan berjalan."),
        ("Kartu Pembelian Peternak: ", "Menampilkan total pengeluaran untuk pembelian telur segar dan pakan ke mitra kandang."),
        ("Kartu Piutang Aktif Toko/Agen: ", "Menampilkan total saldo bon tagihan yang masih berada di pasar, dilengkapi informasi jatuh tempo."),
        ("Kartu Hutang Usaha: ", "Menampilkan total kewajiban perusahaan kepada peternak dan supplier pakan/obat."),
        ("Estimasi Laba Kotor Berjalan: ", "Dihitung secara otomatis dari: Total Penjualan dikurangi Total HPP Batch FIFO."),
        ("Grafik Tren Penjualan Komoditas: ", "Visualisasi kurva penjualan per komoditas (Telur vs Pakan Pabrikan vs Pakan Curah vs Obat vs Tray)."),
        ("Widget Peringatan Stok Kritis: ", "Menampilkan daftar barang yang kuantitas fisiknya berada di bawah batas minimum agar bagian logistik segera melakukan restock.")
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
    r4 = h4.add_run("BAB 4: PENGELOLAAN MASTER DATA BISNIS (BARANG, MITRA, COA)")
    r4.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph("Master Data adalah acuan utama yang digunakan oleh seluruh transaksi. Pastikan data berikut terkonfigurasi dengan benar:")
    
    doc.add_heading(level=2).add_run("4.1. Master Barang & Kategori Komoditas")
    doc.add_paragraph("Menu: Navigasi Kiri > Master Data > Master Barang. Kolom input terdiri atas:")
    barang_cols = [
        ["Kode Barang", "Otomatis di-generate sistem (misal: BRG-0001) atau kode barcode pabrik."],
        ["Nama Komoditas", "Nama spesifik (contoh: Telur Horn Super, Pakan Sentrat 511, Jagung Giling Curah, Tray Karton)."],
        ["Jenis Barang", "Pilihan kategori: Telur (8), Pakan Pabrikan (9), Pakan Curah (10), Obat (11), atau EggTray (12)."],
        ["Satuan Dasar", "Satuan ukur: Kg (telur & curah), Sak (pakan pabrik), Pcs (tray), Butir, atau Botol."],
        ["Stok Minimum", "Ambang batas peringatan stok menipis pada kartu stok dan dashboard."],
        ["Harga Jual Standar", "Patokan harga jual per unit untuk memudahkan kasir saat memilih produk."]
    ]
    barang_tbl = doc.add_table(rows=1, cols=2)
    format_table(barang_tbl, [2.0, 4.5], ["Kolom Input", "Penjelasan & Aturan Pengisian"], barang_cols)
    
    doc.add_heading(level=2).add_run("4.2. Master Mitra Bisnis (Client & Vendor)")
    doc.add_paragraph("Menu: Navigasi Kiri > Master Data > Master Mitra. Mengelompokkan mitra ke dalam kategori:")
    client_types = [
        ["PETERNAK / KANDANG", "Pemasok telur utama. Pembelian tempo dari mitra ini akan menambah saldo hutang usaha."],
        ["TOKO / AGEN / PEDAGANG", "Pelanggan pembeli partai/eceran. Penjualan tempo/bon akan menambah saldo piutang."],
        ["SUPPLIER PABRIKAN", "Pabrik pakan besar (Pokphand, Japfa, Malindo) atau distributor obat/tray."],
        ["KARYAWAN / TRUK", "Armada sopir penjemput telur dan pengantar barang ke pedagang pasar."]
    ]
    client_tbl = doc.add_table(rows=1, cols=2)
    format_table(client_tbl, [2.2, 4.3], ["Tipe Mitra", "Deskripsi Peran & Dampak Pembukuan"], client_types)

    # -------------------------------------------------------------------------
    # BAB 5
    # -------------------------------------------------------------------------
    h5 = doc.add_heading(level=1)
    r5 = h5.add_run("BAB 5: OPERASIONAL PEMBELIAN KOMODITAS & RETUR PEMBELIAN")
    r5.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_heading(level=2).add_run("5.1. Alur Transaksi Pembelian Komoditas")
    doc.add_paragraph("Digunakan saat menerima telur dari kandang atau menerima pasokan pakan/obat dari supplier:")
    beli_steps = [
        "Buka menu komoditas terkait (Menu Telur, Pakan Pabrikan, Obat, atau Tray).",
        "Pilih tab 'Pembelian' > klik tombol '+ Tambah Pembelian'.",
        "Pilih Tanggal Transaksi: Sesuaikan dengan tanggal fisik barang tiba di gudang.",
        "Pilih Mitra / Peternak: Cari dari searchable dropdown mitra.",
        "Pilih Akun Pembayaran: Kas Tunai Toko, Rekening Bank Transfer, atau Hutang Usaha (Tempo/Bon).",
        "Tambahkan Rincian Barang: Pilih komoditas, masukkan kuantitas (Kg/Sak), dan harga beli satuan.",
        "Klik tombol 'Simpan Pembelian'. Sistem otomatis membentuk Batch FIFO dan membukukan jurnal Debit Persediaan vs Kredit Kas/Bank/Hutang."
    ]
    for step in beli_steps:
        doc.add_paragraph(step, style='List Bullet')
        
    doc.add_heading(level=2).add_run("5.2. Prosedur Retur Pembelian ke Peternak/Supplier")
    doc.add_paragraph(
        "Jika terdapat barang yang cacat, rusak di jalan, atau tidak sesuai spesifikasi saat dibeli dari peternak/supplier, "
        "gunakan sub-fitur Retur Pembelian dengan alur Search Select cerdas:"
    )
    retur_beli_steps = [
        "Masuk ke tab 'Retur Pembelian' pada modul komoditas terkait > klik '+ Tambah Retur Pembelian'.",
        "Langkah 1 (Pilih Faktur Asal): Pada kolom 'Pilih Faktur Transaksi Asal yang Diretur', gunakan fitur Search Select. Ketik nomor faktur pembelian, nama peternak, atau nama produk.",
        "Dropdown cerdas akan menampilkan ringkasan faktur: nomor invoice, tanggal transaksi, metode bayar (Tunai/Transfer/Hutang), total nilai nota, dan daftar produk yang dibeli.",
        "Pilih faktur yang sesuai. Sistem otomatis mengunci identitas mitra dan akun pengembalian dari faktur asal.",
        "Langkah 2 (Tentukan Jumlah Barang Retur): Isi kuantitas barang yang dikembalikan (tidak boleh melebihi kuantitas beli asli).",
        "Klik 'Simpan Transaksi Retur'.",
    ]
    for step in retur_beli_steps:
        doc.add_paragraph(step, style='List Bullet')
        
    add_callout(doc, "Dampak Otomatisasi Retur Pembelian:\n1. Stok fisik komoditas berkurang sesuai kuantitas yang diretur.\n2. Alokasi batch FIFO disesuaikan secara proporsional.\n3. Jika pembelian awal Tempo/Kredit, saldo hutang ke peternak berkurang seketika.\n4. Jika pembelian Tunai/Transfer, dana kas/bank bertambah kembali.", "OTOMATISASI RETUR PEMBELIAN", "tip")

    # -------------------------------------------------------------------------
    # BAB 6
    # -------------------------------------------------------------------------
    h6 = doc.add_heading(level=1)
    r6 = h6.add_run("BAB 6: OPERASIONAL PENJUALAN KOMODITAS & RETUR PENJUALAN")
    r6.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_heading(level=2).add_run("6.1. Alur Transaksi Penjualan Komoditas")
    doc.add_paragraph("Mencatat pelepasan barang ke toko, agen, pelanggan pasar, maupun peternak:")
    jual_steps = [
        "Masuk ke menu komoditas terkait (Menu Telur, Pakan Pabrikan, Obat, atau Tray).",
        "Pilih tab 'Penjualan' > klik tombol '+ Tambah Penjualan'.",
        "Pilih Toko / Pelanggan dari dropdown pencarian.",
        "Pilih Metode Pembayaran: Tunai Laci, Transfer Bank, atau Piutang Bon Toko.",
        "Masukkan Barang, Kuantitas (Kg/Sak), dan Harga Jual Satuan.",
        "Klik 'Simpan Penjualan'. Sistem otomatis memotong stok dari batch FIFO tertua, menghitung HPP, dan mencetak faktur invoice."
    ]
    for step in jual_steps:
        doc.add_paragraph(step, style='List Bullet')
        
    doc.add_heading(level=2).add_run("6.2. Prosedur Retur Penjualan dari Pelanggan")
    doc.add_paragraph(
        "Jika pelanggan mengembalikan telur atau pakan karena cacat atau rusak, kasir mencatatnya melalui Retur Penjualan:"
    )
    retur_jual_steps = [
        "Pilih tab 'Retur Penjualan' > klik '+ Tambah Retur Penjualan'.",
        "Gunakan Search Select pada Langkah 1 untuk mencari nota penjualan asal berdasarkan nomor nota pelanggan atau nama toko.",
        "Pilih nota terkait. Identitas pelanggan dan metode transaksi awal otomatis terkunci demi integritas audit.",
        "Masukkan jumlah kuantitas barang yang dikembalikan pelanggan.",
        "Klik 'Simpan Transaksi Retur'.",
        "Dampak Sistem: Stok gudang bertambah kembali, HPP penjualan di-rollback, dan saldo bon piutang pelanggan langsung berkurang (atau kas toko dikembalikan jika pembelian tunai)."
    ]
    for step in retur_jual_steps:
        doc.add_paragraph(step, style='List Bullet')

    # -------------------------------------------------------------------------
    # BAB 7
    # -------------------------------------------------------------------------
    h7 = doc.add_heading(level=1)
    r7 = h7.add_run("BAB 7: MODUL KHUSUS PAKAN CURAH & REKONSILIASI KEUANGAN PAK PRI")
    r7.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph(
        "Untuk mengakomodasi karakteristik bisnis kemitraan pakan curah bersama Bapak Supriyadi (Pak Pri), "
        "sistem menyediakan modul mandiri di menu 'Pakan Curah (Pak Pri)' (/curah-pak-pri). Modul ini mengintegrasikan "
        "operasional harian kasir pakan curah sekaligus audit rekonsiliasi keuangan modal talangan Bima Pratama."
    )
    
    doc.add_heading(level=2).add_run("7.1. Empat Kartu KPI Real-Time")
    curah_kpi = [
        ("Saldo Rekening Bp. Supriyadi: ", "Menampilkan posisi keuangan modal. Status 'Ditalangi Bima Pratama' jika kas BP mendanai belanja bahan lebih besar daripada setoran jual, atau status 'Hak Pak Pri' jika terdapat surplus."),
        ("Kas Tunai Curah (Laci Toko): ", "Menghitung akumulasi uang tunai fisik yang terkumpul di laci kasir dari hasil penjualan pakan curah eceran."),
        ("Rekening Transfer Bank: ", "Menghitung total pembayaran pakan curah yang masuk melalui transfer perbankan."),
        ("Total Stok Gudang Curah: ", "Kuantitas fisik seluruh bahan pakan curah (Kg) yang tersedia di gudang penyimpanan.")
    ]
    for bold_text, normal_text in curah_kpi:
        p = doc.add_paragraph(style='List Bullet')
        r_b = p.add_run(bold_text)
        r_b.bold = True
        p.add_run(normal_text)
        
    doc.add_heading(level=2).add_run("7.2. Tiga Tab Operasional Pakan Curah")
    curah_tabs = [
        ["Tab 1: Operasional Mbak Pakan", "Formulir transaksi penjualan, pembelian, retur, dan monitoring khusus komoditas pakan curah (Jenis ID 9). Kasir fokus melayani pembeli peternak tanpa terganggu pakan pabrik."],
        ["Tab 2: Audit Kasir & Keuangan Pak Pri", "Laporan audit transaksi terintegrasi mitra Pak Pri (Client ID 241). Terbagi atas: Kas Masuk Tunai, Penerimaan Transfer Bank, dan Belanja Bahan Curah (ditalangi Kas BP). Dilengkapi pagination 25 baris dan tombol Export Excel."],
        ["Tab 3: Konversi & Racik Pakan Curah", "Modul peracikan bahan baku curah (misal: jagung giling, bekatul, katul campuran, konsentrat curah) menjadi pakan adukan siap pakai dengan kalkulasi rendemen/susut otomatis."]
    ]
    curah_tbl = doc.add_table(rows=1, cols=2)
    format_table(curah_tbl, [2.2, 4.3], ["Tab Navigasi", "Fungsi & Cakupan Fitur"], curah_tabs)

    # -------------------------------------------------------------------------
    # BAB 8
    # -------------------------------------------------------------------------
    h8 = doc.add_heading(level=1)
    r8 = h8.add_run("BAB 8: MANAJEMEN GUDANG, SORTIR TELUR & KONVERSI BARANG")
    r8.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_heading(level=2).add_run("8.1. Klasifikasi Sortir Telur Fisik")
    sortir_data = [
        ["Telur Utuh Normal", "Telur kualitas standar siap dipasarkan ke toko/agen dengan harga penuh."],
        ["Telur Bentes", "Telur retak halus rambut tetapi selaput dalam utuh; dijual harga diskon eceran."],
        ["Telur Kotor", "Telur terkena noda kandang tebal; dibersihkan atau dipisahkan grading-nya."],
        ["Telur Ceplok", "Telur pecah basah; segera diolah atau dijual langsung ke usaha kuliner hari itu juga."],
        ["Telur Jumbo", "Telur berukuran ekstra besar dengan segmentasi harga premium."],
        ["Telur Prok / Afkir", "Telur rusak total/busuk; dimusnahkan dan dibukukan sebagai beban penyusutan gudang."]
    ]
    sortir_tbl = doc.add_table(rows=1, cols=2)
    format_table(sortir_tbl, [2.2, 4.3], ["Kategori Sortir", "Karakteristik & Penanganan"], sortir_data)
    
    doc.add_heading(level=2).add_run("8.2. Stok Opname Fisik & Penyesuaian Selisih")
    doc.add_paragraph(
        "Stok Opname dilakukan berkala di menu Stok Opname (/stok-opname). Staf menginput hasil hitung fisik gudang. "
        "Jika terjadi selisih antara fisik dan catatan sistem, sistem otomatis memposting jurnal penyesuaian persediaan "
        "ke akun Beban Selisih/Penyusutan Persediaan."
    )
    
    doc.add_heading(level=2).add_run("8.3. Modul Konversi Barang & Reproses")
    doc.add_paragraph(
        "Menu 'Konversi & Reproses' di navigasi STOK (/konversi-barang) digunakan untuk transformasi barang: "
        "misalnya pemecahan kemasan sak ke eceran, reproses telur utuh ke hasil sortir, atau pengolahan pakan adukan. "
        "Sistem mencatat barang asal yang berkurang dan barang target yang bertambah secara akurat tanpa merusak nilai modal HPP."
    )

    # -------------------------------------------------------------------------
    # BAB 9
    # -------------------------------------------------------------------------
    h9 = doc.add_heading(level=1)
    r9 = h9.add_run("BAB 9: PENGELOLAAN KAS, BANK, BON TITIPAN (PIUTANG) & HUTANG")
    r9.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph("Manajemen perputaran uang tunai, bank, dan kartu piutang/hutang:")
    kas_items = [
        ("Pelunasan Piutang / Bon Titipan Toko: ", "Menu Keuangan > Piutang Dagang (/piutang). Pilih pelanggan, masukkan nominal setoran yang diterima (Tunai/Bank), dan saldo piutang toko berkurang seketika."),
        ("Pembayaran Hutang Peternak / Pemasok: ", "Menu Keuangan > Hutang Usaha (/hutang). Pilih peternak, tentukan nominal pembayaran dan rekening sumber dana transfer. Saldo hutang peternak langsung terpotong."),
        ("Pencatatan Kas Masuk & Kas Keluar Umum: ", "Menu Keuangan > Buku Kas (/kas). Mencatat seluruh pengeluaran di luar komoditas: solar armada truk, e-toll, upah sopir, servis kendaraan, kardus paking, dan listrik kantor.")
    ]
    for bold_text, normal_text in kas_items:
        p = doc.add_paragraph(style='List Bullet')
        r_b = p.add_run(bold_text)
        r_b.bold = True
        p.add_run(normal_text)

    # -------------------------------------------------------------------------
    # BAB 10
    # -------------------------------------------------------------------------
    h10 = doc.add_heading(level=1)
    r10 = h10.add_run("BAB 10: LAPORAN KEUANGAN & AKUNTANSI DOUBLE-ENTRY")
    r10.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_paragraph("Seluruh laporan keuangan di-generate otomatis secara real-time dan dapat diekspor ke Microsoft Excel atau PDF:")
    lap_data = [
        ["Jurnal Umum (General Journal)", "Audit trail seluruh transaksi berpasangan Debit dan Kredit yang 100% seimbang."],
        ["Buku Besar (Ledger)", "Mutasi pergerakan saldo per akun buku besar (Kas, Bank, Piutang, HPP, Persediaan, Ekuitas)."],
        ["Neraca Saldo (Trial Balance)", "Verifikasi keseimbangan saldo Debit dan Kredit sebelum penutupan buku."],
        ["Laporan Laba Rugi Komersial", "Pendapatan Penjualan dikurangi HPP FIFO = Laba Kotor; dikurangi Biaya Operasional = Laba Bersih."],
        ["Laba Rugi per Komoditas", "Analisis profitabilitas terpisah: Telur, Pakan Pabrikan, Pakan Curah, Obat, dan Tray."],
        ["Neraca Keuangan (Balance Sheet)", "Posisi Aset Lancar (Kas + Bank + Piutang + Nilai Stok) vs Hutang Dagang dan Ekuitas Pemilik."]
    ]
    lap_tbl = doc.add_table(rows=1, cols=2)
    format_table(lap_tbl, [2.2, 4.3], ["Nama Laporan", "Fungsi & Informasi yang Disajikan"], lap_data)

    # -------------------------------------------------------------------------
    # BAB 11
    # -------------------------------------------------------------------------
    h11 = doc.add_heading(level=1)
    r11 = h11.add_run("BAB 11: SINKRONISASI, BACKUP DATA & PANDUAN TROUBLESHOOTING (FAQ)")
    r11.font.color.rgb = RGBColor(5, 150, 105)
    
    doc.add_heading(level=2).add_run("11.1. Fitur Sinkronisasi SQL Sistem Lama")
    doc.add_paragraph(
        "Jika memiliki file backup database SQL dari sistem lama, Anda dapat mengunggahnya pada menu 'Sinkronisasi & Migrasi'. "
        "Sistem akan memproses streaming engine lossless ETL untuk mentransformasikan data lama menjadi struktur ERP 2.0."
    )
    
    doc.add_heading(level=2).add_run("11.2. Pertanyaan Umum & Solusi Kendala (FAQ)")
    faqs = [
        ("T: Bagaimana jika kasir salah menginput kuantitas atau harga pada penjualan?", "J: Buka menu Penjualan pada komoditas terkait, cari nomor invoice, lalu klik tombol Edit (ikon pensil). Sistem akan menyesuaikan kembali stok batch FIFO dan jurnal akuntansinya secara otomatis."),
        ("T: Bagaimana cara mencari faktur lama saat pelanggan melakukan retur?", "J: Pada modal Tambah Retur, klik input 'Pilih Faktur Transaksi Asal' (Search Select). Ketikkan nomor invoice, nama pelanggan, atau nama produk. Daftar transaksi selesai akan muncul secara instan."),
        ("T: Mengapa saldo hutang atau piutang tidak berubah setelah transaksi dicatat?", "J: Pastikan metode pembayaran yang dipilih adalah 'KREDIT / TEMPO' untuk hutang/piutang, bukan Tunai atau Transfer."),
        ("T: Bagaimana prosedur backup data mandiri?", "J: Buka cPanel hosting > phpMyAdmin > pilih database bimaprat_v2 > klik tab Export > pilih Quick SQL > klik Export. Simpan file cadangan secara berkala di media penyimpanan eksternal yang aman.")
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
    margin: 18mm 16mm 18mm 16mm;
    @top-right {
      content: "Bima Pratama ERP 2.0 - User Manual & SOP";
      font-size: 8pt;
      color: #64748b;
    }
    @bottom-center {
      content: counter(page);
      font-size: 8.5pt;
      color: #64748b;
    }
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 9.5pt;
  }
  .cover {
    page-break-after: always;
    text-align: center;
    padding-top: 60px;
    padding-bottom: 40px;
  }
  .cover-badge {
    display: inline-block;
    background-color: #ecfdf5;
    color: #059669;
    padding: 6px 18px;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 9.5pt;
    letter-spacing: 1px;
    border: 1px solid #a7f3d0;
  }
  .cover-title {
    font-size: 24pt;
    font-weight: 800;
    color: #0f172a;
    margin: 18px 0 10px 0;
    line-height: 1.25;
  }
  .cover-subtitle {
    font-size: 11pt;
    color: #475569;
    margin-bottom: 30px;
    line-height: 1.5;
  }
  .divider {
    height: 3px;
    background: linear-gradient(to right, #059669, #10b981, #059669);
    width: 200px;
    margin: 0 auto 30px auto;
    border-radius: 2px;
  }
  .cover-meta {
    margin-top: 40px;
    font-size: 9.5pt;
    color: #334155;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 24px;
    display: inline-block;
    text-align: left;
    max-width: 520px;
    line-height: 1.6;
  }
  h1 {
    color: #059669;
    font-size: 15pt;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 5px;
    margin-top: 24px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }
  h2 {
    color: #0f172a;
    font-size: 11.5pt;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }
  p {
    margin-top: 0;
    margin-bottom: 9px;
    text-align: justify;
  }
  ul, ol {
    margin-top: 0;
    margin-bottom: 10px;
    padding-left: 20px;
  }
  li {
    margin-bottom: 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 8.5pt;
  }
  th {
    background-color: #059669;
    color: white;
    font-weight: 700;
    text-align: left;
    padding: 7px 10px;
    border: 1px solid #047857;
  }
  td {
    padding: 6px 10px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .callout {
    background-color: #ecfdf5;
    border-left: 4px solid #059669;
    padding: 9px 13px;
    border-radius: 0 8px 8px 0;
    margin: 12px 0;
    font-size: 9pt;
  }
  .callout-warning {
    background-color: #fffbeb;
    border-left-color: #d97706;
  }
  .callout-title {
    font-weight: 700;
    color: #059669;
    margin-bottom: 2px;
  }
  .callout-warning .callout-title {
    color: #d97706;
  }
  .page-break {
    page-break-after: always;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    background: #e2e8f0;
    color: #334155;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-badge">BIMA PRATAMA ENTERPRISE RESOURCE PLANNING</div>
  <div class="cover-title">BUKU PANDUAN PENGGUNAAN SISTEM<br>(USER MANUAL & SOP OPERASIONAL)</div>
  <div class="cover-subtitle">
    Sistem Informasi Manajemen Terpadu & Akuntansi Double-Entry Komoditas Peternakan<br>
    <strong>Edisi Pembaruan 2.0 (November 2026)</strong><br>
    <em>Dilengkapi Hak Akses Granular CRUD, Search Select Retur, dan Modul Terpadu Pakan Curah</em>
  </div>
  <div class="divider"></div>
  <div class="cover-meta">
    <strong>Disusun untuk:</strong><br>
    Dewan Manajemen, Staff Operasional Kasir, Pengelola Gudang, dan Divisi Keuangan<br>
    <strong>Perusahaan:</strong> CV / UD Bima Pratama<br><br>
    <strong>Portal Aplikasi:</strong> https://sim.bimapratama.com<br>
    <strong>Backend Service:</strong> https://api.bimapratama.com/api/v1
  </div>
</div>

<!-- BAB 1 -->
<h1>BAB 1: PENDAHULUAN & ARSITEKTUR SISTEM ERP 2.0</h1>
<p><strong>Bima Pratama ERP 2.0</strong> adalah sistem informasi manajemen terintegrasi generasi enterprise yang dirancang khusus untuk memenuhi seluruh kebutuhan operasional perdagangan komoditas peternakan (Telur Ayam, Telur Bebek, Telur Puyuh, Telur Arab, Pakan Sentrat Pabrikan, Pakan Curah, Obat-obatan, dan EggTray). Dibangun dengan arsitektur modern (React 19, NestJS 11, TypeScript, dan MySQL 8 Enterprise) dengan keunggulan otomatisasi akuntansi double-entry dan perhitungan HPP berbasis First-In-First-Out (FIFO) yang presisi 1:1.</p>

<h2>1.1. Keunggulan Utama Pembaruan Sistem</h2>
<ul>
  <li><strong>Otomatisasi Akuntansi Double-Entry:</strong> Setiap transaksi fisik (penjualan, pembelian, retur, kas, beban) otomatis membukukan jurnal Debit dan Kredit seimbang.</li>
  <li><strong>Algoritma Stok Batch FIFO:</strong> Pelacakan batch kedatangan barang memastikan HPP penjualan dan margin laba kotor selalu akurat.</li>
  <li><strong>Hak Akses Granular Per Sub-Fitur (CRUD):</strong> Pengaturan izin tindakan Create, Read, Update, Delete secara mandiri untuk setiap sub-fitur operasional.</li>
  <li><strong>Pemisahan Menu Komoditas Terfokus:</strong> Menu Telur, Pakan Pabrikan, Pakan Curah (Pak Pri), Obat, dan Tray dipisahkan rapi di sidebar.</li>
  <li><strong>Fitur Retur Berbasis Search Select:</strong> Pencarian faktur asal saat retur barang menggunakan komponen Search Select interaktif (nomor nota, nama mitra, atau produk).</li>
  <li><strong>Rekonsiliasi Terpadu Pakan Curah & Kas Pak Pri:</strong> Pemantauan saldo modal talangan, mutasi kas tunai laci, transfer bank, dan belanja bahan curah.</li>
</ul>

<div class="callout">
  <div class="callout-title">📌 ALAMAT RESMI AKSES SISTEM</div>
  Portal Aplikasi Web: <strong>https://sim.bimapratama.com</strong><br>
  Backend API Service: <strong>https://api.bimapratama.com/api/v1</strong>
</div>

<div class="page-break"></div>

<!-- BAB 2 -->
<h1>BAB 2: MANAJEMEN PENGGUNA & HAK AKSES GRANULAR (CRUD)</h1>
<h2>2.1. Arsitektur Hak Akses Granular</h2>
<p>Pada versi 2.0, hak akses tidak lagi bersifat umum per modul, melainkan dipecah secara detail (granular) berdasarkan sub-fitur dan aksi (Create, Read, Update, Delete):</p>
<table>
  <thead>
    <tr><th style="width:24%">Modul / Sub-Fitur</th><th style="width:40%">Permission Key Granular</th><th>Keterangan Cakupan</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Komoditas Telur</strong></td>
      <td><code>telur:pembelian:{c,r,u,d}</code><br><code>telur:penjualan:{c,r,u,d}</code><br><code>telur:retur-pembelian:{c,r,u,d}</code><br><code>telur:retur-penjualan:{c,r,u,d}</code><br><code>telur:monitoring:{c,r,u,d}</code></td>
      <td>Operasional transaksi telur segar kandang, retur barang, dan monitoring harian.</td>
    </tr>
    <tr>
      <td><strong>Pakan Pabrikan</strong></td>
      <td><code>pakan:pembelian:{c,r,u,d}</code><br><code>pakan:penjualan:{c,r,u,d}</code><br><code>pakan:retur-pembelian:{c,r,u,d}</code><br><code>pakan:retur-penjualan:{c,r,u,d}</code><br><code>pakan:monitoring:{c,r,u,d}</code></td>
      <td>Operasional pakan kemasan sak pabrik (Pokphand, Japfa, Malindo, dll).</td>
    </tr>
    <tr>
      <td><strong>Pakan Curah (Pak Pri)</strong></td>
      <td><code>curah:transaksi:{c,r,u,d}</code><br><code>curah:kas:{c,r,u,d}</code><br><code>curah:konversi:{c,r,u,d}</code></td>
      <td>Operasional Mbak Pakan, audit kasir tunai/transfer, dan racik bahan curah.</td>
    </tr>
    <tr>
      <td><strong>Obat &amp; EggTray</strong></td>
      <td><code>obat:*</code> dan <code>tray:*</code></td>
      <td>Pengelolaan komoditas obat peternakan dan rak telur karton/plastik.</td>
    </tr>
    <tr>
      <td><strong>Stok &amp; Gudang</strong></td>
      <td><code>stok:read</code>, <code>stok:opname:{c,r,u,d}</code><br><code>stok:konversi:{c,r,u,d}</code></td>
      <td>Monitoring stok gudang, formulir opname sortir, dan reproses persediaan.</td>
    </tr>
    <tr>
      <td><strong>Keuangan &amp; Kas</strong></td>
      <td><code>keuangan:kas-masuk:{c,r,u,d}</code><br><code>keuangan:kas-keluar:{c,r,u,d}</code><br><code>keuangan:piutang:{c,r,u,d}</code><br><code>keuangan:hutang:{c,r,u,d}</code></td>
      <td>Pengelolaan mutasi kasir laci toko, bank, penagihan bon, dan pembayaran peternak.</td>
    </tr>
    <tr>
      <td><strong>Akuntansi &amp; Laporan</strong></td>
      <td><code>laporan:jurnal:{r,u,d}</code><br><code>laporan:buku-besar:read</code><br><code>laporan:laba-rugi:read</code><br><code>laporan:neraca:read</code></td>
      <td>Akses laporan keuangan resmi, buku besar, neraca saldo, dan laba rugi.</td>
    </tr>
  </tbody>
</table>

<h2>2.2. Mengatur Hak Akses Staf</h2>
<ol>
  <li>Masuk ke menu: <strong>Pengaturan &gt; Manajemen Pengguna</strong> (<code>/users</code>).</li>
  <li>Klik tombol <strong>+ Tambah Pengguna</strong> atau klik ikon <strong>Edit (Pensil)</strong> pada pengguna yang ada.</li>
  <li>Tentukan Peran Utama (Administrator, Staff Keuangan, Staff Kasir, atau Staff Gudang).</li>
  <li>Pada checklist matriks granular, centang izin tindakan (Create, Read, Update, Delete) yang diperbolehkan.</li>
  <li>Klik <strong>Simpan Pengguna</strong>. Hak akses langsung aktif secara instan.</li>
</ol>

<div class="page-break"></div>

<!-- BAB 3 -->
<h1>BAB 3: MEMAHAMI DASHBOARD UTAMA & ANALITIK REALTIME</h1>
<p>Dashboard utama memberikan visualisasi performa bisnis perusahaan secara menyeluruh:</p>
<ul>
  <li><strong>Kartu Omzet Penjualan:</strong> Nilai nominal omzet hari ini dan akumulasi bulan berjalan.</li>
  <li><strong>Kartu Pembelian Peternak:</strong> Total pengeluaran bahan komoditas telur dan pakan dari kandang.</li>
  <li><strong>Kartu Piutang Aktif:</strong> Saldo tagihan toko/agen yang beredar di pasar.</li>
  <li><strong>Kartu Hutang Dagang:</strong> Kewajiban yang harus dibayarkan ke peternak dan supplier.</li>
  <li><strong>Estimasi Laba Kotor Berjalan:</strong> Dihitung langsung dari Penjualan dikurangi HPP FIFO.</li>
  <li><strong>Peringatan Stok Menipis:</strong> Daftar barang yang kuantitasnya di bawah stok minimum.</li>
</ul>

<!-- BAB 4 -->
<h1>BAB 4: PENGELOLAAN MASTER DATA BISNIS (BARANG, MITRA, COA)</h1>
<h2>4.1. Master Barang &amp; Komoditas</h2>
<p>Menu: <strong>Master Data &gt; Master Barang</strong>. Parameter yang dikonfigurasi meliputi:</p>
<table>
  <thead>
    <tr><th style="width:25%">Kolom Input</th><th>Keterangan Pengisian</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Kode Barang</strong></td><td>Kode unik otomatis sistem (misal: BRG-0001) atau kode barcode pabrik.</td></tr>
    <tr><td><strong>Nama Komoditas</strong></td><td>Nama spesifik (misal: Telur Horn Super, Pakan Sentrat 511, Jagung Giling Curah, Tray Karton).</td></tr>
    <tr><td><strong>Jenis Barang</strong></td><td>Kategori fisik: Telur (8), Pakan Pabrikan (9), Pakan Curah (10), Obat (11), atau EggTray (12).</td></tr>
    <tr><td><strong>Satuan Dasar</strong></td><td>Satuan ukur: Kg (telur & curah), Sak (pakan pabrik), Pcs (tray), Butir, atau Botol.</td></tr>
    <tr><td><strong>Stok Minimum</strong></td><td>Batas kuantitas untuk memicu peringatan restock pada dashboard.</td></tr>
  </tbody>
</table>

<h2>4.2. Master Mitra Bisnis (Client &amp; Vendor)</h2>
<p>Menu: <strong>Master Data &gt; Master Mitra</strong>. Klasifikasi mitra mencakup:</p>
<ul>
  <li><strong>PETERNAK:</strong> Pemasok telur dari kandang (transaksi pembelian kredit menambah saldo hutang).</li>
  <li><strong>TOKO / AGEN:</strong> Pelanggan pembeli partai/eceran (penjualan bon menambah saldo piutang).</li>
  <li><strong>SUPPLIER PABRIKAN:</strong> Pemasok pakan pabrik besar, obat-obatan, dan eggtray.</li>
  <li><strong>KARYAWAN / TRUK:</strong> Sopir armada distribusi dan penjemput telur kandang.</li>
</ul>

<div class="page-break"></div>

<!-- BAB 5 -->
<h1>BAB 5: OPERASIONAL PEMBELIAN KOMODITAS & RETUR PEMBELIAN</h1>
<h2>5.1. Alur Transaksi Pembelian</h2>
<ol>
  <li>Masuk ke menu komoditas (Menu Telur, Pakan Pabrikan, Obat, atau Tray).</li>
  <li>Pilih tab <strong>Pembelian</strong> &gt; klik tombol <strong>+ Tambah Pembelian</strong>.</li>
  <li>Pilih tanggal transaksi dan pilih nama Peternak / Pemasok.</li>
  <li>Pilih Akun Pembayaran: Kas Tunai Toko, Rekening Bank Transfer, atau Hutang Usaha (Tempo).</li>
  <li>Masukkan barang, kuantitas timbangan bersih (Kg/Sak), dan harga beli satuan.</li>
  <li>Klik <strong>Simpan Pembelian</strong>. Sistem otomatis membentuk batch FIFO baru dan membukukan jurnal Debit Persediaan vs Kredit Kas/Bank/Hutang.</li>
</ol>

<h2>5.2. Alur Retur Pembelian ke Supplier/Peternak (Search Select)</h2>
<p>Jika barang yang diterima dari peternak/supplier rusak atau cacat, catat melalui Retur Pembelian:</p>
<ol>
  <li>Pilih tab <strong>Retur Pembelian</strong> &gt; klik <strong>+ Tambah Retur Pembelian</strong>.</li>
  <li><strong>Langkah 1 (Pilih Faktur Asal):</strong> Gunakan komponen <strong>Search Select</strong> pada input 'Pilih Faktur Transaksi Asal'. Ketik nomor faktur, nama peternak, atau nama produk.</li>
  <li>Pilih nota pembelian yang sesuai. Sistem otomatis mengunci mitra dan akun pengembalian.</li>
  <li><strong>Langkah 2 (Tentukan Jumlah Retur):</strong> Masukkan kuantitas barang yang dikembalikan.</li>
  <li>Klik <strong>Simpan Transaksi Retur</strong>. Stok berkurang, batch FIFO disesuaikan, dan saldo hutang ke supplier langsung berkurang otomatis.</li>
</ol>

<!-- BAB 6 -->
<h1>BAB 6: OPERASIONAL PENJUALAN KOMODITAS & RETUR PENJUALAN</h1>
<h2>6.1. Alur Transaksi Penjualan</h2>
<ol>
  <li>Pilih tab <strong>Penjualan</strong> &gt; klik tombol <strong>+ Tambah Penjualan</strong>.</li>
  <li>Pilih Toko / Pelanggan dari dropdown pencarian.</li>
  <li>Pilih Metode Pembayaran: Tunai Laci, Transfer Bank, atau Bon Titipan / Piutang.</li>
  <li>Masukkan produk, kuantitas, dan harga jual satuan.</li>
  <li>Klik <strong>Simpan Penjualan</strong> dan cetak nota faktur rangkap.</li>
</ol>

<h2>6.2. Alur Retur Penjualan dari Pelanggan (Search Select)</h2>
<ol>
  <li>Pilih tab <strong>Retur Penjualan</strong> &gt; klik <strong>+ Tambah Retur Penjualan</strong>.</li>
  <li>Gunakan <strong>Search Select</strong> untuk mencari nomor nota penjualan asal yang ingin diretur pelanggan.</li>
  <li>Pilih faktur transaksi asal. Data pelanggan terkunci otomatis demi kepatuhan audit.</li>
  <li>Isi kuantitas barang yang dikembalikan pelanggan.</li>
  <li>Klik <strong>Simpan Transaksi Retur</strong>. Stok fisik bertambah kembali ke gudang, HPP di-rollback, dan saldo bon piutang pelanggan langsung berkurang.</li>
</ol>

<div class="page-break"></div>

<!-- BAB 7 -->
<h1>BAB 7: MODUL KHUSUS PAKAN CURAH & REKONSILIASI KEUANGAN PAK PRI</h1>
<p>Menu <strong>Pakan Curah (Pak Pri)</strong> (<code>/curah-pak-pri</code>) adalah portal terpadu untuk operasional pakan curah dan rekonsiliasi keuangan kemitraan Bapak Supriyadi:</p>

<h2>7.1. Empat Kartu KPI Real-Time</h2>
<ul>
  <li><strong>Saldo Rekening Bp. Supriyadi:</strong> Posisi modal talangan (Ditalangi Bima Pratama vs Hak Pak Pri).</li>
  <li><strong>Kas Tunai Curah (Laci Toko):</strong> Akumulasi uang tunai fisik yang terkumpul di kasir curah.</li>
  <li><strong>Rekening Transfer Bank:</strong> Total penerimaan penjualan curah melalui transfer perbankan.</li>
  <li><strong>Stok Gudang Curah:</strong> Kuantitas fisik persediaan bahan pakan curah (Kg).</li>
</ul>

<h2>7.2. Tiga Tab Operasional Pakan Curah</h2>
<table>
  <thead>
    <tr><th style="width:30%">Tab Operasional</th><th>Fungsi & Cakupan Fitur</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Tab 1: Operasional Mbak Pakan</strong></td>
      <td>Transaksi Penjualan, Pembelian, Retur, dan Monitoring khusus komoditas pakan curah (Jenis ID 9).</td>
    </tr>
    <tr>
      <td><strong>Tab 2: Audit Kasir & Keuangan Pak Pri</strong></td>
      <td>Laporan audit kasir mitra Pak Pri (Client ID 241): Kas Masuk Tunai, Transfer Bank, dan Belanja Bahan Curah ditalangi Kas BP. Dilengkapi pagination 25 baris & ekspor Excel.</td>
    </tr>
    <tr>
      <td><strong>Tab 3: Konversi & Racik Pakan</strong></td>
      <td>Peracikan bahan baku curah (jagung giling, bekatul, katul campuran, konsentrat) menjadi pakan adukan siap pakai dengan kalkulasi susut/rendemen otomatis.</td>
    </tr>
  </tbody>
</table>

<!-- BAB 8 -->
<h1>BAB 8: MANAJEMEN GUDANG, SORTIR TELUR & KONVERSI BARANG</h1>
<h2>8.1. Klasifikasi Sortir Telur Fisik</h2>
<table>
  <thead>
    <tr><th style="width:25%">Kategori Sortir</th><th>Karakteristik & Penanganan</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Telur Utuh Normal</strong></td><td>Kualitas standar siap dipasarkan dengan harga penuh.</td></tr>
    <tr><td><strong>Telur Bentes</strong></td><td>Retak halus rambut, selaput tidak bocor; dijual diskon eceran.</td></tr>
    <tr><td><strong>Telur Kotor</strong></td><td>Tercemar kotoran kandang; dicuci atau dipisahkan grading-nya.</td></tr>
    <tr><td><strong>Telur Ceplok</strong></td><td>Pecah basah; segera diolah atau dijual langsung ke usaha kuliner.</td></tr>
    <tr><td><strong>Telur Jumbo</strong></td><td>Ukuran ekstra besar dengan harga jual premium.</td></tr>
    <tr><td><strong>Telur Prok / Afkir</strong></td><td>Busuk/mati; dimusnahkan dan dibukukan sebagai kerugian susut gudang.</td></tr>
  </tbody>
</table>

<h2>8.2. Stok Opname Fisik & Penyesuaian</h2>
<p>Menu: <strong>Stok Opname &gt; Tambah Opname</strong>. Masukkan kuantitas hasil hitung fisik di rak gudang. Sistem otomatis menghitung selisih dan memposting penyesuaian persediaan ke beban selisih opname.</p>

<h2>8.3. Modul Konversi Barang & Reproses</h2>
<p>Menu <strong>Konversi &amp; Reproses</strong> di navigasi STOK (<code>/konversi-barang</code>) digunakan untuk transformasi barang (pemecahan kemasan sak ke eceran, reproses telur utuh ke sortir, atau racik pakan). Nilai HPP dipindahkan secara proporsional tanpa menimbulkan distorsi akuntansi.</p>

<div class="page-break"></div>

<!-- BAB 9 -->
<h1>BAB 9: PENGELOLAAN KAS, BANK, BON TITIPAN (PIUTANG) & HUTANG</h1>
<ul>
  <li><strong>Pelunasan Piutang / Bon Toko:</strong> Menu <em>Keuangan &gt; Piutang Dagang</em>. Pilih pelanggan &gt; masukkan nominal pembayaran &gt; saldo bon toko berkurang seketika.</li>
  <li><strong>Pembayaran Hutang Peternak:</strong> Menu <em>Keuangan &gt; Hutang Usaha</em>. Pilih peternak &gt; masukkan nominal transfer &gt; saldo hutang peternak otomatis berkurang.</li>
  <li><strong>Biaya Operasional Toko:</strong> Menu <em>Keuangan &gt; Buku Kas</em>. Mencatat biaya solar armada, servis kendaraan, gaji karyawan, konsumsi, dan listrik kantor.</li>
</ul>

<!-- BAB 10 -->
<h1>BAB 10: LAPORAN KEUANGAN & AKUNTANSI DOUBLE-ENTRY</h1>
<p>Seluruh laporan di-generate otomatis dan dapat diekspor langsung ke Microsoft Excel (.xlsx) atau PDF:</p>
<table>
  <thead>
    <tr><th style="width:28%">Laporan</th><th>Fungsi Analisis</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Jurnal Umum</strong></td><td>Audit trail seluruh transaksi Debit dan Kredit yang 100% seimbang (balanced).</td></tr>
    <tr><td><strong>Buku Besar (Ledger)</strong></td><td>Rincian mutasi pergerakan saldo kas, bank, persediaan, piutang, dan hutang.</td></tr>
    <tr><td><strong>Neraca Saldo</strong></td><td>Verifikasi keseimbangan saldo akun sebelum penutupan buku periode.</td></tr>
    <tr><td><strong>Laporan Laba Rugi</strong></td><td>Penjualan Bersih dikurangi HPP FIFO = Laba Kotor; dikurangi Beban Operasional = Laba Bersih Usaha.</td></tr>
    <tr><td><strong>Laba Rugi per Komoditas</strong></td><td>Analisis profitabilitas terpisah: Telur vs Pakan Pabrikan vs Pakan Curah vs Obat vs Tray.</td></tr>
    <tr><td><strong>Neraca Keuangan</strong></td><td>Posisi Aset Lancar vs Total Hutang Usaha dan Ekuitas Pemilik.</td></tr>
  </tbody>
</table>

<!-- BAB 11 -->
<h1>BAB 11: SINKRONISASI, BACKUP DATA & PANDUAN TROUBLESHOOTING (FAQ)</h1>
<h2>11.1. Fitur Upload Backup SQL</h2>
<p>Melalui menu <strong>Sinkronisasi &amp; Migrasi</strong>, pengguna dapat mengunggah file backup <code>.sql</code> dari sistem lama. Streaming engine lossless ETL akan mentransformasikan data lama menjadi struktur ERP 2.0 secara otomatis.</p>

<h2>11.2. Pertanyaan Umum (FAQ)</h2>
<p><strong>T: Bagaimana jika salah menginput kuantitas penjualan?</strong><br>
J: Buka menu Penjualan terkait, cari nomor invoice, lalu klik tombol Edit (pensil). Sistem akan menyesuaikan kembali stok batch FIFO dan jurnal akuntansinya secara otomatis.</p>

<p><strong>T: Bagaimana cara mencari faktur lama saat retur barang?</strong><br>
J: Pada form Tambah Retur, klik kolom Search Select. Ketikkan nomor invoice, nama pelanggan, atau nama produk. Daftar faktur yang relevan akan langsung disaring secara otomatis.</p>

<p><strong>T: Bagaimana cara backup database rutin?</strong><br>
J: Masuk ke phpMyAdmin di cPanel hosting &gt; pilih database <code>bimaprat_v2</code> &gt; klik tab Export &gt; pilih Quick SQL &gt; klik Export. Simpan file <code>.sql</code> di komputer Anda sebagai arsip aman.</p>

</body>
</html>
"""
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"✅ File HTML berhasil disimpan: {html_path}")

def convert_html_to_pdf(html_path, pdf_path):
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    edge_path = next((p for p in edge_paths if os.path.exists(p)), None)
    if not edge_path:
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
    
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
        print(f"✅ File PDF berhasil dibuat: {pdf_path} ({round(os.path.getsize(pdf_path)/1024, 1)} KB)")
        return True
    else:
        print("❌ Gagal membuat PDF via Edge headless.")
        return False

def sync_to_docs(base_dir, docx_file, pdf_file):
    docs_dir = os.path.join(base_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    
    target_docx = os.path.join(docs_dir, "BIMA_PRATAMA_ERP_PANDUAN_PENGGUNAAN.docx")
    target_pdf = os.path.join(docs_dir, "BIMA_PRATAMA_ERP_PANDUAN_PENGGUNAAN.pdf")
    
    if os.path.exists(docx_file):
        shutil.copy2(docx_file, target_docx)
        print(f"📁 Disinkronkan ke docs: {target_docx}")
    if os.path.exists(pdf_file):
        shutil.copy2(pdf_file, target_pdf)
        print(f"📁 Disinkronkan ke docs: {target_pdf}")

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    docx_file = os.path.join(base_dir, "BIMA_PRATAMA_ERP_PANDUAN_PENGGUNAAN.docx")
    html_file = os.path.join(base_dir, "BIMA_PRATAMA_ERP_PANDUAN_PENGGUNAAN.html")
    pdf_file = os.path.join(base_dir, "BIMA_PRATAMA_ERP_PANDUAN_PENGGUNAAN.pdf")
    
    print("🚀 Memulai pembuatan Dokumen Panduan...")
    build_docx_manual(docx_file)
    build_html_for_pdf(html_file)
    convert_html_to_pdf(html_file, pdf_file)
    sync_to_docs(base_dir, docx_file, pdf_file)
    print("🎉 SEMUA DOKUMEN PANDUAN BERHASIL DIPERBARUI DENGAN SEMPURNA!")
