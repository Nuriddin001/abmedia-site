//! One page per film and language (/work/good-day/, /ru/work/good-day/ ...).
//! Google shows a video in search only from a page whose main content is that video,
//! so each film gets its own small page: the film, its brief and concept, the credits,
//! VideoObject data and a way back to the request form. All texts come from static/i18n.js.

use crate::seo::{page_url, LANGS, SITE_URL};
use serde_json::{json, Value};

const I18N: &str = include_str!("../static/i18n.js");
/// The day the films were first published on this site (first commit of media/*.mp4), Tashkent time.
const PUBLISHED: &str = "2026-11-16T00:00:00+05:00";

fn block(name: &str, open: &str, close: &str) -> Value {
    let start = I18N.find(&format!("const {name} = ")).expect("i18n.js block") + format!("const {name} = ").len();
    let end = start + I18N[start..].find(&format!("\n{close};")).expect("i18n.js block end") + 1 + close.len();
    assert!(I18N[start..].starts_with(open));
    serde_json::from_str(&I18N[start..end]).expect("i18n.js block is JSON")
}

pub struct Film {
    pub slug: String,
    data: Value,
}

pub fn films() -> Vec<Film> {
    block("CASES", "[", "]").as_array().unwrap().iter().map(|c| Film { slug: c["video"].as_str().unwrap().to_string(), data: c.clone() }).collect()
}

/// The films as written in i18n.js (for the cards on the main page).
pub fn cases_json() -> Value {
    block("CASES", "[", "]")
}

impl Film {
    pub fn client(&self) -> &str {
        self.data["client"].as_str().unwrap_or(&self.slug)
    }
}

/// VideoObject for one film in one language (used on the film's own page and for the opening film on the main page).
pub fn video_ld(lang: &str, film: &Film) -> Value {
    let c = &film.data;
    let client = film.client();
    let tt = &c["t"][lang];
    let (task, concept) = (tt[0].as_str().unwrap_or(""), tt[1].as_str().unwrap_or(""));
    json!({
        "@context": "https://schema.org", "@type": "VideoObject",
        "@id": format!("{}#video", film_url(lang, &film.slug)),
        "name": format!("{client} — {}", kind(lang)), "description": format!("{concept} {task}"),
        "thumbnailUrl": [format!("{SITE_URL}media/{}.jpg", film.slug), format!("{SITE_URL}media/{}.webp", film.slug)],
        "contentUrl": format!("{SITE_URL}media/{}.mp4", film.slug),
        "embedUrl": film_url(lang, &film.slug),
        "uploadDate": PUBLISHED, "duration": iso_duration(c["dur"].as_str().unwrap_or("")),
        "inLanguage": lang, "productionCompany": { "@type": "Organization", "name": c["exec"] },
        "creator": { "@id": crate::seo::org_id() }
    })
}

pub fn film_url(lang: &str, slug: &str) -> String {
    format!("{}work/{slug}/", page_url(lang))
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn kind(lang: &str) -> &'static str {
    match lang { "es" => "vídeo de marca", "ru" => "рекламный ролик", "ar" => "فيلم إعلاني", _ => "brand film" }
}

fn iso_duration(d: &str) -> String {
    let (m, s) = d.split_once(':').unwrap_or(("0", d));
    format!("PT{}M{}S", m.trim_start_matches('0').parse::<u32>().unwrap_or(0), s.parse::<u32>().unwrap_or(0))
}

fn people(ids: &Value, p: &Value, lang: &str) -> String {
    let sep = if lang == "ar" { "، " } else { ", " };
    ids.as_array().unwrap().iter().filter_map(Value::as_str).map(|id| p[id][lang].as_str().or(p[id]["en"].as_str()).unwrap_or(id).to_string()).collect::<Vec<_>>().join(sep)
}

/// The links under the footer of the main page: every film, in that page's language.
pub fn footer_links(lang: &str) -> String {
    let l = block("L", "{", "}");
    let label = l[lang]["cs_eb"].as_str().unwrap_or("Work");
    let links: String = films().iter().map(|f| format!("<a href=\"work/{}/\">{}</a>", f.slug, esc(f.data["client"].as_str().unwrap()))).collect();
    format!("<nav class=\"films-nav\" aria-label=\"{}\"><span>{}</span>{links}</nav>", esc(label), esc(label))
}

