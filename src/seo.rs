//! Search engines: one page per language (/, /es/, /ru/, /ar/), each with its own
//! title, description, hreflang links, social preview and structured data, and with
//! the plain texts already in the HTML, so a crawler that runs no JavaScript still reads them.

use crate::content::SiteData;
use serde_json::{json, Value};

/// The public address of the site (GitHub Pages). Canonical links, hreflang and the sitemap use it.
pub const SITE_URL: &str = "https://nuriddin001.github.io/abmedia-site/";
pub const LANGS: [&str; 4] = ["en", "es", "ru", "ar"];

const I18N: &str = include_str!("../static/i18n.js");
const HEAD_SLOT: &str = "<!--__SEO_HEAD__-->";

struct Meta {
    title: &'static str,
    description: &'static str,
    locale: &'static str,
}

fn meta(lang: &str) -> Meta {
    match lang {
        "es" => Meta {
            title: "AB Media — Productora de vídeo corporativo y storytelling de marca",
            description: "Productora de vídeo para empresas: spots publicitarios, vídeo corporativo y storytelling de marca con campañas go-to-market. Good Day, Sales Doctor Academy, IMZO. Auditoría de negocio gratis.",
            locale: "es_ES",
        },
        "ru" => Meta {
            title: "AB Media — видеопродакшн для бизнеса: имиджевые и рекламные ролики",
            description: "Видеопродакшн полного цикла для бизнеса: имиджевые и рекламные ролики, сторителлинг и go-to-market кампании. Good Day, Sales Doctor Academy, IMZO. Бесплатный аудит бизнеса.",
            locale: "ru_RU",
        },
        "ar" => Meta {
            title: "AB Media — شركة إنتاج فيديوهات وإعلانات تجارية بأسلوب سرد القصص",
            description: "شركة إنتاج فيديوهات للشركات: تصوير إعلانات تجارية احترافية وفيديو تعريفي للشركة وسرد قصص العلامة التجارية مع حملات دخول السوق. تدقيق مجاني لعملك.",
            locale: "ar_AR",
        },
        _ => Meta {
            title: "AB Media — Storytelling Video Production & Brand Films",
            description: "Storytelling video production company: brand films, commercials and go-to-market campaigns that make customers know and trust you. Good Day, Sales Doctor Academy, IMZO. Free business audit.",
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
    let org = json!({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "AB Media",
        "url": SITE_URL,
        "image": image,
        "description": m.description,
        "telephone": c.phone.replace(' ', ""),
        "founder": { "@type": "Person", "name": "Abror Bakhtiyarovich" },
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
        "publisher": { "@type": "Organization", "name": "AB Media", "url": SITE_URL }
    });
    for v in [org, page] {
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
        .replacen("<h1 class=\"sr\" id=\"h1\"></h1>", &format!("<h1 class=\"sr\" id=\"h1\">{}</h1>", esc(t["hero_tag"].as_str().unwrap_or(""))), 1);
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
        assert!(ru.contains("<html lang=\"ru\" dir=\"ltr\">"));
        assert!(ru.contains("\"../static/app.js"));
        assert!(ru.contains("hreflang=\"ar\" href=\"https://nuriddin001.github.io/abmedia-site/ar/\""));
        assert!(ru.contains("<link rel=\"canonical\" href=\"https://nuriddin001.github.io/abmedia-site/ru/\">"));
        assert!(!ru.contains("\"static/"));
        assert!(ru.contains("\"@type\":\"FAQPage\""));
        assert!(ru.contains("<div class=\"faq\" id=\"faqlist\"><details><summary>"));
    }
}
