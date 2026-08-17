# borles

OUTCOME:

Saya ingin membangun sebuah aplikasi ujian online yang lengkap untuk SMK Borneo Lestari, sebuah sekolah menengah kejuruan di Banjarbaru, Kalimantan Selatan. Aplikasi ini harus memungkinkan guru membuat dan mengelola ujian, siswa mengikuti ujian secara online dengan aman, dan admin mengelola seluruh sistem serta melihat laporan hasil ujian.

CONTEXT:

Sekolah: SMK Borneo Lestari - Akreditasi A, motto "ASIK" (Agamis, Santun, Inovatif, Kompetetif)

Target Pengguna: Admin sekolah, Guru/Staff, dan Siswa

Tech Stack yang Diinginkan:

Frontend: React + Tailwind CSS (atau framework yang direkomendasikan Lovable)

Backend & Database: Supabase (autentikasi, database, storage, RLS)

Deployment: Lovable Cloud

REQUIREMENTS:

A. Manajemen Pengguna (Role-Based Access)

Tiga role pengguna: Admin, Guru, dan Siswa

Admin: Akses penuh ke semua data, kelola user, lihat semua laporan

Guru: Buat ujian, kelola soal, lihat hasil siswa, beri nilai manual untuk soal esai

Siswa: Login, ikuti ujian yang tersedia, lihat riwayat dan hasil ujian sendiri

B. Manajemen Ujian (Guru & Admin)

Guru dapat membuat ujian dengan: judul, deskripsi, durasi (menit), jadwal mulai & selesai

Kategori ujian berdasarkan mata pelajaran atau jurusan

Guru dapat menambahkan soal ke dalam ujian dengan tipe:

Pilihan Ganda (single choice) - 4 opsi jawaban, 1 benar

Multiple Answer - lebih dari 1 jawaban benar

Upload File (untuk esai/proyek) - siswa upload PDF/Gambar

Soal dapat menyertakan gambar (upload image)

Bank soal: Guru dapat menyimpan soal ke bank soal untuk digunakan kembali

C. Portal Siswa (Mengikuti Ujian)

Halaman dashboard siswa: daftar ujian yang tersedia (aktif) dan riwayat ujian

Saat membuka ujian:

Timer countdown sesuai durasi ujian

Palet soal navigasi (menunjukkan nomor soal, status terjawab/belum)

Auto-save jawaban setiap kali siswa memilih jawaban

Tombol "Submit" untuk mengumpulkan ujian

Setelah submit: siswa langsung melihat skor untuk soal otomatis

Single attempt: Siswa hanya bisa mengikuti 1 kali untuk setiap ujian

Cegah akses bersamaan: Cegah login dari perangkat berbeda saat ujian berlangsung

D. Penilaian & Hasil

Penilaian otomatis untuk soal pilihan ganda dan multiple answer

Penilaian manual untuk soal upload file: Guru bisa memberi skor dan feedback

Guru dapat melihat hasil semua siswa dalam bentuk tabel

Ekspor hasil ke Excel/CSV

Dashboard analitik: statistik nilai, grafik performa, trending nilai

E. Keamanan

Autentikasi menggunakan Supabase Auth (email + password)

Row Level Security (RLS) di Supabase untuk membatasi akses data berdasarkan role

Validasi file upload: tipe file (PDF, JPG, PNG, DOCX), ukuran max 5MB

CSRF protection untuk setiap form

Session management dengan timeout

F. UI/UX Design

Tema warna: Hijau dan Putih (sesuai identitas sekolah) dengan aksen emas

Tampilan modern, bersih, dan responsif (mobile-friendly)

Gunakan komponen dari shadcn/ui jika tersedia

Navigasi sidebar untuk dashboard admin/guru

Landing page dengan informasi profil sekolah dan login/register

CONSTRAINTS (HAL YANG TIDAK BOLEH DIUBAH):

Jangan mengubah struktur database yang sudah ditentukan tanpa konfirmasi

Jangan merusak autentikasi yang sudah dibangun

Jangan menghapus data ujian yang sudah ada saat melakukan perubahan

Semua perubahan harus menjaga RLS policy yang sudah diterapkan

Jika ada konflik dengan arsitektur yang ada, stop dan beri penjelasan

ACCEPTANCE CRITERIA (KRITERIA KEBERHASILAN):

✅ Admin bisa login dan melihat dashboard dengan semua menu

✅ Guru bisa membuat ujian baru dengan soal pilihan ganda

✅ Guru bisa menambahkan soal upload file ke dalam ujian

✅ Siswa bisa login dan melihat daftar ujian yang tersedia

✅ Siswa bisa mengikuti ujian dengan timer yang berjalan

✅ Jawaban siswa tersimpan otomatis

✅ Siswa hanya bisa submit 1 kali (single attempt)

✅ Sistem menampilkan skor otomatis setelah submit

✅ Guru bisa melihat hasil siswa dan memberi nilai manual untuk soal esai

✅ Ekspor hasil ujian ke Excel berfungsi

✅ Aplikasi responsif di mobile, tablet, dan desktop

✅ Semua role memiliki akses sesuai haknya (RLS berfungsi)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/17656cac-1522-40fd-aabc-5caf790a3382).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
