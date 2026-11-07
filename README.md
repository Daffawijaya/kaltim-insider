# Kaltim Insider

Portal berita warga Kalimantan Timur dengan Next.js 16.4.5, React 19, dan Supabase. Berita publik hanya berasal dari database: database kosong menampilkan empty state; kegagalan database menampilkan error, bukan berita demo. Desain editorial yang ada dipertahankan. Tidak ada analytics, penulisan view counter per kunjungan, video palsu, ruang iklan kosong, atau tombol simpan/sumber pilihan yang belum berfungsi.

## Environment dan menjalankan lokal

Salin `.env.example` ke `.env.local`. Jangan commit `.env.local`, token, password SMTP, service-role key, atau kredensial database.

| Variable | Kegunaan |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Origin API proyek Supabase, wajib |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key publik, wajib; RLS harus aktif |
| `NEXT_PUBLIC_SITE_URL` | Origin situs. Lokal boleh HTTP; production wajib domain publik HTTPS tanpa path/kredensial, diisi saat build dan start |
| `EDITORIAL_CONTACT_EMAIL` | Alamat redaksi publik pada `/kontak`; wajib dilengkapi sebelum peluncuran |

Tidak ada fallback localhost dalam production: metadata, sitemap, dan robots memakai helper URL yang sama dan gagal dengan pesan konfigurasi yang jelas bila URL belum valid. `supabase/config.toml` adalah konfigurasi development lokal, bukan konfigurasi SMTP proyek hosted.

```sh
npm ci
npm run dev
```

Development menggunakan `.next-dev`; build production memakai `.next`, sehingga verifikasi build tidak menimpa output dev server. Upload melalui Server Action dibatasi 6 MB untuk memberi ruang multipart pada file WebP maksimum 5 MB; hosting/proxy juga harus menerima ukuran ini.

## Migrasi dan Storage

Cadangkan database, uji di staging, lalu terapkan seluruh `supabase/migrations` sesuai urutan dengan Supabase CLI `supabase db push` pada proyek yang benar. Migrasi lama tidak diubah. Migrasi baru:

- `202611060001_production_security.sql`: RLS/WITH CHECK, grants kolom, validasi origin/pemilik gambar, perlindungan gambar aktif, label advertorial, RPC keputusan dengan expected status, admin terakhir, penghentian RPC view counter, pembatasan notifikasi dan histori review.

Migrasi memetakan artikel lama `in_review` ke `submitted` dan `scheduled` ke `approved`; tidak menjadwalkan atau menerbitkan artikel otomatis. Nilai enum lama tetap ada demi kompatibilitas database, tetapi tidak tersedia sebagai workflow aktif.

Setelah migrasi, konfigurasi origin Storage tepercaya melalui SQL Editor sebagai pemilik database. Nilainya harus sama dengan `NEXT_PUBLIC_SUPABASE_URL` (tanpa slash akhir). Ini konfigurasi publik, bukan secret:

```sql
insert into public.site_configuration(singleton, storage_origin)
values (true, 'https://YOUR-PROJECT.supabase.co')
on conflict (singleton) do update set storage_origin = excluded.storage_origin;
```

Untuk Supabase lokal gunakan `http://127.0.0.1:54321` sesuai URL proyek lokal. Tanpa konfigurasi ini, database menolak referensi gambar baru. Referensi gambar lama tidak dihapus oleh migrasi; audit hak pakai dan pindahkan foto eksternal lama ke bucket sendiri sebelum peluncuran.

Bucket `article-images` tetap publik, hanya WebP, maksimum 5 MB, folder `<user-id>/<uuid>.webp`. Server memeriksa origin, bucket, folder pemilik, tipe/ukuran dan header WebP; trigger database memastikan objek benar-benar ada dan dimiliki penulis. URL arbitrer melalui REST juga ditolak. Kolom editorial tidak diberi hak tulis REST; keputusan editor/admin dilakukan melalui RPC. SQL Editor/service role adalah akses istimewa dan tidak boleh tersedia pada browser.

