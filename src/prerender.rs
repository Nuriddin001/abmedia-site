//! The sections the script builds (manifesto, journey beats, films, fixes, reasons, process, planner,
//! next steps, contacts, nav labels, the hero line) written straight into each language's HTML, with
//! the same elements and classes app.js makes. A crawler that runs no JavaScript (Bing in part, AI
//! crawlers) reads every section; with JavaScript the script keeps or rebuilds the same nodes, so the
//! page looks and moves exactly as before.

use crate::content::SiteData;
use serde_json::Value;

fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}
fn s<'a>(v: &'a Value) -> &'a str {
    v.as_str().unwrap_or("")
}

/// Number formatting as `toLocaleString` does it for en-US, es-ES, ru-RU and ar-u-nu-latn.
pub fn fmt(n: f64, lang: &str) -> String {
    let n = n.round() as i64;
    let digits = n.abs().to_string();
    let sep = match lang { "es" => ".", "ru" => "\u{a0}", _ => "," };
    // es-ES leaves four-digit numbers ungrouped (1234, but 12.345)
    if lang == "es" && digits.len() <= 4 {
        return n.to_string();
    }
    let mut out = String::new();
    for (i, ch) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 { out += sep; }
        out.push(ch);
    }
    if n < 0 { format!("-{out}") } else { out }
}

/// `dec()` in app.js: one decimal, a comma outside English, no trailing ".0".
fn dec(x: f64, lang: &str) -> String {
    let r = (x * 10.0).round() / 10.0;
    let t = if r.fract() == 0.0 { format!("{}", r as i64) } else { format!("{r}") };
    if lang == "en" { t } else { t.replace('.', ",") }
}

/// `words()` in app.js: split on spaces; words inside *stars* are marked.
fn words(text: &str, marks: bool) -> Vec<(String, bool)> {
    // like the script: every word between a pair of stars gets a \u{1} prefix, then split on spaces
    let mut marked = String::new();
    let mut rest = text;
    while marks {
        let Some(a) = rest.find('*') else { break };
        let Some(b) = rest[a + 1..].find('*') else { break };
        marked += &rest[..a];
        marked += &rest[a + 1..a + 1 + b].split_whitespace().map(|w| format!("\u{1}{w}")).collect::<Vec<_>>().join(" ");
        rest = &rest[a + 2 + b..];
    }
    marked += rest;
    marked.split_whitespace().map(|w| (w.replacen('\u{1}', "", 1), w.starts_with('\u{1}'))).collect()
}

/// The keys of a small object in i18n.js in written order (serde_json sorts them; the script keeps them as written).
fn key_order(name: &str) -> Vec<String> {
    const I18N: &str = include_str!("../static/i18n.js");
    let pat = format!("\"{name}\": {{");
    let Some(a) = I18N.find(&pat) else { return vec![] };
    let body = &I18N[a + pat.len()..];
    let body = &body[..body.find('}').unwrap_or(0)];
    body.split(',').filter_map(|kv| kv.split(':').next()).map(|k| k.trim().trim_matches('"').to_string()).filter(|k| !k.is_empty()).collect()
}

/// `<picture>` with AVIF and WebP sources and the JPG as fallback (the files sit side by side in media/).
fn picture(name: &str, alt: &str, w: u32, h: u32) -> String {
    format!("<picture><source type=\"image/avif\" srcset=\"media/{name}.avif\"><source type=\"image/webp\" srcset=\"media/{name}.webp\"><img loading=\"lazy\" decoding=\"async\" width=\"{w}\" height=\"{h}\" alt=\"{}\" src=\"media/{name}.jpg\"></picture>", esc(alt))
}

fn icon(id: &str) -> String {
    format!("<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-{id}\"></use></svg>")
}

/// Fills the empty element that starts with `open` (`<tag ...>` exactly as in the template) with `inner`.
fn fill(html: &mut String, open: &str, close: &str, inner: &str) {
    let pat = format!("{open}{close}");
    assert!(html.contains(&pat), "template lost {open}");
    *html = html.replacen(&pat, &format!("{open}{inner}{close}"), 1);
}

