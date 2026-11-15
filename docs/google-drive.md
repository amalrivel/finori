# Google Drive dan CRUD transaksi

Finori menggunakan `googleapis` di server Node.js (Node 22+). Login aplikasi tetap Supabase. Google OAuth hanya mengizinkan penyimpanan lampiran pada Drive pribadi, dengan scope `https://www.googleapis.com/auth/drive.file`.

## Setup Google Cloud

1. Buat/pilih proyek di [Google Cloud Console](https://console.cloud.google.com/).
2. Buka **APIs & Services → Library**, cari **Google Drive API**, lalu **Enable**.
3. Buka **Google Auth Platform**. Isi branding/nama aplikasi Finori, email dukungan, dan kontak developer. Pilih audience **External** untuk akun Gmail pribadi. Jika status masih **Testing**, tambahkan email Google Anda sebagai test user.
4. Pada **Data Access**, gunakan scope `https://www.googleapis.com/auth/drive.file`. Aplikasi tidak memerlukan akses seluruh isi Drive.
5. Pada **Clients**, buat **OAuth client ID**, tipe **Web application**. Tambahkan **Authorized redirect URI**:

   ```text
   http://127.0.0.1:3000/api/drive/callback
   ```

   Origin harus sama dengan URL aplikasi yang dibuka. Jika memakai `localhost`, ubah redirect URI di Google dan `.env.local` menjadi `http://localhost:3000/api/drive/callback` dan buka aplikasi dengan hostname itu. Jangan mencampur `localhost` dan `127.0.0.1` selama OAuth.

6. Isi `.env.local` memakai contoh berikut. Jangan mengirim Client Secret lewat chat atau memasukkannya ke Git.

   ```dotenv
   GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/drive/callback
   SUPABASE_SECRET_KEY=your-private-local-supabase-secret-key
   DRIVE_TOKEN_ENCRYPTION_KEY=your-32-byte-base64-key
   ```

   `SUPABASE_SECRET_KEY` dan `DRIVE_TOKEN_ENCRYPTION_KEY` sudah disiapkan untuk workspace lokal ini. Untuk lingkungan baru, ambil secret server dari `npx supabase status` (SECRET_KEY atau legacy SERVICE_ROLE_KEY) dan buat kunci enkripsi sekali dengan:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   Jangan ganti kunci enkripsi ketika koneksi Drive masih aktif tanpa menghubungkan ulang akun. Backup kunci dan database secara privat. Semua variabel di atas khusus server; tidak memakai prefiks `NEXT_PUBLIC_`.

7. Jalankan `npx supabase migration up` untuk workspace baru, lalu jalankan ulang `npm run dev`.
8. Masuk Finori → **Penyimpanan** → **Hubungkan Google Drive**. Pilih akun Google pribadi dan setujui izin. Finori membuat folder **Finori — Lampiran** yang privat.

Google OAuth dalam mode Testing dapat memberikan refresh token yang kedaluwarsa setelah tujuh hari untuk scope Drive. Untuk penggunaan berkelanjutan, tinjau publishing status Google OAuth sesuai dokumentasi Google; ini berbeda dari membagikan atau men-deploy aplikasi Finori ke publik. Jika izin dicabut/expired, pilih **Hubungkan ulang**. Hubungkan akun Google semula jika sudah ada lampiran terkait.

Referensi: [OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [masa berlaku token](https://developers.google.com/identity/protocols/oauth2#expiration), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

## Pemakaian

- **Tambah transaksi:** simpan transaksi melalui form biasa. Setelah tersimpan, buka **Detail transaksi** untuk menambahkan gambar; ini mencegah unggahan untuk transaksi yang belum ada.
- **Baca:** Detail menampilkan seluruh field yang tersedia, rincian barang/diskon, dan daftar lampiran. Klik **Lihat gambar** untuk mengambil gambar privat, atau **Unduh gambar** setelah preview tersedia.
- **Ubah:** **Ubah transaksi / rincian** memakai form React Hook Form + Zod yang sama. Dapat mengubah nominal, tanggal, kategori, rekening dalam mata uang yang sama, serta menambah/mengubah/menghapus baris barang. **Tanpa rincian** menghapus rincian setelah perubahan disimpan. Saldo dan grafik ikut diperbarui setelah database mengonfirmasi.
- **Lampiran:** upload JPEG/PNG/WebP maksimal 5 MB, maksimal 10 gambar per transaksi. Nama file bisa diubah. Untuk mengganti gambar, hapus lampiran lama lalu unggah penggantinya.
- **Hapus lampiran:** konfirmasi memindahkan gambar ke sampah Drive dan menghapus kaitannya di Finori. Pemulihan file melalui sampah Drive tidak otomatis mengembalikan metadata lampiran; unggah kembali bila ingin mengaitkannya ulang.
- **Hapus transaksi:** konfirmasi menghapus transaksi dan rincian, lalu saldo/laporan dihitung ulang. Transaksi dengan lampiran dilindungi foreign key; hapus lampirannya dahulu agar file Drive tetap terkelola.
- **Putuskan koneksi:** refresh token lokal dihapus dan izin Google dicoba dicabut. File dan metadata tetap ada. Jika Google sedang tidak dapat dihubungi, UI memberi tahu agar izin juga dicabut melalui akun Google.

## Pemeliharaan dan batas integrasi

- `src/lib/drive/server.ts`: validasi JWT Supabase melalui `getUser`, pemeriksaan kepemilikan, Google client, dan respons error tanpa credential.
- `src/lib/drive/security.ts`: AES-256-GCM untuk refresh token/state OAuth, pembatasan request stream, pemeriksaan signature gambar dan nama file.
- `/api/drive`: status koneksi/start OAuth/disconnect. Callback mengikat state+PKCE ke token login dalam cookie terenkripsi HttpOnly, SameSite=Lax, kedaluwarsa 10 menit. Cookie Secure untuk HTTPS.
- `/api/transactions/[transactionId]/attachments`: daftar/upload. Subroute `[attachmentId]` menyediakan preview privat, rename, dan hapus. Browser mengirim bearer token pada request; gambar diterima sebagai blob URL sementara yang dibersihkan saat ditutup. File tidak dipublikasikan dan token Google tidak dikirim ke browser.
- `drive_connections`: RLS aktif, tidak dapat dibaca/ditulis `anon` maupun `authenticated`; service-role server menyimpan token terenkripsi per pengguna. `transaction_attachments` hanya dapat dibaca pemiliknya. Mutasi metadata melalui API server setelah kepemilikan transaksi diperiksa.
- Setiap file hanya dapat dikelola melalui ID lampiran dalam database, bukan file ID bebas dari request. Foreign key mengikat lampiran ke pengguna/transaksi; slot unik 1–10 membatasi jumlah walau ada upload bersamaan.
- Operasi Google Drive dan Postgres tidak dapat menjadi satu transaksi atomik. Jika metadata upload gagal, file dicoba dipindahkan ke sampah; rename/delete mencoba rollback saat database gagal. Jika kompensasi juga gagal, pesan meminta pemeriksaan Drive. Kegagalan jaringan setelah Google menerima unggahan dapat meninggalkan file tanpa metadata; periksa folder sebelum mengulang.
- Penghapusan/perubahan file secara manual di Drive dapat membuat preview tidak tersedia. UI melaporkan error tanpa mengubah transaksi keuangan.
- Google OAuth eksternal belum dapat diverifikasi tanpa Client ID/Secret dan persetujuan akun pribadi. Tes lokal memeriksa kriptografi, batas upload, CRUD/RLS, serta jalur API tanpa Google. Lakukan uji upload-preview-rename-delete dan reconnect setelah setup selesai.