Foto diperkecil maksimum 2.000 px dan dikonversi di browser. Pemilihan atau pembatalan foto belum mengunggah apa pun. Upload dilakukan saat penyimpanan, dibersihkan bila penyimpanan database gagal, dan foto lama baru dibersihkan setelah commit berhasil. Storage menolak penghapusan foto yang masih direferensikan serta menolak overwrite objek oleh pengguna. Jika proses server mati di antara upload dan commit, berkas bisa tertinggal: gunakan skrip cleanup di bawah, tanpa scheduler baru.

```sh
# Token sesi pengguna (JWT access token), BUKAN service-role key atau token CLI Supabase.
# Isi hanya lewat environment lokal; jangan tulis token dalam perintah yang dibagikan.
node --env-file=.env.local scripts/cleanup-images.mjs
# Setelah meninjau dry run, tambahkan --apply untuk menghapus objek yatim milik akun itu.
```

Skrip memerlukan `SUPABASE_USER_ACCESS_TOKEN` pada environment, hanya mempertimbangkan WebP berusia lebih dari 24 jam dalam folder akun tersebut, memeriksa referensi database, dan tetap tunduk pada kebijakan Storage yang melindungi gambar aktif. Jalankan per akun yang memiliki upload yatim; jangan memakai service-role key. Kesalahan cleanup tidak menggagalkan penyimpanan artikel yang sudah berhasil.

## Autentikasi dan SMTP produksi

`/daftar` mengirim OTP dengan `shouldCreateUser:true`; `/masuk` memakai `shouldCreateUser:false`. Email yang belum terdaftar tidak otomatis dibuat dari login. Keduanya menggunakan layar verifikasi enam digit dan `verifyOtp(type: email)` yang sama. Tidak ada password pada login. Route lama `/lupa-kata-sandi` dan `/atur-kata-sandi` diarahkan ke `/masuk`: OTP sudah menjadi cara masuk dan pemulihan, termasuk untuk akun lama. Tidak ada alur reset password terpisah atau redirect email berbasis localhost.

Pada Supabase Auth proyek hosted:

1. Aktifkan Email provider, pendaftaran, dan konfirmasi email. Atur OTP enam digit, masa berlaku dan rate limit yang sesuai.
2. Isi template **Confirm signup** dan **Magic Link** dengan kode `{{ .Token }}`; contoh ada di `supabase/templates/otp.html`. Template lokal sudah dikonfigurasi untuk keduanya. Template yang hanya berisi tautan tidak cukup untuk layar enam digit.
3. Tetapkan Site URL ke origin HTTPS produksi dan allowlist callback `https://DOMAIN/auth/callback` bila memakai tautan Auth/PKCE. Hindari wildcard domain yang tidak diperlukan.
4. Gunakan provider email transaksional dan domain pengirim terverifikasi untuk production. Konfigurasi SPF/DKIM dan DMARC sesuai provider, alamat From, kuota, serta penanganan bounce. Gmail SMTP hanya untuk development/testing.
5. Masukkan kredensial SMTP hanya di secret/dashboard provider. Jangan menampilkan atau memasukkannya ke repository. Tidak ada skrip di proyek ini yang mengubah dashboard SMTP.

Uji email nyata di staging: daftar alamat baru, masukkan kode, keluar, masuk lagi dengan OTP, coba email yang belum terdaftar dari `/masuk`, kode salah/kedaluwarsa, dan rate limit. Test lokal menggunakan transport Auth tiruan; tidak mengirim email.

## Admin pertama dan workflow

