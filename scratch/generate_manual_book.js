const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Generating Manual Book Dashboard Gorong-Gorong PG1...');

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Panduan Pengguna (Manual Book) - Dashboard Gorong-Gorong PG1</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 25mm 20mm 25mm 25mm;
      @bottom-right {
        content: counter(page);
        font-family: "Times New Roman", Times, serif;
        font-size: 10pt;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: "Times New Roman", Times, serif !important;
      font-size: 12pt !important;
      line-height: 1.5;
      color: #111827;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      text-align: justify !important;
      text-justify: inter-word !important;
    }

    p {
      text-align: justify !important;
      text-justify: inter-word !important;
      margin-top: 0;
      margin-bottom: 0.85em;
      text-indent: 1.5em;
    }

    p.no-indent {
      text-indent: 0 !important;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: "Times New Roman", Times, serif !important;
      color: #064e3b; /* Deep Emerald Forest */
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid;
      margin-top: 1.2em;
      margin-bottom: 0.5em;
      text-align: left;
    }

    h1 {
      font-size: 18pt !important;
      border-bottom: 2px solid #064e3b;
      padding-bottom: 4px;
      margin-top: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    h2 {
      font-size: 14pt !important;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
    }

    h3 {
      font-size: 12.5pt !important;
      color: #0f766e;
    }

    h4 {
      font-size: 12pt !important;
      color: #1e293b;
      font-style: italic;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    /* Cover Page */
    .cover-container {
      height: 96vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      border: 3px double #064e3b;
      padding: 40px 30px;
      box-sizing: border-box;
    }

    .cover-header {
      margin-top: 20px;
    }

    .company-title {
      font-size: 16pt;
      font-weight: bold;
      color: #064e3b;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .company-subtitle {
      font-size: 12pt;
      font-weight: normal;
      color: #4b5563;
      margin-top: 5px;
    }

    .cover-main {
      margin: auto 0;
    }

    .document-badge {
      display: inline-block;
      background-color: #064e3b;
      color: #ffffff;
      padding: 6px 18px;
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 20px;
      border-radius: 4px;
    }

    .manual-title {
      font-size: 22pt !important;
      font-weight: bold;
      color: #064e3b;
      line-height: 1.3;
      margin-bottom: 15px;
      text-transform: uppercase;
      border: none;
      padding: 0;
      text-align: center;
    }

    .manual-subtitle {
      font-size: 13pt;
      font-weight: normal;
      color: #374151;
      max-width: 90%;
      margin: 0 auto;
      line-height: 1.4;
      text-align: center;
    }

    .cover-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 20px;
      font-size: 11pt;
      color: #4b5563;
      display: flex;
      justify-content: space-between;
      text-align: left;
    }

    /* Table of Contents */
    .toc-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 11.5pt;
    }

    .toc-title {
      font-weight: bold;
      color: #064e3b;
    }

    .toc-sub {
      padding-left: 20px;
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 11pt;
      color: #374151;
    }

    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted #9ca3af;
      margin: 0 8px 4px 8px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 10.5pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #9ca3af;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #064e3b;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
    }

    tr:nth-child(even) {
      background-color: #f9fafb;
    }

    /* Callout & Alert Boxes */
    .alert-box {
      border-left: 4px solid #064e3b;
      background-color: #f0fdf4;
      padding: 10px 14px;
      margin: 14px 0;
      font-size: 11pt;
      page-break-inside: avoid;
      text-align: justify !important;
      text-justify: inter-word !important;
    }

    .alert-box.warning {
      border-left-color: #d97706;
      background-color: #fffbeb;
    }

    .alert-box.info {
      border-left-color: #2563eb;
      background-color: #eff6ff;
    }

    .alert-title {
      font-weight: bold;
      margin-bottom: 4px;
      color: #1f2937;
    }

    /* Key Value & Grid */
    .feature-card {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 12px 14px;
      margin: 10px 0;
      background: #fafafa;
      page-break-inside: avoid;
    }

    .feature-title {
      font-weight: bold;
      color: #064e3b;
      font-size: 11.5pt;
      margin-bottom: 4px;
    }

    ol, ul {
      margin-top: 0;
      margin-bottom: 0.85em;
      padding-left: 28px;
      text-align: justify !important;
      text-justify: inter-word !important;
    }

    li {
      margin-bottom: 0.35em;
      text-align: justify !important;
      text-justify: inter-word !important;
    }

    .code-inline {
      font-family: "Courier New", Courier, monospace;
      background-color: #f1f5f9;
      padding: 1px 4px;
      font-size: 10.5pt;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    .header-tag {
      font-size: 9.5pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover-container">
    <div class="cover-header">
      <div class="company-title">PT GREAT GIANT PINEAPPLE — PLANTATION GROUP 1 (PG1)</div>
      <div class="company-subtitle">Divisi Agronomy, Plantation Engineering & Operational Technology</div>
    </div>

    <div class="cover-main">
      <div class="document-badge">BUKU PANDUAN RESMI (OFFICIAL MANUAL BOOK)</div>
      <div class="manual-title">PANDUAN OPERASIONAL &amp; SISTEM MONITORING GORONG-GORONG</div>
      <div class="manual-subtitle">
        Dokumentasi Komprehensif Seluruh Menu, Dashboard Monitoring, Control Board Rekonsiliasi SAP, Formulir Transaksi Operasional Lapangan, dan Tata Kelola Master Data Terpadu
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong>Disusun Oleh:</strong> Tim Sistem Digital Agronomy &amp; FE PG1<br>
        <strong>Kategori Dokumen:</strong> Standard Operating Procedure &amp; User Manual<br>
        <strong>Sasaran Pengguna:</strong> Super Admin, Kepala Wilayah, Mandor Wilayah (AW01–AW07), Verifikator FE
      </div>
      <div style="text-align: right;">
        <strong>Nomor Dokumen:</strong> PG1-SOP-MNL-2026-004<br>
        <strong>Versi Aplikasi:</strong> v2.4 (Enterprise Edition)<br>
        <strong>Tanggal Publikasi:</strong> November 2026
      </div>
    </div>
  </div>

  <!-- ==================== KATA PENGANTAR & DAFTAR ISI ==================== -->
  <div class="page-break"></div>
  <div class="header-tag">
    <span>Sistem Monitoring Gorong-Gorong PG1</span>
    <span>Kata Pengantar &amp; Daftar Isi</span>
  </div>

  <h1>KATA PENGANTAR</h1>
  <p>
    Puji dan syukur kami panjatkan kepada Tuhan Yang Maha Esa atas selesainya penyusunan Dokumen Buku Panduan Pengguna (<em>Manual Book</em>) Sistem Monitoring dan Kontrol Operasional Gorong-Gorong Plantation Group 1 (PG1). Sistem ini dikembangkan sebagai wujud komitmen manajemen PT Great Giant Pineapple dalam mewujudkan transformasi digital operasional perkebunan yang modern, presisi, transparan, dan akuntabel.
  </p>
  <p>
    Gorong-gorong merupakan infrastruktur vital dalam manajemen tata kelola air (<em>water management</em>) dan sistem drainase perkebunan nanas. Keberhasilan penyaluran, pemasangan yang tepat waktu, serta pemantauan material gorong-gorong pada setiap petak sangat menentukan pencegahan genangan air (<em>waterlogging</em>) yang dapat mengancam kesehatan tanaman dan produktivitas hasil panen. Melalui sistem terintegrasi ini, seluruh pemangku kepentingan—mulai dari Mandor Wilayah di garis depan operasional, Verifikator Field Engineering (FE), Kepala Wilayah, hingga jajaran Manajemen Puncak—diberikan akses real-time terhadap data kebutuhan, pengiriman material, realisasi pemasangan fisik, serta rekonsiliasi data inventori di sistem ERP SAP.
  </p>
  <p>
    Buku panduan ini disusun secara runtut dan mendalam guna menjadi rujukan resmi bagi seluruh pengguna sistem. Diharapkan seluruh pengguna dapat memahami fungsi setiap fitur, tata cara penginputan formulir, interpretasi indikator kinerja (KPI), serta tata kelola data master secara disiplin demi tercapainya keunggulan operasional perkebunan secara berkesinambungan.
  </p>

  <div style="margin-top: 30px;">
    <h2>DAFTAR ISI KESELURUHAN</h2>
    <div style="margin-top: 15px;">
      <div class="toc-item"><span class="toc-title">BAB I. PENDAHULUAN &amp; ARSITEKTUR SISTEM</span><span class="toc-dots"></span><span>Hal. 1</span></div>
      <div class="toc-sub"><span>1.1 Latar Belakang &amp; Urgensi Sistem Monitoring Gorong-Gorong</span><span class="toc-dots"></span><span>Hal. 1</span></div>
      <div class="toc-sub"><span>1.2 Siklus Hidup Alur Kerja Gorong-Gorong (Order, Drop, Pasang, SAP)</span><span class="toc-dots"></span><span>Hal. 2</span></div>
      <div class="toc-sub"><span>1.3 Matriks Peran Pengguna &amp; Pembagian Wilayah Kerja (AW01–AW07)</span><span class="toc-dots"></span><span>Hal. 3</span></div>
      <div class="toc-sub"><span>1.4 Panduan Akses Portal &amp; Tata Cara Otentikasi Pengguna</span><span class="toc-dots"></span><span>Hal. 4</span></div>

      <div class="toc-item" style="margin-top: 8px;"><span class="toc-title">BAB II. DASHBOARD MONITORING GORONG-GORONG (MENU UTAMA)</span><span class="toc-dots"></span><span>Hal. 5</span></div>
      <div class="toc-sub"><span>2.1 Kartu Ringkasan Indikator Kinerja Utama (KPI Metrics Summary)</span><span class="toc-dots"></span><span>Hal. 5</span></div>
      <div class="toc-sub"><span>2.2 Card Ringkasan Progres Pemenuhan Per Wilayah (Status Open)</span><span class="toc-dots"></span><span>Hal. 6</span></div>
      <div class="toc-sub"><span>2.3 Visualisasi Grafik Tren Bulanan &amp; Grafik Kinerja Wilayah</span><span class="toc-dots"></span><span>Hal. 7</span></div>
      <div class="toc-sub"><span>2.4 Widget Pemantauan Realisasi Harian (Today's Movement)</span><span class="toc-dots"></span><span>Hal. 8</span></div>
      <div class="toc-sub"><span>2.5 Panel Filter Dinamis Terpadu &amp; Fitur Quick Search Petak</span><span class="toc-dots"></span><span>Hal. 8</span></div>
      <div class="toc-sub"><span>2.6 Analisis Komprehensif Tabel Utama List Lokasi Order (54 Kolom)</span><span class="toc-dots"></span><span>Hal. 9</span></div>
      <div class="toc-sub"><span>2.7 Analisis Tabel Lokasi Belum Order &amp; Kriteria Petak Muncul</span><span class="toc-dots"></span><span>Hal. 12</span></div>
      <div class="toc-sub"><span>2.8 Fitur Ekspor Data Laporan (Excel &amp; PDF Resmi)</span><span class="toc-dots"></span><span>Hal. 13</span></div>

      <div class="toc-item" style="margin-top: 8px;"><span class="toc-title">BAB III. CONTROL BOARD GORONG-GORONG (REKONSILIASI SAP)</span><span class="toc-dots"></span><span>Hal. 14</span></div>
      <div class="toc-sub"><span>3.1 Konsep Rekonsiliasi Realisasi Fisik Lapangan vs SAP ERP</span><span class="toc-dots"></span><span>Hal. 14</span></div>
      <div class="toc-sub"><span>3.2 Metrik Ringkasan Selisih &amp; Evaluasi Bulan Berjalan</span><span class="toc-dots"></span><span>Hal. 15</span></div>
      <div class="toc-sub"><span>3.3 Tabel Verifikasi 3-Tier Merged (Status Match vs Check)</span><span class="toc-dots"></span><span>Hal. 16</span></div>
      <div class="toc-sub"><span>3.4 Prosedur Investigasi Deviasi &amp; Penyelesaian Selisih Data</span><span class="toc-dots"></span><span>Hal. 17</span></div>

      <div class="toc-item" style="margin-top: 8px;"><span class="toc-title">BAB IV. FORMULIR INPUT OPERASIONAL LAPANGAN</span><span class="toc-dots"></span><span>Hal. 18</span></div>
      <div class="toc-sub"><span>4.1 Antarmuka Form Input Multi-Lokasi &amp; Validasi Wilayah</span><span class="toc-dots"></span><span>Hal. 18</span></div>
      <div class="toc-sub"><span>4.2 Formulir Pengajuan Order Gorong-Gorong Baru</span><span class="toc-dots"></span><span>Hal. 19</span></div>
      <div class="toc-sub"><span>4.3 Formulir Pencatatan Kedatangan Material (Form Drop)</span><span class="toc-dots"></span><span>Hal. 20</span></div>
      <div class="toc-sub"><span>4.4 Formulir Pencatatan Pemasangan Fisik (Form Pasang Manual)</span><span class="toc-dots"></span><span>Hal. 21</span></div>
      <div class="toc-sub"><span>4.5 Formulir Pemindahan Material Antar Petak (Form Pindah Lokasi)</span><span class="toc-dots"></span><span>Hal. 22</span></div>
      <div class="toc-sub"><span>4.6 Tabel Histori Transaksi Form &amp; Manajemen Koreksi Data</span><span class="toc-dots"></span><span>Hal. 23</span></div>

      <div class="toc-item" style="margin-top: 8px;"><span class="toc-title">BAB V. MODUL MASTER DATA TERPADU</span><span class="toc-dots"></span><span>Hal. 24</span></div>
      <div class="toc-sub"><span>5.1 Master Status Lokasi &amp; Prosedur Upload Excel Massal</span><span class="toc-dots"></span><span>Hal. 24</span></div>
      <div class="toc-sub"><span>5.2 Master Waterlogging (Peta Risiko &amp; Rekomendasi FE)</span><span class="toc-dots"></span><span>Hal. 25</span></div>
      <div class="toc-sub"><span>5.3 Master Upload Data Realisasi SAP ERP</span><span class="toc-dots"></span><span>Hal. 26</span></div>
      <div class="toc-sub"><span>5.4 Master Histori Order, Drop, Pasang Manual, &amp; Pindah Lokasi</span><span class="toc-dots"></span><span>Hal. 27</span></div>

      <div class="toc-item" style="margin-top: 8px;"><span class="toc-title">BAB VI. ADMINISTRASI PENGGUNA &amp; TATA KELOLA AKSES</span><span class="toc-dots"></span><span>Hal. 28</span></div>
      <div class="toc-sub"><span>6.1 Manajemen Pengguna &amp; Pembatasan Wilayah Kerja (Assigned Wilayah)</span><span class="toc-dots"></span><span>Hal. 28</span></div>
      <div class="toc-sub"><span>6.2 Prosedur Registrasi Akun, Penugasan Peran, &amp; Reset Kata Sandi</span><span class="toc-dots"></span><span>Hal. 29</span></div>

      <div class="toc-item" style="margin-top: 8px;"><span class="toc-title">BAB VII. PANDUAN PEMECAHAN MASALAH (FAQ &amp; TROUBLESHOOTING)</span><span class="toc-dots"></span><span>Hal. 30</span></div>
      <div class="toc-sub"><span>7.1 Penanganan Gangguan Akses &amp; Otorisasi</span><span class="toc-dots"></span><span>Hal. 30</span></div>
      <div class="toc-sub"><span>7.2 Penanganan Kendala Sinkronisasi &amp; Validasi Data</span><span class="toc-dots"></span><span>Hal. 31</span></div>
      <div class="toc-sub"><span>7.3 Saluran Dukungan Teknis &amp; Helpdesk Operasional</span><span class="toc-dots"></span><span>Hal. 32</span></div>
    </div>
  </div>

  <!-- ==================== BAB I ==================== -->
  <div class="page-break"></div>
  <div class="header-tag">
    <span>Sistem Monitoring Gorong-Gorong PG1</span>
    <span>Bab I: Pendahuluan &amp; Arsitektur Sistem</span>
  </div>

  <h1>BAB I. PENDAHULUAN &amp; ARSITEKTUR SISTEM</h1>

  <h2>1.1 Latar Belakang &amp; Urgensi Sistem Monitoring Gorong-Gorong</h2>
  <p>
    Kondisi agroklimat di area operasional perkebunan Plantation Group 1 (PG1) memiliki dinamika curah hujan musiman yang tinggi. Salah satu ancaman terbesar terhadap pertumbuhan tanaman nanas adalah fenomena genangan air (<em>waterlogging</em>) pada zona perakaran. Tanaman nanas yang terendam air lebih dari 24 hingga 48 jam akan mengalami penurunan pasokan oksigen tanah secara drastis (anoksia), pembusukan akar, peningkatan kerentanan terhadap jamur patogen <em>Phytophthora nicotianae</em>, hingga penurunan drastis pada bobot buah dan kualitas kemanisan (Brix).
  </p>
  <p>
    Gorong-gorong beton dengan spesifikasi diameter 40 cm, 60 cm, 80 cm, dan 100 cm berfungsi sebagai saluran pembuang utama (<em>cross-drain</em>) yang melintasi jalan kebun dan tanggul pembatas petak, memastikan aliran air dari saluran tersier dapat dialirkan secara lancar menuju saluran sekunder dan primer tanpa menggenangi lahan produktif. Sebelum sistem digital ini diimplementasikan, pemantauan pengadaan, pengiriman, dan pemasangan gorong-gorong dilakukan secara konvensional melalui formulir manual berbasis kertas dan spreadsheet yang terdesentralisasi di masing-masing wilayah (AW01 sampai AW07).
  </p>
  <p>
    Metode konvensional tersebut menimbulkan berbagai kelemahan operasional yang signifikan, antara lain keterlambatan pendistribusian material gorong-gorong, hilangnya visibilitas atas saldo kebutuhan petak di lapangan, terjadinya deviasi pencatatan antara fisik yang terpasang dengan pemakaian material di sistem Enterprise Resource Planning (ERP SAP), serta kesulitan dalam melakukan audit dan peramalan kebutuhan infrastruktur. Oleh karena itu, Sistem Monitoring Gorong-Gorong PG1 dihadirkan sebagai platform tunggal (<em>single source of truth</em>) yang mengintegrasikan seluruh tahapan manajemen gorong-gorong secara menyeluruh.
  </p>

  <h2>1.2 Siklus Hidup Alur Kerja Gorong-Gorong</h2>
  <p>
    Sistem dirancang mengikuti siklus hidup material (<em>material lifecycle</em>) yang terbagi menjadi empat tahapan berurutan dan saling terhubung secara otomatis dalam basis data terpusat, sebagaimana dijabarkan pada tabel berikut:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 8%;">Tahap</th>
        <th style="width: 22%;">Nama Fase</th>
        <th style="width: 25%;">Pelaksana / Aktor</th>
        <th style="width: 45%;">Deskripsi Operasional &amp; Dampak Sistem</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center; font-weight: bold;">1</td>
        <td><strong>Pengajuan Order (Kebutuhan Petak)</strong></td>
        <td>Mandor Wilayah / Supervisor AW01–AW07</td>
        <td>Mandor mengidentifikasi petak yang membutuhkan gorong-gorong lalu menginput pengajuan order pada menu <em>Form Input</em> dengan menentukan jumlah unit per diameter (Dia 40, 60, 80, 100). Sistem mencatat transaksi baru pada tabel <span class="code-inline">MasterDataOrder</span> dan memperbarui saldo kebutuhan di tabel <span class="code-inline">LokasiOrderGorongGorong</span>.</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: bold;">2</td>
        <td><strong>Dropping Material (Kedatangan Lapangan)</strong></td>
        <td>Logistik / Pengemudi Armada / Mandor Penerima</td>
        <td>Armada mengangkut gorong-gorong dari pabrik pencetakan (<em>precast yard</em>) menuju petak kebun. Mandor mencatat kedatangan unit fisik melalui <em>Form Drop</em>. Sistem mencatat transaksi di tabel <span class="code-inline">MasterDataDrop</span>, meningkatkan realisasi kedatangan, dan menghitung persentase kedatangan (<span class="code-inline">%Kedatangan</span>).</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: bold;">3</td>
        <td><strong>Pemasangan Fisik (Instalasi Lapangan)</strong></td>
        <td>Mandor Wilayah / Tenaga Kerja Lapangan</td>
        <td>Gorong-gorong ditanam pada parit jalan atau crossing petak menggunakan alat berat atau tenaga manual. Mandor mencatat realisasi unit terpasang melalui <em>Form Pasang Manual</em>. Sistem mencatat di tabel <span class="code-inline">MasterDataPasangManual</span>, memperbarui kolom realisasi pasang, serta menghitung saldo sisa yang belum terpasang.</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: bold;">4</td>
        <td><strong>Pencatatan SAP &amp; Rekonsiliasi Control Board</strong></td>
        <td>Verifikator FE / Admin Agronomy / Accounting</td>
        <td>Pemakaian material gorong-gorong dilaporkan ke dalam sistem SAP ERP perusahaan (transaksi reservasi dan <em>goods issue</em>). Data rekap SAP kemudian diunggah ke portal. Modul <em>Control Board</em> secara otomatis mencocokkan angka terpasang fisik lapangan vs SAP untuk mengidentifikasi status <strong>Match</strong> atau <strong>Check</strong>.</td>
      </tr>
    </tbody>
  </table>

  <h2>1.3 Matriks Peran Pengguna &amp; Pembagian Wilayah Kerja</h2>
  <p>
    Sistem menerapkan pengamanan berbasis peran (<em>Role-Based Access Control / RBAC</em>) yang ketat guna menjamin integritas data dan keamanan operasional. Setiap akun pengguna memiliki batas kewenangan dan lingkup wilayah operasional (<em>assignedWilayah</em>):
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Peran Pengguna (Role)</th>
        <th style="width: 25%;">Lingkup Wilayah Kerja</th>
        <th style="width: 25%;">Hak Akses Menu</th>
        <th style="width: 30%;">Tanggung Jawab Operasional</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Super Admin</strong></td>
        <td>Seluruh Wilayah (AW01 – AW07)</td>
        <td>Akses Penuh: Monitor, Control Board, Form Input, Seluruh Master Data, Manajemen User.</td>
        <td>Pemeliharaan arsitektur sistem, konfigurasi basis data, audit global, reset password pengguna, dan penanganan isu teknis tingkat lanjut.</td>
      </tr>
      <tr>
        <td><strong>Admin Agronomy</strong></td>
        <td>Seluruh Wilayah (AW01 – AW07)</td>
        <td>Monitor, Control Board, Form Input (Input &amp; Edit Transaksi), Seluruh Master Data, Manajemen User.</td>
        <td>Verifikasi operasional perkebunan harian, pengunggahan master data status lokasi, pengelolaan akun pengguna lapangan, dan ekspor laporan resmi.</td>
      </tr>
      <tr>
        <td><strong>Kepala Wilayah (Kabag)</strong></td>
        <td>Wilayah Kerja Terkait (atau Seluruh PG1)</td>
        <td>Monitor Gorong-Gorong, Control Board, Form Input (Mode Monitor / View Only), Seluruh Master Data.</td>
        <td>Pengawasan progres fisik lapangan, pemantauan KPI pencapaian dropping dan pemasangan, serta evaluasi deviasi material pada Control Board.</td>
      </tr>
      <tr>
        <td><strong>Mandor Wilayah (User Wilayah)</strong></td>
        <td>Terkunci Khusus pada 1 Wilayah (misal: AW01 saja)</td>
        <td>Form Input (Order, Drop, Pasang Manual, Pindah Lokasi khusus petak di wilayah tugasnya).</td>
        <td>Pelaporan transaksi lapangan harian, pengajuan order gorong-gorong, konfirmasi kedatangan unit di petak, dan pencatatan hasil kerja harian.</td>
      </tr>
      <tr>
        <td><strong>TK Verifikator FE</strong></td>
        <td>Seluruh Wilayah (AW01 – AW07)</td>
        <td>Monitor Gorong-Gorong, Control Board (Akses Utama), Form Input (View Only), Seluruh Master Data.</td>
        <td>Audit fisik pemasangan gorong-gorong, pengunggahan data realisasi SAP bulanan, dan investigasi selisih data fisik vs sistem ERP.</td>
      </tr>
    </tbody>
  </table>

  <h2>1.4 Panduan Akses Portal &amp; Tata Cara Otentikasi</h2>
  <p>
    Aplikasi dapat diakses melalui peramban web modern (Google Chrome, Microsoft Edge, atau Mozilla Firefox) pada tautan resmi: <span class="code-inline">http://&lt;ip-server&gt;:3000/gorong-gorong</span>.
  </p>
  <p>
    Setiap pengguna diwajibkan melakukan proses otentikasi menggunakan kredensial berupa Nama Pengguna (<em>Username</em>) dan Kata Sandi (<em>Password</em>) yang telah didaftarkan oleh Administrator. Sesi pengguna dilindungi dengan token terenkripsi yang memiliki batas masa aktif (<em>session timeout</em>) guna mencegah penyalahgunaan pada komputer bersama di kantor kebun.
  </p>

  <!-- ==================== BAB II ==================== -->
  <div class="page-break"></div>
  <div class="header-tag">
    <span>Sistem Monitoring Gorong-Gorong PG1</span>
    <span>Bab II: Dashboard Monitoring Gorong-Gorong</span>
  </div>

  <h1>BAB II. DASHBOARD MONITORING GORONG-GORONG (MENU UTAMA)</h1>

  <h2>2.1 Kartu Ringkasan Indikator Kinerja Utama (KPI Metrics Summary)</h2>
  <p>
    Pada bagian paling atas halaman Dashboard Monitoring, sistem menyajikan 6 (enam) kartu ringkasan indikator kinerja utama (KPI) yang memberikan gambaran menyeluruh terhadap status pemenuhan material gorong-gorong secara seketika (<em>real-time</em>). Angka pada kartu ini secara dinamis mengikuti filter tahun, bulan, dan wilayah yang dipilih oleh pengguna:
  </p>

  <div class="feature-card">
    <div class="feature-title">1. Total Lokasi Order &amp; Total Belum Order</div>
    <p class="no-indent">
      Menampilkan jumlah petak lokasi kebun yang telah memiliki dokumen pengajuan order aktif dalam sistem, berdampingan dengan jumlah petak yang teridentifikasi memiliki kerentanan genangan air atau kebutuhan teknis drainase namun belum memiliki pengajuan order resmi (<em>Belum Order</em>).
    </p>
  </div>

  <div class="feature-card">
    <div class="feature-title">2. Total Kebutuhan Unit (Dia 40, 60, 80, 100 cm)</div>
    <p class="no-indent">
      Mengakumulasikan seluruh kuantitas unit gorong-gorong yang diminta dari formulir pengajuan order di seluruh petak terpilih. Metrik ini dipecah ke dalam empat diameter teknis standar: Diameter 40 cm (aliran debit kecil/tersier), Diameter 60 cm (saluran sedang), Diameter 80 cm (saluran utama petak), dan Diameter 100 cm (saluran pembuang primer/gorong-gorong induk jalan utama).
    </p>
  </div>

  <div class="feature-card">
    <div class="feature-title">3. Total Realisasi Kedatangan (Dropping) &amp; Persentase Kedatangan (%Kedatangan)</div>
    <p class="no-indent">
      Menghitung akumulasi fisik gorong-gorong yang telah berhasil dikirimkan dan tiba di petak kebun berdasarkan rekam data Form Drop. Persentase Kedatangan dihitung dengan rumus:
      <br>
      <span class="code-inline" style="display: block; margin: 4px 0; text-align: center; font-weight: bold;">
        %Kedatangan = (Total Realisasi Dropping / Total Permintaan Kebutuhan) × 100%
      </span>
      Kartu ini dilengkapi dengan indikator visual persentase yang berubah warna secara otomatis: Hijau (≥ 100%), Kuning (50% – 99%), dan Merah (&lt; 50%).
    </p>
  </div>

  <div class="feature-card">
    <div class="feature-title">4. Total Realisasi Pemasangan &amp; Persentase Terpasang (%Terpasang)</div>
    <p class="no-indent">
      Menampilkan jumlah total unit gorong-gorong yang telah tertanam secara fisik di lapangan berdasarkan rekapitulasi data pemasangan. Persentase Terpasang dihitung menggunakan formula:
      <br>
      <span class="code-inline" style="display: block; margin: 4px 0; text-align: center; font-weight: bold;">
        %Terpasang = (Total Realisasi Pasang / Total Permintaan Kebutuhan) × 100%
      </span>
      Metrik ini menjadi tolok ukur utama keberhasilan penuntasan infrastruktur drainase sebelum jadwal pengolahan tanah (<em>land preparation</em>) atau penanaman bibit nanas dimulai.
    </p>
  </div>

  <h2>2.2 Card Ringkasan Progres Pemenuhan Per Wilayah (Status Open)</h2>
  <p>
    Tepat di bawah deretan KPI utama, terdapat panel <strong>Ringkasan Per Wilayah</strong> yang menampilkan kartu individual untuk masing-masing wilayah kerja: AW01, AW02, AW03, AW04, AW05, AW06, dan AW07. Setiap kartu wilayah merangkum:
  </p>
  <ul>
    <li><strong>Jumlah Petak Aktif:</strong> Total petak lokasi di wilayah tersebut yang memiliki status operasional <em>Open</em>.</li>
    <li><strong>%Kedatangan Wilayah:</strong> Rasio total dropping terhadap kebutuhan khusus untuk petak berstatus <em>Open</em> di wilayah tersebut.</li>
    <li><strong>%Terpasang Wilayah:</strong> Rasio total unit terpasang terhadap kebutuhan khusus untuk petak berstatus <em>Open</em> di wilayah tersebut.</li>
    <li><strong>Badge Status Kinerja:</strong> Label warna otomatis yang menunjukkan tingkat kesehatan progres operasional wilayah (<em>On Track</em>, <em>Moderate</em>, atau <em>Delayed</em>).</li>
  </ul>

  <div class="alert-box">
    <div class="alert-title">Catatan Khusus Desain Logika Perhitungan (Pembaruan Sistem):</div>
    Persentase kedatangan dan persentase terpasang pada Card Ringkasan Per Wilayah telah diselaraskan secara matematis hanya menghitung petak-petak yang berstatus <strong>Open</strong> (aktif berjalan). Petak yang telah berstatus <em>Close</em> (selesai masa tanam atau ditutup secara administratif) tidak lagi membebani persentase berjalan. Nilai persentase ini identik dan selaras 100% dengan visualisasi pada Grafik Batang Pemenuhan per Wilayah.
  </div>

  <h2>2.3 Visualisasi Grafik Tren Bulanan &amp; Grafik Kinerja Wilayah</h2>
  <p>
    Dashboard dilengkapi dengan komponen grafik analitik interaktif yang menyajikan data historis dan perbandingan kinerja:
  </p>
  <ol>
    <li>
      <strong>Grafik Tren Pemenuhan Bulanan:</strong> Menampilkan kurva pergerakan permintaan kebutuhan gorong-gorong baru, realisasi dropping, dan realisasi pemasangan dari bulan Januari hingga Desember. Grafik ini membantu tim manajemen dalam mengevaluasi apakah kecepatan pasokan precast dari vendor sebanding dengan laju persiapan lahan perkebunan.
    </li>
    <li>
      <strong>Grafik Batang Komparasi Antar Wilayah (AW01 – AW07):</strong> Membandingkan capaian %Kedatangan dan %Terpasang antar wilayah secara berdampingan. Wilayah dengan batang pencapaian berwarna merah menunjukkan adanya hambatan drop material atau kendala ketersediaan alat berat pemasangan yang memerlukan intervensi segera dari Kepala Bagian Wilayah.
    </li>
  </ol>

  <h2>2.4 Widget Pemantauan Realisasi Harian (Today's Movement)</h2>
  <p>
    Widget ini berfungsi sebagai monitor harian (<em>daily log ticker</em>) yang mencatat pergerakan transaksi dropping dan pemasangan yang terjadi pada hari kerja berjalan. Informasi yang disajikan meliputi nomor petak yang menerima drop gorong-gorong hari ini, volume per diameter, identitas mandor pelaksana, serta sisa antrean pemasangan yang harus diselesaikan keesokan harinya.
  </p>

  <h2>2.5 Panel Filter Dinamis Terpadu &amp; Fitur Quick Search</h2>
  <p>
    Untuk memudahkan navigasi ribuan data petak kebun di seluruh PG1, disediakan panel penyaring (<em>Filter Bar</em>) dengan parameter:
  </p>
  <ul>
    <li><strong>Filter Tahun:</strong> Memilih tahun anggaran atau tahun tanam operasional (misal: 2024, 2025, 2026).</li>
    <li><strong>Filter Bulan:</strong> Mempersempit pantauan pada bulan tertentu atau memilih opsi <em>Semua Bulan</em>.</li>
    <li><strong>Filter Wilayah:</strong> Menyaring data spesifik untuk satu wilayah kerja (AW01 sampai AW07) atau menampilkan agregat seluruh wilayah PG1.</li>
    <li><strong>Filter Status Lokasi:</strong> Memfilter petak berdasarkan status operasional: <em>Semua</em>, <em>Open</em> (masih dalam siklus tanam/aktif), atau <em>Close</em> (petak selesai).</li>
    <li><strong>Filter Status Dropping:</strong> Menyaring petak dengan status <em>Belum Drop</em>, <em>Sebagian (On Progress)</em>, atau <em>Selesai Drop (Complete)</em>.</li>
    <li><strong>Filter Status Pasang:</strong> Menyaring petak dengan status <em>Belum Pasang</em>, <em>Sebagian Terpasang</em>, atau <em>Tuntas Terpasang</em>.</li>
    <li><strong>Kotak Pencarian Cepat (Quick Search):</strong> Memungkinkan pencarian instan berdasarkan kode petak lokasi (misal: <span class="code-inline">101A</span>, <span class="code-inline">204B</span>) dengan respon instan tanpa perlu memuat ulang seluruh halaman.</li>
    <li><strong>Tombol Reset Filter:</strong> Mengembalikan seluruh pengaturan filter ke kondisi default (Tahun berjalan, Semua Wilayah, Status Open).</li>
  </ul>

  <h2>2.6 Analisis Komprehensif Tabel Utama List Lokasi Order (54 Kolom Lengkap)</h2>
  <p>
    Tabel utama <strong>List Lokasi Order Gorong-Gorong</strong> merupakan jantung operasional sistem yang merangkum 54 kolom atribut data komprehensif untuk setiap petak kebun. Struktur kolom disusun ke dalam beberapa blok data logis:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Blok Kolom</th>
        <th style="width: 35%;">Daftar Kolom Utama</th>
        <th style="width: 50%;">Fungsi Teknis &amp; Formula Perhitungan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Identitas Lokasi</strong></td>
        <td>No, Lokasi, Wilayah, Afdeling, Luas (Ha), Status Lahan, Varietas Tanaman.</td>
        <td>Mengidentifikasi identitas geografis petak kebun bersumber dari Master Status Lokasi. Nama lokasi dapat diklik untuk membuka <em>Drawer Rincian Lokasi</em>.</td>
      </tr>
      <tr>
        <td><strong>2. Parameter Agronomi</strong></td>
        <td>Tgl Tanam Terakhir, Umur Tanaman (Bulan), Rencana Forcing, Rencana Panen, Kategori Waterlogging.</td>
        <td>Menampilkan fase pertumbuhan tanaman saat ini. Kategori Waterlogging (High/Medium/Low) menandakan urgensi penanganan drainase di petak terkait.</td>
      </tr>
      <tr>
        <td><strong>3. Permintaan Kebutuhan</strong></td>
        <td>Order Dia 40, Order Dia 60, Order Dia 80, Order Dia 100, Total Permintaan Gorong-Gorong.</td>
        <td>Kuantitas unit gorong-gorong yang diajukan oleh Mandor Wilayah. Total Permintaan merupakan penjumlahan dari keempat diameter tersebut.</td>
      </tr>
      <tr>
        <td><strong>4. Realisasi Kedatangan (Drop)</strong></td>
        <td>Drop Dia 40, Drop Dia 60, Drop Dia 80, Drop Dia 100, Total Realisasi Kedatangan, Tgl Terakhir Drop.</td>
        <td>Akumulasi fisik gorong-gorong yang telah tiba di petak dari seluruh rekam transaksi Form Drop. Tanggal Terakhir Drop mencatat waktu dropping paling mutakhir.</td>
      </tr>
      <tr>
        <td><strong>5. Realisasi Pemasangan (Pasang)</strong></td>
        <td>Pasang Dia 40, Pasang Dia 60, Pasang Dia 80, Pasang Dia 100, Total Realisasi Pasang, Tgl Terakhir Pasang.</td>
        <td>Akumulasi unit yang telah tertanam secara fisik berdasarkan rekap data pemasangan di lapangan.</td>
      </tr>
      <tr>
        <td><strong>6. Saldo Sisa Kebutuhan</strong></td>
        <td>Saldo Kebutuhan Belum Tiba (Saldo Drop), Saldo Belum Terpasang (Saldo Pasang).</td>
        <td>
          <span class="code-inline">Saldo Drop = Total Permintaan - Total Drop</span><br>
          <span class="code-inline">Saldo Pasang = Total Permintaan - Total Pasang</span>
        </td>
      </tr>
      <tr>
        <td><strong>7. Analisis Deviasi &amp; Progres</strong></td>
        <td>Deviasi Kedatangan, Deviasi Pemasangan, %Kedatangan, %Terpasang, Status Akhir Petak.</td>
        <td>
          <span class="code-inline">Deviasi Drop = Total Drop - Total Permintaan</span><br>
          <span class="code-inline">Deviasi Pasang = Total Pasang - Total Permintaan</span><br>
          Nilai negatif menunjukkan kekurangan pasokan/pasang; nilai 0 menunjukkan pemenuhan tepat; nilai positif menandakan kelebihan stok di petak.
        </td>
      </tr>
      <tr>
        <td><strong>8. Aksi Operasional</strong></td>
        <td>Tombol Drop Cepat, Pasang Cepat, Pindah Lokasi, dan Riwayat Transaksi.</td>
        <td>Memberikan jalan pintas bagi pengguna berwenang untuk melakukan pencatatan transaksi langsung dari baris tabel petak yang bersangkutan.</td>
      </tr>
    </tbody>
  </table>

  <h2>2.7 Analisis Tabel Lokasi Belum Order</h2>
  <p>
    Tabel <strong>Lokasi Belum Order</strong> menampilkan daftar petak kebun yang menurut analisis teknis lapangan memerlukan instalasi saluran drainase gorong-gorong, namun hingga saat ini belum memiliki pengajuan order resmi di sistem. Kriteria petak yang muncul pada tabel ini adalah:
  </p>
  <ol>
    <li>Petak memiliki riwayat kerentanan pada tabel <em>Master Waterlogging</em> (klasifikasi risiko High atau Medium).</li>
    <li>Petak sedang berada pada fase persiapan tanam (<em>land preparation</em>) atau berumur tanaman muda (&lt; 3 bulan setelah tanam) yang belum terpasang gorong-gorong permanen.</li>
    <li>Petak belum tercatat pada basis data pengajuan order berjalan di tahun bersangkutan.</li>
  </ol>
  <p>
    Melalui tabel ini, Supervisor dan Kepala Wilayah dapat segera memerintahkan Mandor untuk melakukan survei lapangan dan mengajukan order kebutuhan gorong-gorong sebelum genangan air merusak tanaman di musim penghujan.
  </p>

  <h2>2.8 Fitur Ekspor Data Laporan (Excel &amp; PDF Resmi)</h2>
  <p>
    Pada sudut kanan atas Dashboard Monitoring, tersedia tombol aksi ekspor data:
  </p>
  <ul>
    <li>
      <strong>Ekspor ke Excel (.xlsx):</strong> Menghasilkan berkas spreadsheet lengkap dengan format sel yang telah dikonfigurasi rapi, formula otomatis, judul kolom profesional, dan menyertakan seluruh 54 kolom data sesuai filter aktif yang sedang diterapkan oleh pengguna.
    </li>
    <li>
      <strong>Ekspor ke PDF Resmi (.pdf):</strong> Menghasilkan berkas cetak siap pakai (<em>print-ready</em>) yang memuat kop surat resmi perusahaan, ringkasan KPI, grafik pemenuhan wilayah, serta tabel rekapitulasi data petak yang dilengkapi dengan tanda tangan persetujuan pejabat berwenang.
    </li>
  </ul>

  <!-- ==================== BAB III ==================== -->
  <div class="page-break"></div>
  <div class="header-tag">
    <span>Sistem Monitoring Gorong-Gorong PG1</span>
    <span>Bab III: Control Board Gorong-Gorong</span>
  </div>

  <h1>BAB III. CONTROL BOARD GORONG-GORONG (REKONSILIASI SAP)</h1>

  <h2>3.1 Konsep Rekonsiliasi Realisasi Fisik Lapangan vs SAP ERP</h2>
  <p>
    Dalam tata kelola aset dan biaya operasional perkebunan berskala industri, keselarasan antara barang fisik yang terpasang di lapangan dengan pencatatan pembukuan material pada sistem Enterprise Resource Planning (ERP SAP) merupakan kewajiban audit yang mutlak. Ketidaksesuaian antara kedua sumber data tersebut dapat mengakibatkan selisih saldo inventori persediaan (<em>inventory discrepancy</em>), ketidakakuratan pembebanan biaya pemeliharaan petak (<em>cost center allocation</em>), serta risiko penyalahgunaan aset material.
  </p>
  <p>
    Modul <strong>Control Board Gorong-Gorong</strong> dirancang khusus sebagai alat audit dan verifikasi harian (<em>cross-verification engine</em>) yang secara otomatis membandingkan data pemasangan fisik yang dicatat oleh Mandor di lapangan dengan data pengeluaran material (<em>Goods Issue</em>) yang tercatat pada sistem SAP perusahaan.
  </p>

  <h2>3.2 Metrik Ringkasan Selisih &amp; Evaluasi Periode Berjalan</h2>
  <p>
    Control Board menyajikan panel penyaring periode evaluasi berbasis bulan tunggal (<em>single-month selector</em>) yang secara default langsung menampilkan data bulan kalender yang sedang berjalan. Pada bagian atas tabel, disajikan metrik audit ringkas:
  </p>
  <ul>
    <li><strong>Total Unit Terpasang Fisik Lapangan:</strong> Akumulasi unit gorong-gorong yang dilaporkan terpasang oleh tim operasional kebun pada bulan terpilih.</li>
    <li><strong>Total Unit Pengeluaran SAP ERP:</strong> Akumulasi unit gorong-gorong yang telah terbit dokumen pemakaian materialnya di SAP pada bulan terpilih.</li>
    <li><strong>Total Selisih (Deviasi):</strong> Selisih mutlak antara angka fisik lapangan dikurangi angka pencatatan SAP. Nilai deviasi 0 (nol) menunjukkan kondisi ideal (<em>perfect reconciliation</em>).</li>
    <li><strong>Rasio Keselarasan (%Match Ratio):</strong> Persentase jumlah transaksi petak yang telah berstatus selaras sempurna (Match) terhadap total populasi petak yang dievaluasi.</li>
  </ul>

  <h2>3.3 Tabel Verifikasi 3-Tier Merged (Status Match vs Check)</h2>
  <p>
    Tabel verifikasi pada Control Board mengadopsi struktur tampilan berlapis tiga tingkat (<em>3-Tier Merged Table</em>) yang mengelompokkan data berdasarkan Tanggal Transaksi, Wilayah Operasional, Kode Petak Lokasi, dan Rincian Diameter Gorong-Gorong. Setiap baris data verifikasi memiliki status hasil audit otomatis:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Status Audit</th>
        <th style="width: 20%;">Indikator Visual</th>
        <th style="width: 30%;">Kriteria Sistem</th>
        <th style="width: 35%;">Tindak Lanjut Operasional</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong style="color: #064e3b;">MATCH</strong></td>
        <td>Badge Hijau Segar (<span class="code-inline">bg-emerald-100 text-emerald-800</span>)</td>
        <td>Kuantitas fisik gorong-gorong yang terpasang di petak sama persis (identik 100%) dengan jumlah unit pengeluaran material di SAP untuk diameter yang bersangkutan.</td>
        <td>Transaksi terverifikasi tuntas. Data dikunci dan siap dilaporkan ke dalam laporan bulanan manajemen agrikultur.</td>
      </tr>
      <tr>
        <td><strong style="color: #b45309;">CHECK</strong></td>
        <td>Badge Kuning Amber (<span class="code-inline">bg-amber-100 text-amber-800</span>)</td>
        <td>Terdapat selisih kuantitas antara fisik terpasang dengan data SAP (angka fisik &gt; SAP atau angka SAP &gt; fisik).</td>
        <td>Memerlukan audit lapangan oleh Verifikator FE dan konfirmasi kepada Mandor Wilayah serta staf administrasi SAP.</td>
      </tr>
    </tbody>
  </table>

  <h2>3.4 Prosedur Investigasi Deviasi &amp; Penyelesaian Selisih Data</h2>
  <p>
    Apabila sistem menemukan baris transaksi dengan status <strong>CHECK</strong>, tim operasional wajib melakukan prosedur resolusi sebagai berikut:
  </p>
  <ol>
    <li>
      <strong>Kondisi Fisik Lebih Besar dari SAP (Fisik &gt; SAP):</strong> Menandakan material gorong-gorong telah dipasang oleh mandor di lapangan, namun dokumen pengeluaran material (reservasi barang di SAP) belum diterbitkan oleh bagian administrasi gudang. Tindak lanjut: Staf administrasi segera memproses dokumen <em>Goods Issue</em> di SAP sesuai nomor petak terkait.
    </li>
    <li>
      <strong>Kondisi SAP Lebih Besar dari Fisik (SAP &gt; Fisik):</strong> Menandakan material telah dikeluarkan dari gudang secara sistem, namun belum selesai dipasang di petak oleh tenaga kerja, atau terjadi kesalahan penginputan nomor petak saat reservasi di SAP. Tindak lanjut: Verifikator FE melakukan cek fisik ke petak untuk memastikan apakah gorong-gorong masih menumpuk di tepi jalan kebun (belum tertanam) atau dialihkan ke petak lain tanpa pelaporan.
    </li>
    <li>
      <strong>Koreksi Data:</strong> Setelah akar permasalahan teridentifikasi, pembaruan data dapat dilakukan melalui unggahan revisi SAP atau pembaruan formulir transaksi di portal.
    </li>
  </ol>

  <!-- ==================== BAB IV ==================== -->
  <div class="page-break"></div>
  <div class="header-tag">
    <span>Sistem Monitoring Gorong-Gorong PG1</span>
    <span>Bab IV: Formulir Input Operasional Lapangan</span>
  </div>

  <h1>BAB IV. FORMULIR INPUT OPERASIONAL LAPANGAN</h1>

  <h2>4.1 Antarmuka Form Input Multi-Lokasi &amp; Validasi Wilayah</h2>
  <p>
    Menu <strong>Form Input</strong> merupakan pintu gerbang pencatatan transaksi harian yang digunakan oleh para Mandor Wilayah di perkebunan. Untuk memaksimalkan efisiensi kerja pengguna di lapangan, sistem dirancang dengan konsep <em>Multi-Lokasi Slot</em> (default 3 slot pengisian sekaligus), sehingga mandor dapat melaporkan transaksi untuk beberapa petak kebun yang dikerjakan pada hari yang sama hanya dalam satu kali proses penyimpanan data.
  </p>
  <p>
    Sistem menerapkan proteksi wilayah kerja otomatis: bagi akun dengan peran <em>Mandor Wilayah</em>, kotak pemilihan lokasi hanya menampilkan daftar petak yang berada di bawah wilayah penugasannya (<span class="code-inline">assignedWilayah</span>), dan kotak input wilayah akan terkunci secara otomatis. Hal ini mencegah terjadinya kesalahan input petak milik wilayah lain.
  </p>

  <h2>4.2 Formulir Pengajuan Order Gorong-Gorong Baru</h2>
  <p>
    Digunakan saat mandor merencanakan kebutuhan pemasangan gorong-gorong baru pada petak kebun. Langkah-langkah penginputan:
  </p>
  <ol>
    <li>Buka tab <strong>Form Input</strong> pada navigasi utama, lalu pilih jenis transaksi: <strong>Order</strong>.</li>
    <li>Pilih <strong>Tanggal Pengajuan Order</strong> menggunakan pop-up kalender interaktif.</li>
    <li>Pada <strong>Slot Lokasi 1</strong>, pilih kode petak lokasi kebun dari menu tarik-turun (<em>dropdown</em>). Sistem secara otomatis mengisi nama wilayah yang sesuai.</li>
    <li>Masukkan kuantitas unit yang dibutuhkan pada masing-masing kotak diameter teknis: <strong>Dia 40</strong>, <strong>Dia 60</strong>, <strong>Dia 80</strong>, dan/atau <strong>Dia 100</strong>. Jika suatu diameter tidak dibutuhkan, biarkan bernilai 0 (nol).</li>
    <li>Jika terdapat petak lain yang ingin diajukan bersamaan, isi pada <strong>Slot Lokasi 2</strong> dan <strong>Slot Lokasi 3</strong>, atau klik tombol <em>Tambah Baris Lokasi</em>.</li>
    <li>Tuliskan catatan teknis pada kolom <strong>Keterangan</strong> (misal: "Kebutuhan perbaikan saluran crossing jalan utama petak").</li>
    <li>Klik tombol <strong>Simpan Transaksi Order</strong>. Sistem akan menyimpan baris transaksi baru pada tabel <span class="code-inline">MasterDataOrder</span> dan memperbarui saldo kebutuhan petak di tabel <span class="code-inline">LokasiOrderGorongGorong</span> secara instan tanpa menimpa data yang telah ada sebelumnya.</li>
  </ol>

  <h2>4.3 Formulir Pencatatan Kedatangan Material (Form Drop)</h2>
  <p>
    Digunakan saat material gorong-gorong beton tiba di lokasi petak kebun yang diangkut oleh armada truk atau traktor:
  </p>
  <ol>
    <li>Pilih jenis transaksi: <strong>Drop</strong> pada Form Input.</li>
    <li>Tentukan tanggal kedatangan material dan pilih kode petak lokasi yang menerima penurunan gorong-gorong.</li>
    <li>Ketikkan jumlah unit fisik yang berhasil diturunkan pada masing-masing kotak diameter (Dia 40, 60, 80, 100).</li>
    <li>Sistem secara otomatis melakukan validasi: jika jumlah drop melebihi sisa kebutuhan order petak, sistem akan memunculkan notifikasi peringatan (<em>warning confirmation</em>) untuk memastikan tidak ada kesalahan input nomor petak.</li>
    <li>Klik tombol <strong>Simpan Transaksi Drop</strong>. Sistem mencatat rekam baru di <span class="code-inline">MasterDataDrop</span>, meningkatkan akumulasi drop di petak terkait, dan menghitung ulang saldo kebutuhan yang belum tiba.</li>
  </ol>

  <h2>4.4 Formulir Pencatatan Pemasangan Fisik (Form Pasang Manual)</h2>
  <p>
    Digunakan saat gorong-gorong yang telah berada di petak selesai ditanam dan dipasang pada saluran drainase:
  </p>
  <ol>
    <li>Pilih jenis transaksi: <strong>Pasang Manual</strong> pada Form Input.</li>
    <li>Tentukan tanggal pelaksanaan pemasangan fisik di lapangan.</li>
    <li>Pilih kode petak lokasi kebun tempat gorong-gorong dipasang.</li>
    <li>Masukkan kuantitas unit yang telah tuntas terpasang berdasarkan masing-masing diameter teknis.</li>
    <li>Klik tombol <strong>Simpan Transaksi Pasang</strong>. Sistem akan mencatat transaksi di tabel <span class="code-inline">MasterDataPasangManual</span>, menambahkan nilai pada kolom realisasi pasang di tabel utama monitoring, serta mengurangi saldo unit yang belum terpasang.</li>
  </ol>

  <h2>4.5 Formulir Pemindahan Material Antar Petak (Form Pindah Lokasi)</h2>
  <p>
    Dalam dinamika operasional perkebunan, seringkali terjadi kondisi darurat di mana suatu petak kelebihan stok material dropping, sementara petak lain yang berdekatan mengalami kekurangan gorong-gorong dan harus segera ditangani. Fitur <strong>Form Pindah Lokasi</strong> hadir untuk mencatat relokasi material antar petak:
  </p>
  <ul>
    <li>
      <strong>Format Dua Kotak Lokasi:</strong> Tampilan form secara dinamis berubah menyediakan kotak <strong>Lokasi Pengirim (Asal)</strong> dan kotak <strong>Lokasi Penerima (Tujuan)</strong>.
    </li>
    <li>
      <strong>Mekanisme Buku Besar Real-Time:</strong> Saat disimpan, sistem secara otomatis:
      <ol>
        <li>Mencatat baris mutasi resmi pada tabel <span class="code-inline">MasterDataPindahLokasi</span>.</li>
        <li>Mengurangi angka saldo/dropping pada petak pengirim sebesar jumlah unit yang dipindahkan.</li>
        <li>Menambah angka dropping pada petak penerima sebesar jumlah unit yang sama.</li>
      </ol>
    </li>
    <li>Dengan demikian, integritas total saldo fisik gorong-gorong di seluruh perkebunan tetap seimbang dan terlacak secara akurat (<em>audit trail</em>).</li>
  </ul>

  <h2>4.6 Tabel Histori Transaksi Form &amp; Manajemen Koreksi Data</h2>
  <p>
    Pada bagian bawah formulir input, sistem menampilkan <strong>Tabel Histori Transaksi Form</strong> yang mencatat daftar transaksi yang baru saja diinput. Khusus untuk pengguna dengan peran <em>Administrator</em> atau <em>Super Admin</em>, tersedia tombol <strong>Edit</strong> dan <strong>Hapus</strong> pada setiap baris transaksi guna memfasilitasi koreksi data apabila terjadi kesalahan pengetikan kuantitas atau tanggal oleh mandor lapangan.
  </p>

  <!-- ==================== BAB V ==================== -->
  <div class="page-break"></div>
  <div class="header-tag">
    <span>Sistem Monitoring Gorong-Gorong PG1</span>
    <span>Bab V: Modul Master Data Terpadu</span>
  </div>

  <h1>BAB V. MODUL MASTER DATA TERPADU</h1>

  <h2>5.1 Master Status Lokasi &amp; Prosedur Upload Excel Massal</h2>
  <p>
    Sub-menu <strong>Master Status Lokasi</strong> memuat basis data induk seluruh petak lahan yang ada di wilayah kerja PG1. Setiap baris data memuat atribut profil komprehensif, antara lain: Kode Lokasi, Wilayah Kerja, Afdeling, Luas Netto (Hektar), Status Siklus Lahan, Varietas Tanaman Nanas, Tanggal Tanam Terakhir, Umur Tanaman Berjalan, Estimasi Tanggal Forcing (Induksi Pembungaan), dan Estimasi Tanggal Panen.
  </p>
  <div class="feature-card">
    <div class="feature-title">Tata Cara Pengunggahan Data Massal (Upload Excel Master Status Lokasi):</div>
    <ol>
      <li>Buka menu <strong>Master Data</strong> &gt; pilih sub-menu <strong>Master Status Lokasi</strong>.</li>
      <li>Klik tombol <strong>Download Template Excel</strong> pada pojok kanan atas tabel untuk mengunduh template spreadsheet standar sistem.</li>
      <li>Buka berkas template dan isi data petak sesuai struktur kolom yang telah ditentukan. Pastikan format tanggal ditulis dengan format baku <span class="code-inline">YYYY-MM-DD</span> atau <span class="code-inline">DD/MM/YYYY</span>.</li>
      <li>Simpan berkas Excel, kemudian kembali ke aplikasi dan klik tombol <strong>Upload Data Excel</strong>.</li>
      <li>Pilih berkas yang telah disiapkan, lalu sistem akan memvalidasi kelayakan format. Jika validasi sukses, sistem melakukan proses sinkronisasi massal (<em>bulk upsert</em>) ke basis data PostgreSQL dalam hitungan detik.</li>
    </ol>
  </div>

  <h2>5.2 Master Waterlogging (Peta Risiko &amp; Rekomendasi FE)</h2>
  <p>
    Sub-menu <strong>Master Waterlogging</strong> menyimpan peta kerentanan genangan air pada setiap petak perkebunan hasil survei topografi tim Field Engineering (FE). Data ini mengklasifikasikan tingkat kerentanan ke dalam tiga tingkatan: <em>High Risk</em>, <em>Medium Risk</em>, dan <em>Low Risk</em>, dilengkapi dengan rekomendasi teknis mengenai jumlah titik saluran crossing dan spesifikasi diameter gorong-gorong yang wajib dipasang. Data pada tabel ini menjadi landasan munculnya rekomendasi pada tabel <em>Lokasi Belum Order</em>.
  </p>

  <h2>5.3 Master Upload Data Realisasi SAP ERP</h2>
  <p>
    Sub-menu ini diperuntukkan bagi tim Verifikator FE dan Administrator untuk mengunggah berkas rekapitulasi pengeluaran material gorong-gorong dari sistem ERP SAP (laporan mutasi material kode akun gorong-gorong beton). Berkas yang diunggah diproses oleh sistem untuk membaca Nomor Reservasi, Tanggal Posting, Nomor Petak Tujuan, dan Kuantitas per Diameter. Data yang terunggah secara otomatis langsung terhubung ke modul <strong>Control Board</strong> untuk pencocokan harian.
  </p>

  <h2>5.4 Master Histori Order, Drop, Pasang Manual, &amp; Pindah Lokasi</h2>
  <p>
    Empat sub-menu master ini berfungsi sebagai buku besar digital (<em>ledger</em>) yang menyimpan seluruh jejak rekam historis setiap transaksi yang pernah dilakukan di dalam sistem tanpa pernah menghapus data terdahulu:
  </p>
  <ul>
    <li><strong>Master Data Order:</strong> Menyimpan kronologi seluruh pengajuan kebutuhan material, mencakup waktu input, nama mandor pemohon, dan spesifikasi pesanan.</li>
    <li><strong>Master Data Drop:</strong> Menyimpan seluruh histori penurunan material di petak, menjadi rujukan bukti fisik apabila terjadi klaim kekurangan kiriman dari vendor.</li>
    <li><strong>Master Data Pasang Manual:</strong> Menyimpan histori penyelesaian pekerjaan fisik pemasangan di lapangan.</li>
    <li><strong>Master Data Pindah Lokasi:</strong> Menyimpan seluruh berkas mutasi pemindahan material antar petak, mencakup lokasi asal, lokasi tujuan, dan alasan mutasi.</li>
  </ul>

  <!-- ==================== BAB VI ==================== -->
  <div class="page-break"></div>
  <div class="header-tag">
    <span>Sistem Monitoring Gorong-Gorong PG1</span>
    <span>Bab VI: Administrasi Pengguna &amp; Tata Kelola Akses</span>
  </div>

  <h1>BAB VI. ADMINISTRASI PENGGUNA &amp; TATA KELOLA AKSES</h1>

  <h2>6.1 Manajemen Pengguna &amp; Pembatasan Wilayah Kerja</h2>
  <p>
    Modul <strong>Manajemen User</strong> hanya dapat diakses oleh akun dengan kewenangan <em>Administrator</em> dan <em>Super Admin</em>. Modul ini bertanggung jawab atas pengelolaan seluruh akun pengguna yang beroperasi di dalam portal:
  </p>
  <ul>
    <li><strong>Daftar Akun Pengguna:</strong> Menampilkan tabel seluruh pengguna terdaftar, username, nama lengkap, peran (role), status akun (Aktif/Nonaktif), dan wilayah penugasan (<span class="code-inline">assignedWilayah</span>).</li>
    <li><strong>Pembatasan Wilayah Kerja:</strong> Kunci keamanan utama operasional terletak pada kolom <span class="code-inline">assignedWilayah</span>. Ketika seorang Mandor Wilayah diberi nilai wilayah <span class="code-inline">AW02</span>, seluruh formulir transaksi yang dibukanya akan secara otomatis terkunci pada wilayah AW02, sehingga mandor tersebut tidak dapat melihat maupun memodifikasi data wilayah lain.</li>
  </ul>

  <h2>6.2 Prosedur Registrasi Akun, Penugasan Peran, &amp; Reset Sandi</h2>
  <p>
    Untuk menambahkan pengguna baru ke dalam sistem:
  </p>
  <ol>
    <li>Buka menu <strong>Manajemen User</strong>, lalu klik tombol <strong>Tambah Pengguna Baru</strong>.</li>
    <li>Isi formulir data pengguna: Nama Lengkap, Alamat Surel (Email resmi perusahaan), Nama Pengguna (Username unik), dan Kata Sandi Awal.</li>
    <li>Pilih <strong>Peran Pengguna (Role)</strong> dari pilihan yang tersedia: <em>Super Admin</em>, <em>Admin</em>, <em>Kepala Wilayah</em>, <em>User Wilayah (Mandor)</em>, atau <em>TK Verifikator FE</em>.</li>
    <li>Jika memilih peran <em>User Wilayah</em>, pilih wilayah penugasannya pada kotak pilihan wilayah (AW01 sampai AW07).</li>
    <li>Klik <strong>Simpan Pengguna</strong>. Akun baru siap digunakan untuk masuk ke portal.</li>
    <li>Apabila pengguna lapangan lupa kata sandi, Administrator dapat menekan tombol <strong>Reset Password</strong> pada baris nama pengguna tersebut untuk menerbitkan kata sandi sementara yang baru.</li>
  </ol>

  <!-- ==================== BAB VII ==================== -->
  <div class="page-break"></div>
  <div class="header-tag">
    <span>Sistem Monitoring Gorong-Gorong PG1</span>
    <span>Bab VII: Panduan Pemecahan Masalah (FAQ)</span>
  </div>

  <h1>BAB VII. PANDUAN PEMECAHAN MASALAH (FAQ &amp; TROUBLESHOOTING)</h1>

  <h2>7.1 Penanganan Gangguan Akses &amp; Otorisasi</h2>
  <div class="feature-card">
    <div class="feature-title">Tanya: Mengapa saat membuka menu Master Data atau Control Board, aplikasi otomatis mengalihkan layar kembali ke menu Form Input?</div>
    <p class="no-indent">
      <strong>Jawaban:</strong> Kondisi tersebut terjadi karena akun Anda terdaftar dengan peran <em>User Wilayah (Mandor)</em>. Berdasarkan matriks keamanan sistem, peran mandor wilayah dibatasi hanya memiliki hak akses pada formulir input operasional. Jika tugas Anda memerlukan akses pemantauan atau audit, mintalah kepada Administrator Agronomy untuk memperbarui peran akun Anda menjadi <em>Kepala Wilayah</em> atau <em>Verifikator FE</em>.
    </p>
  </div>

  <div class="feature-card">
    <div class="feature-title">Tanya: Mengapa muncul pesan kesalahan "Sesi Anda telah kedaluwarsa. Silakan masuk kembali"?</div>
    <p class="no-indent">
      <strong>Jawaban:</strong> Demi menjaga keamanan data operasional perusahaan, sistem secara otomatis mengunci sesi peramban yang tidak aktif selama periode waktu tertentu. Solusinya, muat ulang (refresh) halaman peramban dan masukkan kembali username serta password Anda pada formulir login.
    </p>
  </div>

  <h2>7.2 Penanganan Kendala Sinkronisasi &amp; Validasi Data</h2>
  <div class="feature-card">
    <div class="feature-title">Tanya: Mengapa kode petak lokasi kebun saya tidak muncul pada kotak dropdown pilihan lokasi di Form Input?</div>
    <p class="no-indent">
      <strong>Jawaban:</strong> Pastikan dua hal berikut: (1) Periksa apakah petak tersebut sudah terdaftar di basis data <em>Master Status Lokasi</em> dengan status operasional <em>Open</em>; jika belum ada, minta Administrator untuk mengunggah pembaruan status petak. (2) Pastikan petak tersebut memang berada di bawah wilayah penugasan akun Anda (misal: mandor AW01 tidak akan menemukan petak milik wilayah AW02).
    </p>
  </div>

  <div class="feature-card">
    <div class="feature-title">Tanya: Bagaimana cara mengatasi status "CHECK" yang muncul pada Control Board?</div>
    <p class="no-indent">
      <strong>Jawaban:</strong> Periksa rincian angka fisik terpasang vs angka SAP pada baris petak terkait. Hubungi mandor yang bersangkutan untuk memastikan apakah fisik gorong-gorong benar-benar telah dipasang di petak tersebut. Jika fisik sudah terpasang namun SAP masih kosong, koordinasikan dengan petugas administrasi gudang untuk menerbitkan dokumen <em>Goods Issue</em> di SAP. Setelah berkas revisi SAP diunggah ulang ke portal, status akan otomatis berubah menjadi <strong>MATCH</strong>.
    </p>
  </div>

  <h2>7.3 Saluran Dukungan Teknis &amp; Helpdesk Operasional</h2>
  <p>
    Apabila Anda mengalami kendala teknis pada sistem, kegagalan fungsi tombol, atau membutuhkan pembaruan data dalam skala besar yang tidak dapat diselesaikan melalui buku panduan ini, silakan menghubungi tim dukungan resmi:
  </p>
  <ul>
    <li><strong>Helpdesk IT &amp; Digital Systems PG1:</strong> Gedung Agrieksekutif Lantai 2, Kantor Pusat PG1.</li>
    <li><strong>Layanan Pesan Cepat (WhatsApp Helpdesk):</strong> +62 812-XXXX-XXXX (Jam Kerja Operasional: 07.00 – 16.30 WIB).</li>
    <li><strong>Surat Elektronik (Email Dukungan):</strong> <span class="code-inline">agronomy.systems@greatgiantpineapple.com</span>.</li>
  </ul>

  <div style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: center; font-size: 10pt; color: #6b7280;">
    &copy; 2026 PT Great Giant Pineapple — Plantation Group 1 (PG1). Seluruh hak cipta dilindungi undang-undang.<br>
    Buku Panduan Operasional Sistem Monitoring Gorong-Gorong • Edisi November 2026
  </div>

</body>
</html>
`;

const htmlFilePath = path.join(__dirname, 'manual_book.html');
fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log('HTML Manual Book written to:', htmlFilePath);

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const pdfFilePath = path.join(publicDir, 'Manual_Book_Dashboard_Gorong_Gorong_PG1.pdf');

console.log('Rendering PDF via Headless Edge...');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfFilePath}" --no-pdf-header-footer "${htmlFilePath}"`;

try {
  execSync(cmd, { stdio: 'inherit' });
  if (fs.existsSync(pdfFilePath)) {
    const stat = fs.statSync(pdfFilePath);
    console.log(`SUCCESS! PDF created at: ${pdfFilePath} (${stat.size} bytes)`);
  } else {
    console.error('PDF file not found after conversion!');
  }
} catch (err) {
  console.error('Error generating PDF with Edge:', err);
}
