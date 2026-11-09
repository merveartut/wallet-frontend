# Microservice Wallet — Frontend

[microservice-wallet-spring](../microservice-wallet-spring) backend'i için React arayüzü.

**Teknolojiler:** React 18 · TypeScript (strict) · Vite 5 · React Router 6. UI kütüphanesi yok; stiller `src/styles.css` içinde (açık/koyu tema).

## Çalıştırma

Önce backend'in ayakta olması gerekir (API Gateway `localhost:8080`):

```bash
cd ../microservice-wallet-spring && docker compose up -d
```

Sonra:

```bash
npm install
npm run dev        # http://localhost:5173
```

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu (kod değişince sayfa kendiliğinden yenilenir) |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run build` | Tip kontrolü + production derlemesi (`dist/`) |
| `npm run preview` | Production derlemesini yerelde sunar |

Gateway başka bir adresteyse `.env.local` dosyasına yazın:

```
API_GATEWAY_URL=http://localhost:8080
```

## Backend'e nasıl bağlanıyor?

Tarayıcı tüm istekleri kendi adresine (`localhost:5173/api/...`) gönderir; Vite bu istekleri gateway'e aktarır (`vite.config.ts` → `server.proxy`). Böylece tarayıcı açısından istek aynı adrese gittiği için **CORS ayarı gerekmez**. Gateway'de CORS tanımlı değil (backend yapılacaklar #23).

**Üretimde** aynı mantık bir reverse proxy ile kurulur: örneğin NGINX `dist/` klasörünü sunar ve `/api/` isteklerini gateway'e yönlendirir. Frontend ve API farklı adreslerden sunulacaksa gateway'e CORS ayarı eklenmelidir.

## Özellikler

| Sayfa | Yol | Kimler |
|---|---|---|
| Giriş | `/login` | Herkes |
| Kayıt (sonrasında otomatik giriş) | `/register` | Herkes |
| Hesaplarım: bakiyeler, toplamlar, yeni hesap açma | `/` | Giriş yapmış |
| Para transferi | `/transfer` | Giriş yapmış |
| Para yatırma (herhangi bir hesaba) | `/deposit` | Yalnızca ADMIN |
| Piyasa: canlı kripto fiyatları, grafik, al/sat (piyasa, limit, stop), bekleyen emirler | `/market` | Giriş yapmış |
| Portföy: pozisyonlar, canlı değer, kâr/zarar, emir geçmişi | `/portfolio` | Giriş yapmış |

- **Asenkron cüzdan:** Kayıttan sonra cüzdan Kafka üzerinden birkaç saniye içinde açılır. Panel, hesap görünene kadar 2 saniyede bir yeniden sorgular.
- **Oturum:** JWT `localStorage`'da tutulur, her isteğe `Authorization: Bearer` olarak eklenir. Token süresi dolunca (30 dk) ya da backend 401 dönünce oturum kapanır ve giriş sayfasında nedeni gösterilir.
- **Hatalar:** Backend'in RFC 9457 Problem Details cevapları okunur. `detail` mesajı formun üstünde, `errors` listesindeki alan hataları ilgili alanın altında gösterilir.
- **Canlı fiyatlar:** `usePriceStream` hook'u backend'in Server-Sent Events akışını (`/api/crypto/prices/stream`) `EventSource` ile dinler; bağlantı koparsa tarayıcı kendiliğinden yeniden bağlanır. Fiyat yükselince/düşünce satır yeşil/kırmızı yanıp söner. Grafik bağımlılıksız SVG'dir (`src/crypto/PriceChart.tsx`).
- **Kripto alım-satım:** Gerçek değildir; TRY hesabındaki sanal bakiye kullanılır. Emir sonucu `status` alanından okunur: `COMPLETED`, `OPEN` (limit/stop bekliyor), `REJECTED` (ör. yetersiz bakiye), `FAILED` (satış tutarı yatırılamadı, coin'ler iade edildi), `EXECUTING` (cüzdan servisinden cevap gelmedi, birkaç saniyede kendiliğinden tamamlanır). Bekleyen emirler arka planda tetiklendiği için emir ve portföy listesi 5 sn'de bir yenilenir. Adetler 8 ondalık hassasiyetle string olarak gönderilir. Satışta formdaki **Satılacak coin** listesi elinizdeki coin'leri satılabilir adetleriyle gösterir; fiyat listesinde elinizde olan coin'ler ● ile işaretlidir.
- **Rol kontrolü:** ADMIN menüsü ve sayfası yalnızca arayüz kolaylığıdır. Asıl yetki kontrolünü backend yapar.

## Klasör yapısı

```
src/
├── api/
│   ├── client.ts        # fetch sarmalayıcı: token ekleme, hata → ApiError, 401 → oturumu kapat
│   ├── walletApi.ts     # Endpoint'ler ve tipler (User, Account, ...)
│   └── cryptoApi.ts     # crypto-service: fiyatlar, emirler, portföy
├── auth/
│   ├── AuthContext.tsx  # Oturum durumu: login, logout, token süresi takibi
│   ├── jwt.ts           # Token içeriğini okuma (imza doğrulaması backend'de)
│   └── tokenStorage.ts  # localStorage erişimi
├── components/
│   ├── Layout.tsx       # Üst menü + sayfa çerçevesi
│   ├── RouteGuards.tsx  # RequireAuth, RequireAdmin, GuestOnly
│   ├── useAccounts.ts   # Hesapları yükleyen hook
│   └── ui.tsx           # Alert, Field, SelectField, SubmitButton
├── crypto/              # usePriceStream (SSE), useCryptoAccount, PriceChart, OrderForm, OrderTable, format
├── pages/               # Login, Register, Dashboard, Transfer, Deposit, Market, Portfolio
├── utils/format.ts      # Para biçimlendirme (tr-TR), tutar ayrıştırma
├── App.tsx              # Route tanımları
├── main.tsx             # Giriş noktası
└── styles.css
```

## VS Code

Klasörü VS Code ile açın (`code .`). Önerilen eklentiler `.vscode/extensions.json` içinde; VS Code ilk açılışta kurmayı önerir:

- **Prettier:** Kaydederken kodu biçimlendirir (`.prettierrc.json`).
- **ES7+ React snippets:** `rfc` + Tab gibi kısayollarla bileşen iskeleti.

`.vscode/settings.json`, VS Code'un projedeki TypeScript sürümünü kullanmasını sağlar.

## Bilinen kısıtlar

- Backend'in bazı endpoint'leri (giriş, hesap açma, para yatırma, transfer) JSON yerine düz metin döner (#20). Frontend bu metni olduğu gibi gösterir; giriş cevabının içeriği `Accept` header'ına göre `application/json` etiketiyle de gelebildiği için `client.ts` buna göre yazıldı.
- Farklı para birimindeki hesaplar arasında transfer yapılabiliyor ve **kur dönüşümü yapılmıyor**: TRY hesabından USD hesabına 10 gönderilirse USD hesabı 10 artar. Bu bir backend hatası.
- Eski otomatik hesaplarda para birimi `TR` (geçerli ISO kodu `TRY`, backend #19); bu hesaplar "10,00 TR" biçiminde gösterilir.
- İşlem geçmişi yok; backend'de böyle bir endpoint bulunmuyor.
- Token `localStorage`'da; XSS'e karşı daha güvenli yöntem HttpOnly cookie'dir (backend değişikliği gerektirir).
- Otomatik test yok. İleride Vitest + React Testing Library (birim) ve Playwright (uçtan uca) eklenebilir.
