const yApiKoku = "/api/251109076/abonelikler";

const yAbonelikEkleFormu = document.getElementById("y-abonelik-ekle-formu");
const yDurumYazisi = document.getElementById("y-durum-yazisi");
const yAbonelikGovde = document.getElementById("y-abonelik-govde");

function yBilgiYaz(metin, hataMi = false) {
  if (!yDurumYazisi) {
    return;
  }
  yDurumYazisi.textContent = metin;
  yDurumYazisi.style.color = hataMi ? "#ff9a9a" : "#a9ffb2";
}

async function yIstekAt(url, secenekler) {
  const cevap = await fetch(url, secenekler);
  const icerik = await cevap.json().catch(() => ({}));
  if (!cevap.ok) {
    throw new Error(icerik.mesaj || "Islem tamamlanamadi.");
  }
  return icerik;
}

if (yAbonelikEkleFormu) {
  yAbonelikEkleFormu.addEventListener("submit", async (olay) => {
    olay.preventDefault();
    const formVerisi = new FormData(yAbonelikEkleFormu);
    const govde = {
      uye_id: formVerisi.get("uye_id"),
      paket_id: formVerisi.get("paket_id"),
      baslangic_tarihi: formVerisi.get("baslangic_tarihi"),
      durum: formVerisi.get("durum")
    };

    try {
      await yIstekAt(yApiKoku, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde)
      });
      yBilgiYaz("Abonelik eklendi, sayfa yenileniyor.");
      setTimeout(() => window.location.reload(), 500);
    } catch (hata) {
      yBilgiYaz(hata.message, true);
    }
  });
}

if (yAbonelikGovde) {
  yAbonelikGovde.addEventListener("click", async (olay) => {
    const silDugme = olay.target.closest(".y-sil-dugme");
    const guncelleDugme = olay.target.closest(".y-guncelle-dugme");

    if (silDugme) {
      const satir = silDugme.closest("tr");
      const abonelikId = satir?.dataset.abonelikId;
      if (!abonelikId) {
        return;
      }
      if (!confirm("Bu kayit silinsin mi?")) {
        return;
      }

      try {
        await yIstekAt(`${yApiKoku}/${abonelikId}`, { method: "DELETE" });
        yBilgiYaz("Kayit silindi.");
        satir.remove();
      } catch (hata) {
        yBilgiYaz(hata.message, true);
      }
    }

    if (guncelleDugme) {
      const satir = guncelleDugme.closest("tr");
      const abonelikId = satir?.dataset.abonelikId;
      const durumAlani = satir?.querySelector(".y-durum-secim");
      const paketAlani = satir?.querySelector(".y-paket-secim");
      if (!abonelikId || !durumAlani || !paketAlani) {
        return;
      }

      try {
        await yIstekAt(`${yApiKoku}/${abonelikId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durum: durumAlani.value,
            paket_id: paketAlani.value
          })
        });
        yBilgiYaz(`Abonelik ${abonelikId} guncellendi.`);
      } catch (hata) {
        yBilgiYaz(hata.message, true);
      }
    }
  });
}
