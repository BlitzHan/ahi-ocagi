# Ahi Ocağı

Tarayıcıda oynanan, Osmanlı ve Türk halk masalları temalı bir demirci idle RPG.

Sen bir Ahi ustasısın. Ocağında dövdüğün silahlarla akıncın Söğüt Ovası'ndan Kaf Dağı'na kadar Eşkıya, Gulyabani, Karakoncolos, Tepegöz, İfrit, Albastı ve Div gibi masal yaratıklarıyla savaşır.

**Oyna:** https://blitzhan.github.io/ahi-ocagi/

## Özellikler

- **Dövme:** 1 çekiçle rastgele eşya. 8 yuva (Yatağan, Tolga, Kaftan, Kolçak, Muska, Zihgir, Çizme, Kuşak) ve 6 nadirlik (Sade, Nakışlı, Murassa, Efsanevi, Destansı, Ezelî). Ek özellikler: kritik, saldırı hızı, can çalma, kaçınma, yenileme, çift vuruş, diken, boss hasarı, ganimet.
- **Kıt çekiç:** Çekiç ilerleyerek kazanılır. İlk kez geçilen aşama +3, ilk boss +12; düşmandan %12, ocak 45 sn'de 1 yeniler.
- **Usta Kalfa:** Otomatik döver, daha güçlüsünü kendisi kuşanır, gerisini satar.
- **Ocak:** Altınla yükseltilir, nadir eşya şansını artırır. Süre altınla kısaltılabilir.
- **Bileme:** Kuşanılan eşyanın ana değerini artırır.
- **Yoldaşlar:** Van Kedisi, Kızıl Tilki, Kurt Yavrusu, Bilge Kaplumbağa, Doğan, Yavru Ejder, Zümrüd-ü Anka, Gökbörü. Yumurtalar kuluçkada zamanla çatlar; yoldaş yanında savaşır ve özellik verir.
- **Ahilik Beratı:** 4. bölgeden sonra ilerlemeyi sıfırlayıp kalıcı güç kazanırsın.
- **Çevrimdışı ilerleme:** Oyun kapalıyken %80 verimle (en fazla 12 saat) savaşmaya, dövmeye ve kuluçkaya devam eder. Dönünce "Sen Yokken" raporu çıkar.
- 3D savaş sahnesi (Three.js), 5 bölge, sentez ses efektleri, telefon uyumlu arayüz.

## Çalıştırma

Kurulum gerekmez. `index.html` dosyasını tarayıcıda aç ya da GitHub Pages adresinden oyna. İlerleme tarayıcıda kaydedilir.

Kısayollar: Boşluk döv · A Usta Kalfa · E kuşan · S sat · M ses

## Dosyalar

| Dosya | İçerik |
|---|---|
| `js/core.js` | Oyun mantığı, denge, kayıt, çevrimdışı hesap |
| `js/scene.js` | 3D savaş sahnesi, modeller, animasyon |
| `js/ui.js` | Arayüz, ocak, açılış ekranları, ana döngü |
| `js/icons.js` | Eşya, yoldaş ve yumurta ikonları (SVG) |
| `js/audio.js` | Ses efektleri (Web Audio) |

## Lisanslar

- [Three.js](https://threejs.org/) r149: MIT
- Yazı tipleri [Lilita One](https://fonts.google.com/specimen/Lilita+One) ve [Nunito](https://fonts.google.com/specimen/Nunito): SIL Open Font License 1.1
