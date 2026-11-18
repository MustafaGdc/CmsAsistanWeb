# Mustafa Güdücü — Dashboard Portfolio + CMS + AI Asistan

WordPress kullanmadan hazırlanmış, Node.js/Express tabanlı kişisel portfolyo.

## Kurulum (Windows / macOS / Linux)
1. Node.js 20+ kurun.
2. Proje klasöründe terminal açın.
3. `npm install` çalıştırın.
4. `.env.example` dosyasını `.env` adıyla kopyalayın. `ADMIN_PASSWORD` ve `SESSION_SECRET` değerlerini güçlü, benzersiz değerlerle değiştirin.
5. `npm start` çalıştırın.
6. Site: http://localhost:3000 — Yönetim: http://localhost:3000/admin.html

**Önemli:** HTML dosyasına çift tıklamak bu sürümde yeterli değildir; sunucuyu başlatın.

## Yönetim paneli
- Profil (iki dilde), projeler, galeri, üç örnek blog yazısı düzenlenebilir.
- Görseller JPG/PNG/WEBP/GIF olarak 4 MB'a kadar yüklenebilir; görsel URL'si ilgili alana yazılır.
- İletişim formundan gelen mesajlar panelde görüntülenir.
- `data/content.json` ve `uploads/` kalıcı veri içerir; yedekleyin.
- İlk içeriklerdeki görseller, iletişim bilgileri ve örnek proje açıklamaları gerçek bilgilerinizle değiştirilmelidir.

## Kişisel asistan
- Site sağ alt köşesindeki ✦ düğmesiyle açılır.
- `GEMINI_API_KEY` girilmezse temel anahtar kelime tabanlı yanıtlar verir; **bu mod yapay zekâ değildir**.
- Gemini anahtarı `.env` içine eklenirse API üzerinden AI yanıtları üretir. Anahtarı asla frontend'e koymayın.
- AI API erişimi, kota ve maliyet hesabınıza bağlıdır. Model `.env` üzerinden değiştirilebilir.

## Yayınlama
- Bu sürüm sunucu ve yerel JSON dosyası kullandığı için yalnızca statik hosting'e yüklenemez.
- Node.js çalıştırabilen ve **kalıcı disk** sunan bir hosting kullanın; örneğin uygun planlı Render/Railway/VPS. Ephemeral disk kullanan sunucuda değişiklikler kaybolabilir.
- Üretimde HTTPS, güçlü şifre, kalıcı session store (ör. Redis), düzenli yedek, spam koruması ve mümkünse gerçek veritabanı ekleyin. Bu örnek `express-session` MemoryStore kullanır; yoğun/çok kullanıcılı üretim için uygun değildir.
- Üretimde `NODE_ENV=production` ayarlayın ve HTTPS reverse proxy kullanın.
- Domain ve yayınlama kullanıcı hesabı üzerinden ayrıca tamamlanmalıdır.

## Ödev kontrol listesi
- [x] Anasayfa, Hakkımda, Projeler, Galeri, Blog, İletişim
- [x] TR / EN, responsive dashboard
- [x] 3 örnek blog makalesi, kategori, etiketler
- [x] İletişim formu, Google Maps embed
- [x] Şifreli içerik yönetim paneli
- [x] Asistan arayüzü ve opsiyonel Gemini entegrasyonu
- [ ] Gerçek vesikalık, proje ve galeri görselleri
- [ ] Gerçek adres, telefon, e-posta ve harita konumu
- [ ] Domain/hosting yayını ve isteğe bağlı tanıtım videosu

## Teslim
`Öğrenci_No.zip` olarak arşivleyin. Teams ZIP kabul etmiyorsa öğretmenin yönergesine göre ZIP dosyasının **uzantısını** `.pdf` olarak değiştirin; PDF'ye dönüştürmeyin. 500 MB sınırını aşmayın. `.env`, `node_modules`, gerçek iletişim mesajları ve özel API anahtarlarını teslim arşivine eklemeyin.
