# Dashboard dari data tersimpan

Halaman **Ringkasan** (`/`, `src/components/home.tsx`) hanya menampilkan filter, empat angka utama, satu grafik arus kas, dan lima transaksi terbaru. Tautan **Buka analisis lengkap** menuju `/analytics`.

Halaman **Analisis** (`src/app/(dashboard)/analytics/page.tsx`, `src/components/analytics.tsx`) memuat grafik lengkap, pola transaksi, informasi kategori, rincian rekening, pencarian, serta ekspor CSV. Sidebar dan header mengenali halaman ini; tautan bagian arus kas/pola transaksi menuju `/analytics#...`.

Keduanya memakai `DashboardFilters` (`src/components/dashboard-filters.tsx`) dengan FieldGroup grid satu kolom pada layar kecil dan dua kolom mulai breakpoint `sm`. Field memakai lebar penuh tanpa lebar tetap atau `flex-row`; informasi rentang berada di bawah filter agar tidak berebut ruang. ID label/kontrol memakai `useId`.

Kedua halaman membaca akun/transaksi milik pengguna dari `FinanceProvider`. Provider memuat seluruh halaman data Supabase, bukan hanya 1.000 baris pertama. Dashboard tidak menulis atau mengubah transaksi.

## Perhitungan

`src/lib/dashboard.ts` berisi fungsi murni `buildDashboard`, dengan pengujian di `src/lib/dashboard.test.ts`.

- Mata uang disaring berdasarkan rekening. IDR, JPY, dan USD tidak dijumlahkan atau dikonversi.
- Default periode **Seluruh data**, dari tanggal transaksi pertama sampai terakhir. Pilihan bulan berasal dari data mata uang tersebut.
- Pemasukan, pengeluaran, arus kas bersih, grafik, pola transaksi, dan daftar terbaru mengikuti filter periode. Arus kas bersih = pemasukan − pengeluaran; bukan saldo.
- **Saldo tercatat saat ini** dan tabel rekening selalu memakai seluruh riwayat beserta saldo awal, terlepas dari filter bulan.
- Grafik saldo memulai perhitungan dari saldo awal + transaksi sebelum awal rentang. Setiap titik menunjukkan saldo setelah aktivitas pada interval tersebut. Saldo negatif dipertahankan.
- Untuk bulan terpilih, rentang meliputi seluruh hari kalender. Untuk seluruh data, rentang dimulai/diakhiri tanggal transaksi yang tersedia.
- Rentang ≤62 hari menggunakan titik harian; selebihnya menggunakan bulanan hingga 24 bulan, lalu tahunan. Interval tanpa transaksi diisi arus kas nol dan saldo diteruskan. Tanggal menggunakan UTC untuk menghindari pergeseran hari.
- Uang dijumlahkan melalui `sumMoney`; rincian barang tidak dijumlahkan lagi karena sudah merupakan bagian nominal transaksi.

Saldo adalah rekonstruksi dari data yang dicatat, bukan hasil sinkronisasi bank. Saldo awal tidak memiliki tanggal efektif dalam model saat ini dan dipakai sebagai dasar sebelum riwayat transaksi.

## Data lama berkategori Lainnya

Dashboard menampilkan jumlah transaksi berkategori **Lainnya** tanpa menebak kategori baru. Grafik pengeluaran menggabungkan nama catatan yang identik setelah normalisasi Unicode, spasi, dan huruf besar/kecil; tidak menggabungkan nama berbeda secara semantik. Nama catatan bukan kategori atau merchant yang sudah diverifikasi. Grafik menampilkan enam kelompok dengan nominal terbesar, bukan semua kelompok.

Rata-rata pengeluaran dihitung per transaksi pengeluaran. Hari pengeluaran tertinggi menjumlahkan pengeluaran pada tanggal yang sama; pemasukan tidak menguranginya. Bila tidak ada pengeluaran, tampilkan keadaan kosong, bukan rasio tak terdefinisi.

## Tampilan grafik

`DashboardCharts` menerima `overview` untuk hanya merender grafik arus kas pada Ringkasan. Mode default menampilkan empat grafik pada Analisis.

`src/components/dashboard-charts.tsx` memakai `src/components/ui/chart.tsx` (shadcn) dan Recharts v3:

- Area pemasukan/pengeluaran tidak ditumpuk; grafik saldo memakai langkah antar interval.
- Warna berasal dari `--chart-1/2/3` di `globals.css`. Format tooltip mengikuti mata uang; label sumbu disingkat.
- ChartContainer memiliki tinggi eksplisit agar responsif. `accessibilityLayer` diaktifkan; tooltip menampilkan nominal lengkap. Animasi data dimatikan.
- Mode sembunyikan nominal tidak merender grafik/tooltip maupun rincian barang, agar nilai tidak bocor melalui label grafik.
- Daftar terbaru di Analisis dibatasi sepuluh hasil (Ringkasan lima hasil). Ekspor CSV mencakup seluruh transaksi sesuai mata uang/periode terpilih, bukan hanya sepuluh baris atau pencarian daftar.
- Navigasi sidebar **Pola transaksi** menuju `/analytics#pola-transaksi`, menggantikan anggaran contoh.

Pemeriksaan: `node --test --test-isolation=none src/lib/dashboard.test.ts`, `npm run lint`, `npx tsc --noEmit`, dan `npm run build`. Untuk pemeriksaan visual, gunakan tema terang/gelap dan viewport kecil; periksa pula rentang satu hari, periode tanpa pengeluaran, dan saldo negatif.

## Detail transaksi

`TransactionDetails` (`src/components/transaction-details.tsx`) menyediakan Dialog read-only yang sama untuk Transaksi, Ringkasan, Analisis, detail rekening, dan pratinjau impor JSON. Isinya mencakup nama, arah pemasukan/pengeluaran, nominal/mata uang, tanggal, kategori, rekening, ID, serta waktu pencatatan di aplikasi. Waktu pencatatan berasal dari `created_at` database dan berbeda dari tanggal transaksi, terutama untuk data hasil impor.

`PurchaseDetailsContent` pada `purchase-items.tsx` menampilkan jumlah/harga barang, jenis, kelompok, diskon per baris, subtotal, diskon seluruh belanja, dan total akhir. Transaksi tanpa rincian memiliki keadaan kosong; aplikasi tidak menebak daftar barang. Pratinjau JSON diberi label belum disimpan dan tidak memiliki ID/waktu pencatatan. Saat nominal disembunyikan di Ringkasan/Analisis, pemicu detail juga disembunyikan.
