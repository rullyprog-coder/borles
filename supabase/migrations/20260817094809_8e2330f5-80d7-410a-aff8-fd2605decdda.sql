create temp table _pairs(name text, idx int, term text, def text);
insert into _pairs values
('Administrasi Farmasi',1,'Faktur','Dokumen tagihan dari distributor yang memuat rincian barang, jumlah, dan harga'),
('Administrasi Farmasi',2,'Kartu stok','Catatan keluar-masuk setiap jenis sediaan farmasi di gudang atau apotek'),
('Administrasi Farmasi',3,'Surat pesanan','Dokumen resmi apotek untuk memesan sediaan farmasi kepada distributor resmi'),
('Administrasi Farmasi',4,'Stock opname','Kegiatan menghitung fisik persediaan dan mencocokkannya dengan catatan'),
('Administrasi Farmasi',5,'Defecta','Buku catatan barang yang habis atau menipis sebagai dasar pemesanan'),
('Administrasi Farmasi',6,'Copy resep','Salinan resep yang dibuat apotek memuat keterangan obat yang sudah diserahkan'),
('Administrasi Farmasi',7,'HET','Harga eceran tertinggi yang boleh dibebankan kepada pasien untuk obat tertentu'),
('Administrasi Farmasi',8,'Margin','Selisih antara harga jual dan harga pokok pembelian barang'),
('Administrasi Farmasi',9,'FIFO','Metode pengeluaran barang berdasarkan yang lebih dahulu masuk lebih dahulu keluar'),
('Administrasi Farmasi',10,'FEFO','Metode pengeluaran barang berdasarkan tanggal kedaluwarsa terdekat lebih dahulu'),
('Administrasi Farmasi',11,'Retur','Pengembalian barang kepada distributor karena rusak, salah kirim, atau kedaluwarsa'),
('Administrasi Farmasi',12,'Pemusnahan obat','Kegiatan memusnahkan obat rusak/kedaluwarsa disertai berita acara resmi'),
('Bahasa Indonesia',1,'Gagasan utama','Inti pembicaraan yang menjadi dasar pengembangan sebuah paragraf'),
('Bahasa Indonesia',2,'Kalimat efektif','Kalimat yang singkat, jelas, dan sesuai kaidah sehingga mudah dipahami'),
('Bahasa Indonesia',3,'Teks eksposisi','Teks yang memaparkan informasi disertai argumen untuk meyakinkan pembaca'),
('Bahasa Indonesia',4,'Teks prosedur','Teks berisi langkah-langkah berurutan untuk melakukan sesuatu'),
('Bahasa Indonesia',5,'Teks negosiasi','Teks berisi tawar-menawar untuk mencapai kesepakatan kedua pihak'),
('Bahasa Indonesia',6,'Majas personifikasi','Gaya bahasa yang memberi sifat manusia kepada benda mati'),
('Bahasa Indonesia',7,'Konjungsi','Kata penghubung antarkata, antarklausa, atau antarkalimat'),
('Bahasa Indonesia',8,'Kalimat baku','Kalimat yang sesuai dengan kaidah ejaan dan tata bahasa resmi'),
('Bahasa Indonesia',9,'Sinonim','Kata yang memiliki makna sama atau mirip dengan kata lain'),
('Bahasa Indonesia',10,'Antonim','Kata yang memiliki makna berlawanan dengan kata lain'),
('Bahasa Indonesia',11,'Simpulan','Pernyataan akhir yang ditarik berdasarkan isi keseluruhan teks'),
('Bahasa Indonesia',12,'Daftar pustaka','Daftar sumber rujukan yang digunakan penulis dalam karya tulis'),
('Bahasa Inggris',1,'Simple present tense','Tenses untuk menyatakan kebiasaan atau fakta umum, contoh: She works here'),
('Bahasa Inggris',2,'Present continuous tense','Tenses untuk kegiatan yang sedang berlangsung, contoh: She is working'),
('Bahasa Inggris',3,'Simple past tense','Tenses untuk kejadian yang selesai di masa lampau, contoh: She worked'),
('Bahasa Inggris',4,'Descriptive text','Teks yang menggambarkan ciri khusus orang, tempat, atau benda'),
('Bahasa Inggris',5,'Procedure text','Teks berisi urutan langkah untuk membuat atau melakukan sesuatu'),
('Bahasa Inggris',6,'Recount text','Teks yang menceritakan kembali pengalaman atau peristiwa lampau'),
('Bahasa Inggris',7,'Adjective','Kata yang menerangkan kata benda, misalnya beautiful, small, expensive'),
('Bahasa Inggris',8,'Adverb','Kata yang menerangkan kata kerja, misalnya quickly, carefully, well'),
('Bahasa Inggris',9,'Passive voice','Bentuk kalimat ketika subjek dikenai pekerjaan, contoh: The drug is taken'),
('Bahasa Inggris',10,'Modal verb','Kata bantu seperti can, must, should untuk menyatakan kemampuan atau keharusan'),
('Bahasa Inggris',11,'Greeting expression','Ungkapan menyapa seperti Good morning atau How do you do'),
('Bahasa Inggris',12,'Offering help','Ungkapan menawarkan bantuan seperti May I help you?'),
('Dasar-Dasar Teknologi Farmasi',1,'Sediaan solida','Bentuk sediaan padat seperti tablet, kapsul, dan serbuk'),
('Dasar-Dasar Teknologi Farmasi',2,'Sediaan liquida','Bentuk sediaan cair seperti sirup, suspensi, dan eliksir'),
('Dasar-Dasar Teknologi Farmasi',3,'Sediaan semi solida','Bentuk sediaan setengah padat seperti salep, krim, dan gel'),
('Dasar-Dasar Teknologi Farmasi',4,'Mortir dan stamper','Alat untuk menggerus dan mencampur bahan obat secara manual'),
('Dasar-Dasar Teknologi Farmasi',5,'Timbangan analitik','Alat penimbang dengan ketelitian tinggi untuk bahan obat'),
('Dasar-Dasar Teknologi Farmasi',6,'CPOB','Cara Pembuatan Obat yang Baik sebagai pedoman mutu produksi obat'),
('Dasar-Dasar Teknologi Farmasi',7,'Kalibrasi','Kegiatan memastikan alat ukur menunjukkan nilai yang benar dan akurat'),
('Dasar-Dasar Teknologi Farmasi',8,'APD','Alat pelindung diri seperti jas lab, masker, dan sarung tangan'),
('Dasar-Dasar Teknologi Farmasi',9,'Higiene personal','Upaya menjaga kebersihan diri personel selama proses produksi'),
('Dasar-Dasar Teknologi Farmasi',10,'Bahan aktif','Zat dalam sediaan yang memberikan efek terapi utama'),
('Dasar-Dasar Teknologi Farmasi',11,'Bahan tambahan','Zat pembantu seperti pengisi, pengikat, dan pemanis dalam sediaan'),
('Dasar-Dasar Teknologi Farmasi',12,'K3','Keselamatan dan kesehatan kerja untuk mencegah kecelakaan di laboratorium'),
('Farmakognosi',1,'Simplisia','Bahan alam yang dikeringkan dan belum mengalami pengolahan apa pun'),
('Farmakognosi',2,'Rhizoma','Simplisia yang berasal dari bagian akar tinggal atau rimpang tanaman'),
('Farmakognosi',3,'Folium','Simplisia yang berasal dari bagian daun tanaman'),
('Farmakognosi',4,'Cortex','Simplisia yang berasal dari bagian kulit batang tanaman'),
('Farmakognosi',5,'Semen','Simplisia yang berasal dari bagian biji tanaman'),
('Farmakognosi',6,'Alkaloid','Senyawa bersifat basa mengandung nitrogen dan umumnya berasa pahit'),
('Farmakognosi',7,'Flavonoid','Senyawa fenolik yang banyak berperan sebagai antioksidan alami'),
('Farmakognosi',8,'Minyak atsiri','Minyak mudah menguap yang memberi aroma khas pada tanaman'),
('Farmakognosi',9,'Sortasi basah','Pemisahan kotoran dari bahan segar sebelum tahap pencucian'),
('Farmakognosi',10,'Perajangan','Pemotongan bahan menjadi ukuran kecil agar pengeringan lebih cepat'),
('Farmakognosi',11,'Maserasi','Penyarian dengan merendam simplisia dalam pelarut pada suhu kamar'),
('Farmakognosi',12,'Ekstrak kental','Hasil penyarian yang telah diuapkan hingga tersisa massa kental'),
('Farmakologi',1,'Farmakokinetik','Perjalanan obat dalam tubuh: absorpsi, distribusi, metabolisme, dan ekskresi'),
('Farmakologi',2,'Farmakodinamik','Kajian tentang efek obat dan mekanisme kerjanya pada tubuh'),
('Farmakologi',3,'Absorpsi','Proses masuknya obat dari tempat pemberian ke dalam peredaran darah'),
('Farmakologi',4,'Distribusi','Penyebaran obat dari darah ke jaringan dan organ tubuh'),
('Farmakologi',5,'Metabolisme obat','Perubahan struktur obat oleh enzim, terutama di hati'),
('Farmakologi',6,'Ekskresi','Pengeluaran obat atau metabolitnya dari tubuh, terutama lewat ginjal'),
('Farmakologi',7,'Efek samping','Efek obat yang tidak dikehendaki pada dosis terapi yang lazim'),
('Farmakologi',8,'Indikasi','Keadaan atau penyakit yang menjadi alasan pemberian suatu obat'),
('Farmakologi',9,'Kontraindikasi','Kondisi yang menyebabkan suatu obat tidak boleh diberikan'),
('Farmakologi',10,'Analgetik','Golongan obat yang berfungsi meredakan atau menghilangkan rasa nyeri'),
('Farmakologi',11,'Antipiretik','Golongan obat yang berfungsi menurunkan demam'),
('Farmakologi',12,'Antibiotik','Obat yang membunuh atau menghambat pertumbuhan bakteri'),
('Farmasetika',1,'Pulveres','Serbuk terbagi yang dibungkus untuk sekali pakai tiap bungkus'),
('Farmasetika',2,'Pulvis','Serbuk tidak terbagi yang penggunaannya ditakar oleh pasien'),
('Farmasetika',3,'Kapsul','Sediaan padat berisi obat yang terbungkus cangkang keras atau lunak'),
('Farmasetika',4,'Suspensi','Sediaan cair berisi partikel padat terdispersi dan harus dikocok dahulu'),
('Farmasetika',5,'Emulsi','Sediaan cair berisi dua cairan tak saling campur yang distabilkan emulgator'),
('Farmasetika',6,'Unguentum','Sediaan setengah padat berbasis lemak untuk pemakaian luar (salep)'),
('Farmasetika',7,'Suppositoria','Sediaan padat untuk dimasukkan melalui rektum dan meleleh pada suhu tubuh'),
('Farmasetika',8,'Signa','Bagian resep yang berisi aturan pakai obat untuk pasien'),
('Farmasetika',9,'Corrigens saporis','Bahan tambahan untuk memperbaiki rasa sediaan obat'),
('Farmasetika',10,'Aqua destillata','Air suling yang digunakan sebagai pelarut dalam sediaan farmasi'),
('Farmasetika',11,'Dosis maksimum','Takaran terbesar yang masih aman diberikan tanpa efek toksik'),
('Farmasetika',12,'Rumus Young','Perhitungan dosis anak berdasarkan umur anak dalam tahun'),
('Farmasi Klinis dan Komunitas',1,'PIO','Pelayanan informasi obat kepada pasien maupun tenaga kesehatan lain'),
('Farmasi Klinis dan Komunitas',2,'Konseling','Komunikasi dua arah untuk meningkatkan pemahaman dan kepatuhan pasien'),
('Farmasi Klinis dan Komunitas',3,'Swamedikasi','Upaya pengobatan sendiri oleh pasien menggunakan obat bebas'),
('Farmasi Klinis dan Komunitas',4,'Home pharmacy care','Pelayanan kefarmasian yang diberikan di rumah pasien'),
('Farmasi Klinis dan Komunitas',5,'Medication error','Kesalahan dalam proses pengobatan yang dapat merugikan pasien'),
('Farmasi Klinis dan Komunitas',6,'DRP','Masalah terkait obat yang mengganggu tercapainya tujuan terapi'),
('Farmasi Klinis dan Komunitas',7,'Kepatuhan pasien','Kesesuaian perilaku pasien dengan aturan pakai obat yang diberikan'),
('Farmasi Klinis dan Komunitas',8,'Interaksi obat','Perubahan efek suatu obat karena pengaruh obat atau makanan lain'),
('Farmasi Klinis dan Komunitas',9,'Monitoring efek samping','Kegiatan memantau munculnya reaksi obat yang tidak dikehendaki'),
('Farmasi Klinis dan Komunitas',10,'Visite','Kunjungan tenaga kefarmasian ke pasien rawat inap bersama tim medis'),
('Farmasi Klinis dan Komunitas',11,'Rekonsiliasi obat','Pencocokan daftar obat pasien saat masuk, pindah, dan pulang rawat'),
('Farmasi Klinis dan Komunitas',12,'DAGUSIBU','Gerakan cara dapatkan, gunakan, simpan, dan buang obat dengan benar'),
('Informatika',1,'Algoritma','Urutan langkah logis dan sistematis untuk menyelesaikan suatu masalah'),
('Informatika',2,'Flowchart','Diagram alir yang menggambarkan urutan proses dengan simbol tertentu'),
('Informatika',3,'Variabel','Tempat penyimpanan data dalam program yang nilainya dapat berubah'),
('Informatika',4,'Perulangan','Struktur program yang menjalankan perintah berulang selama syarat terpenuhi'),
('Informatika',5,'Percabangan','Struktur program yang memilih perintah berdasarkan kondisi tertentu'),
('Informatika',6,'Basis data','Kumpulan data yang tersusun rapi dan saling berhubungan'),
('Informatika',7,'Spreadsheet','Aplikasi pengolah angka berbentuk tabel dengan rumus otomatis'),
('Informatika',8,'Jaringan komputer','Kumpulan perangkat yang terhubung untuk berbagi data dan sumber daya'),
('Informatika',9,'Perangkat keras','Komponen fisik komputer seperti prosesor, RAM, dan penyimpanan'),
('Informatika',10,'Perangkat lunak','Program yang menjalankan instruksi pada perangkat keras komputer'),
('Informatika',11,'Enkripsi','Penyandian data agar tidak dapat dibaca pihak yang tidak berwenang'),
('Informatika',12,'Backup data','Kegiatan menyalin data untuk cadangan bila data asli hilang atau rusak'),
('Kimia Farmasi',1,'Larutan','Campuran homogen antara zat terlarut dan pelarut'),
('Kimia Farmasi',2,'Molaritas','Jumlah mol zat terlarut dalam satu liter larutan'),
('Kimia Farmasi',3,'pH','Ukuran derajat keasaman suatu larutan berdasarkan konsentrasi ion H+'),
('Kimia Farmasi',4,'Asam','Zat yang melepaskan ion H+ dalam air dan memerahkan lakmus biru'),
('Kimia Farmasi',5,'Basa','Zat yang melepaskan ion OH- dalam air dan membirukan lakmus merah'),
('Kimia Farmasi',6,'Larutan penyangga','Larutan yang mempertahankan pH meski ditambah sedikit asam atau basa'),
('Kimia Farmasi',7,'Reaksi redoks','Reaksi yang melibatkan perpindahan elektron, oksidasi dan reduksi'),
('Kimia Farmasi',8,'Ikatan kovalen','Ikatan kimia karena pemakaian bersama pasangan elektron'),
('Kimia Farmasi',9,'Ikatan ion','Ikatan kimia karena serah terima elektron antaratom'),
('Kimia Farmasi',10,'Senyawa organik','Senyawa yang kerangka utamanya tersusun dari atom karbon'),
('Kimia Farmasi',11,'Katalis','Zat yang mempercepat reaksi tanpa ikut habis bereaksi'),
('Kimia Farmasi',12,'Stoikiometri','Perhitungan kuantitatif zat-zat yang terlibat dalam reaksi kimia'),
('Kimia Farmasi Analisis',1,'Analisis kualitatif','Analisis untuk mengetahui jenis zat yang terkandung dalam sampel'),
('Kimia Farmasi Analisis',2,'Analisis kuantitatif','Analisis untuk mengetahui kadar atau jumlah zat dalam sampel'),
('Kimia Farmasi Analisis',3,'Titrasi','Penetapan kadar dengan menambahkan titran hingga tercapai titik akhir'),
('Kimia Farmasi Analisis',4,'Indikator','Zat yang menunjukkan titik akhir titrasi melalui perubahan warna'),
('Kimia Farmasi Analisis',5,'Titik ekuivalen','Keadaan saat zat yang dititrasi tepat habis bereaksi dengan titran'),
('Kimia Farmasi Analisis',6,'Alkalimetri','Titrasi penetapan kadar asam menggunakan larutan baku basa'),
('Kimia Farmasi Analisis',7,'Asidimetri','Titrasi penetapan kadar basa menggunakan larutan baku asam'),
('Kimia Farmasi Analisis',8,'Larutan baku primer','Larutan dengan kemurnian tinggi yang kadarnya dapat langsung dihitung'),
('Kimia Farmasi Analisis',9,'Spektrofotometri','Analisis kadar berdasarkan serapan cahaya oleh larutan sampel'),
('Kimia Farmasi Analisis',10,'Kromatografi','Pemisahan komponen campuran berdasarkan perbedaan distribusi dua fase'),
('Kimia Farmasi Analisis',11,'Blanko','Larutan pembanding tanpa analit untuk mengoreksi hasil pengukuran'),
('Kimia Farmasi Analisis',12,'Validasi metode','Pembuktian bahwa metode analisis sesuai tujuan penggunaannya'),
('Matematika',1,'Persamaan linear','Persamaan dengan variabel berpangkat satu, misalnya 2x + 3 = 7'),
('Matematika',2,'Persamaan kuadrat','Persamaan berbentuk ax^2 + bx + c = 0 dengan a tidak nol'),
('Matematika',3,'Fungsi','Relasi yang memasangkan setiap anggota domain tepat satu anggota kodomain'),
('Matematika',4,'Barisan aritmetika','Barisan bilangan dengan selisih antarsuku yang tetap'),
('Matematika',5,'Barisan geometri','Barisan bilangan dengan perbandingan antarsuku yang tetap'),
('Matematika',6,'Logaritma','Operasi kebalikan dari pemangkatan untuk mencari eksponen'),
('Matematika',7,'Perbandingan senilai','Hubungan dua besaran yang membesar atau mengecil bersama-sama'),
('Matematika',8,'Peluang','Ukuran kemungkinan terjadinya suatu kejadian, bernilai 0 sampai 1'),
('Matematika',9,'Median','Nilai tengah data setelah data diurutkan'),
('Matematika',10,'Modus','Nilai yang paling sering muncul dalam sekumpulan data'),
('Matematika',11,'Mean','Nilai rata-rata hitung dari sekumpulan data'),
('Matematika',12,'Teorema Pythagoras','Hubungan kuadrat sisi miring dengan jumlah kuadrat dua sisi siku-siku'),
('Muatan Lokal',1,'Kearifan lokal','Nilai dan kebiasaan baik masyarakat setempat yang diwariskan turun-temurun'),
('Muatan Lokal',2,'Bahasa daerah','Bahasa yang digunakan masyarakat di suatu wilayah sebagai identitas budaya'),
('Muatan Lokal',3,'Kain sasirangan','Kain khas Kalimantan Selatan dengan motif hasil teknik jelujur dan ikat'),
('Muatan Lokal',4,'Pasar terapung','Pasar tradisional di atas sungai yang menjadi ikon Kalimantan Selatan'),
('Muatan Lokal',5,'Tanaman obat keluarga','Tanaman berkhasiat obat yang ditanam di pekarangan rumah'),
('Muatan Lokal',6,'Jamu','Ramuan obat tradisional Indonesia dari bahan alam warisan leluhur'),
('Muatan Lokal',7,'Gotong royong','Kebiasaan bekerja bersama untuk kepentingan bersama di masyarakat'),
('Muatan Lokal',8,'Rumah adat banjar','Rumah tradisional suku Banjar, contohnya bubungan tinggi'),
('Muatan Lokal',9,'Kuliner tradisional','Makanan khas daerah yang menjadi bagian identitas budaya setempat'),
('Muatan Lokal',10,'Pelestarian budaya','Upaya menjaga agar warisan budaya tetap hidup dan dikenal generasi muda'),
('Muatan Lokal',11,'Wirausaha lokal','Usaha yang memanfaatkan potensi dan bahan baku daerah setempat'),
('Muatan Lokal',12,'Etika masyarakat','Aturan sopan santun yang berlaku dalam pergaulan masyarakat setempat'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',1,'Obat bebas','Obat yang dapat dibeli tanpa resep, bertanda lingkaran hijau'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',2,'Obat bebas terbatas','Obat keras dalam jumlah terbatas tanpa resep, bertanda lingkaran biru'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',3,'Obat keras','Obat yang hanya boleh diserahkan dengan resep dokter, bertanda lingkaran merah huruf K'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',4,'Tanda peringatan P1','Awas! Obat keras. Bacalah aturan pemakaiannya'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',5,'OWA','Obat wajib apotek, obat keras yang boleh diserahkan apoteker tanpa resep'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',6,'Swamedikasi','Pengobatan sendiri oleh pasien untuk keluhan ringan'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',7,'Analgetik-antipiretik','Golongan obat pereda nyeri sekaligus penurun demam seperti parasetamol'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',8,'Antasida','Obat penetral asam lambung untuk keluhan maag'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',9,'Antihistamin','Obat untuk meredakan gejala alergi seperti gatal dan bersin'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',10,'Aturan pakai','Petunjuk jumlah, waktu, dan cara penggunaan obat oleh pasien'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',11,'Kedaluwarsa','Batas waktu obat masih terjamin mutu dan keamanannya'),
('Pelayanan Obat Bebas dan Obat Bebas Terbatas',12,'Rujukan ke dokter','Tindakan menyarankan pasien ke dokter bila keluhan berat atau berlanjut'),
('Pelayanan Resep',1,'Inscriptio','Bagian resep berisi nama, alamat, dan izin praktik dokter serta tanggal'),
('Pelayanan Resep',2,'Invocatio','Tanda R/ pada resep sebagai permintaan dokter kepada apoteker'),
('Pelayanan Resep',3,'Praescriptio','Bagian resep berisi nama obat, kekuatan, dan jumlah yang diminta'),
('Pelayanan Resep',4,'Signatura','Bagian resep berisi aturan pakai obat untuk pasien'),
('Pelayanan Resep',5,'Subscriptio','Tanda tangan atau paraf dokter penulis resep'),
('Pelayanan Resep',6,'Skrining administratif','Pemeriksaan kelengkapan identitas dokter dan pasien pada resep'),
('Pelayanan Resep',7,'Skrining farmasetik','Pemeriksaan bentuk sediaan, dosis, dan kompatibilitas bahan pada resep'),
('Pelayanan Resep',8,'Skrining klinis','Pemeriksaan ketepatan indikasi, dosis, alergi, dan interaksi obat'),
('Pelayanan Resep',9,'Etiket putih','Etiket untuk obat pemakaian dalam (diminum)'),
('Pelayanan Resep',10,'Etiket biru','Etiket untuk obat pemakaian luar seperti salep dan tetes mata'),
('Pelayanan Resep',11,'Iter','Tanda pada resep yang menyatakan resep boleh diulang'),
('Pelayanan Resep',12,'Cito','Tanda pada resep yang menyatakan obat harus disiapkan segera'),
('Pendidikan Agama dan Budi Pekerti',1,'Amanah','Sikap dapat dipercaya dalam menjalankan tugas dan menjaga titipan'),
('Pendidikan Agama dan Budi Pekerti',2,'Jujur','Sikap menyampaikan sesuatu sesuai kenyataan tanpa dilebihkan atau dikurangi'),
('Pendidikan Agama dan Budi Pekerti',3,'Toleransi','Sikap menghargai perbedaan keyakinan dan pendapat orang lain'),
('Pendidikan Agama dan Budi Pekerti',4,'Ikhlas','Melakukan kebaikan semata karena Tuhan tanpa mengharap pujian'),
('Pendidikan Agama dan Budi Pekerti',5,'Sabar','Sikap menahan diri dan tetap tenang dalam menghadapi ujian'),
('Pendidikan Agama dan Budi Pekerti',6,'Syukur','Sikap berterima kasih atas nikmat yang diterima dengan ucapan dan perbuatan'),
('Pendidikan Agama dan Budi Pekerti',7,'Empati','Kemampuan merasakan dan memahami keadaan yang dialami orang lain'),
('Pendidikan Agama dan Budi Pekerti',8,'Tanggung jawab','Kesediaan menanggung akibat dari perbuatan dan menuntaskan kewajiban'),
('Pendidikan Agama dan Budi Pekerti',9,'Disiplin','Sikap taat pada aturan dan waktu yang telah ditetapkan'),
('Pendidikan Agama dan Budi Pekerti',10,'Sopan santun','Perilaku menghormati orang lain melalui tutur kata dan tindakan'),
('Pendidikan Agama dan Budi Pekerti',11,'Sedekah','Memberikan sebagian harta kepada yang membutuhkan secara sukarela'),
('Pendidikan Agama dan Budi Pekerti',12,'Birrul walidain','Sikap berbakti dan berbuat baik kepada kedua orang tua'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',1,'Pemanasan','Aktivitas ringan sebelum olahraga untuk menyiapkan otot dan mencegah cedera'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',2,'Pendinginan','Aktivitas ringan setelah olahraga untuk memulihkan kondisi tubuh'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',3,'Daya tahan kardiorespirasi','Kemampuan jantung dan paru bekerja lama saat aktivitas fisik'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',4,'Kelenturan','Kemampuan sendi bergerak dalam rentang gerak yang luas'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',5,'Kekuatan otot','Kemampuan otot menghasilkan tenaga maksimal dalam satu kali kerja'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',6,'Passing','Teknik mengoper bola kepada rekan satu tim'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',7,'Smash','Pukulan keras menukik untuk mematikan serangan dalam bola voli'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',8,'Dribbling','Teknik menggiring bola sambil bergerak menguasai bola'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',9,'Servis','Pukulan pertama untuk memulai permainan dalam bola voli atau bulu tangkis'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',10,'Gizi seimbang','Pola makan dengan jenis dan jumlah zat gizi sesuai kebutuhan tubuh'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',11,'Indeks massa tubuh','Ukuran status gizi dari perbandingan berat badan dan kuadrat tinggi badan'),
('Pendidikan Jasmani, Olahraga, dan Kesehatan',12,'P3K','Pertolongan pertama pada kecelakaan sebelum bantuan medis datang'),
('Pendidikan Pancasila',1,'Pancasila','Dasar negara dan pandangan hidup bangsa Indonesia yang terdiri atas lima sila'),
('Pendidikan Pancasila',2,'Sila pertama','Ketuhanan Yang Maha Esa'),
('Pendidikan Pancasila',3,'Sila kelima','Keadilan sosial bagi seluruh rakyat Indonesia'),
('Pendidikan Pancasila',4,'UUD 1945','Hukum dasar tertulis yang menjadi konstitusi negara Republik Indonesia'),
('Pendidikan Pancasila',5,'Bhinneka Tunggal Ika','Semboyan bangsa yang berarti berbeda-beda tetapi tetap satu'),
('Pendidikan Pancasila',6,'Demokrasi Pancasila','Sistem demokrasi yang berlandaskan musyawarah untuk mufakat'),
('Pendidikan Pancasila',7,'Hak warga negara','Sesuatu yang mutlak diterima warga negara, misalnya hak pendidikan'),
('Pendidikan Pancasila',8,'Kewajiban warga negara','Sesuatu yang harus dilaksanakan warga negara, misalnya menaati hukum'),
('Pendidikan Pancasila',9,'Norma hukum','Aturan yang dibuat lembaga berwenang dan bersanksi tegas'),
('Pendidikan Pancasila',10,'Norma kesusilaan','Aturan yang bersumber dari hati nurani manusia'),
('Pendidikan Pancasila',11,'Musyawarah','Pembahasan bersama untuk mencapai keputusan yang disepakati'),
('Pendidikan Pancasila',12,'Integrasi nasional','Upaya menyatukan perbedaan menjadi kesatuan bangsa yang utuh'),
('Praktik Kerja Lapangan (PKL)',1,'PKL','Pembelajaran di dunia kerja untuk menerapkan kompetensi yang dipelajari di sekolah'),
('Praktik Kerja Lapangan (PKL)',2,'Pembimbing industri','Petugas dari tempat PKL yang membimbing dan menilai peserta didik'),
('Praktik Kerja Lapangan (PKL)',3,'Jurnal kegiatan','Catatan harian peserta didik berisi aktivitas selama PKL'),
('Praktik Kerja Lapangan (PKL)',4,'Laporan PKL','Karya tulis hasil pelaksanaan praktik kerja lapangan'),
('Praktik Kerja Lapangan (PKL)',5,'Etika kerja','Sikap dan perilaku yang pantas selama bekerja di tempat PKL'),
('Praktik Kerja Lapangan (PKL)',6,'Kedisiplinan','Ketaatan pada jam kerja dan aturan yang berlaku di tempat PKL'),
('Praktik Kerja Lapangan (PKL)',7,'Komunikasi efektif','Penyampaian pesan yang jelas dan sopan kepada rekan maupun pelanggan'),
('Praktik Kerja Lapangan (PKL)',8,'SOP','Prosedur operasional baku yang harus diikuti dalam melaksanakan pekerjaan'),
('Praktik Kerja Lapangan (PKL)',9,'Absensi','Bukti kehadiran peserta didik selama pelaksanaan PKL'),
('Praktik Kerja Lapangan (PKL)',10,'Sertifikat PKL','Bukti tertulis bahwa peserta didik telah menyelesaikan PKL'),
('Praktik Kerja Lapangan (PKL)',11,'Kerahasiaan data','Kewajiban menjaga informasi pasien atau perusahaan agar tidak bocor'),
('Praktik Kerja Lapangan (PKL)',12,'Evaluasi PKL','Penilaian hasil kerja dan sikap peserta didik selama praktik'),
('Projek Kreatif dan Kewirausahaan',1,'Wirausaha','Orang yang menciptakan dan mengelola usaha dengan berani mengambil risiko'),
('Projek Kreatif dan Kewirausahaan',2,'Peluang usaha','Kesempatan yang dapat dimanfaatkan untuk memulai atau mengembangkan usaha'),
('Projek Kreatif dan Kewirausahaan',3,'Analisis SWOT','Analisis kekuatan, kelemahan, peluang, dan ancaman suatu usaha'),
('Projek Kreatif dan Kewirausahaan',4,'BEP','Titik impas ketika total pendapatan sama dengan total biaya'),
('Projek Kreatif dan Kewirausahaan',5,'Harga pokok produksi','Total biaya yang dikeluarkan untuk menghasilkan satu satuan produk'),
('Projek Kreatif dan Kewirausahaan',6,'Prototipe','Contoh awal produk yang dibuat untuk diuji sebelum produksi massal'),
('Projek Kreatif dan Kewirausahaan',7,'Segmentasi pasar','Pengelompokan calon konsumen berdasarkan ciri dan kebutuhan tertentu'),
('Projek Kreatif dan Kewirausahaan',8,'Branding','Upaya membangun citra dan identitas produk agar dikenal konsumen'),
('Projek Kreatif dan Kewirausahaan',9,'Proposal usaha','Dokumen rencana usaha yang memuat gambaran produk, pasar, dan keuangan'),
('Projek Kreatif dan Kewirausahaan',10,'Inovasi','Pembaruan produk atau cara kerja agar lebih bernilai bagi konsumen'),
('Projek Kreatif dan Kewirausahaan',11,'Pemasaran digital','Promosi produk melalui media daring seperti media sosial dan marketplace'),
('Projek Kreatif dan Kewirausahaan',12,'Laba','Selisih positif antara pendapatan usaha dan seluruh biaya yang dikeluarkan'),
('Sejarah',1,'Sumpah Pemuda','Ikrar pemuda tahun 1928 tentang satu tanah air, bangsa, dan bahasa'),
('Sejarah',2,'Proklamasi kemerdekaan','Pernyataan kemerdekaan Indonesia pada 17 Agustus 1945'),
('Sejarah',3,'BPUPKI','Badan yang dibentuk untuk menyelidiki persiapan kemerdekaan Indonesia'),
('Sejarah',4,'PPKI','Panitia yang mengesahkan UUD 1945 dan memilih presiden pertama'),
('Sejarah',5,'Politik Etis','Kebijakan balas budi Belanda meliputi irigasi, edukasi, dan transmigrasi'),
('Sejarah',6,'VOC','Kongsi dagang Belanda yang menguasai perdagangan di Nusantara'),
('Sejarah',7,'Kerajaan Majapahit','Kerajaan besar Hindu-Buddha di Jawa Timur dengan Patih Gajah Mada'),
('Sejarah',8,'Kerajaan Sriwijaya','Kerajaan maritim Buddha di Sumatra yang menguasai jalur perdagangan'),
('Sejarah',9,'Sistem tanam paksa','Kebijakan Belanda mewajibkan rakyat menanam komoditas ekspor'),
('Sejarah',10,'Konferensi Meja Bundar','Perundingan 1949 yang mengakhiri pengakuan kedaulatan Indonesia'),
('Sejarah',11,'Orde Baru','Masa pemerintahan Soeharto sejak 1966 hingga 1998'),
('Sejarah',12,'Reformasi','Masa perubahan politik Indonesia yang dimulai tahun 1998'),
('Seni dan Budaya',1,'Seni rupa dua dimensi','Karya seni yang hanya memiliki panjang dan lebar, misalnya lukisan'),
('Seni dan Budaya',2,'Seni rupa tiga dimensi','Karya seni yang memiliki volume dan dapat dilihat dari berbagai arah'),
('Seni dan Budaya',3,'Unsur warna','Unsur seni rupa yang memberi kesan dan suasana pada karya'),
('Seni dan Budaya',4,'Komposisi','Penyusunan unsur karya agar tampak seimbang dan harmonis'),
('Seni dan Budaya',5,'Tempo','Cepat lambatnya suatu lagu dinyanyikan atau dimainkan'),
('Seni dan Budaya',6,'Birama','Pembagian kelompok ketukan yang berulang teratur dalam musik'),
('Seni dan Budaya',7,'Tangga nada pentatonis','Tangga nada dengan lima nada pokok, umum pada musik tradisional'),
('Seni dan Budaya',8,'Tari tradisional','Tarian yang tumbuh dan diwariskan dalam masyarakat suatu daerah'),
('Seni dan Budaya',9,'Properti tari','Alat yang digunakan penari untuk memperkuat makna gerak'),
('Seni dan Budaya',10,'Pameran seni','Kegiatan menyajikan karya seni kepada publik'),
('Seni dan Budaya',11,'Apresiasi seni','Kegiatan menikmati, menilai, dan menghargai sebuah karya seni'),
('Seni dan Budaya',12,'Batik','Kain bermotif hasil teknik perintang warna dengan lilin malam');

create or replace function pg_temp.mk(c text, d1 text, d2 text, d3 text, pos int)
returns jsonb language sql immutable as $$
  select jsonb_agg(jsonb_build_object('id', (array['a','b','c','d'])[o], 'text', t[o]) order by o)
  from (select case pos when 0 then array[c,d1,d2,d3] when 1 then array[d1,c,d2,d3]
                        when 2 then array[d1,d2,c,d3] else array[d1,d2,d3,c] end as t) s,
       generate_series(1,4) o;
$$;

do $$
declare r record; _m uuid; _e uuid; _creator uuid;
begin
  select created_by into _creator from public.exams limit 1;
  if _creator is null then return; end if;
  for r in
    select s.id sid, s.name, c.class_id
    from public.subjects s
    join public.curricula c on c.id = s.curriculum_id
    where c.class_id is not null
      and not exists (select 1 from public.exams e where e.subject_id = s.id and e.title like 'Latihan 50 Soal%')
      and exists (select 1 from _pairs p where p.name = s.name)
  loop
    insert into public.meetings (class_id, subject_id, title, description, order_index, created_by)
    values (r.class_id, r.sid, 'Latihan Soal - ' || r.name, 'Paket latihan 50 soal', 1, _creator)
    returning id into _m;
    insert into public.exams (meeting_id, class_id, subject_id, title, description, duration_minutes, is_published, created_by, max_attempts, score_policy)
    values (_m, r.class_id, r.sid, 'Latihan 50 Soal ' || r.name, 'Paket latihan 50 soal pilihan ganda', 90, true, _creator, 2, 'highest')
    returning id into _e;
  end loop;
end $$;

with ex as (
  select e.id exam_id, s.name, coalesce(max(q.order_index),0) mx, count(q.id) cnt
  from public.exams e
  join public.subjects s on s.id = e.subject_id
  left join public.questions q on q.exam_id = e.id
  where e.title like 'Latihan 50 Soal%'
  group by 1,2
),
n as (select name, count(*)::int c from _pairs group by 1),
gen as (
  select p.name, 1 kind, p.idx,
    'Pernyataan yang tepat mengenai ' || p.term || ' dalam mata pelajaran ' || p.name || ' adalah …' content,
    p.def ct, d1.def x1, d2.def x2, d3.def x3
  from _pairs p join n on n.name = p.name
  join _pairs d1 on d1.name = p.name and d1.idx = (p.idx % n.c) + 1
  join _pairs d2 on d2.name = p.name and d2.idx = ((p.idx + 1) % n.c) + 1
  join _pairs d3 on d3.name = p.name and d3.idx = ((p.idx + 2) % n.c) + 1
  union all
  select p.name, 2, p.idx,
    'Perhatikan pengertian berikut: “' || p.def || '”. Istilah yang dimaksud adalah …',
    p.term, d1.term, d2.term, d3.term
  from _pairs p join n on n.name = p.name
  join _pairs d1 on d1.name = p.name and d1.idx = ((p.idx + 3) % n.c) + 1
  join _pairs d2 on d2.name = p.name and d2.idx = ((p.idx + 4) % n.c) + 1
  join _pairs d3 on d3.name = p.name and d3.idx = ((p.idx + 5) % n.c) + 1
  union all
  select p.name, 3, p.idx,
    'Berikut ini yang BUKAN termasuk pokok bahasan mata pelajaran ' || p.name || ' adalah …',
    f.term, d1.term, d2.term, d3.term
  from _pairs p join n on n.name = p.name
  join _pairs d1 on d1.name = p.name and d1.idx = ((p.idx + 6) % n.c) + 1
  join _pairs d2 on d2.name = p.name and d2.idx = ((p.idx + 7) % n.c) + 1
  join _pairs d3 on d3.name = p.name and d3.idx = ((p.idx + 8) % n.c) + 1
  join lateral (
    select f2.term from _pairs f2 where f2.name <> p.name
    order by md5(f2.name || f2.term || p.name || p.idx::text) limit 1
  ) f on true
),
ranked as (
  select ex.exam_id, ex.mx, ex.cnt, g.content, g.ct, g.x1, g.x2, g.x3,
    ((g.idx + g.kind) % 4) pos,
    row_number() over (partition by ex.exam_id order by g.kind, g.idx) rn
  from ex join gen g on g.name = ex.name
)
insert into public.questions (exam_id, type, content, options, correct_answers, points, order_index)
select exam_id, 'single', content, pg_temp.mk(ct, x1, x2, x3, pos),
       array[(array['a','b','c','d'])[pos + 1]], 20, mx + rn
from ranked
where rn <= 50 - cnt;

update public.exams set max_attempts = greatest(max_attempts, 2)
where title like 'Latihan 50 Soal%';

update public.exam_attempts a
   set max_score = coalesce((select sum(points) from public.questions q where q.exam_id = a.exam_id), 0)
 where a.status = 'in_progress';

drop function pg_temp.mk(text, text, text, text, int);
drop table _pairs;