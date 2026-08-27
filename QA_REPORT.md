# QA Report — 2026-08-27 Huella

**Project:** Guardería canina de día (B2C) — ficha del perro, aforo N por manada, hold 15 min y pase QR de recogida
**Stack:** Angular 22 (zoneless/signals) + NestJS 11 + TypeORM + SQLite
**Author:** Hermes Daily Builder + QA

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc --incremental false` | PASS | dist/main.js |
| Web `ng build --configuration=production` | PASS | dist/web/browser/index.html, baseHref `/` |
| isFinalDesign | DESIGN_FREE | proyecto nuevo |

## ✅ 2. Test Results

19/19 Jest (huella.spec.ts) — ALL PASSED. +1 test SIZE_MISMATCH.

Incluye: login username/email, hold expiresAt ~15 min, ALREADY_HELD, DOG_NOT_READY, SIZE_MISMATCH, YARD_CLOSED, GROUP_FULL, QR real, ALREADY_BOOKED, sweeper, check-in/ALREADY_CHECKED_IN, PICKUP_DENIED + puntos, lista↔detalle, freeSlotsToday, stats 7 días, add-ons, reseña, pack, pase público.

## ✅ 3. Binary / Runtime Verification

| Mode | Output | Status |
|------|--------|--------|
| API :3076 | Huella API running | PASS |
| GET /api/health | `{ ok: true }` | PASS |
| Smoke endpoints | 26/26 | PASS |
| Browser Puppeteer | 14/14 rutas dinámicas | PASS |

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Capa de valor | PASS | Ficha sanitaria + aforo N + QR de autorización de salida |
| Totales lista ↔ detalle | PASS | 3000 = Σ BookingLine |
| freeSlotsToday home ↔ ficha | PASS | 8=8 |
| Gráfico ocupación | PASS | ejes + fechas MM-DD + `<title>` tooltips |
| QR real | PASS | qrcode SVG contiene `https://huella.proyectos.cristiancode.dev/pase/HUE-PUC7`; GET público 200 |
| Hold/TTL CTA | PASS | `#hold-action` + `humanConflict`; no códigos crudos |
| Auth antes de `**` | PASS | /login /entrar /registro /pase/:code |
| Token | PASS | `huella_token` + `accessToken`; interceptor sin AuthService |
| contraste-hover | PASS | `a:hover:not(.btn)`; btn-primary hover/focus/active usa on-primary. Light 7.17 / dark 4.75. Acento dark ajustado #B04F1F (5.27) |
| TZ Madrid | PASS | API `madridToday`; checkout `en-CA` Europe/Madrid |
| Fotos vertical | PASS | SVGs patio/perros, no gym/hielo |

### Minor Issues
| Issue | Severity | Suggestion |
|-------|----------|------------|
| `.env` del builder era copia de Gambito (puerto 3075) | fixed | PORT=3076 + WEB_ORIGIN huella |
| 409 talla usaba código `DOG_NOT_READY` (copy de vacunas) | fixed | `SIZE_MISMATCH` |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| JWT Bearer interceptor | PASS (`'Bearer ' + token`) |
| APP_GUARD global | ausente (público register/login) |
| me sin token | 401 |
| .env gitignored | PASS |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | DONE | huella.proyectos.cristiancode.dev → :3076 + dist/web/browser |
| manage-apis.sh | DONE | 3076 / huella / 2026-08-27-huella aligned 61 |
| GitHub | DONE | https://github.com/cristiancode-hermes/2026-08-27-huella README 200 |
| Landing | DONE | proyectos-cristiancode-dev index.html |
| Excel | DONE | row 93 |
| Portafolio | DONE | es/en/pt slug `huella` id 231 |
| Capture config | DONE | config.mjs + prod-capture huella_token |

Demo: `nora` / `nora@huella.test` / `Huella2026!` · staff: `staff@huella.test` / `Huella2026!`

## Summary

**OVERALL: PASS ✅**

QR real: sí | url: /pase/:code
contraste-hover: PASS (regla 2026-08-19)
