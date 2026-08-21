# Foilio

App de coaching para deportistas de kitesurf y wing foil: sube un video de tu
sesión, se analiza pose/biomecánica/movimiento, se detectan errores técnicos,
se compara contra tus sesiones anteriores o contra un video de referencia, y
un entrenador IA (Claude) genera un plan de mejora. Incluye reportes en
PDF/Excel, gestión de escuelas/grupos, y planes de suscripción vía Stripe.

Tres proyectos en este repo:

```
foilio/
├── api/      # Express + TypeScript + Prisma/PostgreSQL
├── web/      # Next.js (App Router)
└── mobile/   # Expo / React Native
```

> Progreso documentado por fases. Esta portada cubre instalación y
> arquitectura general; las fichas de entrega detalladas de las primeras
> fases están en `/docs`:
> - [Fase 2 — Carga de Videos](docs/FASE-2.md)
> - [Fase 3 — Visión por Computador (detección de pose)](docs/FASE-3.md)
> - [Fase 4 — Biomecánica](docs/FASE-4.md)
>
> Las fases posteriores (movimiento, errores, comparaciones, entrenador IA,
> reportes, escuelas, suscripciones) ya están implementadas en el código
> (ver `api/src/modules/`) pero todavía no tienen ficha individual en `/docs`.

---

## 1. Arquitectura y por qué

```
Cliente (web/mobile)
   │  usa el SDK de Firebase Auth directamente
   ▼
Firebase Authentication   ← dueño de credenciales, contraseñas, reseteo, OAuth
   │  emite un idToken (JWT firmado por Google)
   ▼
Backend (Express)
   │  verifica el idToken con firebase-admin (nunca confía en el UID sin verificar)
   ▼
PostgreSQL (vía Prisma)   ← perfiles, roles, videos, análisis, suscripciones
   │
   ├── Supabase Storage   ← almacenamiento de los videos subidos
   ├── Anthropic API      ← genera el plan del entrenador IA
   └── Stripe             ← checkout y webhooks de suscripción
```

**Por qué así:** Firebase resuelve registro, login, reseteo de contraseña y
login social de forma segura y probada — reimplementar eso a mano (bcrypt,
JWT propios, envío de correos) sería duplicar trabajo y superficie de
errores de seguridad. El backend solo hace lo que Firebase no hace: guardar
el perfil deportivo, los videos/análisis, y decidir permisos por rol.

Patrón usado en el backend: **Controller → Service → Repository**, con DTOs
validados por Zod antes de llegar al Service. Esto permite cambiar de
PostgreSQL/Prisma sin tocar los controllers.

## 2. Estructura de carpetas

```
foilio/
├── api/
│   ├── prisma/
│   │   ├── schema.prisma      # User, Video, Biomechanics, Subscription, etc.
│   │   └── seed.ts            # crea los 5 roles por defecto
│   ├── src/
│   │   ├── config/            # env.ts, firebase.ts, supabase.ts
│   │   ├── middlewares/       # auth, role, validate, error, rateLimit
│   │   ├── modules/
│   │   │   ├── users/         # perfil deportivo
│   │   │   ├── roles/         # asignación de roles (solo Admin)
│   │   │   ├── videos/        # subida (URLs firmadas de Supabase)
│   │   │   ├── pose/          # landmarks de MediaPipe
│   │   │   ├── biomechanics/  # ángulos y métricas derivadas de la pose
│   │   │   ├── movement/      # segmentación de maniobras
│   │   │   ├── errors/        # detección automática de errores técnicos
│   │   │   ├── comparisons/   # SELF_PREVIOUS / PROFESSIONAL / TRAINER
│   │   │   ├── coach/         # plan generado con la API de Anthropic
│   │   │   ├── dashboard/     # resumen de progreso
│   │   │   ├── injuries/      # registro manual de lesiones
│   │   │   ├── reports/       # PDF/Excel + envío por correo
│   │   │   ├── schools/       # grupos, entrenadores, ranking
│   │   │   └── subscriptions/ # planes, checkout y webhooks de Stripe
│   │   ├── shared/            # prisma client, errores, apiResponse
│   │   ├── app.ts
│   │   └── server.ts
│   ├── docker-compose.yml     # levanta PostgreSQL local
│   └── .env.example
├── web/                        # Next.js: auth + perfil + videos + análisis + escuelas + suscripción
│   ├── app/
│   ├── context/AuthContext.tsx
│   ├── hooks/useRequireAuth.ts
│   └── lib/{firebase.ts, api.ts, supabaseClient.ts}
└── mobile/                     # Expo: mismas pantallas + navegación nativa
    ├── App.tsx
    ├── eas.json                # perfiles de build (development/preview/production)
    └── src/{screens, api, context, firebase, navigation, supabase, theme}
```

## 3. Requisitos previos

