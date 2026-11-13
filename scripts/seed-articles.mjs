// Temporary development seeder for the public pages.
// Inserts published articles across all channels so the homepage, /kanal pages,
// and article pages have realistic content while the editorial team builds a real backlog.
//
// Usage:
//   node scripts/seed-articles.mjs          → dry run, prints the plan, writes nothing
//   node scripts/seed-articles.mjs --apply  → inserts (skips slugs that already exist)
//
// Delete seeded rows later with:
//   delete from public.articles where slug like 'seed-%';

import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const databaseUrl = env.match(/^DATABASE_URL=(.*)$/m)?.[1];
if (!databaseUrl) throw new Error("DATABASE_URL tidak ditemukan di .env.local");

const apply = process.argv.includes("--apply");

// cover_url must reference an existing object in the article-images bucket owned by the author (DB trigger),
// so seeds alternate between the two real photos already uploaded by the author account.
const imageCoffee = "https://fmjwfkezfqkeookjiaaw.supabase.co/storage/v1/object/public/article-images/5f245716-1a88-4b71-a4ae-8ea86de02d3b/590cd1f9-ce7d-47f7-aa56-3fb0a295bd6e.webp";
const imageBoat = "https://fmjwfkezfqkeookjiaaw.supabase.co/storage/v1/object/public/article-images/5f245716-1a88-4b71-a4ae-8ea86de02d3b/342b7d18-8d6d-45ab-872e-f8af242619bf.webp";
const author = "5f245716-1a88-4b71-a4ae-8ea86de02d3b"; // profile "Daffa Wijaya"

const daysAgo = (d, h = 0) => new Date(Date.now() - d * 86_400_000 - h * 3_600_000);

const articles = [
  { cat: "daerah", title: "Samarinda Gandeng Warga Bersihkan Saluran Air di Kecamatan Sungai Pinang", excerpt: "Warga bersama RT dan Dinas PUPR membersihkan saluran air yang tersumbat sampah plastik dan dedaunan menjelang musim hujan.", location: "Samarinda", seed: "samarinda-sungai-pinang", days: 1 },
  { cat: "daerah", title: "Balikpapan Fokus Bangun Drainase dan Jalan Lingkar di Kawasan Klandasan", excerpt: "DPU Balikpapan mulai pembangunan drainase primer dan jalan lingkar senilai Rp18,2 miliar untuk mengurangi genangan.", location: "Balikpapan", seed: "balikpapan-klandasan", days: 3 },
  { cat: "ekonomi", title: "Harga Cabai di Pasar Pagi Balikpapan Naik Jelang Musim Hujan", excerpt: "Harga cabai rawit merah naik dari Rp42 ribu menjadi Rp58 ribu per kilogram akibat pasokan dari sentra produksi menipis.", location: "Balikpapan", seed: "ekonomi-cabai", days: 2 },
  { cat: "ekonomi", title: "Pemkot Kutai Kartanegara Resmi Buka Kawasan Industri Baru di Loa Janan", excerpt: "Kawasan industri 312 hektare di Loa Janan dipersiapkan untuk industri pengolahan kelapa dan nikel dengan 4.000 tenaga kerja lokal.", location: "Kutai Kartanegara", seed: "ekonomi-loajanan", days: 5 },
  { cat: "pendidikan", title: "Siswa SMK di Samarinda Raih Juara Lomba Robotika Tingkat Nasional", excerpt: "Tim robotika SMK Negeri 3 Samarinda menjadi juara pertama kategori autonomous rescue di ajang KRCI 2026.", location: "Samarinda", seed: "pendidikan-robotika", days: 1 },
  { cat: "pendidikan", title: "Pemerintah Targetkan 100 Sekolah Adiwiyata di Kalimantan Timur", excerpt: "Tiga puluh satu sekolah sudah terakreditasi Adiwiyata tingkat nasional, sisanya akan didampingi hingga 2027.", location: "Samarinda", seed: "pendidikan-adiwiyata", days: 6 },
  { cat: "wisata-budaya", title: "Festival Lembah Mahakam 2026 Akan Digelar pada 10 Oktober", excerpt: "Festival dua hari ini menampilkan tarian tradisional, kuliner khas Kutai, dan lomba perahu lesung di Desa Loh Haji.", location: "Kutai Kartanegara", seed: "wisata-mahakam", days: 2 },
  { cat: "wisata-budaya", title: "Tari Jepen Tampil Memukau di Pembukaan Pekan Budaya Samarinda", excerpt: "Dua ratus penari muda menampilkan Tari Jepen Massal di Tepian Mahakam disaksikan ribuan warga.", location: "Samarinda", seed: "wisata-jepen", days: 8 },
  { cat: "opini", title: "Opini: Kaltim Perlu Merombak Tata Kelola Anggaran Pendidikan", excerpt: "Dana pendidikan masih tersebar di banyak program tanpa prioritas, sehingga hasilnya tidak merata.", location: "Samarinda", seed: "opini-anggaran", days: 4 },
  { cat: "kesehatan", title: "RSUD Abdul Wahab Sjahranie Tambah Tiga Ambulans Baru", excerpt: "Tiga ambulans bantuan Pemprov Kaltim akan memperkuat layanan tanggap darurat di seluruh wilayah Samarinda.", location: "Samarinda", seed: "kesehatan-ambulans", days: 3 },
  { cat: "kesehatan", title: "Dinkes Kaltim Imbau Warga Vaksinasi Influenza Musim Ini", excerpt: "Kasus ISPA meningkat 18 persen di tiga bulan terakhir; warga lansia dan anak-anak diprioritaskan untuk vaksinasi.", location: "Samarinda", seed: "kesehatan-influenza", days: 7 },
  { cat: "lingkungan", title: "Sungai Mahakam Meluap, Warga di Lojsari dan Sungai Pinang Diimbau Waspada", excerpt: "Ketinggian air mencapai 12,4 meter pada Jumat dini hari; BPBD menyiapkan evakuasi mandiri untuk 400 KK.", location: "Samarinda", seed: "lingkungan-mahakam", days: 1 },
  { cat: "lingkungan", title: "Satwa Liar Kembali Masuk Permukiman di Penajam Paser Utara", excerpt: "Seekor beruang madu terekam masuk ke kebun warga; BKSDA memasang kandang jebak dan mengimbau warga tidak panik.", location: "Penajam Paser Utara", seed: "lingkungan-beruang", days: 9 },
  { cat: "teknologi", title: "Startup Kaltim Raih Pendanaan Seri A Senilai 5 Juta Dolar AS", excerpt: "Startup agritech asal Balikpapan fokus pada rantai pasok komoditas sawit berkelanjutan untuk pasar ekspor.", location: "Balikpapan", seed: "teknologi-startup", days: 5 },
  { cat: "teknologi", title: "Pemkot Bontang Uji Coba Smart Meter Air Rumah Tangga", excerpt: "Lima ratus pelanggan di Kelurahan Bontang Kuala menjadi pilot project meteran air digital pertama di Kaltim.", location: "Bontang", seed: "teknologi-smart-meter", days: 10 },
  { cat: "gaya-hidup", title: "Kafe-kafe di Samarinda Mulai Menjual Menu Lokal: Kopi Kukar Hingga Bandeng Presto", excerpt: "Tren kuliner lokal mengangkat UMKM Samarinda; tiga kafe baru membuka menu andalan berbasis bahan lokal.", location: "Samarinda", seed: "gayahidup-kafe", days: 6 },
  { cat: "olahraga", title: "Kaltim Gagal ke Final PON XXI Setelah Dikalahkan Jawa Timur", excerpt: "Tim bola voli putri Kaltim kalah 0-3 di semifinal; pelatih menjanjikan evaluasi besar jelang PON berikutnya.", location: "Samarinda", seed: "olahraga-pon", days: 2 },
  { cat: "olahraga", title: "Timnas Indonesia U-23 Main di Balikpapan Bulan Depan", excerpt: "Laga uji coba melawan Thailand di Stadion Aji Imbut Tenggarong akan terbuka untuk penonton umum.", location: "Tenggarong", seed: "olahraga-timnas", days: 11 },
  { cat: "ekonomi", title: "Pertumbuhan Ekonomi Kaltim Tembus 6,1 Persen, Tertinggi di Indonesia", excerpt: "BPS mencatat pertumbuhan dipicu sektor pertambangan, perkebunan, dan konstruksi IKN.", location: "Samarinda", seed: "ekonomi-pertumbuhan", days: 12, featured: true },
  { cat: "wisata-budaya", title: "Keraton Kutai Kartanegara di Dondang Dibuka untuk Wisata Sejarah", excerpt: "Pemugaran keraton selesai; pengunjung kini bisa melihat koleksi pusaka dan naskah kuno dari masa Kesultanan Kutai.", location: "Kutai Kartanegara", seed: "wisata-keraton", days: 13 },
  { cat: "pendidikan", title: "Beasiswa Mahasiswa Kaltim dari Dana CSR Perusahaan Sawit Dibuka", excerpt: "Dua ratus beasiswa penuh S1 mencakup biaya kuliah dan biaya hidup untuk putra-putri daerah.", location: "Samarinda", seed: "pendidikan-beasiswa", days: 14 },
  { cat: "teknologi", title: "Kampus ITB Buka Program Studi Kecerdasan Buatan di Bontang", excerpt: "Program baru ini menyiapkan talenta digital untuk industri energi dan digital IKN.", location: "Bontang", seed: "teknologi-itb", days: 15, featured: true },
  { cat: "daerah", title: "Bupati PPU Resmikan Puskesmas Baru di Kecamatan Sepaku", excerpt: "Puskesmas Sepaku jadi pusat layanan primer untuk kawasan IKN dengan kapasitas 12 tempat tidur.", location: "Penajam Paser Utara", seed: "daerah-sepaku", days: 16 },
  { cat: "lingkungan", title: "KLHK Cabut Izin Tambang di Kawasan Hutan di Muara Jawa", excerpt: "Empat izin usaha pertambangan operasi-produksi dicabut karena melanggar batas kawasan hutan lindung.", location: "Muara Jawa", seed: "lingkungan-klhk", days: 17 },
];

