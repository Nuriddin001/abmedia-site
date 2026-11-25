//! AB Media landing page server.
//!
//!   GET  /            the page, with the numbers from `content.rs` injected
//!   GET  /api/site    the same numbers as JSON
//!   POST /api/leads   form requests, stored in data/leads.jsonl
//!   GET  /static/*    css, js
//!   GET  /media/*     film posters and videos (range requests supported)
//!
//! Environment: HOST (default 127.0.0.1), PORT (default 8080),
//! SITE_ROOT (folder with templates/, static/, media/; default: the crate folder).

mod config;
mod content;
mod leads;
mod films;
mod film_copy;
mod prerender;
mod seo;

use axum::{
    extract::{ConnectInfo, State},
    http::{header, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use std::{net::SocketAddr, path::PathBuf, sync::Arc};
use tower_http::{compression::CompressionLayer, services::ServeDir, set_header::SetResponseHeaderLayer};

const TEMPLATE: &str = include_str!("../templates/index.html");
const DATA_SLOT: &str = "/*__SITE_DATA__*/null";

struct AppState {
    page: String,
    site_json: String,
    leads: leads::LeadStore,
}

const PREVIEW_SLOT: &str = "/*__PREVIEW__*/false";

/// `preview` is for the static export: there is no server behind it, so the form only shows its success state.
fn render_page(site_json: &str, preview: bool) -> String {
    assert!(TEMPLATE.contains(DATA_SLOT), "templates/index.html lost its data slot");
    // Keep the JSON from closing the <script> tag it sits in.
    let safe = site_json.replace("</", "<\\/");
    bust_cache(&TEMPLATE.replacen(DATA_SLOT, &safe, 1).replacen(PREVIEW_SLOT, if preview { "true" } else { "false" }, 1))
}

/// Adds `?v=<hash of the file>` to every local script and stylesheet link, so a browser
/// that cached an older copy fetches the new one as soon as the file changes.
fn bust_cache(html: &str) -> String {
    use std::hash::{Hash, Hasher};
    let mut out = html.to_string();
    for file in ["static/style.css", "static/i18n.js", "static/motion.js", "static/app.js"] {
        let Ok(bytes) = std::fs::read(file) else { continue };
        let mut h = std::collections::hash_map::DefaultHasher::new();
        bytes.hash(&mut h);
        out = out.replace(&format!("\"{file}\""), &format!("\"{file}?v={:08x}\"", h.finish() as u32));
    }
    out
}

async fn index(State(st): State<Arc<AppState>>) -> Response {
    ([(header::CACHE_CONTROL, "no-cache")], Html(st.page.clone())).into_response()
}

async fn site_api(State(st): State<Arc<AppState>>) -> Response {
    ([(header::CONTENT_TYPE, "application/json")], st.site_json.clone()).into_response()
}

async fn create_lead(
    State(st): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(lead): Json<leads::LeadIn>,
) -> Response {
    use leads::LeadError::*;
    match st.leads.submit(addr.ip(), lead).await {
        Ok(()) => (StatusCode::CREATED, Json(json!({ "ok": true }))).into_response(),
        Err(Invalid(field)) => {
            (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({ "ok": false, "field": field }))).into_response()
        }
        Err(RateLimited) => (StatusCode::TOO_MANY_REQUESTS, Json(json!({ "ok": false, "error": "rate" }))).into_response(),
        Err(Storage) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "ok": false }))).into_response(),
    }
}

#[tokio::main]
async fn main() {
    let root = std::env::var("SITE_ROOT").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")));
    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".into());
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080);

    let site_json = serde_json::to_string(&content::site()).expect("site data serialises");

    // `cargo run --release -- export` writes a ready index.html next to static/ and media/,
    // so the folder can be served as plain files (Vercel, GitHub Pages) without this server.
    // One page per language (/, /es/, /ru/, /ar/) plus sitemap.xml, for search engines.
    if std::env::args().any(|a| a == "export") {
        let site = content::site();
        let page = render_page(&site_json, true);
        for lang in seo::LANGS {
            let dir = if lang == "en" { root.clone() } else { root.join(lang) };
            std::fs::create_dir_all(&dir).expect("language folder");
            std::fs::write(dir.join("index.html"), seo::localize(&page, lang, &site)).expect("write index.html");
            for film in films::films() {
                let fdir = dir.join("work").join(&film.slug);
                std::fs::create_dir_all(&fdir).expect("film folder");
                std::fs::write(fdir.join("index.html"), films::page(lang, &film, site.contacts.phone)).expect("write film page");
            }
        }
        std::fs::write(root.join("sitemap.xml"), seo::sitemap()).expect("write sitemap.xml");
        std::fs::write(root.join("404.html"), seo::not_found()).expect("write 404.html");
        // robots.txt and CNAME only mean something at the root of an own domain (see config.rs, DOMAIN.md)
        if config::at_domain_root() {
            std::fs::write(root.join("robots.txt"), config::robots_txt()).expect("write robots.txt");
            std::fs::write(root.join("CNAME"), format!("{}
", config::host())).expect("write CNAME");
        }
        println!("static site written to {} (en, es, ru, ar, a page per film + sitemap.xml)", root.display());
        return;
    }

    let page = seo::localize(&render_page(&site_json, false), "en", &content::site());
    let state = Arc::new(AppState {
        page,
        site_json,
        leads: leads::LeadStore::new(root.join("data").join("leads.jsonl")),
    });

    // Text is compressed; videos are not, so range requests keep working.
    let app = Router::new()
        .route("/", get(index))
        .route("/api/site", get(site_api))
        .route("/api/leads", post(create_lead))
        .route("/healthz", get(|| async { "ok" }))
        // Browsers must recheck css/js on every visit (unchanged files come back as 304),
        // so a site update is never hidden behind a stale cached script.
        .nest_service(
            "/static",
            tower::ServiceBuilder::new()
                .layer(SetResponseHeaderLayer::overriding(header::CACHE_CONTROL, header::HeaderValue::from_static("no-cache")))
                .service(ServeDir::new(root.join("static"))),
        )
        .layer(CompressionLayer::new())
        .nest_service("/media", ServeDir::new(root.join("media")))
        .with_state(state);

    let addr: SocketAddr = format!("{host}:{port}").parse().expect("HOST:PORT");
    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    println!("AB Media site: http://{addr}");
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .expect("server");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn page_gets_the_data() {
        let json = serde_json::to_string(&content::site()).unwrap();
        let page = render_page(&json, false);
        assert!(!page.contains(DATA_SLOT));
        assert!(page.contains("\"featured\":"));
        assert!(page.contains("window.ABM_PREVIEW = false"));
        assert!(render_page(&json, true).contains("window.ABM_PREVIEW = true"));
    }

    #[test]
    fn script_close_is_escaped() {
        let page = render_page(r#"{"x":"</script><b>"}"#, false);
        assert!(!page.contains(r#""</script><b>""#));
    }
}
