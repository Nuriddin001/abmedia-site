//! Search engines: one page per language (/, /es/, /ru/, /ar/), each with its own
//! title, description, hreflang links, social preview and structured data, and with
//! the plain texts already in the HTML, so a crawler that runs no JavaScript still reads them.

use crate::content::SiteData;
use serde_json::{json, Value};

/// The public address of the site lives in config.rs (one value; canonical, hreflang, OG, JSON-LD and the sitemap use it).
pub use crate::config::SITE_URL;
pub const LANGS: [&str; 4] = ["en", "es", "ru", "ar"];

const I18N: &str = include_str!("../static/i18n.js");
const HEAD_SLOT: &str = "<!--__SEO_HEAD__-->";
/// One id for the studio, so every page's data points at the same Organization.
pub fn org_id() -> String { format!("{SITE_URL}#org") }
pub const AR_FONTS: &str = "&family=Noto+Kufi+Arabic:wght@500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&";

struct Meta {
    title: &'static str,
    description: &'static str,
    locale: &'static str,
}

fn meta(lang: &str) -> Meta {
    match lang {
        "es" => Meta {
            title: "AB Media — Productora de vídeo corporativo y storytelling de marca",
            description: "Productora de vídeo para empresas: spots publicitarios, vídeo corporativo y storytelling de marca. Good Day, Sales Doctor Academy, IMZO. Auditoría gratis.",
            locale: "es_ES",
        },
        "ru" => Meta {
            title: "AB Media — видеопродакшн для бизнеса: имиджевые и рекламные ролики",
            description: "Видеопродакшн для бизнеса: имиджевые и рекламные ролики, сторителлинг и go-to-market кампании. Good Day, Sales Doctor Academy, IMZO. Бесплатный аудит бизнеса.",
            locale: "ru_RU",
        },
        "ar" => Meta {
            title: "AB Media — شركة إنتاج فيديوهات وإعلانات تجارية بأسلوب سرد القصص",
            description: "شركة إنتاج فيديوهات للشركات: تصوير إعلانات تجارية احترافية وفيديو تعريفي للشركة وسرد قصص العلامة التجارية مع حملات دخول السوق. تدقيق مجاني لعملك.",
            locale: "ar_AR",
        },
        _ => Meta {
            title: "AB Media — Storytelling Video Production & Brand Films",
            description: "Storytelling video production company: brand films, commercials and go-to-market campaigns. Good Day, Sales Doctor Academy, IMZO. Free business audit.",
            locale: "en_US",
        },
    }
}

