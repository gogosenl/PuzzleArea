# Puzzle Area

Puzzle Area, Gorsen Oyun Yapim tarafindan gelistirilen mobil bir alan bulma bulmaca oyunudur. Oyuncu, tahta uzerindeki sayilari icine alacak sekilde o sayi kadar kare iceren dikdortgen alanlar cizer. Isaretlemeye sayidan baslamak zorunlu degildir; bos kareden de baslanabilir. Amac, tahtadaki tum kareleri dogru alanlarla kapatarak bolumu tamamlamaktir.

Detayli oyun sistemi, ekonomi, katmanlar ve Play Store notlari icin bu dosya kullanilir. Play Store'a yuklenecek hazir metin ve formlar `playstore/` klasorundedir.

## Kisa Ozet

- 975 bolum
- 3x3'ten 11x12'ye kadar katman sistemi
- Ipucu parasi ve katman parasi ekonomisi
- Animasyonlu tanitim akisi
- Bolum tamamlama ve katman acma efektleri
- Expo / React Native mobil oyun

## Calistirma

```powershell
npm install
npx.cmd expo start
```

PowerShell `npx` hatasi verirse `npx.cmd` kullan.

## Yayin Oncesi Kritik Notlar

- `RESET_PROGRESS_ON_LAUNCH` yayin oncesinde `false` kalmali.
- Magaza urun kimlikleri App Store / Google Play urunleriyle birebir eslesmeli.
- 2x odul butonu odullu reklam hazir degilse bedava odul vermemeli.
- Privacy Policy web URL olarak yayinlanmali.
