//! Where the site lives. This is the only place the public address is written.
//!
//! Moving to an own domain is one line: set `SITE_URL` to "https://{DOMAIN}/" and run the export.
//! Canonical links, hreflang, Open Graph, JSON-LD, the sitemap and the 404 page all follow it, and
//! the export then also writes `CNAME` (GitHub Pages) and `robots.txt` (both only work at a domain root).
//! Steps for the owner: DOMAIN.md.

// TODO(owner): the own domain, for example "https://abmedia.studio/" (see DOMAIN.md)
pub const SITE_URL: &str = "https://nuriddin001.github.io/abmedia-site/";

/// The path part of the address: "/abmedia-site/" on github.io, "/" on an own domain.
pub fn base_path() -> &'static str {
    let after_scheme = SITE_URL.split_once("://").map(|(_, r)| r).unwrap_or(SITE_URL);
    after_scheme.find('/').map(|i| &after_scheme[i..]).unwrap_or("/")
}

/// The host name, for the GitHub Pages CNAME file.
pub fn host() -> &'static str {
    let after_scheme = SITE_URL.split_once("://").map(|(_, r)| r).unwrap_or(SITE_URL);
    after_scheme.split('/').next().unwrap_or(after_scheme)
}

/// True once the site is served from the root of its own domain (robots.txt and CNAME then make sense).
pub fn at_domain_root() -> bool {
    base_path() == "/" && !host().ends_with(".github.io")
}

pub fn robots_txt() -> String {
    format!("User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}sitemap.xml\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn address_parts() {
        assert!(SITE_URL.starts_with("https://") && SITE_URL.ends_with('/'));
        assert!(base_path().starts_with('/') && base_path().ends_with('/'));
        assert!(!host().is_empty() && !host().contains('/'));
        assert!(robots_txt().contains(&format!("Sitemap: {SITE_URL}sitemap.xml")));
    }
}
