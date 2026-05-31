# Proje Kural Kontrol Notu

## Konu ve Tema
- Konu: Spor Salonu Uye Yonetim Sistemi
- Tema: Kirmizi / Siyah
- Teknoloji: Node.js (Express) + MySQL
- Tasarim: Bootstrap yok, harici `style.css` kullanildi

## 3.1 Frontend Gereksinimleri
1. Sayfa sayisi en az 3: `anasayfa`, `paketler`, `giris-kayit` (+ `yonetim` ekstra)
2. Harici CSS: `public/css/style.css`
3. Gorsel + z-index: `views/anasayfa.ejs` icindeki `.y-kapak-alani` ve `.y-kapak-yazi`
4. Tablo + `nth-child`: `style.css` icinde `.y-fiyat-tablosu tbody tr:nth-child(...)`
5. Iletisim formu + Radio + Select: `views/anasayfa.ejs` form bolumu
6. Video + Harita iframe: `views/anasayfa.ejs`
7. Menu + ikonlar: tum sayfalarda ust menu, anasayfa/paketlerde FontAwesome ikonlar

## 3.2 Backend Gereksinimleri
8. Kullanici kayit/giris: `/kayit-ol` ve `/giris-yap`
9. Oturum yonetimi: `express-session`
10. REST API (en az 4 endpoint):
   - `GET /api/251109076/abonelikler`
   - `POST /api/251109076/abonelikler`
   - `PUT /api/251109076/abonelikler/:abonelikId`
   - `DELETE /api/251109076/abonelikler/:abonelikId`
11. Veritabani en az 3 tablo + iliski:
   - `251109076_uyeler`
   - `251109076_paketler`
   - `251109076_abonelikler`
   - `JOIN` sorgusu: `/yonetim` route icinde
12. Admin paneli: `GET /yonetim` (listeleme, ekleme, silme, guncelleme)

## Guvenlik ve Ozgunluk Kurallari
- CSS class/id isimleri Turkce ve `y-` on ekli kullanildi.
- Veritabani tablo adlari ve API yolu ogrenci no on ekli (`251109076`).
- CSS yorum satiri: 5+ adet.
- Backend yorum satiri: 8+ adet.
- GitHub baglantisi ornek alani: `views/anasayfa.ejs` icinde "Proje Kaynak Baglantisi" bolumu.

## Not
- Ogrenci numarasi sizde farkliysa `251109076` degerlerini kendi numaranizla degistirin.
