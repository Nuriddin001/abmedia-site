# O'z domeniga ko'chish

Sayt hozir `nuriddin001.github.io/abmedia-site/` manzilida turibdi. O'z domeniga ko'chirish uchun quyidagi qadamlarni bajarish kerak.

## 1. Domen sotib oling (siz)

Domenni Cloudflare Registrar, Namecheap yoki Porkbun saytidan olishingiz mumkin. Masalan, `abmedia.studio`. Narxi yiliga taxminan $10–15.

## 2. DNS yozuvlarini qo'shing (siz, domen sotib olingan saytda)

Domenning o'zi uchun (`abmedia.studio`) to'rtta **A** yozuvi kerak:

| Turi | Nomi | Qiymati |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

IPv6 uchun to'rtta **AAAA** yozuvi ham qo'shing (bu ixtiyoriy):
- `2606:50c0:8000::153`
- `2606:50c0:8001::153`
- `2606:50c0:8002::153`
- `2606:50c0:8003::153`

`www` manzili uchun bitta **CNAME** yozuvi kerak: nomi `www`, qiymati `nuriddin001.github.io`.

## 3. Saytni yangi manzilga o'tkazish (men)

1. `src/config.rs` faylidagi `SITE_URL` qiymatini `https://{DOMAIN}/` ga almashtiraman.
2. Saytni qaytadan yig'aman (`export`). Shunda quyidagi fayllar avtomatik yoziladi:
   - `CNAME` va `robots.txt`;
   - yangi manzil bilan sitemap;
   - canonical, hreflang va strukturali ma'lumotlar.
3. GitHub'ga yuboraman.

## 4. HTTPS ni yoqing (siz)

GitHub'da repozitoriyni oching va **Settings → Pages** bo'limiga kiring:
- **Custom domain** maydonida domen ko'rinishi kerak;
- DNS tekshiruvi o'tgach, **Enforce HTTPS** belgisini yoqing.

Tekshiruv bir necha daqiqadan 24 soatgacha davom etishi mumkin.

GitHub Pages eski `github.io/abmedia-site/...` manzillarni yangi domenga o'zi yo'naltiradi. Shuning uchun eski havolalar ishlashda davom etadi.

## 5. Qidiruv tizimlari (siz)

- **Google Search Console:** yangi **Domain** turidagi resurs qo'shing. Tasdiqlash uchun DNS'ga TXT yozuvi qo'shiladi. Keyin `https://{DOMAIN}/sitemap.xml` sitemap'ini yuboring.
- **Bing Webmaster Tools:** domenni qo'shing yoki Google Search Console'dan import qiling, keyin sitemap'ni yuboring.
- **Google Business Profile:** kompaniya profilini oching.

## Tekshirish

Ko'chishdan keyin quyidagilar bajarilgan bo'lishi kerak:
- `https://{DOMAIN}/robots.txt` va `https://{DOMAIN}/sitemap.xml` ochilib, 200 javob qaytaradi;
- sayt fayllarida `github.io` so'zi qolmagan.