pub fn sections(mut html: String, lang: &str, t: &Value, cases: &Value, site: &SiteData) -> String {
    // nav labels
    let nav = t["nav"].as_array().cloned().unwrap_or_default();
    for (i, href) in ["#journey", "#cases", "#how", "#faq"].iter().enumerate() {
        let a = format!("<a href=\"{href}\"></a>");
        html = html.replacen(&a, &format!("<a href=\"{href}\">{}</a>", esc(nav.get(i).map(s).unwrap_or(""))), 1);
    }

    // hero line (decorative: the H1 carries the words for search and screen readers)
    let mut line = String::new();
    for (li, ln) in s(&t["hero_line"]).split('\n').enumerate() {
        if li > 0 { line += "<br>"; }
        for (i, (w, _)) in words(ln, false).iter().enumerate() {
            if i > 0 { line.push(' '); }
            line += &format!("<span class=\"lw{}\">{}</span>", if li > 0 { " hl" } else { "" }, esc(w));
        }
    }
    fill(&mut html, "<p class=\"line\" id=\"line\" aria-hidden=\"true\">", "</p>", &line);

    // manifesto
    let mf: Vec<String> = words(s(&t["mf"]), true).iter().map(|(w, hl)| format!("<span class=\"w{}\">{}</span>", if *hl { " hl" } else { "" }, esc(w))).collect();
    fill(&mut html, "<p class=\"mf\" id=\"mf\">", "</p>", &mf.join(" "));

    // journey beats, with the model's numbers formatted as the script formats them
    let m = &site.cjm;
    let (n, f) = (m.now.map(|x| x as f64), m.film.map(|x| x as f64));
    let vars: Vec<(&str, String)> = vec![
        ("r0", fmt(n[0], lang)), ("r1", fmt(n[1], lang)), ("r2", fmt(n[2], lang)), ("r3", fmt(n[3], lang)),
        ("f1", fmt(f[1], lang)), ("f2", fmt(f[2], lang)), ("f3", fmt(f[3], lang)),
        ("lost1", fmt(n[0] - n[1], lang)), ("p2", ((1.0 - n[2] / n[1]) * 100.0).round().to_string()), ("x", dec(f[3] / n[3], lang)),
    ];
    let fill_vars = |text: &str| vars.iter().fold(text.to_string(), |acc, (k, v)| acc.replace(&format!("{{{k}}}"), v));
    let beats: String = t["s_steps"].as_array().unwrap().iter().map(|b| format!("<li><b>{}</b><p>{}</p></li>", esc(&fill_vars(s(&b[0]))), esc(&fill_vars(s(&b[1]))))).collect();
    fill(&mut html, "<ol class=\"beats\" id=\"beats\">", "</ol>", &beats);

    // films: the featured two first, then the rest (hidden behind "More films", as on screen)
    let list = cases.as_array().unwrap();
    let mut order: Vec<usize> = site.featured.iter().filter_map(|c| list.iter().position(|x| s(&x["client"]) == *c)).collect();
    order.extend((0..list.len()).filter(|i| !site.featured.contains(&s(&list[*i]["client"]))));
    let mut cards = String::new();
    for (k, &i) in order.iter().enumerate() {
        let c = &list[i];
        let (client, slug) = (s(&c["client"]), s(&c["video"]));
        let big = site.featured.contains(&client);
        let tc = match c["bts"]["dur"].as_str() { Some(b) => format!("{} + {b}", s(&c["dur"])), None => s(&c["dur"]).to_string() };
        let alt = s(&t["alt_still"]).replace("{c}", client);
        cards += &format!(
            "<article class=\"cc{}{}\"><button class=\"cc-media\" type=\"button\" data-cursor=\"play\" data-video=\"{slug}\" aria-label=\"{}: {}\">{}<video muted loop playsinline preload=\"none\"></video><span class=\"cc-n\">{:02}</span><span class=\"tc\">{}</span></button><div class=\"cc-head\"><div><h3><a href=\"work/{slug}/\">{}</a></h3><span class=\"cat\">{}</span></div></div></article>",
            if big { " big" } else { "" }, if k >= 2 { " extra" } else { "" },
            esc(s(&t["open_case"])), esc(client), picture(slug, &alt, 1280, 720), k + 1, esc(&tc), esc(client), esc(s(&t["cat"][client])),
        );
    }
    fill(&mut html, "<div class=\"track\" id=\"track\">", "</div>", &cards);
    fill(&mut html, "<span id=\"more-lbl\">", "</span>", &esc(s(&t["cs_more"])));
    fill(&mut html, "<b id=\"more-n\">", "</b>", &format!("+{}", list.len().saturating_sub(2)));
    let names: Vec<&str> = list.iter().map(|c| s(&c["client"])).collect();
    let run: String = (0..2).flat_map(|_| names.iter().map(|n| format!("<span>{}</span>", esc(n)))).collect();
    fill(&mut html, "<div class=\"run\" id=\"run\" aria-hidden=\"true\">", "</div>", &run);
    fill(&mut html, "<p class=\"sr\" id=\"run-sr\">", "</p>", &esc(&names.join(", ")));
    if let Some(first) = order.first() {
        let c = &list[*first];
        fill(&mut html, "<b id=\"reel-name\">", "</b>", &esc(s(&c["client"])));
        fill(&mut html, "<span id=\"reel-meta\">", "</span>", &esc(s(&c["dur"])));
    }

    // what we fix
    let fixes: String = t["fixes"].as_array().unwrap().iter().map(|p| format!("<li class=\"fx\"><span class=\"fx-old\">{}</span><span class=\"fx-new\">{}</span></li>", esc(s(&p[0])), esc(s(&p[1])))).collect();
    fill(&mut html, "<ol class=\"fixes\" id=\"fixlist\">", "</ol>", &fixes);

    // why Abror
    let reasons: String = t["why"].as_array().unwrap().iter().zip(["reel", "clap", "link", "target"]).map(|(h, ic)| format!("<li>{}<span>{}</span></li>", icon(ic), esc(s(h)))).collect();
    fill(&mut html, "<ul class=\"reasons rv-c\" id=\"reasons\">", "</ul>", &reasons);

    // process, in the first mode ("We run it")
    let modes = t["modes"].as_array().cloned().unwrap_or_default();
    for (i, m) in modes.iter().enumerate() {
        let b = format!("<button type=\"button\" data-m=\"{i}\"></button>");
        let pressed = if i == 0 { "true" } else { "false" };
        html = html.replacen(&b, &format!("<button type=\"button\" data-m=\"{i}\" aria-pressed=\"{pressed}\">{}</button>", esc(s(m))), 1);
    }
    fill(&mut html, "<p class=\"mode-d\" id=\"mode-d\">", "</p>", &esc(s(&t["mode_d"][0])));
    let steps: String = t["steps"].as_array().unwrap().iter().enumerate().map(|(i, st)| format!(
        "<li class=\"step\"><span class=\"n\">0{}</span><div class=\"step-t\"><h3>{}</h3><p>{}</p></div><span class=\"chip full\">{}</span></li>",
        i + 1, esc(s(&st[0])), esc(s(&st[1])), esc(s(&t["chip"]["full"])))).collect();
    fill(&mut html, "<ol class=\"steps\" id=\"steps\">", "</ol>", &steps);

    // planner questions (the answer panel is built by the script)
    let mut bq = String::new();
    for (gi, (key, chosen)) in [("goal", "trust"), ("have", "task"), ("dist", "yes")].iter().enumerate() {
        let opts = t[format!("b_{key}")].as_object().cloned().unwrap_or_default();
        let row: String = key_order(&format!("b_{key}")).into_iter().filter_map(|v| opts.get(&v).map(|l| (v, l))).map(|(v, label)| format!(
            "<input type=\"radio\" name=\"b-{key}\" id=\"b-{key}-{v}\" value=\"{v}\"{}><label for=\"b-{key}-{v}\">{}</label>",
            if v.as_str() == *chosen { " checked" } else { "" }, esc(s(label)))).collect();
        bq += &format!("<fieldset><legend><b>{}</b>{}</legend><div class=\"opts\">{row}</div></fieldset>", gi + 1, esc(s(&t["b_q"][gi])));
    }
    fill(&mut html, "<form class=\"bq\" id=\"bq\">", "</form>", &bq);

    // what happens after the request: three frames
    let shots = [
        ("portrait", 1024, 1024, t["name"].clone(), "scan", "READING"),
        ("abror-timessquare", 720, 1280, t["name"].clone(), "wave", "LIVE · 00:30:00"),
        ("sales-doctor-backstage", 1280, 720, t["alt_bts"].clone(), "grid", "CONCEPT v1"),
    ];
    let frames: String = t["nx"].as_array().unwrap().iter().zip(shots.iter()).enumerate().map(|(i, (title, (img, w, h, alt, kind, hud)))| format!(
        "<figure class=\"shot\">{}<span class=\"shot-fx {kind}\"></span><span class=\"shot-hud\"><i></i>{hud}</span><figcaption><b>{:02}</b><h3>{}</h3></figcaption></figure>",
        picture(img, s(alt), *w, *h), i + 1, esc(s(title)))).collect();
    let shots_open = "<div class=\"shots\" id=\"shots\"><i class=\"shots-line\" aria-hidden=\"true\"><i id=\"shots-fill\"></i></i>";
    assert!(html.contains(shots_open), "template lost #shots");
    html = html.replacen(shots_open, &format!("{shots_open}{frames}"), 1);

    // contacts: only the ones that exist in this language
    let c = &site.contacts;
    let pick = |p: &crate::content::PerLang| match lang { "es" => p.es, "ru" => p.ru, "ar" => p.ar, _ => p.en };
    let handle = |v: &str| {
        let v = v.trim_end_matches('/');
        match v.rsplit_once('/') { Some((_, h)) if v.starts_with("http") => format!("@{}", h.trim_start_matches('@')), _ => v.to_string() }
    };
    let ct = t["ct"].as_array().cloned().unwrap_or_default();
    let label = |i: usize, d: &str| ct.get(i).and_then(Value::as_str).unwrap_or(d).to_string();
    let mut contacts = String::new();
    contacts += &format!("<a class=\"ct\" href=\"tel:{}\"><span>{}</span><b>{}</b></a>", c.phone.chars().filter(|ch| ch.is_ascii_digit() || *ch == '+').collect::<String>(), esc(&label(0, "Phone")), esc(c.phone));
    for (v, i, d) in [(pick(&c.telegram), 1, "Telegram"), (pick(&c.instagram), 2, "Instagram"), (c.youtube, 4, "YouTube")] {
        if let Some(v) = v { contacts += &format!("<a class=\"ct\" href=\"{}\" target=\"_blank\" rel=\"noopener\"><span>{}</span><b>{}</b></a>", esc(v), esc(&label(i, d)), esc(&handle(v))); }
    }
    if let Some(m) = c.email { contacts += &format!("<a class=\"ct\" href=\"mailto:{m}\"><span>{}</span><b>{m}</b></a>", esc(&label(3, "Email"))); }
    fill(&mut html, "<div class=\"contacts\" id=\"contacts\">", "</div>", &contacts);
    html
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numbers_match_the_browser() {
        assert_eq!(fmt(100000.0, "en"), "100,000");
        assert_eq!(fmt(88000.0, "es"), "88.000");
        assert_eq!(fmt(3100.0, "es"), "3100");
        assert_eq!(fmt(12345.0, "ru"), "12\u{a0}345");
        assert_eq!(fmt(900.0, "ar"), "900");
        assert_eq!(dec(2.0, "ru"), "2");
        assert_eq!(dec(2.25, "es"), "2,3");
    }

    #[test]
    fn marked_words() {
        assert_eq!(words("*88 of 100* people", true), vec![("88".into(), true), ("of".into(), true), ("100".into(), true), ("people".into(), false)]);
    }
}
