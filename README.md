# Huella

Guardería canina de día (B2C). El tutor ficha al perro, reserva un hueco de manada y recoge con pase QR.

## Demo

- Tutor: `nora` / `nora@huella.test` / `Huella2026!`
- Staff: `staff` / `staff@huella.test` / `Huella2026!`

## Stack

Angular 22 (signals, zoneless) + NestJS 11 + TypeORM + SQLite (Neon-ready). Puerto API **3076**.

## QR real

`qrcode` en la API. Payload = `WEB_ORIGIN/pase/:code`. Confirmación y detalle usan `bypassSecurityTrustHtml`.

## Decision Record

- Tipo: B2C cliente final
- Login: panel lateral de marca
- QR real: sí | url: `/pase/:code`
- B2C anti-doble-reserva: user+perro+día → 409