// Extra filler articles for Bisnis / Gaya Hidup / Olahraga / Opini so the channel pages have enough content to layout
const moreArticles = [
  { cat: "bisnis", title: "Tembus 32 Persen, Investasi IKN Dikuasai Sektor Konstruksi", excerpt: "59 persen dari total investasi IKN per semester ini mengalir ke konstruksi, properti, dan infrastruktur transportasi.", location: "Sepaku", seed: "bisnis-ikn-konstruksi", days: 1 },
  { cat: "bisnis", title: "UMKM Kaltim Naik Kelas: Fintech Permudah Modal Usaha Kecil", excerpt: "Puluhan UMKM di Samarinda dan Balikpapan memanfaatkan fintech peer-to-peer lending untuk mengembangkan usaha.", location: "Samarinda", seed: "bisnis-umkm-fintech", days: 2 },
  { cat: "bisnis", title: "Ekspor Sawit Kaltim Tembus Rp45 Triliun Tahun Ini", excerpt: "Volume ekspor minyak sawit mentah naik 12 persen dibanding tahun lalu; tujuan utama India, Tiongkok, dan Pakistan.", location: "Balikpapan", seed: "bisnis-ekspor-sawit", days: 3 },
  { cat: "bisnis", title: "Rupiah Menguat, Eksportir Kaltim Tarik Napas", excerpt: "Penguatan rupiah ke level Rp15.200 per dolar AS membantu eksportir mengamankan harga jual di pasar internasional.", location: "Samarinda", seed: "bisnis-rupiah", days: 4 },
  { cat: "bisnis", title: "BUMN Klaim Proyek Tol IKN Terealisasi 65 Persen", excerpt: "Progresnya meliputi konstruksi jalan utama, jembatan sungai, dan sistem drainase di kawasan inti Nusantara.", location: "Sepaku", seed: "bisnis-tol-ikn", days: 5 },
  { cat: "bisnis", title: "Transaksi Digital Balikpapan Naik 180 Persen Setahun", excerpt: "QRIS dan e-wallet paling populer di kalangan UMKM; pedagang pasar tradisional mulai beralih ke pembayaran digital.", location: "Balikpapan", seed: "bisnis-digital", days: 6 },
  { cat: "bisnis", title: "Pemilik Kedai Kopi di Samarinda Ungkap Tips Bertahan di Tengah Ekonomi", excerpt: "Tiga kedai kopi lokal berbagi strategi bertahan: menu lokal, harga terjangkau, dan lokasi strategis.", location: "Samarinda", seed: "bisnis-kedai-kopi", days: 7 },
  { cat: "bisnis", title: "Pasar Pagi Balikpapan Pasok Ikan ke Samarinda, Harga Mulai Stabil", excerpt: "Distribusi ikan laut dari Balikpapan membantu memenuhi kebutuhan protein hewani di Samarinda.", location: "Balikpapan", seed: "bisnis-ikan", days: 8 },
  { cat: "bisnis", title: "Pemprov Kaltim Susun Remda IKN: Mendorong UMKM Lokal", excerpt: "Regulasi baru akan memprioritaskan pengadaan barang dan jasa dari pelaku usaha mikro di sekitar IKN.", location: "Samarinda", seed: "bisnis-remda", days: 9 },
  { cat: "bisnis", title: "Bisnis Tambang Berkelanjutan: Kaltim Jadi Contoh Nasional", excerpt: "Tiga perusahaan tambang di Kaltim menerapkan standar ESG internasional dan mendapat sertifikasi internasional.", location: "Kutai Kartanegara", seed: "bisnis-tambang", days: 10 },
  { cat: "bisnis", title: "Nelayan Bontang Alihkan Penjualan ke E-Commerce, Omzet Naik", excerpt: "Penjualan ikan segar lewat aplikasi e-commerce membantu nelayan meningkatkan pendapatan rata-rata 35 persen.", location: "Bontang", seed: "bisnis-nelayan", days: 11 },
  { cat: "bisnis", title: "Industri Nikel Kaltim Serap 12 Ribu Tenaga Kerja Lokal", excerpt: "Pengembangan kawasan industri nikel di Kutai Timur membuka lapangan kerja untuk masyarakat sekitar.", location: "Kutai Timur", seed: "bisnis-nikel", days: 12 },
  { cat: "bisnis", title: "IKM Kaltim Diproyeksi Tumbuh 8 Persen di 2026", excerpt: "Sektor makanan olahan, kerajinan tangan, dan furnitur menjadi penggerak utama pertumbuhan industri kecil.", location: "Samarinda", seed: "bisnis-ikm", days: 13 },

  { cat: "gaya-hidup", title: "Festival Kopi Nusantara Kembali Digelar di Samarinda", excerpt: "Puluhan roastery dari berbagai daerah menyajikan kopi khas Nusantara dengan sesi cupping dan workshop.", location: "Samarinda", seed: "gh-festival-kopi", days: 1 },
  { cat: "gaya-hidup", title: "6 Kafe Paling Instagramable di Balikpapan untuk Nongkrong Weekend", excerpt: "Dari Rooftop Sarinda hingga Coffee Shop Ternama, berikut rekomendasi tempat nongkrong paling fotogenik.", location: "Balikpapan", seed: "gh-kafe-instagram", days: 2 },
  { cat: "gaya-hidup", title: "Tren Fashion Lokal: Brand Kaltim Masuk Pasar Nasional", excerpt: "Beberapa brand pakaian lokal Kaltim menembus pasar Jakarta dan Surabaya dengan desain khas etnik modern.", location: "Samarinda", seed: "gh-fashion-lokal", days: 3 },
  { cat: "gaya-hidup", title: "Kuliner Malam di Jalan Jakarta Samarinda Kembali Ramai", excerpt: "Deretan tenda kuliner di Jalan Jakarta Samarinda kembali hidup sejak akhir pekan lalu memancing minat pengunjung.", location: "Samarinda", seed: "gh-kuliner-jakarta", days: 4 },
  { cat: "gaya-hidup", title: "Festival Warung Kopi Kukar Suguhkan 40 Kedai Lokal", excerpt: "Event kuliner tahunan ini menghadirkan 40 kedai kopi dari Kukar dengan konsep live music dan workshop barista.", location: "Tenggarong", seed: "gh-festival-kukar", days: 5 },
  { cat: "gaya-hidup", title: "Fashion Show Kain Ulin Meriahkan Pembukaan Pekan Budaya", excerpt: "Ratusan model mengenakan busana dari kain uliting khas Dayak Kalimantan dalam acara yang memukau ribuan penonton.", location: "Samarinda", seed: "gh-fashion-ulu", days: 6 },
  { cat: "gaya-hidup", title: "Wisata Religi: 5 Masjid Bersejarah yang Wajib Dikunjungi di Kaltim", excerpt: "Termasuk Masjid Jami Lok Binuang di Kukar yang berusia lebih dari 200 tahun dengan arsitektur khas Melayu.", location: "Kutai Kartanegara", seed: "gh-wisata-religi", days: 7 },
  { cat: "gaya-hidup", title: "Review Gadget: Smartphone Terbaru yang Cocok untuk Content Creator", excerpt: "Dari kamera ganda hingga baterai tahan lama, berikut smartphone dengan harga terjangkau untuk kebutuhan konten.", location: "Samarinda", seed: "gh-review-gadget", days: 8 },
  { cat: "gaya-hidup", title: "Tips Styling Hijab untuk Tampilan Sehari-hari yang Praktis", excerpt: "Lima gaya hijab sederhana yang bisa diaplikasikan sendiri untuk berbagai acara dari kasual hingga semi-formal.", location: "Samarinda", seed: "gh-styling-hijab", days: 9 },
  { cat: "gaya-hidup", title: "Hiburan Akhir Pekan: Konser Musik Lokal di Balikpapan Bulan Depan", excerpt: "Dua band lokal populer akan tampil di Balikpapan Convention Center dengan harga tiket mulai Rp75 ribu.", location: "Balikpapan", seed: "gh-konser-balikpapan", days: 10 },
  { cat: "gaya-hidup", title: "Cara Memilih Baju Olahraga yang Nyaman dan Tahan Lama", excerpt: "Panduan memilih bahan, ukuran, dan merek pakaian olahraga yang tepat untuk berbagai jenis aktivitas olahraga.", location: "Samarinda", seed: "gh-baju-olahraga", days: 11 },
  { cat: "gaya-hidup", title: "Inspirasi Outfit untuk Tempat Acara Kasual dan Semiformal", excerpt: "Kombinasi blazer dan sepatu oxford untuk semiformal; polo dan chinos untuk kasual, tips dari stylist ternama.", location: "Samarinda", seed: "gh-outfit-event", days: 12 },

  { cat: "olahraga", title: "Kaltim Targetkan 6 Medali Emas di PON XXI Aceh-Sumut", excerpt: "Tim voli, panahan, dan karate Kaltim jadi andalan untuk meraih enam medali emas di PON XXI.", location: "Samarinda", seed: "ol-tim-pon", days: 1 },
  { cat: "olahraga", title: "PSSI Kaltim Resmi Tunjuk Pelatih Baru Tim U-23", excerpt: "Pelatih asal Jawa Timur ditunjuk menggantikan pelatih sebelumnya yang mengundurkan diri setelah gagal di Piala Soeratin.", location: "Samarinda", seed: "ol-pelatih-u23", days: 2 },
  { cat: "olahraga", title: "Bulu Tangkis Kaltim: Taufik Hidayat Proyeksikan Aulia Rahman ke Pelatnas", excerpt: "Legenda bulutangkis Indonesia Taufik Hidayat mengamati bakat atlet muda asal Samarinda dan memproyeksikan ke pelatnas.", location: "Samarinda", seed: "ol-taufik-hidayat", days: 3 },
  { cat: "olahraga", title: "Pertandingan Liga 3 Kaltim Dimulai Akhir Bulan Ini", excerpt: "Sembilan klub akan berlaga di Liga 3 regional Kaltim dengan pertandingan perdana di Stadion Utama Palaran.", location: "Samarinda", seed: "ol-liga3", days: 4 },
  { cat: "olahraga", title: "Robi Kawilarang dari Balikpapan Lolos ke Kejuaraan Dunia Bulu Tangkis", excerpt: "Atlet muda Balikpapan ini berhasil menjuarai Kejuaraan Bulu Tangkis Nasional kelompok junior dan lolos ke kejuaraan dunia.", location: "Balikpapan", seed: "ol-robbi-kawilarang", days: 5 },
  { cat: "olahraga", title: "Tim Basket Putra Kaltim Juarai Kejuaraan Nasional", excerpt: "Kaltim mengalahkan Jawa Timur 78-65 di final kejuaraan basket nasional antar provinsi.", location: "Samarinda", seed: "ol-basket-kaltim", days: 6 },
  { cat: "olahraga", title: "Pemain Sepak Bola Kaltim Jalani Seleksi Timnas U-19", excerpt: "Dua pemain asal Kaltim lolos seleksi awal Timnas U-19 dan akan bergabung dalam pemusatan latihan di Jakarta.", location: "Samarinda", seed: "ol-seleksi-timnas", days: 7 },
  { cat: "olahraga", title: "Maraton Balikpapan Akan Gelar Lomba Lari 10K dan 5K", excerpt: "Acara lari tahunan ini menghadirkan rute terpesona melewati kota Balikpapan dan diikuti ratusan pelari amatir.", location: "Balikpapan", seed: "ol-maraton", days: 8 },
  { cat: "olahraga", title: "Dispora Kaltim Targetkan 10 Atlet ke SEA Games", excerpt: "Dinas Pemuda dan Olahraga Kaltim memproyeksikan sepuluh atlet masuk kontingen Indonesia pada SEA Games mendatang.", location: "Samarinda", seed: "ol-sea-games", days: 9 },
  { cat: "olahraga", title: "Liga Renang Daerah Kaltim Kembali Digelar Setelah 2 Tahun", excerpt: "Kejuaraan renang antar kabupaten/kota akan digelar di Kolam Renang Palaran untuk mencari wakil Kaltim di PON.", location: "Samarinda", seed: "ol-renang", days: 10 },
  { cat: "olahraga", title: "Atlet Panahan Kaltim Sumbang Medali Perak ke Nasional", excerpt: "Petenis panahan asal Balikpapan berhasil meraih medali perak di Kejuaraan Panahan Nasional.", location: "Balikpapan", seed: "ol-panahan", days: 11 },

  { cat: "opini", title: "Opini: Ibu Kota Baru dan Tantangan Sosial Kaltim", excerpt: "Pemindahan ibu kota membawa peluang ekonomi sekaligus tantangan sosial yang perlu diantisipasi bersama.", location: "Samarinda", seed: "op-ikn-sosial", days: 1 },
  { cat: "opini", title: "Opini: UMKM Kaltim Butuh Akses Digital, Bukan Cuma Modal", excerpt: "Banyak UMKM Kaltim gagal berkembang bukan karena kekurangan modal, tetapi karena minimnya literasi digital dan pemasaran.", location: "Samarinda", seed: "op-umkm-digital", days: 2 },
  { cat: "opini", title: "Opini: Perlunya Iklim Belajar yang Sehat di Sekolah Kaltim", excerpt: "Sistem pendidikan yang mendukung kreativitas dan karakter perlu dibangun, bukan sekadar mengejar nilai ujian.", location: "Samarinda", seed: "op-iklim-belajar", days: 3 },
  { cat: "opini", title: "Opini: Urbanisasi dan Penutupan Kebun Kelapa Sawit", excerpt: "Penutupan kebun sawit di pesisir Balikpapan mengancam mata pencaharian ribuan keluarga tanpa solusi yang jelas.", location: "Balikpapan", seed: "op-kebun-sawit", days: 4 },
  { cat: "opini", title: "Opini: CSR Perkebunan Belum Optimal, Saatnya Evaluasi", excerpt: "Perusahaan kebun sawit Kaltim belum memberikan kontribusi nyata bagi komunitas sekitar seperti yang dijanjikan.", location: "Kutai Kartanegara", seed: "op-csr", days: 5 },
  { cat: "opini", title: "Opini: Kaltim Perlu Kebijakan Khusus untuk Nelayan Pesisir", excerpt: "Nelayan kecil di pesisir Kaltim terjepit antara banjir, pasang surut, dan regulasi yang tidak berpihak pada mereka.", location: "Bontang", seed: "op-nelayan", days: 6 },
  { cat: "opini", title: "Opini: Banjir Kaltim Butuh Pendekatan Mitigasi Jangka Panjang", excerpt: "Penanganan banjir selama ini masih reaktif. Diperlukan pendekatan mitigasi jangka panjang berbasis tata ruang.", location: "Samarinda", seed: "op-banjir", days: 7 },
  { cat: "opini", title: "Opini: Pendidikan Vokasi Kaltim Harus Lebih Relevan dengan Industri", excerpt: "Lulusan SMK/STM Kaltim banyak yang menganggur karena kurikulum belum selaras dengan kebutuhan industri IKN.", location: "Samarinda", seed: "op-vokasi", days: 8 },
  { cat: "opini", title: "Opini: Menjaga Hutan Kaltim untuk Generasi Berikutnya", excerpt: "Hutan Kaltim adalah warisan dunia yang harus dijaga. Pembabatan liar harus dihentikan sekarang juga.", location: "Samarinda", seed: "op-hutan", days: 9 },
  { cat: "opini", title: "Opini: Industri Kreatif Kaltim Masih Tertinggal, Ini Solusinya", excerpt: "Kaltim memiliki potensi industri kreatif yang besar, tetapi dukungan infrastruktur dan regulasi masih minim.", location: "Samarinda", seed: "op-industri-kreatif", days: 10 },
  { cat: "opini", title: "Opini: Pemberdayaan Perempuan Kaltim di Sektor Ekonomi", excerpt: "Perempuan Kaltim berkontribusi besar dalam ekonomi keluarga, namun akses terhadap modal dan pelatihan masih terbatas.", location: "Samarinda", seed: "op-perempuan", days: 11 },
  { cat: "opini", title: "Opini: Sepak Bola Kaltim dan Bonus Rp50 Miliar yang Tidak Jelas", excerpt: "Bonus besar untuk tim sepak bola Kaltim memicu perdebatan publik; pertanyaannya, di mana akuntabilitasnya?", location: "Samarinda", seed: "op-bonus-sepakbola", days: 12 },
  { cat: "wisata", title: "Pantai Lamaru Balikpapan Kembali Dibuka Setelah Reklamasi", excerpt: "Wisata pantai favorit warga Balikpapan kembali dibuka dengan fasilitas baru dan menara pengawas.", location: "Balikpapan", seed: "wis-lamaru", days: 3 },
  { cat: "wisata", title: "Trekking di Bukit Bumi Hijau Bengkong: Destinasi Baru Samarinda", excerpt: "Bukit Bumi Hijau Bengkong menawarkan panorama Sungai Mahakam dan sunset terbaik di Samarinda.", location: "Samarinda", seed: "wis-bumi-bengkong", days: 5 },
  { cat: "wisata", title: "Ternate Lake, Danau Tersembunyi di Kutai Timur", excerpt: "Danau Ternate di Sangatta menawarkan wisata perahu dan camping di tepi danau alami.", location: "Sangatta", seed: "wis-ternate-lake", days: 7 },
  { cat: "wisata", title: "Eksplor Wisata Bawah Air di Pantai Bontang", excerpt: "Keindahan terumbu karang di Bontang mulai dikenal wisatawan; operator diving lokal ikut tumbuh.", location: "Bontang", seed: "wis-pantai-bontang", days: 9 },
  { cat: "hiburan", title: "Stand Up Comedy Marathon di Samarinda: 12 Komika Tampil", excerpt: "Acara stand up comedy terbesar di Samarinda kembali digelar dengan lineup 12 komika nasional dan lokal.", location: "Samarinda", seed: "hib-suci-marathon", days: 2 },
  { cat: "hiburan", title: "Konser Jazz di Tepian Mahakam Digelar Akhir Bulan Ini", excerpt: "Musisi jazz nasional akan tampil di panggung terapung Tepian Mahakam untuk dua malam berturut-turut.", location: "Samarinda", seed: "hib-jazz-tepian", days: 4 },
  { cat: "hiburan", title: "Pameran Fotografi Kaltim Gelar Karya 30 Fotografer", excerpt: "Pameran fotografi bertema Identitas Kaltim menampilkan 30 karya fotografer lokal di Galeri Seni Samarinda.", location: "Samarinda", seed: "hib-pameran-foto", days: 6 },
  { cat: "hiburan", title: "Pertunjukan Wayang Samarinda pada Festival Budaya 2026", excerpt: "Dalang senior dari Jawa Timur tampil dalam Festival Budaya Samarinda 2026 di Gedung Kesenian.", location: "Samarinda", seed: "hib-wayang", days: 8 },
  { cat: "umkm", title: "Produk Kemplang UMKM Kaltim Lolos Sertifikasi Halal Nasional", excerpt: "Tujuh produk kemplang oleh-oleh khas Kaltim telah mengantongi sertifikasi halal MUI nasional.", location: "Samarinda", seed: "um-kemplang", days: 4 },
  { cat: "umkm", title: "Pameran UMKM Kaltim Hadir di Tiga Kota Besar", excerpt: "Pameran UMKM Kaltim digelar di Jakarta, Surabaya, dan Bandung untuk mengenalkan produk lokal ke pasar nasional.", location: "Samarinda", seed: "um-pameran-jakarta", days: 6 },
  { cat: "umkm", title: "Pelatihan Digital Marketing untuk 50 UMKM Samarinda", excerpt: "Dinas Koperasi dan UMKM menggelar pelatihan digital marketing selama 3 hari untuk 50 pelaku usaha mikro.", location: "Samarinda", seed: "um-pelatihan", days: 8 },
  { cat: "industri", title: "Industri Mebel Kaltim Tembus Pasar Amerika", excerpt: "Ekspor mebel rotan dan kayu ulin dari Kaltim ke Amerika Serikat naik 45 persen tahun ini.", location: "Samarinda", seed: "ind-mebel", days: 2 },
  { cat: "industri", title: "Pabrik Pengolahan Rumput Laut di Bontang Mulai Produksi", excerpt: "Pabrik rumput laut di Bontang akan memproduksi agar-agar dan produk turunan untuk pasar Asia Tenggara.", location: "Bontang", seed: "ind-rumput-laut", days: 5 },
  { cat: "kuliner", title: "Serabi Samarinda: Warisan Kuliner yang Harus Dicoba", excerpt: "Serabi Samarinda yang legendaris tetap bertahan di tengah gempuran makanan modern; ini lima tempat terbaik menikmatinya.", location: "Samarinda", seed: "kul-serabi", days: 2 },
  { cat: "kuliner", title: "Bandeng Presto Khas Semarang Tersedia di Balikpapan", excerpt: "Restauran pendatang dari Semarang membuka cabang di Balikpapan dengan menu khas bandeng presto.", location: "Balikpapan", seed: "kul-bandeng", days: 4 },
  { cat: "kuliner", title: "Festival Kuliner Nusantara Hadir di Samarinda", excerpt: "Festival kuliner ini menampilkan lebih dari 100 stan makanan dari 34 provinsi di Indonesia.", location: "Samarinda", seed: "kul-festival-nasional", days: 7 },
  { cat: "kuliner", title: "Street Food di Balikpapan: 8 Spot Wajib Coba Bulan Ini", excerpt: "Kuliner jalanan Balikpapan berkembang pesat; ini rekomendasi 8 spot makanan enak dan terjangkau.", location: "Balikpapan", seed: "kul-streetfood-bpp", days: 9 },
  { cat: "fashion", title: "Batik Kaltim Hadir di New York Fashion Week", excerpt: "Desainer Kaltim membawa koleksi batik Kalimantan ke New York Fashion Week dan mendapat sambutan hangat.", location: "Samarinda", seed: "fa-batik-kaltim", days: 3 },
  { cat: "fashion", title: "Brand Fashion Lokal Kaltim Buka Toko di Mall Besar Jakarta", excerpt: "Fashion brand asal Samarinda yang populer di Instagram resmi membuka gerai di mal mewah di Jakarta Selatan.", location: "Samarinda", seed: "fa-fashion-jakarta", days: 6 },
];
// Extra seed articles for the sub-kanal pages so their distinct layouts have enough content
const subkanalArticles = [
  { cat: "daerah", title: "Revitalisasi Pasar Segiri Mulai Dikerjakan Bertahap Mulai Bulan Ini", excerpt: "Pemerintah Kota Samarinda mulai merapikan pedagang pasar Segiri sesuai zonasi baru menjelang revitalisasi tahap pertama.", location: "Samarinda", seed: "sk-daerah-pasar-segiri", days: 2 },
  { cat: "daerah", title: "Balikpapan Mulai Bangun Jalan Lingkar Utara Tahap Pertama", excerpt: "Ruas 11,2 kilometer ini ditargetkan tersambung 2028 untuk mengurangi kemacetan di Jalan MT Haryono.", location: "Balikpapan", seed: "sk-daerah-lingkar-utara", days: 4 },
  { cat: "daerah", title: "Kukar Perbaiki Jaringan Irigasi 1.200 Hektare Sawah di Sebulu", excerpt: "Rehabilitasi irigasi primer dan sekunder ini ditargetkan meningkatkan indeks tanam padi dari 1,4 menjadi 1,8.", location: "Kutai Kartanegara", seed: "sk-daerah-irigasi-sebulu", days: 6 },
  { cat: "daerah", title: "Bontang Normalisasi Sodetan Sungai Guntung dan Pelabuhan Nelayan", excerpt: "Normalisasi gunting air dan pendalaman alur sungai dilakukan untuk mengurangi banjir kiriman dan genangan.", location: "Bontang", seed: "sk-daerah-guntung", days: 8 },
  { cat: "daerah", title: "Kutai Timur Siapkan Dana Kelurahan Mandiri Tahap Kedua", excerpt: "Program dana kelurahan tahun ini mencakup pembangunan jalan lingkungan dan sarana air bersih.", location: "Kutai Timur", seed: "sk-daerah-kamanda", days: 9 },
  { cat: "daerah", title: "PPU Percepat Jaringan Listrik ke 12 Desa Sekitar IKN", excerpt: "Pemerintah Pusat dan PLN menyasar desa-desa di Sepaku dan Bumi Harapan agar teraliri listrik 24 jam.", location: "Penajam Paser Utara", seed: "sk-daerah-listrik-ikn", days: 11 },
  { cat: "daerah", title: "Bupati Kukar Tinjau Progres Pembangunan Jalan Koridor Ekspor Sawit", excerpt: "Jalan koridor sepanjang 28 kilometer ini akan memperlancar distribusi CPO dari Kukar ke pelabuhan.", location: "Kutai Kartanegara", seed: "sk-daerah-koridor", days: 13 },
  { cat: "daerah", title: "Samarinda Perketat Izin Reklame di Sepanjang Jalan Sudirman", excerpt: "Kota Samarinda meninjau ulang 120 titik reklame untuk menekan potensi kemacetan dan visual pollution.", location: "Samarinda", seed: "sk-daerah-reklame", days: 15 },

  { cat: "ekonomi", title: "Harga Bawang Merah Naik di Pasar Pagi Balikpapan, Pedagang Defisit Pasokan", excerpt: "Harga bawang merah naik dari Rp28 ribu menjadi Rp36 ribu per kilogram akibat menipisnya pasokan dari Jawa.", location: "Balikpapan", seed: "sk-ekonomi-bawang", days: 1 },
  { cat: "ekonomi", title: "Omset UMKM Sekitar IKN Naik Dua Kali Lipat Sejak Awal Tahun", excerpt: "Ratusan pelaku UMKM di Sepaku mengaku omsetnya melonjak berkat permintaan dari pekerja konstruksi IKN.", location: "Penajam Paser Utara", seed: "sk-ekonomi-umkm-ikn", days: 3 },
  { cat: "ekonomi", title: "Eksportir Sawit Kaltim Kuatirkan Pemangkasan Kuota Ekspor", excerpt: "Asosiasi eksportir berharap pemerintah meninjau ulang kebijakan DMO sawit yang dinilai menggerus margin.", location: "Balikpapan", seed: "sk-ekonomi-sawit-kuota", days: 5 },
  { cat: "ekonomi", title: "Bank Indonesia Perkuat Intervensi Jaga Stabilitas Rupiah", excerpt: "BI masuk pasar spot dan DNDF untuk menekan volatilitas rupiah yang menembus Rp15.200 per dolar AS.", location: "Samarinda", seed: "sk-ekonomi-rupiah-intervensi", days: 7 },
  { cat: "ekonomi", title: "Nelayan Muara Jawa Ekspor Ikan Kerapu ke Singapura Mulai Bulan Ini", excerpt: "Kelompok nelayan Muara Jawa mengekspor 8 ton kerapu hasil budidaya apung ke pasar Singapura.", location: "Kutai Kartanegara", seed: "sk-ekonomi-kerapu", days: 9 },
  { cat: "ekonomi", title: "Kopi Kukar Diekspor ke Malaysia Mulai Bulan Depan", excerpt: "Perkebunan kopi rakyat di Kukar menargetkan ekspor 20 ton per tahun ke pasar Malaysia Timur.", location: "Kutai Kartanegara", seed: "sk-ekonomi-kopi-kukar", days: 11 },
  { cat: "ekonomi", title: "Investasi Tekstil Kaltim Serap 3.000 Tenaga Kerja Lokal", excerpt: "Pabrik tekstil baru di Kukar akan dibangun dalam dua tahap dengan target produksi mulai 2027.", location: "Kutai Kartanegara", seed: "sk-ekonomi-tekstil", days: 14 },
  { cat: "ekonomi", title: "Investasi Asing di Kaltim Naik 24 Persen Tahun Ini", excerpt: "BPKM mencatat investasi asing didominasi sektor konstruksi, tambang, dan perdagangan besar.", location: "Samarinda", seed: "sk-ekonomi-investasi-asing", days: 17 },

  { cat: "pendidikan", title: "SMK Negeri 5 Balikpapan Kerja Sama dengan PT Varia Niaga untuk Teaching Factory", excerpt: "SMK 5 Balikpapan akan menempatkan siswa di industri percetakan dan pengemasan sejak kelas 11.", location: "Balikpapan", seed: "sk-pendidikan-smkn5", days: 2 },
  { cat: "pendidikan", title: "12 Sekolah di Kaltim Lolos Adiwiyata Mandiri Tingkat Nasional", excerpt: "Sekolah-sekolah Adiwiyata Mandiri ini mendapat pendampingan Dinas Pendidikan sejak 2023.", location: "Samarinda", seed: "sk-pendidikan-adiwiyata-mandiri", days: 4 },
  { cat: "pendidikan", title: "LPDP Buka Beasiswa Khusus Putra-Putri Kaltim Tahun 2027", excerpt: "Beasiswa penuh S2 dan S3 ini menargetkan 50 awardee dari Kaltim untuk bidang STEM dan pertanian.", location: "Samarinda", seed: "sk-pendidikan-lpdp", days: 6 },
  { cat: "pendidikan", title: "Perpustakaan Daerah Kaltim Buka Layanan Pojok Digital di 10 Kafe Mitra", excerpt: "Pojok digital menyediakan akses e-book dan database jurnal gratis bagi pelajar dan mahasiswa.", location: "Samarinda", seed: "sk-pendidikan-pojok-digital", days: 8 },
  { cat: "pendidikan", title: "Guru Geografi Kaltim Ikuti Pelatihan Kurikulum Merdeka", excerpt: "Dua ratus guru geografi se-Kaltim mengikuti pelatihan penyusunan modul projek penguatan profil pelajar.", location: "Samarinda", seed: "sk-pendidikan-geografi", days: 10 },
  { cat: "pendidikan", title: "Tiga Sekolah Baru di Kawasan IKN Mulai Terima Siswa Tahun Ini", excerpt: "SD, SMP, dan SMA baru di Sepaku menampung 1.200 siswa, mayoritas anak pekerja IKN.", location: "Penajam Paser Utara", seed: "sk-pendidikan-ikn-baru", days: 12 },
  { cat: "pendidikan", title: "Politeknik Negeri Balikpapan Buka Jurusan Kecerdasan Buatan Tahun Ini", excerpt: "Jurusan AI ini dirancang menyiapkan lulusan siap kerja untuk industri digital dan IKN.", location: "Balikpapan", seed: "sk-pendidikan-poltek-ai", days: 16 },
  { cat: "pendidikan", title: "Gerakan Literasi Sekolah Kaltim Jangkau 500 Ribu Siswa", excerpt: "Program 15 menit membaca setiap hari diterapkan di 1.800 sekolah dasar dan menengah di Kaltim.", location: "Samarinda", seed: "sk-pendidikan-literasi", days: 19 },

  { cat: "kesehatan", title: "Dinkes Kaltim Tekan Angka Stunting Jadi 16 Persen Tahun Ini", excerpt: "Intervensi gizi spesifik dan sensitif menyasar 14.000 balita di daerah dengan prevalensi tertinggi.", location: "Samarinda", seed: "sk-kesehatan-stunting", days: 3 },
  { cat: "kesehatan", title: "Kasus DBD di Samarinda Naik, Dinkes Galakkan Fogging dan PSN", excerpt: "Fogging fokus di kelurahan dengan kasus tertinggi: Sungai Pinang, Samarinda Seberang, dan Sempaja.", location: "Samarinda", seed: "sk-kesehatan-dbd", days: 5 },
  { cat: "kesehatan", title: "Puskesmas Pembantu di Sumber Mulia IKN Resmi Beroperasi", excerpt: "Fasilitas kesehatan primer ini melayani warga Sepaku dan Bumi Harapan dengan 12 tempat tidur.", location: "Penajam Paser Utara", seed: "sk-kesehatan-puskesmas-ikn", days: 7 },
  { cat: "kesehatan", title: "Bontang Perkuat Armada Ambulans dan Layanan PSC 119", excerpt: "Kota Bontang menambah dua ambulans dan memperluas cakupan respons darurat PSC 119 ke seluruh kelurahan.", location: "Bontang", seed: "sk-kesehatan-psc119", days: 9 },
  { cat: "kesehatan", title: "BPJS Kesehatan Cabang Samarinda Ingatkan Peserta Mandiri", excerpt: "Cabang Samarinda mengimbau peserta mandiri rutin membayar iuran agar status kepesertaan tetap aktif.", location: "Samarinda", seed: "sk-kesehatan-bpjs", days: 11 },
  { cat: "kesehatan", title: "Capaian Imunisasi Dasar Kaltim Tembus 92 Persen", excerpt: "Kaltim masuk tiga besar provinsi dengan cakupan imunisasi dasar tertinggi secara nasional.", location: "Samarinda", seed: "sk-kesehatan-imunisasi", days: 13 },
  { cat: "kesehatan", title: "Program Gizi Ibu Hamil di Kaltim Jangkau 8 Ribu Penerima", excerpt: "Paket gizi dan pendampingan ibu hamil risiko tinggi difokuskan di wilayah dengan prevalensi KVA tinggi.", location: "Kutai Kartanegara", seed: "sk-kesehatan-gizi-ibu", days: 15 },
  { cat: "kesehatan", title: "RSUD Abdul Wahab Sjahranie Buka Poli Jantung Terpadu", excerpt: "Poli jantung terpadu menyediakan konsultasi, ekokardiografi, dan tindakan kateterisasi ambulatorik.", location: "Samarinda", seed: "sk-kesehatan-poli-jantung", days: 18 },
  { cat: "kesehatan", title: "Apotek Desa Mulai Beroperasi di 40 Desa di Kaltim", excerpt: "Apotek desa menyediakan obat generik esensial dengan harga terjangkau di desa-desa terpencil.", location: "Kutai Timur", seed: "sk-kesehatan-apotek-desa", days: 21 },

  { cat: "teknologi", title: "Indosat Uji Coba 5G di Kawasan Industri IKN Mulai Bulan Depan", excerpt: "Jaringan 5G ini akan mendukung konektivitas kawasan industri dan pemantauan infrastruktur IKN.", location: "Penajam Paser Utara", seed: "sk-teknologi-5g", days: 2 },
  { cat: "teknologi", title: "Data Center Pertama Kaltim Dibangun di Samarinda", excerpt: "Data center tier III ini disiapkan untuk kebutuhan pemerintah daerah dan instansi vertikal.", location: "Samarinda", seed: "sk-teknologi-datacenter", days: 6 },
  { cat: "teknologi", title: "Kaltim Luncurkan E-Government Terpadu untuk 10 Kabupaten/Kota", excerpt: "Platform e-gov Kaltim menyatukan layanan perizinan, kependudukan, dan administrasi keuangan.", location: "Samarinda", seed: "sk-teknologi-egov", days: 8 },
  { cat: "teknologi", title: "Coding Camp Gratis untuk 500 Pelajar SMK di Kaltim", excerpt: "Pelatihan coding intensif tiga bulan ini menyiapkan pelajar SMK menghadapi industri digital.", location: "Balikpapan", seed: "sk-teknologi-coding-camp", days: 10 },
  { cat: "teknologi", title: "Startup AgriTech Kaltim Ekspansi ke Sulawesi dan Nusa Tenggara", excerpt: "Startup rantai pasok sawit asal Balikpapan mulai beroperasi di dua pulau baru dengan mitra lokal.", location: "Balikpapan", seed: "sk-teknologi-agritech-ekspansi", days: 12 },
  { cat: "teknologi", title: "Desa Digital di Kaltim Terhubung Internet hingga 100 Mbps", excerpt: "Dua puluh desa percontohan mendapat akses internet cepat untuk pelayanan publik digital.", location: "Kutai Kartanegara", seed: "sk-teknologi-desa-digital", days: 16 },
  { cat: "teknologi", title: "Perkebunan Sawit Kaltim Terapkan IoT Monitoring Tanaman", excerpt: "Sensor kelembaban dan NPK membantu petani sawit mengatur pemupukan lebih presisi.", location: "Kutai Timur", seed: "sk-teknologi-iot-sawit", days: 20 },

  { cat: "lingkungan", title: "Kaltim Tanam 50 Ribu Bibit Mangrove di Teluk Balikpapan", excerpt: "Program rehabilitasi mangrove ini melibatkan masyarakat pesisir untuk melindungi garis pantai.", location: "Balikpapan", seed: "sk-lingkungan-mangrove", days: 3 },
  { cat: "lingkungan", title: "Titik Hotspot di Kaltim Turun 40 Persen Berkat Operasi Darat", excerpt: "Operasi darat dan pemantauan satelit mengurangi titik api di dua bulan terakhir.", location: "Kutai Kartanegara", seed: "sk-lingkungan-hotspot", days: 5 },
  { cat: "lingkungan", title: "Samarinda Larang Penggunaan Kantong Plastik di Seluruh Pasar", excerpt: "Kebijakan ini berlaku di 14 pasar modern dan tradisional di Samarinda mulai Januari.", location: "Samarinda", seed: "sk-lingkungan-plastik", days: 8 },
  { cat: "lingkungan", title: "PDAM Balikpapan Kejar Target Air Bersih untuk IKN", excerpt: "PDAM membangun reservoir dan sumur bor baru untuk menjamin pasokan air bersih ke IKN.", location: "Penajam Paser Utara", seed: "sk-lingkungan-air-bersih", days: 10 },
  { cat: "lingkungan", title: "Rehabilitasi Lahan Bekas Tambang di Kukar Capai 200 Hektar", excerpt: "Revegetasi lahan kritis eks-tambang batubara ini menargetkan pemulihan ekosistem seluas 500 hektar.", location: "Kutai Kartanegara", seed: "sk-lingkungan-rehab-tambang", days: 13 },
  { cat: "lingkungan", title: "BPBD Kaltim Siagakan 30 Posko Banjir di Sepanjang Mahakam", excerpt: "Posko banjir disiapkan untuk mengantisipasi musim hujan dengan curah hujan tinggi di wilayah Mahakam.", location: "Kutai Kartanegara", seed: "sk-lingkungan-posko-banjir", days: 15 },
  { cat: "lingkungan", title: "KLHK Apresiasi Kaltim Kurangi Emisi Karbon 18 Persen", excerpt: "Kaltim menjadi contoh provinsi yang berhasil menekan emisi karbon lewat program FOLU Net Sink.", location: "Samarinda", seed: "sk-lingkungan-karbon", days: 18 },

  { cat: "wisata-budaya", title: "Festival Budaya Dayak Kenyah Digelar di Samarinda", excerpt: "Festival budaya ini menampilkan seni tari, musik sampe, dan kuliner khas Dayak Kenyah.", location: "Samarinda", seed: "sk-wb-dayak-kenyah", days: 2 },
  { cat: "wisata-budaya", title: "Wisata Susur Mahakam Resmi Dibuka Tahun Ini", excerpt: "Rute susur sungai Mahakam dari Samarinda ke Tenggarong ditawarkan dengan kapal wisata modern.", location: "Kutai Kartanegara", seed: "sk-wb-susur-mahakam", days: 4 },
  { cat: "wisata-budaya", title: "Museum Mulawarman Tambah Koleksi Kerajinan Kutai", excerpt: "Museum ini menambah koleksi kain ulin dan kerajinan perak dari Kesultanan Kutai.", location: "Kutai Kartanegara", seed: "sk-wb-museum-mulawarman", days: 7 },
  { cat: "wisata-budaya", title: "Festival Kain Ulin di Samarinda Tampilkan 50 Desainer Lokal", excerpt: "Pameran kain ulin ini mempertemukan perajin dengan desainer muda Kaltim di Tepian Mahakam.", location: "Samarinda", seed: "sk-wb-kain-ulin", days: 9 },
  { cat: "wisata-budaya", title: "Taman Hutan Raya Soeharto Buka Trek Baru untuk Wisatawan", excerpt: "Trek hiking baru sepanjang 4 kilometer dibuka untuk wisatawan dengan pemandangan hutan hujan tropis.", location: "Kutai Kartanegara", seed: "sk-wb-tahura", days: 12 },
  { cat: "wisata-budaya", title: "Teluk Awang Jadi Magnet Wisata Baru di Kutai Kartanegara", excerpt: "Pantai Teluk Awang menawarkan sunset dan kuliner laut segar yang mulai dikenal wisatawan.", location: "Kutai Kartanegara", seed: "sk-wb-teluk-awang", days: 14 },
  { cat: "wisata-budaya", title: "Ziarah Makam Datu di Samarinda Jadi Magnet Wisata Religi", excerpt: "Komplek makam Datu di Samarinda ramai dikunjungi peziarah terutama menjelang hari besar Islam.", location: "Samarinda", seed: "sk-wb-makam-datu", days: 16 },
  { cat: "wisata-budaya", title: "Festival Perahu Lesung di Kukar Kembali Digelar Tahun Ini", excerpt: "Festival perahu lesung di Sungai Mahakam diikuti ratusan peserta dari berbagai kabupaten.", location: "Kutai Kartanegara", seed: "sk-wb-perahu-lesung", days: 22 },

  { cat: "umkm", title: "Produk Olahan Ikan Kaltim Lolos Ekspor Perdana ke Malaysia", excerpt: "Kemplang dan ikan teri olahan Samarinda mulai diekspor ke Sabah dan Sarawak.", location: "Samarinda", seed: "sk-umkm-ekspor-malaysia", days: 3 },
  { cat: "umkm", title: "UMKM Kaltim Makin Melek Online Lewat Marketplace Lokal", excerpt: "Delapan ratus UMKM Kaltim bergabung di marketplace lokal dengan omset naik 60 persen.", location: "Balikpapan", seed: "sk-umkm-marketplace", days: 9 },
  { cat: "umkm", title: "Kopi Kukar Tembus Pasar Amerika Lewat Ekspor Perdana", excerpt: "Ekspor perdana kopi Robusta Kukar ke Amerika Serikat mencapai 12 ton.", location: "Kutai Kartanegara", seed: "sk-umkm-kopi-eksport", days: 17 },

  { cat: "industri", title: "Rotan Kaltim Diekspor ke Belanda Tahun Ini", excerpt: "Ekspor rotan setengah jadi dan furnitur rotan Kaltim naik 45 persen ke pasar Eropa.", location: "Samarinda", seed: "sk-industri-rotan", days: 2 },
  { cat: "industri", title: "Pabrik Pengecoran Baja di Kukar Resmi Dimulai", excerpt: "Pabrik pengecoran baja untuk kebutuhan proyek IKN ini menyerap 800 tenaga kerja lokal.", location: "Kutai Kartanegara", seed: "sk-industri-baja", days: 6 },
  { cat: "industri", title: "Industri Pengolahan Padi di Kaltim Naik Dua Kali Lipat Tahun Ini", excerpt: "Modernisasi penggilingan padi di Kukar dan PPU meningkatkan produktivitas beras lokal.", location: "Kutai Kartanegara", seed: "sk-industri-padi", days: 9 },
  { cat: "industri", title: "Pabrik Panel Surya Pertama Kaltim Disiapkan di Bontang", excerpt: "Pabrik panel surya berkapasitas 200 MW ini akan mendukung kebutuhan energi IKN.", location: "Bontang", seed: "sk-industri-panel-surya", days: 13 },
  { cat: "industri", title: "Pelabuhan Industri di Teluk Balikpapan Mulai Dibangun", excerpt: "Pelabuhan khusus industri ini akan memperlancar distribusi nikel dan CPO dari Kaltim.", location: "Balikpapan", seed: "sk-industri-pelabuhan", days: 16 },
  { cat: "industri", title: "Industri Welding Kaltim Penuhi Kebutuhan Proyek IKN", excerpt: "Empat workshop welding di Balikpapan menangani fabrikasi baja untuk konstruksi IKN.", location: "Balikpapan", seed: "sk-industri-welding", days: 21 },

  { cat: "pasar", title: "Revitalisasi Pasar Segiri Masuk Tahap Pembebasan Lahan", excerpt: "Pembebasan 220 bidang lahan di sekitar Pasar Segiri ditargetkan tuntas tahun depan.", location: "Samarinda", seed: "sk-pasar-segiri", days: 2 },
  { cat: "pasar", title: "Pasar Modern Berbasis Digital Mulai Dibangun di Samarinda", excerpt: "Pasar modern ini menyediakan QRIS, kasir digital, dan logistic hub untuk UMKM.", location: "Samarinda", seed: "sk-pasar-digital", days: 5 },
  { cat: "pasar", title: "Pasar Malam Samarinda Menarik 5 Ribu Pengunjung per Malam", excerpt: "Tenda kuliner dan jajanan di Tepian Mahakam hidup lagi sejak akhir pekan lalu.", location: "Samarinda", seed: "sk-pasar-malam", days: 8 },
  { cat: "pasar", title: "Distribusi Ikan dari Balikpapan ke Samarinda Stabil Tahun Ini", excerpt: "Supply ikan laut segar dari Balikpapan menutup defisit stok di pasar-pasar Samarinda.", location: "Balikpapan", seed: "sk-pasar-ikan", days: 10 },
  { cat: "pasar", title: "Harga Cabai dan Bawang di Pasar Kaltim Naik Menjelang Lebaran", excerpt: "Kenaikan harga cabai dan bawang dipicu permintaan tinggi dan pasokan Jawa yang terbatas.", location: "Samarinda", seed: "sk-pasar-lebaran", days: 12 },
  { cat: "pasar", title: "Pedagang Pasar Kaltim Ikut Program Digitalisasi UMKM", excerpt: "Tiga ratus pedagang pasar ikuti pelatihan QRIS, pencatatan digital, dan pemasaran online.", location: "Balikpapan", seed: "sk-pasar-digitalisasi", days: 15 },
  { cat: "pasar", title: "Pasar Seng Goyang Kembali Beroperasi Usai Renovasi", excerpt: "Pasar ikan terbesar di Samarinda buka kembali dengan zonasi dan kebersihan baru.", location: "Samarinda", seed: "sk-pasar-seng-goyang", days: 18 },
  { cat: "pasar", title: "Pemkot Bontang Pertahankan Pasar Tradisional Tiap Akhir Pekan", excerpt: "Pasar mingguan Bontang menjual kebutuhan pokok langsung dari petani dan nelayan.", location: "Bontang", seed: "sk-pasar-mingguan", days: 23 },

  { cat: "ikn", title: "Menara 42 IKN Ditaklukkan dalam 10 Bulan", excerpt: "Menara setinggi 42 meter di kawasan inti IKN selesai lebih cepat dari target awal tahun depan.", location: "Penajam Paser Utara", seed: "sk-ikn-menara42", days: 1 },
  { cat: "ikn", title: "Hunian Pekerja IKN di Sepaku Tembus 3.000 Unit", excerpt: "Hunian pekerja multifungsi di Sepaku sudah dihuni 8.500 pekerja konstruksi dan operasional.", location: "Penajam Paser Utara", seed: "sk-ikn-hunian", days: 3 },
  { cat: "ikn", title: "Jalan Tol IKN Seksi 1-3 Capai 72 Persen", excerpt: "Pembangunan jalan tol Balikpapan-IKN seksi Balikpapan-Sepaku ditargetkan selesai 2026.", location: "Penajam Paser Utara", seed: "sk-ikn-tol", days: 6 },
  { cat: "ikn", title: "Sistem Air Bersih IKN Dialiri ke Kawasan Inti", excerpt: "Jaringan perpipaan air bersih sepanjang 80 kilometer mulai dialirkan ke gedung pemerintahan.", location: "Penajam Paser Utara", seed: "sk-ikn-air-bersih", days: 8 },
  { cat: "ikn", title: "Bandara IKN Mulai Uji Coba Penerbangan Komersial", excerpt: "Bandara IKN akan melayani penerbangan perintis dan carter dari Balikpapan mulai bulan depan.", location: "Penajam Paser Utara", seed: "sk-ikn-bandara", days: 10 },
  { cat: "ikn", title: "Pelabuhan Utama IKN di Sepaku Capai 60 Persen", excerpt: "Pelabuhan ini akan menjadi pintu logistik utama material dan barang ke IKN.", location: "Penajam Paser Utara", seed: "sk-ikn-pelabuhan", days: 12 },
  { cat: "ikn", title: "Studi Kelayakan Kereta Ringan IKN Dimulai Tahun Ini", excerpt: "Kajian kelayakan LRT IKN mencakup rute dari stasiun terdekat hingga kawasan inti.", location: "Penajam Paser Utara", seed: "sk-ikn-kereta", days: 14 },
  { cat: "ikn", title: "Kebun Raya IKN Ditanam 1 Juta Pohon", excerpt: "Kebun raya seluas 1.200 hektar ini menanam 1 juta bibit pohon lokal dan tanaman koleksi.", location: "Penajam Paser Utara", seed: "sk-ikn-kebun-raya", days: 17 },
  { cat: "ikn", title: "Pembangkit Listrik Tenaga Surya IKN Berkapasitas 50 MW", excerpt: "PLTS Sepaku 50 MW mulai beroperasi untuk mendukung kebutuhan listrik kawasan inti IKN.", location: "Penajam Paser Utara", seed: "sk-ikn-plts", days: 20 },

  { cat: "kuliner", title: "Kopi Khas Samarinda Tembus Menu Kafe Jakarta", excerpt: "Tiga kafe di Jakarta Utara dan Selatan memasukkan biji kopi Kaltim ke menu andalan mereka.", location: "Samarinda", seed: "sk-kuliner-kopi-jkt", days: 4 },
  { cat: "kuliner", title: "Mie Ayam Kaltim Jadi Incaran Wisatawan di Akhir Pekan", excerpt: "Mie ayam khas Kaltim dengan topping ayam kampung mulai dikenal wisatawan lokal dan luar daerah.", location: "Samarinda", seed: "sk-kuliner-mie-ayam", days: 10 },
  { cat: "kuliner", title: "Pusat Kuliner Tepian Mahakam Kembali Dibuka Tahun Ini", excerpt: "Sentra kuliner terapung di Tepian Mahakam menampung 60 tenant UMKM makanan dan minuman.", location: "Samarinda", seed: "sk-kuliner-tepian", days: 18 },

  { cat: "wisata", title: "Gunung Mole di Kukar Jadi Destinasi Trekking Favorit Baru", excerpt: "Gunung Mole di Kuaro menawarkan trekking 3-4 jam dengan panorama hutan tropis.", location: "Kutai Kartanegara", seed: "sk-wisata-gunung-mole", days: 2 },
  { cat: "wisata", title: "Pantai Malinau di Kukar Resmi Jadi Objek Wisata", excerpt: "Pantai Malinau ditata dengan zonasi mandi, kuliner, dan area parkir yang memadai.", location: "Kutai Kartanegara", seed: "sk-wisata-malinau", days: 6 },
  { cat: "wisata", title: "Gua Karang di Kutai Timur Dibuka untuk Wisata Alam", excerpt: "Gua karst sepanjang 400 meter di Sangatta dibuka dengan pemandu lokal.", location: "Kutai Timur", seed: "sk-wisata-gua-karang", days: 8 },
  { cat: "wisata", title: "Wisata Susur Sungai Mahakam Mulai Dikenal Wisatawan", excerpt: "Susur sungai dengan kapal kayu tradisional dan kapal wisata modern mulai diminati.", location: "Kutai Kartanegara", seed: "sk-wisata-susur-sungai", days: 11 },
  { cat: "wisata", title: "Pulau Atas di Bontang Dibuka untuk Wisata Keluarga", excerpt: "Pulau Atas menawarkan snorkeling, banana boat, dan penginapan sederhana untuk keluarga.", location: "Bontang", seed: "sk-wisata-pulau-atas", days: 15 },
  { cat: "wisata", title: "Desa Wisata Adat di Kukar Masuk 50 Desa Wisata Terbaik Nasional", excerpt: "Desa wisata adat di Kukar mendapat pengakuan Kemenparekraf sebagai 50 desa wisata terbaik.", location: "Kutai Kartanegara", seed: "sk-wisata-desa-adat", days: 19 },

  { cat: "fashion", title: "Kain Uliting Dayak Tampil di Panggung Mode Jakarta", excerpt: "Desainer muda Kaltim membawa koleksi kain uliting ke Jakarta Fashion Week tahun ini.", location: "Samarinda", seed: "sk-fashion-uliting", days: 3 },
  { cat: "fashion", title: "Modest Fashion Kaltim Tembus Toko Online Internasional", excerpt: "Brand modest fashion asal Samarinda mulai dijual di platform global dengan pasar Asia Tenggara.", location: "Samarinda", seed: "sk-fashion-modest", days: 7 },
  { cat: "fashion", title: "Desainer Muda Kaltim Kolaborasi dengan Artisan Ulin", excerpt: "Kolaborasi ini menghasilkan koleksi busana dan aksesori dari kain ulin dan kayu ulin.", location: "Kutai Kartanegara", seed: "sk-fashion-ulin-kolaborasi", days: 12 },
  { cat: "fashion", title: "Butik Kain Ulin Kaltim Dibuka di Senayan City", excerpt: "Butik kain ulin terbesar di Jakarta ini menjual kain, busana siap pakai, dan aksesori.", location: "Samarinda", seed: "sk-fashion-senayan-city", days: 18 },

  { cat: "hiburan", title: "Open Mic Komika Lokal Kembali Digelar di Balikpapan", excerpt: "Komunitas stand up comedy Balikpapan rutin menggelar open mic setiap akhir pekan.", location: "Balikpapan", seed: "sk-hiburan-open-mic", days: 2 },
  { cat: "hiburan", title: "Film Pendek Kaltim Masuk Festival Film Indonesia", excerpt: "Film pendek bertema IKN karya sineas muda Samarinda lolos seleksi Festival Film Indonesia 2026.", location: "Samarinda", seed: "sk-hiburan-film-pendek", days: 6 },
  { cat: "hiburan", title: "Festival Musik Etnik di Samarinda Angkat Musik Dayak", excerpt: "Festival musik etnik ini menampilkan grup musik Dayak dan Kolaborasi dengan musisi nasional.", location: "Samarinda", seed: "sk-hiburan-musik-etnik", days: 9 },
  { cat: "hiburan", title: "Pameran Kerajinan Tenun Ikat di Kukar Diikuti 60 Pengrajin", excerpt: "Pameran tenun ikat ini menampilkan karya pengrajin dari berbagai kecamatan di Kukar.", location: "Kutai Kartanegara", seed: "sk-hiburan-tenun-ikat", days: 13 },
  { cat: "hiburan", title: "Teater Daerah Kaltim Tampil di Taman Budaya Samarinda", excerpt: "Teater daerah Kaltim mementaskan lakon karya penulis lokal dengan pemeran dari berbagai daerah.", location: "Samarinda", seed: "sk-hiburan-teater", days: 17 },
  { cat: "hiburan", title: "Pentas Wayang Kulit di Samarinda Digelar Rutin Tiap Bulan", excerpt: "Pertunjukan wayang kulit rutin digelar tiap bulan di Gedung Kesenian dengan dalang senior.", location: "Samarinda", seed: "sk-hiburan-wayang", days: 24 },
];