Setelah pemilik mendaftar dan memverifikasi OTP, jalankan sekali lewat SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'email-pemilik@example.com');
```

Gunakan `/admin` selanjutnya. RPC mengunci perubahan peran secara serial dan menolak demosi admin terakhir; buat admin pengganti dahulu. Penghapusan akun melalui akses istimewa dashboard/SQL tetap merupakan tanggung jawab operator.

Workflow aktif:

- Kontributor: buat `draft` atau `submitted` miliknya; edit `draft`/`revision` menjadi `draft`/`submitted`.
- Redaksi: `submitted` -> `revision`, `approved`, `published`, atau `rejected`; `approved` -> `revision`, `published`, atau `rejected`.
- Penulis memperbaiki `revision` dan mengirim kembali sebagai `submitted`.
- Artikel `published` hanya dapat diarsipkan ke `archived` lewat keputusan biasa. `rejected` dan `archived` adalah status akhir, tanpa tombol keputusan lain.
- RPC menerima `expected_status`, mengunci baris, dan menolak halaman lama bila status berubah. Editor harus memuat ulang setelah konflik. Keputusan dan notifikasi tersimpan dalam transaksi yang sama.

Editor/admin menetapkan **Kerja Sama/Advertorial** pada form keputusan sebelum persetujuan/penerbitan. Kontributor tidak bisa mengatur label lewat form maupun REST. Label terlihat di beranda, kartu pencarian/kanal/penulis, dan halaman artikel. Untuk mengoreksi label artikel yang sudah terbit, arsipkan dan tangani melalui prosedur redaksi; UI tidak menawarkan edit publikasi tanpa review.

Halaman transparansi: `/ketentuan-penggunaan`, `/privasi`, `/cookies`, `/tentang`, `/kontak`, `/kebijakan-koreksi`, dan `/tautan-eksternal`. Pengelola perlu meninjau naskah kebijakan sesuai identitas badan penerbit, praktik retensi data, dan kanal kontak sebelum peluncuran.

## Verifikasi

```sh
npm run lint
npm test
npm run build
npm audit --omit=dev
npm run start -- --port 3107
```

Build memerlukan `NEXT_PUBLIC_SITE_URL` produksi yang valid. Untuk verifikasi lokal saja boleh memakai domain HTTPS contoh pada environment proses; ganti dengan domain sebenarnya saat deploy. Jangan mengubah dev server pengguna di port 3000.

`npm test` mencakup OTP login/signup melalui SDK Supabase dengan transport tiruan, kontrak layar kode, validasi URL gambar, konfigurasi URL production, status aktif, dan larangan fixture berita/view writes. Test existing tetap ada.

Matriks SQL executable ada di `supabase/tests/security.sql`. Jalankan sebagai postgres setelah seluruh migrasi pada database **disposable kosong**; test menolak database yang sudah memiliki profil dan melakukan rollback semua fixture. Mencakup RLS insert/update, kolom terlarang, submit draft/revisi, publish editor, dua editor dengan status lama, label advertorial, gambar aktif, serta admin terakhir. Contoh:

```sh
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
```

Alternatif lokal tanpa Docker/Postgres: sediakan `@electric-sql/pglite` di direktori temporary di luar repository, set `PGLITE_MODULE` ke path absolut `dist/index.js`, lalu jalankan `node scripts/verify-sql.mjs`. Runner membuat database WASM sementara dan menerapkan semua migrasi; skema Auth/Storage minimal disediakan untuk pengujian database. Ini bukan pengganti integration test proyek Supabase hosted, jaringan SMTP, atau uji paralel multi-koneksi sesungguhnya. Tidak ada dependency aplikasi baru.

Smoke-test production minimal `/`, `/daftar`, `/masuk`, `/artikel/<slug-yang-terbit>`, `/kanal/terbaru`, `/cari`, `/api/health`, serta halaman legal. Jika database kosong, artikel tidak dikenal harus 404; jangan menambahkan berita demo untuk membuat smoke test lulus. Health harus 200 dan `database: connected`; gangguan database harus 503. Hentikan proses server sementara setelah pengujian.

## Checklist deploy

- Backup dan uji migrasi di staging; terapkan migrasi serta konfigurasi `site_configuration` pada proyek target.
- Isi environment build/runtime, domain HTTPS, dan alamat kontak redaksi yang benar.
- Siapkan provider transaksional, domain email terverifikasi, template OTP dan allowlist callback; uji email nyata.
- Buat admin pertama; uji kontributor, editor, admin, dan percobaan REST yang ditolak.
- Audit artikel/gambar lama, izin foto, label advertorial dan konten legal. Terbitkan artikel asli bila ingin menguji slug valid.
- Jalankan lint/test/build/audit dan matriks SQL; smoke-test production terhadap Supabase staging yang sudah dimigrasi.
- Pastikan hosting menerima multipart 6 MB, secret hanya di server/provider, backup tersedia, dan server sementara dihentikan.
