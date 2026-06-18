# SkyCode - Akıllı Hava Durumu

SkyCode, OpenWeather verilerini kullanan PyQt5 tabanlı bir masaüstü hava durumu uygulamasıdır. Arayüz HTML, Tailwind CDN, CSS ve JavaScript ile hazırlanır; Python tarafı Qt WebChannel üzerinden arayüzle haberleşir.

## Özellikler

- Anlık hava durumu, hissedilen sıcaklık, nem, rüzgar ve yağış bilgisi
- Saatlik ve 5 günlük tahmin görünümü
- Sıcaklık trendi ve analiz kartları
- Hava durumuna göre kıyafet ve gün planlama önerileri
- Yerel kullanıcı profili ve favori şehir desteği

## 📸 Uygulama Ekran Görüntüleri

### Ana Sayfa - Hava Durumu Tahmini

![Ana Sayfa](screenshots/home.png)

Kullanıcılar şehir aratarak anlık hava durumu bilgilerine, saatlik tahminlere ve temel meteorolojik verilere erişebilir.

---

### Hava Durumu Analizi

![Analiz](screenshots/analysis.png)

Son 24 saatlik sıcaklık değişimi, nem oranı, rüzgar hızı ve diğer meteorolojik verilerin görsel analiz ekranı.

---

### Ne Giymeliyim?

![Kıyafet Önerileri](screenshots/outfit.png)

Hava koşullarına göre yapay zeka destekli kıyafet ve aksesuar önerileri sunar.

---

### Kombin ve Günün Renkleri

![Kombin Önerileri](screenshots/outfit-details.png)

Kombin önerileri, günlük aksesuar tavsiyeleri ve hava durumuna uygun renk paletleri.

---

### Akıllı Gün Planlayıcı

![Gün Planlayıcı](screenshots/planner.png)

Hava durumuna göre optimize edilmiş günlük zaman çizelgesi ve kişisel öneriler.

---

### Kullanıcı Profili Oluşturma

![Profil Oluşturma](screenshots/profile-setup.png)

Kullanıcının stil tercihleri, günlük rutinleri ve kişisel özelliklerine göre özelleştirme ekranı.

---

### Profil Yönetimi

![Profil](screenshots/profile.png)

Kullanıcı bilgileri, favori şehirler, tema ayarları ve kişisel hava profili yönetimi.

## Proje Yapısı

```text
.
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── navbar.js
│       └── tailwind.config.js
├── index.html
├── main.py
├── requirements.txt
└── .env.example
```

## Kurulum

1. Sanal ortam oluşturun ve etkinleştirin.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Bağımlılıkları yükleyin.

```powershell
pip install -r requirements.txt
```

3. OpenWeather API anahtarınızı ayarlayın.

```powershell
Copy-Item .env.example .env
```

`.env` dosyasındaki değeri kendi anahtarınızla değiştirin:

```env
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

4. Uygulamayı çalıştırın.

```powershell
python main.py
```

## GitHub Notları

- `.env` dosyası commitlenmez; API anahtarını yalnızca yerel ortamda tutun.
- Daha önce bir API anahtarı herkese açık bir yere yüklendiyse OpenWeather panelinden yenilemeniz önerilir.
- `index.html` doğrudan tarayıcıda açıldığında statik önizleme olarak görünür; canlı hava durumu verileri için uygulamayı `python main.py` ile PyQt üzerinden çalıştırın.

## Windows EXE Oluşturma

```powershell
pip install pyinstaller
pyinstaller --noconfirm --windowed --name SkyCode --add-data "index.html;." --add-data "assets;assets" main.py
```

Çıktı `dist/SkyCode/SkyCode.exe` altında oluşur. API anahtarını exe içine koymayın; çalıştırmadan önce `SkyCode.exe` ile aynı klasöre `.env` dosyası ekleyin.
