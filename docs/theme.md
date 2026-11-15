# Tema Finori

Tema menggunakan permukaan netral hangat dan aksen hijau redup. Tujuannya membedakan halaman, kartu, serta modal dengan jelas tanpa putih murni pada seluruh permukaan atau hitam pekat pada mode gelap.

## Sumber warna

Seluruh nilai warna berada di `src/app/globals.css`:

- `:root`: mode terang.
- `.dark`: mode gelap, diterapkan pada `<html>` oleh `next-themes`.
- `@theme inline`: menghubungkan CSS variables dengan utility Tailwind/shadcn.

Jangan memasang ulang token tema pada `<body>`, `.home-dashboard`, atau wrapper halaman. Dialog dan popover menggunakan portal; token pada root memastikan permukaan dan teksnya tetap mengikuti tema yang sama. `color-scheme` juga menyesuaikan kontrol native dan scrollbar.

| Token                                                  | Pemakaian                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| `--background`, `--foreground`                         | Halaman dan teks utama                                        |
| `--card`, `--card-foreground`                          | Kartu biasa                                                   |
| `--popover`, `--popover-foreground`                    | Dialog, menu, dan popover dengan latar solid                  |
| `--primary`, `--primary-foreground`                    | Tombol utama dan teks di atasnya                              |
| `--secondary`, `--accent` beserta `-foreground`        | Tombol sekunder dan keadaan interaktif                        |
| `--muted`, `--muted-foreground`                        | Permukaan pendukung, deskripsi, dan placeholder               |
| `--border`, `--input`, `--ring`                        | Pembatas, batas kontrol, dan fokus keyboard                   |
| `--destructive`                                        | Pesan kesalahan dan tindakan destruktif                       |
| `--overlay`                                            | Lapisan peredup di belakang Dialog, terhubung ke `bg-overlay` |
| `--balance`, `--balance-foreground`, `--balance-muted` | Kartu saldo `.balance-card`                                   |
| `--sidebar-*`, `--chart-*`                             | Sidebar dan grafik                                            |

Sidebar mengikuti token tema utama. `.balance-card` hanya mengganti token kartu dan teks pendukung di dalam kartu tersebut; jangan gunakan aturan ini untuk modal.

## Dialog

Implementasi bersama: `src/components/ui/dialog.tsx`.

- Memakai `bg-popover` dan `text-popover-foreground`, border, serta shadow untuk memisahkan modal dari halaman.
- Overlay berwarna gelap dengan opasitas berbeda untuk mode terang/gelap. Tidak menggunakan backdrop blur.
- Header menyediakan ruang untuk tombol tutup agar judul panjang tidak bertumpuk.
- Animasi dihentikan ketika pengguna memilih reduced motion.
- Komposisi shadcn/Base UI, pengelolaan fokus, dan perilaku Escape tetap digunakan.

## Mengubah atau menambah warna

1. Ubah pasangan token latar dan teks dalam **kedua mode** di `globals.css`.
2. Gunakan utility semantik seperti `bg-card`, `text-muted-foreground`, dan `border-input` pada komponen. Hindari nilai hex pada halaman.
3. Bila token baru memang dibutuhkan, tambahkan nilainya di `:root`/`.dark` dan pemetaannya pada `@theme inline`.
4. Periksa Dialog tambah/ubah rekening, konfirmasi hapus, impor JSON, serta rincian barang. Periksa juga sidebar mobile, menu, input invalid, fokus keyboard, dan kartu saldo.
5. Jalankan `npm run build`. Bandingkan tampilan terang/gelap, layar kecil, dan reduced motion di browser.

Target kontras teks normal minimal 4.5:1, batas kontrol dan indikator fokus minimal 3:1 terhadap permukaannya. Pasangan teks utama, deskripsi modal, tombol, kesalahan, dan kartu saldo telah diperiksa secara numerik pada kedua palet. Pemeriksaan ini tidak menggantikan pemeriksaan visual dan seluruh keadaan interaktif di browser.