const allArticles = [...articles, ...moreArticles, ...subkanalArticles];

const body = (title, place) => [
  `${place.toUpperCase()}, Kaltim Insider — ${title.trim()}.`,
  `Kejadian ini menjadi pembicaraan publik dalam beberapa hari terakhir. Sejumlah pihak yang terlibat menyampaikan keterangan resmi mengenai kronologi, dampak, dan langkah selanjutnya yang akan diambil.`,
  `Pemerintah daerah dan masyarakat sekitar menyatakan siap mendukung proses yang sedang berjalan. "Kami berharap situasi ini segera kembali normal," ujar salah satu warga yang dimintai keterangan.`,
  `Pihak berwenang masih melakukan verifikasi data dan pemantauan berkala. Petugas mengimbau warga untuk tetap tenang dan berkoordinasi melalui kanal resmi.`,
  `Kaltim Insider akan terus memperbarui informasi ini sebagaimana perkembangannya. Pantau artikel terbaru kami untuk informasi berimbang dan akurat.`,
].join("\n\n");

if (!apply) {
  console.log(`DRY RUN — ${allArticles.length} artikel akan di-seed (tidak ada yang ditulis).`);
  console.log("Jalankan dengan --apply untuk menulis ke database.\n");
  for (const item of allArticles) console.log(`  [seed-${item.seed}] ${item.cat} — ${item.title}`);
  process.exit(0);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });
try {
  const categories = await sql`select id, slug from public.categories`;
  const catBySlug = new Map(categories.map(cat => [cat.slug, cat.id]));
  let inserted = 0, skipped = 0;
  for (const [i, item] of allArticles.entries()) {
    const slug = `seed-${item.seed}`;
    const exists = await sql`select 1 from public.articles where slug = ${slug} limit 1`;
    if (exists.length) { skipped += 1; console.log(`  lewati ${slug} (sudah ada)`); continue; }
    const category_id = catBySlug.get(item.cat);
    if (!category_id) { console.log(`  lewati ${slug} (kanal ${item.cat} tidak ditemukan)`); skipped += 1; continue; }
    const published = daysAgo(item.days ?? 7);
    await sql`insert into public.articles
      (author_id, category_id, title, slug, excerpt, body, location, cover_url, is_featured, is_advertorial, status, submitted_at, published_at, created_at, updated_at, view_count)
      values (${author}, ${category_id}, ${item.title}, ${slug}, ${item.excerpt}, ${body(item.title, item.location)}, ${item.location}, ${i % 2 ? imageCoffee : imageBoat}, ${!!item.featured}, ${false}, 'published', ${published}, ${published}, ${published}, ${published}, ${Math.floor(Math.random() * 900) + 50})`;
    inserted += 1;
    console.log(`  sisip: ${slug}`);
  }
  console.log(`\nSelesai — ${inserted} artikel ditambahkan, ${skipped} dilewati.`);
} finally {
  await sql.end({ timeout: 2 });
}


