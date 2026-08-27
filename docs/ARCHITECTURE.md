# ARCHITECTURE — Huella

Monorepo `apps/api` (NestJS) + `apps/web` (Angular 22 zoneless).

- Auth JWT (`JwtModule.registerAsync` + ConfigService) namespaced `huella_token`.
- Interceptor HTTP lee el token de `localStorage`, nunca inyecta `AuthService`.
- Hold 15 min con `expiresAt` servidor y sweeper 30 s.
- Aforo N por manada (`GROUP_FULL`) + patio cerrado (`YARD_CLOSED`).
- QR real (`qrcode`) con URL absoluta `/pase/:code`.
- Puntos: 10 por visita `picked_up`.
- TZ Europe/Madrid.
