# Finori

Aplikasi pencatatan keuangan menggunakan Next.js, shadcn, dan Supabase lokal.

## Menjalankan aplikasi

```bash
npm ci
npx supabase start
npx supabase migration up
npm run dev
```

Salin `.env.example` ke `.env.local` jika belum tersedia. Ambil **API_URL** dan **PUBLISHABLE_KEY** dari `npx supabase status`. URL aplikasi menggunakan `http://127.0.0.1:54321`, bukan URL koneksi PostgreSQL pada port 54322. Jangan masukkan secret key atau service-role key ke environment `NEXT_PUBLIC_*`.

Buka [localhost:3000](http://localhost:3000), pilih **Daftar akun**, lalu masuk dengan email dan password. Konfigurasi lokal saat ini tidak mewajibkan konfirmasi email. Setiap pengguna mulai dengan daftar rekening kosong. Tambahkan rekening/dompet sebelum mencatat transaksi.

## Akses cepat saat development

Aplikasi ditujukan untuk penggunaan pribadi. Siapkan akun testing lokal sekali:

```bash
npm run dev:account
npm run dev
```

`npm run dev` hanya mendengarkan koneksi loopback `127.0.0.1`, sehingga tidak dibagikan ke jaringan lokal.

Tombol **Masuk akun testing** muncul pada halaman login selama `next dev`. Akun ini menyimpan data testing tersendiri. Password acak disimpan pada `.env.local` sebagai `DEV_TEST_PASSWORD`, bukan variable publik atau kode frontend. Menjalankan ulang perintah setup memakai akun yang sama tanpa menghapus atau mereset datanya.

Pada `next build` / `next start`, tombol tidak ditampilkan dan endpoint akses testing mengembalikan 404. Akses cepat juga ditolak jika aplikasi atau Supabase menggunakan host selain loopback lokal. Untuk data pribadi, gunakan login email/password biasa.

## Data

- Rekening, saldo awal, transaksi, rincian barang, serta diskon tersimpan di database.
- Row Level Security membatasi akses berdasarkan pengguna yang sedang masuk.
- Rekening bertransaksi tidak dapat dihapus, termasuk lewat API langsung.
- Impor JSON disimpan sekaligus: jika satu transaksi ditolak database, seluruh batch gagal.
- Rekening dan transaksi baru tampil setelah database mengonfirmasi penyimpanan. Jika terjadi kegagalan, isian dipertahankan dan pesan kesalahan ditampilkan.
- Memuat ulang halaman atau masuk dari browser lain dengan akun yang sama memuat data yang sudah tersimpan.
- Halaman Ringkasan menampilkan angka utama, satu grafik arus kas, dan lima transaksi terakhir. Halaman `/analytics` menampung analisis lengkap, pencarian, dan ekspor CSV. Keduanya mendukung filter bulan/mata uang dan memakai data tersimpan.

Skema yang dapat direproduksi berada di `supabase/migrations/`. Tidak perlu mereset database untuk menjalankan aplikasi.

## Mata uang

Pilih **IDR**, **JPY**, atau **USD** saat menambah rekening/dompet. Gunakan rekening terpisah untuk setiap mata uang. Transaksi, rincian barang, dan diskon mengikuti mata uang rekening: IDR/JPY berupa angka utuh, USD maksimal 2 desimal (input `12.50`). Mata uang rekening yang sudah memiliki transaksi tidak dapat diubah, termasuk lewat API.

Dashboard memiliki pilihan mata uang untuk ringkasan, grafik, dan daftar transaksi. Daftar rekening menampilkan total terpisah per mata uang; saldo berlainan mata uang tidak dijumlahkan. Belum ada konversi kurs atau transfer valas otomatis. Dashboard tidak mengubah kategori transaksi lama secara otomatis.

Impor JSON boleh mencampur rekening dari berbagai mata uang dalam satu batch. `currency` opsional dan harus sama dengan mata uang `accountId`; nominal selalu dalam mata uang rekening tersebut. Ekspor CSV menyertakan mata uang dan rekening. Data sebelum migrasi tetap IDR dengan nominal yang sama.

## Pemeriksaan

```bash
npm run lint
npx tsc --noEmit
node --test --test-isolation=none src/lib/finance.test.ts src/lib/form-schemas.test.ts src/lib/multicurrency.test.ts src/lib/dashboard.test.ts
npm run test:db
npm run test:dev-login
npm run build
```

`test:db` hanya berjalan untuk alamat Supabase lokal. Tes membuat dua pengguna sementara, memeriksa CRUD, penyimpanan rincian, isolasi antar pengguna, larangan hapus rekening bertransaksi, dan rollback impor. Pengguna serta data tes dibersihkan setelah selesai. Secret lokal hanya dibaca oleh skrip tes dari CLI, tidak dikirim ke browser.

## Tema dan tampilan

Panduan token warna, mode terang/gelap, dan penyesuaian Dialog berada di [docs/theme.md](docs/theme.md). Sumber warna aplikasi tetap di `src/app/globals.css`.

Perhitungan dashboard dan aturan grafik dijelaskan di [docs/dashboard.md](docs/dashboard.md).

## Format kode

```bash
npm run format        # Format source, konfigurasi, dan dokumentasi
npm run format:check  # Periksa format tanpa mengubah file
npm run lint          # Periksa kualitas kode dengan ESLint
```

Prettier memakai `.prettierrc`. Plugin `prettier-plugin-tailwindcss` mengurutkan utility pada `className`, `cn()`, dan `cva()`. Untuk Tailwind v4, plugin membaca token tema dari `src/app/globals.css` melalui `tailwindStylesheet`. Jika menambah plugin Prettier lain, pertahankan plugin Tailwind di urutan terakhir.

`eslint-config-prettier/flat` diletakkan setelah konfigurasi Next.js/TypeScript di `eslint.config.mjs` untuk mematikan aturan format yang bertabrakan. ESLint tetap memeriksa kualitas kode; formatting dijalankan oleh Prettier.

`.prettierignore` mengecualikan build, lockfile hasil generator, kredensial, tooling lokal, dan graphify. Untuk format saat menyimpan di editor, pilih ekstensi Prettier (`esbenp.prettier-vscode`) sebagai formatter dan aktifkan format on save; konfigurasi proyek ini akan dipakai otomatis.
