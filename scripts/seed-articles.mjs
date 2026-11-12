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
];
const allArticles = [...articles, ...moreArticles];

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


