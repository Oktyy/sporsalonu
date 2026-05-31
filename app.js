const path = require("path");
const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config();

const uygulama = express();
const port = Number(process.env.PORT || 3000);
const apiKoku = "/api/251109076";

// Hocam burada veritabanina tekrar tekrar yeni baglanti acmamak icin havuz kullandim.
const baglantiHavuzu = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "spor_salonu_yonetim",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

uygulama.set("view engine", "ejs");
uygulama.set("views", path.join(__dirname, "views"));

uygulama.use(express.urlencoded({ extended: true }));
uygulama.use(express.json());
uygulama.use(express.static(path.join(__dirname, "public")));

// Hocam burada kullanici oturumu ile admin sayfalarini koruyabilmek icin session kullandim.
uygulama.use(
  session({
    secret: process.env.OTURUM_GIZLI || "spor-salonu-gizli",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 4
    }
  })
);

// Hocam burada bir kerelik bildirim gostermek icin session icinde kisa mesaj tasiyorum.
uygulama.use((istek, yanit, sonraki) => {
  yanit.locals.oturum = istek.session.oturum || null;
  yanit.locals.bildirim = istek.session.bildirim || null;
  delete istek.session.bildirim;
  sonraki();
});

// Hocam burada tablo adlarini ogrenci numarasi on ekiyle tanimladim.
const tablolar = {
  uyeler: "`251109076_uyeler`",
  paketler: "`251109076_paketler`",
  abonelikler: "`251109076_abonelikler`"
};

function bildirimYaz(istek, tur, metin) {
  istek.session.bildirim = { tur, metin };
}

function oturumGerekli(istek, yanit, sonraki) {
  if (!istek.session.oturum) {
    bildirimYaz(istek, "hata", "Bu sayfayi gorebilmek icin giris yapmaniz gerekiyor.");
    return yanit.redirect("/giris-kayit");
  }
  return sonraki();
}

function guvenliYol(isleyici) {
  return (istek, yanit, sonraki) => {
    Promise.resolve(isleyici(istek, yanit, sonraki)).catch(sonraki);
  };
}