- **Node.js 20+** y npm.
- **Docker** (para levantar PostgreSQL local) — o un PostgreSQL propio.
- Cuentas gratuitas en:
  - [Firebase](https://console.firebase.google.com) — autenticación (obligatorio).
  - [Supabase](https://supabase.com) — almacenamiento de videos (obligatorio para subir videos).
  - [Anthropic Console](https://console.anthropic.com) — entrenador IA (obligatorio para esa función; el resto de la app funciona sin ella).
  - [Stripe](https://dashboard.stripe.com) — suscripciones (opcional; sin esto los endpoints de pago responden 503).
- Para mobile: [Expo Go](https://expo.dev/go) en tu teléfono (desarrollo) o la app [EAS CLI](https://docs.expo.dev/eas/) (`npm i -g eas-cli`) para builds de producción.

## 4. Backend (`api/`) — cómo levantarlo

```bash
cd api
cp .env.example .env
docker compose up -d        # levanta PostgreSQL en localhost:5432
npm install
npx prisma migrate dev --name init
npx prisma db seed          # crea los 5 roles por defecto (ATHLETE, TRAINER, SCHOOL, ADMIN...)
npm run dev                 # http://localhost:4000
```

Variables de entorno (`api/.env`) — las obligatorias hacen que el servidor
falle al arrancar si faltan (`env.ts` las valida con `required()`):

| Variable | Obligatoria | De dónde sale |
|---|---|---|
| `DATABASE_URL` | Sí | La define `docker-compose.yml` (o tu propio Postgres) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Sí | Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada (descarga un JSON con estos 3 campos) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Sí | Supabase → Project Settings → API. La Service Role Key **nunca** se comparte con el cliente |
| `ANTHROPIC_API_KEY` | Sí | console.anthropic.com → API Keys |
| `SUPABASE_VIDEOS_BUCKET` | No (default `videos`) | Crea ese bucket en Supabase Storage antes de subir un video |
| `ANTHROPIC_COACH_MODEL` | No (default `claude-sonnet-5`) | — |
| `CORS_ORIGINS` | No (default `http://localhost:3000`) | Lista separada por comas si tienes más de un frontend |
| `PORT` | No (default `4000`) | — |
| `SMTP_HOST/PORT/USER/PASS/FROM` | No | Solo si usas "Enviar reporte por correo"; cualquier proveedor SMTP |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PREMIUM/COACH/ACADEMIA` | No | Solo si activas suscripciones; ver nota abajo |
| `FRONTEND_URL` | No (default `http://localhost:3000`) | Adonde redirige Stripe Checkout al terminar |

**Probar el webhook de Stripe en local:**
```bash
stripe listen --forward-to localhost:4000/api/v1/subscriptions/webhook
# copia el "whsec_..." que imprime a STRIPE_WEBHOOK_SECRET
```

## 5. Web (`web/`) — cómo levantarlo

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

Variables (`web/.env.local`) — todas con prefijo `NEXT_PUBLIC_` porque el
navegador las necesita (son valores públicos por diseño: Firebase config y la
clave *anónima* de Supabase, no la service role):

- `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` — Firebase Console → Configuración del proyecto → tus apps → app Web.
- `NEXT_PUBLIC_API_URL` — `http://localhost:4000` en desarrollo.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_VIDEOS_BUCKET` — mismo proyecto Supabase que el backend, pero la clave **anon**, no la service role.

En build de producción (`npm run build`), si falta `NEXT_PUBLIC_API_URL` el
build falla explícitamente en vez de apuntar silenciosamente a `localhost`.

## 6. Mobile (`mobile/`) — cómo levantarlo

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

Mismas variables que la web pero con prefijo `EXPO_PUBLIC_` en vez de
`NEXT_PUBLIC_`. Si pruebas en un emulador Android, usa
`EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` en vez de `localhost` (el
emulador no ve el `localhost` de tu máquina).

Abre la app con Expo Go escaneando el QR, o `npx expo start --android` /
`--ios` con un emulador corriendo.

**Builds de producción (EAS):**
```bash
npx eas login
npx eas init                 # crea/vincula el proyecto y escribe extra.eas.projectId en app.json
# carga cada variable EXPO_PUBLIC_* por ambiente:
npx eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --environment production
# ...repite para el resto de variables y para development/preview si aplica
npx eas build --profile preview --platform android   # build de prueba
```

## 7. Cómo probar el flujo completo

1. Abre `http://localhost:3000/register`, crea una cuenta con un email real.
2. Deberías caer en `/profile`. Completa peso, altura, nivel y disciplinas.
   Guarda y recarga: los datos deben persistir.
3. Ve a `/videos`, sube un video corto. El flujo es: `POST /api/v1/videos`
   (crea el registro y devuelve una URL firmada) → subida directa a Supabase
   Storage → `PATCH /api/v1/videos/:id/complete`.
4. Entra a "Analizar" para correr la detección de pose (MediaPipe, corre en
   el navegador/WebView), luego "Biomecánica", "Movimiento" y "Errores" para
   ver los cálculos derivados.
5. "Comparar" contra tu sesión anterior, y "Entrenador IA" para generar un
   plan (requiere `ANTHROPIC_API_KEY` configurada).
6. Repite el paso 3-5 en la app móvil (mismo backend).
7. Para probar roles: en Prisma Studio (`npx prisma studio`, dentro de
   `api/`), busca tu usuario, copia su `id`, y llama
   `POST /api/v1/roles/assign { "userId": "...", "role": "ADMIN" }` —
   debería dar 403 porque tu usuario todavía no es Admin (asígnalo primero
   manualmente en la base de datos, una única vez, para tener el primer
   Admin).

## 8. Riesgos y deuda técnica conocida

- **Login social en mobile (Google/Apple/Facebook):** requiere
  `expo-auth-session` y/o `expo-apple-authentication` con configuración
  nativa por plataforma (esquemas de URL, Bundle ID, SHA-1 en Firebase). El
  flujo de email/password es 100% funcional; el botón social queda como
  mejora futura.
- **Login con Facebook (web y mobile):** no implementado; requiere una app
  en Meta for Developers.
- **Primer usuario Admin:** no hay pantalla de "bootstrap"; se asigna
  manualmente en la base de datos.
- **Envío de emails transaccionales propios** (más allá del reseteo de
  contraseña que ya envía Firebase) se limita al envío de reportes por SMTP.