/// Address of a language's page: English is the root, the others live in their own folder.
pub fn page_url(lang: &str) -> String {
    if lang == "en" { SITE_URL.to_string() } else { format!("{SITE_URL}{lang}/") }
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

/// The texts of every language, read from static/i18n.js (`const L = {...};` is plain JSON).
fn texts() -> Value {
    let start = I18N.find("const L = ").expect("i18n.js: const L") + "const L = ".len();
    let end = start + I18N[start..].find("\n};").expect("i18n.js: end of L") + 2;
    serde_json::from_str(&I18N[start..end]).expect("i18n.js: L is JSON")
}

fn head(lang: &str, site: &SiteData) -> String {
    let m = meta(lang);
    let url = page_url(lang);
    let image = format!("{SITE_URL}media/good-day.jpg");
    let mut h = String::new();
    h += &format!("<title>{}</title>\n", esc(m.title));
    // the first film's cover is the first large thing a phone paints, so it is fetched before anything else
    h += &format!("<link rel=\"preload\" as=\"image\" type=\"image/webp\" href=\"{}media/good-day.webp\" fetchpriority=\"high\">\n", if lang == "en" { "" } else { "../" });
    h += &format!("<meta name=\"description\" content=\"{}\">\n", esc(m.description));
    h += &format!("<link rel=\"canonical\" href=\"{url}\">\n");
    for l in LANGS {
        h += &format!("<link rel=\"alternate\" hreflang=\"{l}\" href=\"{}\">\n", page_url(l));
    }
    h += &format!("<link rel=\"alternate\" hreflang=\"x-default\" href=\"{SITE_URL}\">\n");
    h += "<meta name=\"robots\" content=\"index,follow,max-image-preview:large\">\n";
    h += "<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:site_name\" content=\"AB Media\">\n";
    h += &format!("<meta property=\"og:url\" content=\"{url}\">\n");
    h += &format!("<meta property=\"og:title\" content=\"{}\">\n", esc(m.title));
    h += &format!("<meta property=\"og:description\" content=\"{}\">\n", esc(m.description));
    h += &format!("<meta property=\"og:image\" content=\"{image}\">\n");
    h += &format!("<meta property=\"og:locale\" content=\"{}\">\n", m.locale);
    for l in LANGS.iter().filter(|l| **l != lang) {
        h += &format!("<meta property=\"og:locale:alternate\" content=\"{}\">\n", meta(l).locale);
    }
    h += "<meta name=\"twitter:card\" content=\"summary_large_image\">\n";
    h += &format!("<meta name=\"twitter:title\" content=\"{}\">\n", esc(m.title));
    h += &format!("<meta name=\"twitter:description\" content=\"{}\">\n", esc(m.description));
    h += &format!("<meta name=\"twitter:image\" content=\"{image}\">\n");
    h += &format!("<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230B0D0F'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%23E5484D'/%3E%3C/svg%3E\">\n");

    // Who the studio is, for Google's knowledge panel: only real facts from content.rs
    let c = &site.contacts;
    let mut same_as: Vec<&str> = Vec::new();
    for p in [&c.telegram, &c.instagram] {
        same_as.extend([p.en, p.es, p.ru, p.ar].into_iter().flatten());
    }
    same_as.extend(c.youtube);
    let mut org = json!({
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": org_id(),
        "name": "AB Media",
        "url": SITE_URL,
        // TODO(owner): replace media/logo.png with the official square logo (at least 112 x 112 px) if there is one
        "logo": { "@type": "ImageObject", "url": format!("{SITE_URL}media/logo.png"), "width": 512, "height": 512 },
        "image": image,
        "description": m.description,
        "telephone": c.phone.replace(' ', ""),
        // TODO(owner): confirm which of these profiles are the founder's own and which are the studio's
        "founder": { "@type": "Person", "@id": format!("{SITE_URL}#founder"), "name": "Abror Bakhtiyarovich", "jobTitle": "Founder", "sameAs": same_as },
        "sameAs": same_as,
        "knowsLanguage": LANGS,
        "contactPoint": { "@type": "ContactPoint", "contactType": "sales", "telephone": c.phone.replace(' ', ""), "availableLanguage": ["English", "Spanish", "Russian", "Arabic"] }
    });
    let page = json!({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": m.title,
        "description": m.description,
        "url": url,
        "inLanguage": lang,
        "publisher": { "@id": org_id() }
    });
    // TODO(owner): the business email (content.rs contacts.email) is not set yet
    if let Some(e) = c.email { org["email"] = Value::from(e); }
    // TODO(owner): areaServed (countries / cities the studio works in) is not added until the owner names them
    // the films on the page as a list (each item leads to the film's own page) and the opening film itself
    let films = crate::films::films();
    let list = json!({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": format!("AB Media — {}", texts()[lang]["cs_eb"].as_str().unwrap_or("Work")),
        "numberOfItems": films.len(),
        "itemListElement": films.iter().enumerate().map(|(i, f)| json!({ "@type": "ListItem", "position": i + 1, "name": f.client(), "url": crate::films::film_url(lang, &f.slug) })).collect::<Vec<_>>()
    });
    let hero = films.iter().find(|f| f.client() == site.featured[0]).map(|f| crate::films::video_ld(lang, f));
    for v in [Some(org), Some(page), Some(list), hero].into_iter().flatten() {
        h += &format!("<script type=\"application/ld+json\">{}</script>\n", v.to_string().replace("</", "<\\/"));
    }
    h
}

/// Puts each language's plain texts straight into the HTML (the same texts the script writes there).
fn fill_texts(html: &str, t: &Value) -> String {
    let mut out = String::with_capacity(html.len() + 8192);
    let mut rest = html;
    while let Some(i) = rest.find("data-i=\"") {
        let key_start = i + "data-i=\"".len();
        let Some(key_len) = rest[key_start..].find('"') else { break };
        let key = &rest[key_start..key_start + key_len];
        let after = key_start + key_len + 1;
        // only an element that is empty in the template: `data-i="key" ...></tag>`
        match (rest[after..].find('>'), t.get(key).and_then(Value::as_str)) {
            (Some(gt), Some(text)) if rest[after + gt + 1..].starts_with("</") && !rest[after..after + gt].contains('<') => {
                let end = after + gt + 1;
                out += &rest[..end];
                out += &esc(text);
                rest = &rest[end..];
            }
            _ => {
                out += &rest[..after];
                rest = &rest[after..];
            }
        }
    }
    out += rest;
    out
}

/// The page for one language. `root` is the way back to the site root from that page ("" or "../").
pub fn localize(page: &str, lang: &str, site: &SiteData) -> String {
    assert!(page.contains(HEAD_SLOT), "templates/index.html lost its SEO head slot");
    let all = texts();
    let t = &all[lang];
    let root = if lang == "en" { "" } else { "../" };
    let dir = if lang == "ar" { "rtl" } else { "ltr" };
    let mut html = page
        .replacen("<html lang=\"en\" dir=\"ltr\">", &format!("<html lang=\"{lang}\" dir=\"{dir}\">"), 1)
        .replacen(HEAD_SLOT, &head(lang, site), 1)
        // the two Arabic families load only on /ar/ (the script adds them if a visitor switches to Arabic elsewhere)
        .replace("&family=__AR_FONTS__", if lang == "ar" { AR_FONTS } else { "&" })
        .replacen("<h1 class=\"tag\" id=\"h1\"></h1>", &format!("<h1 class=\"tag\" id=\"h1\">{}</h1>", esc(t["hero_tag"].as_str().unwrap_or(""))), 1);
    // every section the script builds, already in the HTML (see prerender.rs); data-pre tells the script which language it is
    html = html.replacen(&format!("<html lang=\"{lang}\" dir=\"{dir}\">"), &format!("<html lang=\"{lang}\" dir=\"{dir}\" data-pre=\"{lang}\">"), 1);
    html = crate::prerender::sections(html, lang, t, &crate::films::cases_json(), site);
    html = fill_texts(&html, t);
    html = html.replacen("<!--__FILMS__-->", &crate::films::footer_links(lang), 1);
    // The questions and answers: visible in the HTML (the script rebuilds the same list) and as FAQPage data
    let faq: Vec<(&str, &str)> = t["faq"].as_array().map(|a| a.iter().filter_map(|qa| Some((qa[0].as_str()?, qa[1].as_str()?))).collect()).unwrap_or_default();
    if !faq.is_empty() {
        let items: String = faq.iter().map(|(q, a)| format!("<details><summary>{}</summary><p>{}</p></details>", esc(q), esc(a))).collect();
        html = html.replacen("<div class=\"faq\" id=\"faqlist\"></div>", &format!("<div class=\"faq\" id=\"faqlist\">{items}</div>"), 1);
        let data = json!({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "inLanguage": lang,
            "mainEntity": faq.iter().map(|(q, a)| json!({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } })).collect::<Vec<_>>()
        });
        html = html.replacen("</head>", &format!("<script type=\"application/ld+json\">{}</script>\n</head>", data.to_string().replace("</", "<\\/")), 1);
    }
    let titles: Value = LANGS.iter().map(|l| (l.to_string(), Value::from(meta(l).title))).collect::<serde_json::Map<_, _>>().into();
    html = html.replacen(
        "<script>window.ABM_DATA",
        &format!("<script>window.ABM_LANG = \"{lang}\"; window.ABM_ROOT = \"{root}\"; window.ABM_TITLES = {titles};</script>\n<script>window.ABM_DATA"),
        1,
    );
    if !root.is_empty() {
        html = html.replace("\"static/", &format!("\"{root}static/")).replace("\"media/", &format!("\"{root}media/"));
    }
    html
}