// Hocam burada ilk acilista zorunlu tablolari olusturup eksik temel verileri ekliyorum.
async function hazirlikVerisiOlustur() {
  await baglantiHavuzu.query(
    `CREATE TABLE IF NOT EXISTS ${tablolar.uyeler} (
      uye_id INT AUTO_INCREMENT PRIMARY KEY,
      ad_soyad VARCHAR(120) NOT NULL,
      eposta VARCHAR(160) NOT NULL UNIQUE,
      sifre_ozet VARCHAR(255) NOT NULL,
      rol ENUM('kullanici', 'yonetici') NOT NULL DEFAULT 'kullanici',
      kayit_tarihi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await baglantiHavuzu.query(
    `CREATE TABLE IF NOT EXISTS ${tablolar.paketler} (
      paket_id INT AUTO_INCREMENT PRIMARY KEY,
      paket_adi VARCHAR(120) NOT NULL,
      aylik_ucret DECIMAL(10,2) NOT NULL,
      sure_ay INT NOT NULL
    )`
  );

  await baglantiHavuzu.query(
    `CREATE TABLE IF NOT EXISTS ${tablolar.abonelikler} (
      abonelik_id INT AUTO_INCREMENT PRIMARY KEY,
      uye_id INT NOT NULL,
      paket_id INT NOT NULL,
      baslangic_tarihi DATE NOT NULL,
      durum ENUM('aktif', 'pasif') NOT NULL DEFAULT 'aktif',
      CONSTRAINT fk_uye FOREIGN KEY (uye_id) REFERENCES ${tablolar.uyeler}(uye_id) ON DELETE CASCADE,
      CONSTRAINT fk_paket FOREIGN KEY (paket_id) REFERENCES ${tablolar.paketler}(paket_id) ON DELETE CASCADE
    )`
  );

  const [paketSayisiSonucu] = await baglantiHavuzu.query(
    `SELECT COUNT(*) AS adet FROM ${tablolar.paketler}`
  );

  if (paketSayisiSonucu[0].adet === 0) {
    await baglantiHavuzu.query(
      `INSERT INTO ${tablolar.paketler} (paket_adi, aylik_ucret, sure_ay) VALUES
      ('Baslangic Paketi', 950.00, 1),
      ('Performans Paketi', 2400.00, 3),
      ('Profesyonel Paket', 4200.00, 6)`
    );
  }

  const adminEposta = process.env.ADMIN_EPOSTA || "yonetim@spor.local";
  const adminSifre = process.env.ADMIN_SIFRE || "123456";

  const [adminKontrol] = await baglantiHavuzu.query(
    `SELECT uye_id FROM ${tablolar.uyeler} WHERE eposta = ? LIMIT 1`,
    [adminEposta]
  );

  if (adminKontrol.length === 0) {
    // Hocam burada sifreyi duz metin tutmamak icin bcrypt ile ozetleyip kaydediyorum.
    const ozet = await bcrypt.hash(adminSifre, 10);
    await baglantiHavuzu.query(
      `INSERT INTO ${tablolar.uyeler} (ad_soyad, eposta, sifre_ozet, rol) VALUES (?, ?, ?, 'yonetici')`,
      ["Yonetim Kullanici", adminEposta, ozet]
    );
  }
}

uygulama.get("/", guvenliYol(async (istek, yanit) => {
  yanit.render("anasayfa");
}));

uygulama.get("/paketler", guvenliYol(async (istek, yanit) => {
  const [paketler] = await baglantiHavuzu.query(
    `SELECT paket_id, paket_adi, aylik_ucret, sure_ay FROM ${tablolar.paketler} ORDER BY aylik_ucret ASC`
  );
  yanit.render("paketler", { paketler });
}));

uygulama.get("/giris-kayit", guvenliYol(async (istek, yanit) => {
  yanit.render("giris-kayit");
}));

// Hocam burada tekrar eden eposta kaydini engelleyip sonra yeni kullanici olusturuyorum.
uygulama.post("/kayit-ol", guvenliYol(async (istek, yanit) => {
  const { ad_soyad, eposta, sifre } = istek.body;

  if (!ad_soyad || !eposta || !sifre) {
    bildirimYaz(istek, "hata", "Tum alanlari doldurmaniz gerekiyor.");
    return yanit.redirect("/giris-kayit");
  }

  const [varMi] = await baglantiHavuzu.query(
    `SELECT uye_id FROM ${tablolar.uyeler} WHERE eposta = ? LIMIT 1`,
    [eposta]
  );

  if (varMi.length > 0) {
    bildirimYaz(istek, "hata", "Bu eposta zaten kayitli.");
    return yanit.redirect("/giris-kayit");
  }

  const sifreOzet = await bcrypt.hash(sifre, 10);
  await baglantiHavuzu.query(
    `INSERT INTO ${tablolar.uyeler} (ad_soyad, eposta, sifre_ozet, rol) VALUES (?, ?, ?, 'kullanici')`,
    [ad_soyad, eposta, sifreOzet]
  );

  bildirimYaz(istek, "basari", "Kayit islemi tamamlandi, simdi giris yapabilirsiniz.");
  return yanit.redirect("/giris-kayit");
}));

// Hocam burada sifre dogrulamayi bcrypt.compare ile yapiyorum, guvenlik icin duz metin kontrolu yok.
uygulama.post("/giris-yap", guvenliYol(async (istek, yanit) => {
  const { eposta, sifre } = istek.body;

  const [kayitlar] = await baglantiHavuzu.query(
    `SELECT uye_id, ad_soyad, eposta, sifre_ozet, rol FROM ${tablolar.uyeler} WHERE eposta = ? LIMIT 1`,
    [eposta]
  );

  if (kayitlar.length === 0) {
    bildirimYaz(istek, "hata", "Eposta veya sifre hatali.");
    return yanit.redirect("/giris-kayit");
  }

  const kullanici = kayitlar[0];
  const sifreDogruMu = await bcrypt.compare(sifre, kullanici.sifre_ozet);

  if (!sifreDogruMu) {
    bildirimYaz(istek, "hata", "Eposta veya sifre hatali.");
    return yanit.redirect("/giris-kayit");
  }

  istek.session.oturum = {
    uye_id: kullanici.uye_id,
    ad_soyad: kullanici.ad_soyad,
    rol: kullanici.rol
  };

  bildirimYaz(istek, "basari", "Giris basarili, yonetim sayfasina yonlendiriliyorsunuz.");
  return yanit.redirect("/yonetim");
}));

uygulama.post("/cikis-yap", (istek, yanit) => {
  istek.session.destroy(() => {
    yanit.redirect("/");
  });
});

uygulama.post("/iletisim-gonder", (istek, yanit) => {
  const { ad_soyad, telefon } = istek.body;
  if (!ad_soyad || !telefon) {
    bildirimYaz(istek, "hata", "Iletisim formunda ad ve telefon zorunludur.");
    return yanit.redirect("/");
  }
  bildirimYaz(istek, "basari", "Mesajiniz alindi, en kisa surede sizi arayacagiz.");
  return yanit.redirect("/");
});

uygulama.get("/yonetim", oturumGerekli, guvenliYol(async (istek, yanit) => {
  // Hocam burada uc tabloyu JOIN ederek abonelik raporunu tek tabloda topluyorum.
  const [abonelikler] = await baglantiHavuzu.query(
    `SELECT
      a.abonelik_id,
      DATE_FORMAT(a.baslangic_tarihi, '%Y-%m-%d') AS baslangic_tarihi,
      a.durum,
      u.uye_id,
      u.ad_soyad,
      u.eposta,
      p.paket_id,
      p.paket_adi,
      p.aylik_ucret
    FROM ${tablolar.abonelikler} a
    INNER JOIN ${tablolar.uyeler} u ON u.uye_id = a.uye_id
    INNER JOIN ${tablolar.paketler} p ON p.paket_id = a.paket_id
    ORDER BY a.abonelik_id DESC`
  );

  const [uyeler] = await baglantiHavuzu.query(
    `SELECT uye_id, ad_soyad, eposta FROM ${tablolar.uyeler} ORDER BY ad_soyad ASC`
  );
  const [paketler] = await baglantiHavuzu.query(
    `SELECT paket_id, paket_adi, aylik_ucret FROM ${tablolar.paketler} ORDER BY aylik_ucret ASC`
  );

  yanit.render("yonetim", { abonelikler, uyeler, paketler });
}));

// Hocam burada REST API tarafinda listeleme endpointi var.
uygulama.get(`${apiKoku}/abonelikler`, oturumGerekli, guvenliYol(async (istek, yanit) => {
  const [abonelikler] = await baglantiHavuzu.query(
    `SELECT
      a.abonelik_id,
      DATE_FORMAT(a.baslangic_tarihi, '%Y-%m-%d') AS baslangic_tarihi,
      a.durum,
      u.ad_soyad,
      p.paket_adi
    FROM ${tablolar.abonelikler} a
    INNER JOIN ${tablolar.uyeler} u ON u.uye_id = a.uye_id
    INNER JOIN ${tablolar.paketler} p ON p.paket_id = a.paket_id
    ORDER BY a.abonelik_id DESC`
  );
  yanit.json(abonelikler);
}));

// Hocam burada admin panelinden JSON alarak yeni abonelik ekleme endpointini yazdim.
uygulama.post(`${apiKoku}/abonelikler`, oturumGerekli, guvenliYol(async (istek, yanit) => {
  const { uye_id, paket_id, baslangic_tarihi, durum } = istek.body;

  if (!uye_id || !paket_id || !baslangic_tarihi) {
    return yanit.status(400).json({ mesaj: "Eksik alan var." });
  }

  const durumDegeri = durum === "pasif" ? "pasif" : "aktif";
  await baglantiHavuzu.query(
    `INSERT INTO ${tablolar.abonelikler} (uye_id, paket_id, baslangic_tarihi, durum) VALUES (?, ?, ?, ?)`,
    [uye_id, paket_id, baslangic_tarihi, durumDegeri]
  );

  yanit.status(201).json({ mesaj: "Abonelik eklendi." });
}));

// Hocam burada guncellemede sadece izinli alanlari alip prepared statement ile update yapiyorum.
uygulama.put(`${apiKoku}/abonelikler/:abonelikId`, oturumGerekli, guvenliYol(async (istek, yanit) => {
  const { abonelikId } = istek.params;
  const { paket_id, durum } = istek.body;

  if (!paket_id || !durum) {
    return yanit.status(400).json({ mesaj: "Guncelleme icin paket ve durum gerekli." });
  }

  const durumDegeri = durum === "pasif" ? "pasif" : "aktif";
  const [sonuc] = await baglantiHavuzu.query(
    `UPDATE ${tablolar.abonelikler} SET paket_id = ?, durum = ? WHERE abonelik_id = ?`,
    [paket_id, durumDegeri, abonelikId]
  );

  if (sonuc.affectedRows === 0) {
    return yanit.status(404).json({ mesaj: "Kayit bulunamadi." });
  }

  yanit.json({ mesaj: "Abonelik guncellendi." });
}));

// Hocam burada silme endpointi ile admin panelinden abonelik kaydini kaldiriyorum.
uygulama.delete(`${apiKoku}/abonelikler/:abonelikId`, oturumGerekli, guvenliYol(async (istek, yanit) => {
  const { abonelikId } = istek.params;
  const [sonuc] = await baglantiHavuzu.query(
    `DELETE FROM ${tablolar.abonelikler} WHERE abonelik_id = ?`,
    [abonelikId]
  );

  if (sonuc.affectedRows === 0) {
    return yanit.status(404).json({ mesaj: "Silinecek kayit bulunamadi." });
  }

  yanit.json({ mesaj: "Kayit silindi." });
}));

uygulama.use((hata, istek, yanit, sonraki) => {
  console.error(hata);
  yanit.status(500).send("Sunucuda beklenmeyen bir hata olustu.");
});

hazirlikVerisiOlustur()
  .then(() => {
    uygulama.listen(port, () => {
      console.log(`Sunucu calisiyor: http://localhost:${port}`);
    });
  })
.catch((hata) => {
    console.error("Baslatma hatasi:", hata.code || "", hata.message || hata);
    process.exit(1);
  });