pub fn page(lang: &str, film: &Film, phone: &str) -> String {
    let l = block("L", "{", "}");
    let p = block("P", "{", "}");
    let t = &l[lang];
    let c = &film.data;
    let client = c["client"].as_str().unwrap();
    let tt = &c["t"][lang];
    let (task, concept) = (tt[0].as_str().unwrap_or(""), tt[1].as_str().unwrap_or(""));
    let dur = c["dur"].as_str().unwrap_or("");
    let up = if lang == "en" { "../../" } else { "../../../" };
    let home = if lang == "en" { "../../" } else { "../../" };
    let dir = if lang == "ar" { "rtl" } else { "ltr" };
    let title = format!("{client} — {} | AB Media", kind(lang));
    let mut desc = format!("{concept} {task}");
    if desc.chars().count() > 158 { desc = desc.chars().take(155).collect::<String>() + "…"; }
    let url = film_url(lang, &film.slug);
    let thumb = format!("{SITE_URL}media/{}.jpg", film.slug);
    let video = format!("{SITE_URL}media/{}.mp4", film.slug);

    let mut head = String::new();
    head += &format!("<title>{}</title>\n<meta name=\"description\" content=\"{}\">\n<link rel=\"canonical\" href=\"{url}\">\n", esc(&title), esc(&desc));
    for a in LANGS { head += &format!("<link rel=\"alternate\" hreflang=\"{a}\" href=\"{}\">\n", film_url(a, &film.slug)); }
    head += &format!("<link rel=\"alternate\" hreflang=\"x-default\" href=\"{}\">\n", film_url("en", &film.slug));
    head += &format!("<meta property=\"og:type\" content=\"video.other\">\n<meta property=\"og:site_name\" content=\"AB Media\">\n<meta property=\"og:url\" content=\"{url}\">\n<meta property=\"og:title\" content=\"{}\">\n<meta property=\"og:description\" content=\"{}\">\n<meta property=\"og:image\" content=\"{thumb}\">\n<meta property=\"og:video\" content=\"{video}\">\n<meta property=\"og:video:type\" content=\"video/mp4\">\n<meta name=\"twitter:card\" content=\"summary_large_image\">\n", esc(&title), esc(&desc));
    let ld = json!([
        video_ld(lang, film),
        {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "AB Media", "item": page_url(lang) },
                { "@type": "ListItem", "position": 2, "name": t["cs_eb"].as_str().unwrap_or("Work"), "item": format!("{}#cases", page_url(lang)) },
                { "@type": "ListItem", "position": 3, "name": client, "item": url }
            ]
        }
    ]);
    head += &format!("<script type=\"application/ld+json\">{}</script>\n", ld.to_string().replace("</", "<\\/"));

    let langs: String = LANGS.iter().map(|a| {
        let href = if *a == lang { String::new() } else { format!("{up}{}work/{}/", if *a == "en" { String::new() } else { format!("{a}/") }, film.slug) };
        if href.is_empty() { format!("<b>{}</b>", a.to_uppercase()) } else { format!("<a href=\"{href}\" hreflang=\"{a}\">{}</a>", a.to_uppercase()) }
    }).collect();
    let scope: String = c["scope"].as_array().unwrap().iter().filter_map(Value::as_str).map(|k| format!("<span>{}</span>", esc(t["sc"][k].as_str().unwrap_or(k)))).collect();
    let credits: String = c["credits"].as_array().unwrap().iter().map(|cr| format!("<div><span>{}</span><b>{}</b></div>", esc(t[cr[0].as_str().unwrap()].as_str().unwrap_or("")), esc(&people(&cr[1], &p, lang)))).collect();
    let bts = c["bts"]["video"].as_str().map(|b| format!(
        "<h2>{}</h2><video controls playsinline preload=\"none\" poster=\"{up}media/{b}.jpg\" src=\"{up}media/{b}.mp4\"></video>",
        esc(t["v_bts"].as_str().unwrap_or("Backstage")))).unwrap_or_default();
    let others: String = films().iter().filter(|f| f.slug != film.slug).map(|f| format!("<a href=\"../{}/\">{}</a>", f.slug, esc(f.data["client"].as_str().unwrap()))).collect();

    format!(r##"<!doctype html>
<html lang="{lang}" dir="{dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
{head}<meta name="theme-color" content="#0B0D0F">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230B0D0F'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%23E5484D'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600&family=Manrope:wght@400;600;700&family=JetBrains+Mono:wght@500&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap">
<style>
:root{{--night:#0B0D0F;--night-2:#111417;--edge:rgba(226,234,236,.12);--snow:#EDF1F1;--mist:#8F9AA0;--tungsten:#F4A62A;--rec:#E5483C;--pad:max(16px,min(5vw,48px))}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--night);color:var(--snow);font:400 1rem/1.65 "Manrope",system-ui,sans-serif}}
[dir=rtl] body{{font-family:"IBM Plex Sans Arabic",system-ui,sans-serif}}
a{{color:inherit}}.wrap{{width:min(1040px,100%);margin:0 auto;padding:0 var(--pad)}}
header{{position:sticky;top:0;z-index:2;background:rgba(11,13,15,.9);border-bottom:1px solid var(--edge)}}
header .wrap{{display:flex;align-items:center;gap:16px;min-height:60px;flex-wrap:wrap}}
.logo{{font:600 .95rem "Unbounded",sans-serif;text-decoration:none;letter-spacing:.02em;display:flex;align-items:center;gap:8px}}
.logo i{{width:8px;height:8px;border-radius:50%;background:var(--rec)}}
.langs{{margin-inline-start:auto;display:flex;gap:4px;font:500 .72rem "JetBrains Mono",monospace}}
.langs a,.langs b{{padding:5px 8px;border-radius:6px;text-decoration:none}}.langs b{{background:var(--snow);color:var(--night)}}.langs a{{color:var(--mist)}}
.eb{{font:500 .72rem "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--tungsten);margin:48px 0 8px}}
h1{{font:600 clamp(2rem,6vw,3.6rem)/1.05 "Unbounded",sans-serif;margin:0 0 6px;letter-spacing:-.01em}}
[dir=rtl] h1,[dir=rtl] h2{{font-family:"IBM Plex Sans Arabic",sans-serif}}
[dir=rtl] .eb,[dir=rtl] dt,[dir=rtl] .meta{{letter-spacing:0;font-family:"IBM Plex Sans Arabic",sans-serif;font-size:.85rem}}
.meta{{font:500 .8rem "JetBrains Mono",monospace;color:var(--mist);margin:0 0 24px}}
video{{width:100%;aspect-ratio:16/9;background:#000;border-radius:14px;display:block}}
.concept{{font-size:clamp(1.15rem,2.4vw,1.5rem);line-height:1.45;margin:28px 0}}
dl{{display:grid;gap:18px;margin:0 0 40px;padding:24px;border:1px solid var(--edge);border-radius:14px;background:var(--night-2)}}
dt{{font:500 .7rem "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--mist);margin-bottom:4px}}dd{{margin:0}}
.sl{{display:flex;flex-wrap:wrap;gap:6px}}.sl span{{border:1px solid var(--edge);border-radius:99px;padding:2px 10px;font-size:.88rem}}
.cr div{{display:flex;gap:12px;justify-content:space-between;border-bottom:1px solid var(--edge);padding:6px 0}}.cr span{{color:var(--mist)}}
h2{{font:600 1.2rem "Unbounded",sans-serif;margin:40px 0 14px}}
.cta{{display:inline-block;margin:8px 0 48px;background:var(--tungsten);color:#111;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:12px}}
.more{{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:64px}}.more a{{border:1px solid var(--edge);border-radius:99px;padding:6px 14px;text-decoration:none;color:var(--mist)}}.more a:hover{{color:var(--snow)}}
footer{{border-top:1px solid var(--edge);color:var(--mist);font-size:.85rem;padding:28px 0 40px}}
</style>
</head>
<body>
<header><div class="wrap"><a class="logo" href="{home}"><i></i>AB MEDIA</a><nav class="langs" aria-label="Language">{langs}</nav></div></header>
<main class="wrap">
<p class="eb">{cs_eb}</p>
<h1>{client_e}</h1>
<p class="meta">{kind} · {dur} · {exec_e}</p>
<video controls playsinline preload="metadata" poster="{up}media/{slug}.jpg" src="{up}media/{slug}.mp4"></video>
<p class="concept">{concept_e}</p>
<dl>
<div><dt>{l_exec}</dt><dd>{exec_e}</dd></div>
<div><dt>{l_task}</dt><dd>{task_e}</dd></div>
<div><dt>{l_scope}</dt><dd class="sl">{scope}</dd></div>
<div><dt>{l_team}</dt><dd class="cr">{credits}</dd></div>
</dl>
{bts}
<h2>{rq_h}</h2>
<a class="cta" href="{home}#request">{cta}</a>
<h2>{cs_h}</h2>
<nav class="more">{others}</nav>
</main>
<footer><div class="wrap">© 2026 AB Media · {name} · <a href="tel:{tel}" dir="ltr">{phone}</a></div></footer>
</body>
</html>
"##,
        cs_eb = esc(t["cs_eb"].as_str().unwrap_or("")), client_e = esc(client), kind = esc(kind(lang)), exec_e = esc(c["exec"].as_str().unwrap_or("")),
        slug = film.slug, concept_e = esc(concept), task_e = esc(task),
        l_exec = esc(t["l_exec"].as_str().unwrap_or("")), l_task = esc(t["l_task"].as_str().unwrap_or("")),
        l_scope = esc(t["l_scope"].as_str().unwrap_or("")), l_team = esc(t["l_team"].as_str().unwrap_or("")),
        rq_h = esc(t["rq_h"].as_str().unwrap_or("")), cta = esc(t["hero_cta"].as_str().unwrap_or("")), cs_h = esc(t["cs_h"].as_str().unwrap_or("")),
        name = esc(t["name"].as_str().unwrap_or("")), tel = phone.replace(' ', ""),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_film_has_a_page_in_every_language() {
        let fs = films();
        assert!(fs.len() >= 7);
        for f in &fs {
            for l in LANGS {
                let html = page(l, f, "+1 929 652 4542");
                assert!(html.contains("\"@type\":\"VideoObject\"") && html.contains("\"position\":3"), "{l} {}", f.slug);
                assert!(html.contains(&format!("src=\"{}media/{}.mp4\"", if l == "en" { "../../" } else { "../../../" }, f.slug)));
                assert!(!html.contains("{{"));
            }
        }
        assert_eq!(iso_duration("1:50"), "PT1M50S");
        assert_eq!(iso_duration("0:33"), "PT0M33S");
    }
}