/// The page for a missing address: links to the four language homes, never indexed.
pub fn not_found() -> String {
    include_str!("../templates/404.html").replace("{BASE}", crate::config::base_path())
}

/// sitemap.xml with every language page and its alternates.
pub fn sitemap() -> String {
    let mut s = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n");
    for l in LANGS {
        s += &format!("  <url>\n    <loc>{}</loc>\n", page_url(l));
        for a in LANGS {
            s += &format!("    <xhtml:link rel=\"alternate\" hreflang=\"{a}\" href=\"{}\"/>\n", page_url(a));
        }
        s += &format!("    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"{SITE_URL}\"/>\n    <changefreq>weekly</changefreq>\n  </url>\n");
    }
    for f in crate::films::films() {
        for l in LANGS {
            s += &format!("  <url>\n    <loc>{}</loc>\n", crate::films::film_url(l, &f.slug));
            for a in LANGS {
                s += &format!("    <xhtml:link rel=\"alternate\" hreflang=\"{a}\" href=\"{}\"/>\n", crate::films::film_url(a, &f.slug));
            }
            s += "  </url>\n";
        }
    }
    s + "</urlset>\n"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_language_has_its_texts() {
        let t = texts();
        for l in LANGS {
            assert!(t[l]["hero_tag"].as_str().is_some_and(|s| !s.is_empty()), "{l}");
        }
    }

    #[test]
    fn fills_only_empty_elements() {
        let t = json!({ "a": "Hello <b>", "b": "x" });
        let out = fill_texts(r#"<h2 data-i="a"></h2><p data-i="b">kept</p><i data-i="zz"></i>"#, &t);
        assert_eq!(out, r#"<h2 data-i="a">Hello &lt;b&gt;</h2><p data-i="b">kept</p><i data-i="zz"></i>"#);
    }

    #[test]
    fn russian_page_points_back_to_the_root_assets() {
        let page = crate::render_page(&serde_json::to_string(&crate::content::site()).unwrap(), true);
        let ru = localize(&page, "ru", &crate::content::site());
        assert!(ru.contains("<html lang=\"ru\" dir=\"ltr\" data-pre=\"ru\">"));
        assert!(ru.contains("<a href=\"#journey\">") && !ru.contains("<a href=\"#journey\"></a>"));
        assert!(ru.contains("<h3><a href=\"work/good-day/\">Good Day Cappuccino</a></h3>"));
        assert!(ru.contains("<h1 class=\"tag\" id=\"h1\">Видеопродакшн"));
        assert!(ru.contains("\"../static/app.js"));
        assert!(ru.contains(&format!("hreflang=\"ar\" href=\"{SITE_URL}ar/\"")));
        assert!(ru.contains(&format!("<link rel=\"canonical\" href=\"{SITE_URL}ru/\">")));
        assert!(!ru.contains("\"static/"));
        assert!(ru.contains("\"@type\":\"FAQPage\""));
        assert!(ru.contains("<div class=\"faq\" id=\"faqlist\"><details><summary>"));
        // structured data: one Organization with a logo, the films as a list, the opening film as a video
        assert!(ru.contains(&format!("\"@id\":\"{SITE_URL}#org\"")) && ru.contains("media/logo.png"));
        assert!(ru.contains("\"@type\":\"ItemList\"") && ru.contains("\"numberOfItems\":7"));
        assert!(ru.contains("\"@type\":\"VideoObject\"") && ru.contains("\"uploadDate\":") && ru.contains("\"duration\":\"PT0M45S\""));
        // only the Arabic page carries the Arabic fonts
        assert!(!ru.contains("Noto+Kufi+Arabic") && !ru.contains("__AR_FONTS__"));
        assert!(localize(&page, "ar", &crate::content::site()).contains("Noto+Kufi+Arabic"));
    }
}
