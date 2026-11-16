# AB Media — brand film landing page (Rust)

Axum server that serves the landing page, injects the numbers from `src/content.rs`
into it, and stores form requests in `data/leads.jsonl`.

## Run

```bash
cargo run --release
```

Open http://127.0.0.1:8080. Environment: `HOST` (default `127.0.0.1`, use `0.0.0.0` on a server),
`PORT` (default `8080`), `SITE_ROOT` (folder with `static/` and `media/`; default is this folder).

Tests: `cargo test` (validation, rate limit, storage, funnel model, data injection).

## Where things are

| What | File |
|---|---|
| Numbers, contacts, case results, customer-journey model | `src/content.rs` (rebuild after editing) |
| Form API: validation, honeypot, 5 requests / 10 min per IP | `src/leads.rs` |
| Routes | `src/main.rs` |
| Page structure | `templates/index.html` (compiled into the binary) |
| Texts in EN / ES / RU / AR (Arabic is right-to-left), cases | `static/i18n.js` (served live, no rebuild) |
| Page logic: reel montage, journey story, calculator, planner, films, form | `static/app.js` |
| Scroll scenes (GSAP + ScrollTrigger + Lenis, no 3D): intro slate, fly-through sky of screens, manifesto, snapping journey, live ads-vs-film chart, horizontal films, timeline | `static/motion.js` |
| Films and posters | `media/` |

## Before going live

Every value marked `TAXMINIY` in `src/content.rs` is an estimate: project count, years,
views, case results, contacts and the journey model. Replace them with real figures.

## Windows build note

`Cargo.lock` pins tokio 1.43 / mio 1.0 / socket2 0.5 / hyper 1.6. Newer versions pull
`windows-sys 0.61`, which the plain `x86_64-pc-windows-gnu` toolchain cannot link without
an extra assembler. Don't run a blanket `cargo update` on this machine. On Linux or with
the MSVC toolchain this does not matter.
