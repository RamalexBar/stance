# Foilio

> Progreso por fases. Cada fase tiene su propia ficha de entrega (objetivo,
> arquitectura, cómo probar, riesgos). Esta portada documenta la Fase 1;
> las siguientes están en `/docs`.
>
> - Fase 1 — Fundación (Arquitectura + Auth + Perfil): esta página ↓
> - [Fase 2 — Carga de Videos](docs/FASE-2.md)
> - [Fase 3 — Visión por Computador (detección de pose)](docs/FASE-3.md)
> - [Fase 4 — Biomecánica](docs/FASE-4.md)

---

# Fase 1: Fundación (Arquitectura + Auth + Perfil)

## 1. Objetivo y criterios de aceptación

**Objetivo:** tener los tres proyectos (api, web, mobile) corriendo y conectados,
con registro, login, recuperación de contraseña y edición de perfil deportivo
funcionando de punta a punta.

**Criterios de aceptación (cómo saber que la fase está terminada):**
- [ ] Un usuario nuevo se registra con email/password desde la web o el móvil.
- [ ] Ese mismo usuario cierra sesión y vuelve a iniciar sesión correctamente.
- [ ] El usuario puede pedir "olvidé mi contraseña" y recibe el correo de Firebase.
- [ ] Al entrar por primera vez, se crea automáticamente su perfil en PostgreSQL
      con el rol ATHLETE.
- [ ] El usuario edita edad, peso, altura, nivel, dominancia y disciplinas
      (Kitesurf, Wing Foil — puede elegir varias), y los cambios
      persisten al recargar.
- [ ] Un usuario con rol ADMIN puede llamar `GET /api/v1/roles` y
      `POST /api/v1/roles/assign`; un usuario sin ese rol recibe 403.

## 2. Arquitectura y por qué

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
PostgreSQL (vía Prisma)   ← perfil deportivo, roles, disciplinas
```

**Por qué así:** el prompt original pedía "Autenticación: Firebase Authentication".
Eso significa que Firebase ya resuelve registro, login, reseteo de contraseña y
login social de forma segura y probada. Reimplementar eso a mano (bcrypt, JWT
propios, envío de correos) sería duplicar trabajo y superficie de errores de
seguridad. El backend solo hace lo que Firebase no hace: guardar el perfil
deportivo y decidir permisos por rol.

Patrón usado en el backend: **Controller → Service → Repository**, con DTOs
validados por Zod antes de llegar al Service. Esto es lo que permite, en fases
futuras, cambiar de PostgreSQL/Prisma sin tocar los controllers.

## 3. Estructura de carpetas

```
foilio/
├── api/
│   ├── prisma/
│   │   ├── schema.prisma      # User, Role, UserRole, UserDiscipline
│   │   └── seed.ts            # crea los 5 roles por defecto
│   ├── src/
│   │   ├── config/            # env.ts, firebase.ts
│   │   ├── middlewares/       # auth, role, validate, error
│   │   ├── modules/
│   │   │   ├── users/         # dto, repository, service, controller, routes
│   │   │   └── roles/         # routes (solo Admin)
│   │   ├── shared/            # prisma client, errores, apiResponse
│   │   ├── app.ts
│   │   └── server.ts
│   ├── docker-compose.yml     # levanta PostgreSQL local
│   └── .env.example
├── web/                       # Next.js: /login /register /forgot-password /profile
│   ├── app/
│   ├── context/AuthContext.tsx
│   └── lib/{firebase.ts, api.ts}
└── mobile/                    # Expo: mismas 4 pantallas + navegación
    ├── App.tsx
    └── src/{screens, api, context, firebase, theme}
```

## 4. Base de datos

Modelos (ver `api/prisma/schema.prisma`): `User`, `Role`, `UserRole` (N:M),
`UserDiscipline` (N:M con enum `Discipline`). Enums: `RoleName`, `Discipline`,
`SkillLevel`, `Dominance`, `AuthProvider`.

El campo `firebaseUid` es único y es el puente entre Firebase y Postgres. No se
guarda ninguna contraseña ni token de sesión en esta base de datos.

## 5. Backend — cómo levantarlo

```bash
cd api
cp .env.example .env        # completa con tus credenciales de Firebase Admin
docker compose up -d        # levanta PostgreSQL en localhost:5432
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev                 # http://localhost:4000
```

## 6. Frontend — cómo levantarlo

**Web:**
```bash
cd web
cp .env.local.example .env.local   # completa con tu config de Firebase (app web)
npm install
npm run dev                        # http://localhost:3000
```

**Mobile:**
```bash
cd mobile
cp .env.example .env                # completa con tu config de Firebase (app móvil)
npm install
npx expo start
```

> Necesitas crear un proyecto en [Firebase Console](https://console.firebase.google.com),
> habilitar el método de inicio de sesión "Email/Password" y "Google", y generar:
> 1. Una app Web → te da el `firebaseConfig` para `web/.env.local` y `mobile/.env`.
> 2. Una clave de cuenta de servicio (Configuración del proyecto → Cuentas de servicio)
>    → te da las 3 variables `FIREBASE_*` para `api/.env`.

## 7. Cómo probarlo manualmente

1. Abre `http://localhost:3000/register`, crea una cuenta con un email real.
2. Deberías caer en `/profile`. Si abres las herramientas de red, verás una
   llamada `GET /api/v1/users/me` que devuelve tu perfil recién creado.
3. Completa peso, altura, nivel y marca "KITESURF" y "WINGFOIL" como
   disciplinas. Guarda. Recarga la página: los datos deben seguir ahí.
4. Cierra sesión, vuelve a `/login`, entra con el mismo email/password.
5. Ve a `/forgot-password`, pide el reset, revisa el correo (Firebase lo envía).
6. Repite el paso 1-3 en la app móvil con `npx expo start` (mismo backend).
7. Para probar roles: en Prisma Studio (`npx prisma studio`), busca tu usuario,
   copia su `id`, y usa Postman para llamar
   `POST /api/v1/roles/assign { "userId": "...", "role": "ADMIN" }` — debería
   dar 403 porque tu usuario todavía no es Admin (asígnalo primero manualmente
   en la base de datos por única vez, para tener el primer Admin).

## 8. Riesgos y deuda técnica conocida

- **Login social en mobile (Google/Apple/Facebook):** en Expo requiere
  `expo-auth-session` y/o `expo-apple-authentication` con configuración nativa
  por plataforma (esquemas de URL, Bundle ID, SHA-1 en Firebase). Se dejó el
  flujo de email/password 100% funcional; el botón social se agrega en una
  iteración siguiente de esta misma fase, no bloquea el resto del producto.
- **Login con Facebook (web y mobile):** no se implementó en esta entrega;
  requiere configurar una app en Meta for Developers. Se documenta como
  pendiente, mismo patrón que Google una vez configurado.
- **Primer usuario Admin:** no hay todavía una pantalla de "bootstrap"; el
  primer Admin del sistema se asigna manualmente en la base de datos.
- **Envío de emails transaccionales propios** (más allá del reseteo de
  contraseña que ya envía Firebase) no está cubierto en esta fase.

## 9. Qué queda explícitamente fuera de esta fase

Carga de videos, visión por computador, biomecánica, detección de errores,
comparación, dashboard, entrenador IA, reportes, escuelas y suscripciones —
todo esto corresponde a las Fases 2 a 12 del prompt maestro, y se aborda una
vez esta fase esté validada y confirmada.
