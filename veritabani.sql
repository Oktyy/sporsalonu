CREATE DATABASE IF NOT EXISTS `spor_salonu_yonetim`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_turkish_ci;

USE `spor_salonu_yonetim`;

CREATE TABLE IF NOT EXISTS `251109076_uyeler` (
  `uye_id` INT AUTO_INCREMENT PRIMARY KEY,
  `ad_soyad` VARCHAR(120) NOT NULL,
  `eposta` VARCHAR(160) NOT NULL UNIQUE,
  `sifre_ozet` VARCHAR(255) NOT NULL,
  `rol` ENUM('kullanici', 'yonetici') NOT NULL DEFAULT 'kullanici',
  `kayit_tarihi` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `251109076_paketler` (
  `paket_id` INT AUTO_INCREMENT PRIMARY KEY,
  `paket_adi` VARCHAR(120) NOT NULL,
  `aylik_ucret` DECIMAL(10,2) NOT NULL,
  `sure_ay` INT NOT NULL
);

CREATE TABLE IF NOT EXISTS `251109076_abonelikler` (
  `abonelik_id` INT AUTO_INCREMENT PRIMARY KEY,
  `uye_id` INT NOT NULL,
  `paket_id` INT NOT NULL,
  `baslangic_tarihi` DATE NOT NULL,
  `durum` ENUM('aktif', 'pasif') NOT NULL DEFAULT 'aktif',
  CONSTRAINT `fk_251109076_uye`
    FOREIGN KEY (`uye_id`) REFERENCES `251109076_uyeler`(`uye_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_251109076_paket`
    FOREIGN KEY (`paket_id`) REFERENCES `251109076_paketler`(`paket_id`)
    ON DELETE CASCADE
);

INSERT INTO `251109076_paketler` (`paket_adi`, `aylik_ucret`, `sure_ay`)
SELECT * FROM (
  SELECT 'Baslangic Paketi', 950.00, 1
  UNION ALL
  SELECT 'Performans Paketi', 2400.00, 3
  UNION ALL
  SELECT 'Profesyonel Paket', 4200.00, 6
) AS yeni_veri
WHERE NOT EXISTS (
  SELECT 1 FROM `251109076_paketler`
);
