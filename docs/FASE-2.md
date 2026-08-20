# Foilio — Fase 2: Carga de Videos

## 1. Objetivo y criterios de aceptación

**Objetivo:** que un usuario pueda grabar o importar un video, asociarlo a una
disciplina, y reproducirlo dentro de la app — quedando guardado en su
historial.

**Criterios de aceptación:**
- [ ] Desde la web, el usuario importa un video desde su computador (galería
      de archivos) y lo ve aparecer en "Historial" con estado `UPLOADED`.
- [ ] Desde el móvil, el usuario **grava** un video con la cámara del
      teléfono y también aparece en su historial.
- [ ] Desde el móvil, el usuario **importa** un video ya existente en la
      galería del teléfono (incluye videos exportados de GoPro/Insta360/DJI).
- [ ] El usuario reproduce cualquier video de su historial, en web y en móvil.
- [ ] Un usuario no puede ver ni reproducir videos de otro usuario (se
      verifica comparando `userId` en cada operación).
- [ ] Si la subida a Storage falla a mitad de camino, el registro queda en
      estado `FAILED`, no `UPLOADED` (no se "miente" sobre el estado).

## 2. Arquitectura y por qué

```
Cliente (web/mobile)
   │ 1. POST /api/v1/videos  { discipline, source, originalName }
   ▼
Backend ──── crea registro (status PENDING) ──── PostgreSQL
   │ 2. pide a Supabase una signed upload URL (createSignedUploadUrl)
   ▼
Supabase Storage
   │ 3. devuelve { signedUrl, token } al backend → al cliente
   ▼
Cliente ──── sube el archivo DIRECTO a Supabase con ese token ────►  Supabase Storage
   │ 4. PATCH /api/v1/videos/:id/complete
   ▼
Backend ──── marca status UPLOADED ──── PostgreSQL
```

**Por qué el archivo no pasa por el backend Node:** un servidor Express de
propósito general no está optimizado para mover archivos de cientos de MB;
además duplicaría el tráfico (cliente→servidor→Storage) sin necesidad.
Supabase Storage ya soporta subidas directas con URLs firmadas de un solo uso,
que es el patrón estándar para este caso. El backend sigue siendo el único
que decide *quién* puede subir *qué* (autenticación + registro en BD), pero
no mueve los bytes del video.

**Por qué no hay integración nativa con GoPro/Insta360/DJI en esta fase:**
esas integraciones requieren SDKs propietarios de cada fabricante, distintos
entre sí, y no aportan valor sobre la alternativa simple (exportar a la
galería del teléfono e importar desde ahí). Se documenta como mejora futura.

## 3. Estructura de carpetas (nuevo en esta fase)

```
api/src/modules/videos/
  video.dto.ts          # validación con Zod
  video.repository.ts    # acceso a datos (Prisma)
  video.service.ts       # orquesta Supabase Storage + reglas de negocio
  video.controller.ts
  video.routes.ts
api/src/config/supabase.ts   # cliente admin de Supabase (service role)

web/app/videos/page.tsx       # subir + listar + reproducir
web/lib/supabaseClient.ts     # cliente con clave anónima (solo ejecuta uploads)

mobile/src/screens/VideosScreen.tsx
mobile/src/supabase/supabaseClient.ts
```

## 4. Base de datos

Nuevo modelo `VideoSession` (ver `api/prisma/schema.prisma`): guarda
`discipline`, `source` (RECORDED_IN_APP / GALLERY / GOPRO / INSTA360 / DJI),
`storagePath` (ruta dentro del bucket de Supabase), `status` (PENDING /
UPLOADED / FAILED), duración y tamaño. Relacionado a `User` por `userId`.

Aplica la migración:
```bash
cd api
npx prisma migrate dev --name add_video_sessions
```

## 5. Configuración de Supabase Storage (antes de probar)

1. En Supabase Dashboard → Storage, crea un bucket llamado `videos`, marcado
   como **privado** (no público) — la reproducción se hace con URLs firmadas
   temporales, no con acceso público.
2. Copia `SUPABASE_URL` y la `service_role` key (Project Settings → API) a
   `api/.env`.
3. Copia `SUPABASE_URL` y la key **anon/public** (esa sí es segura de
   exponer) a `web/.env.local` y `mobile/.env`.

## 6. Backend — nuevos endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/v1/videos` | crea el registro + devuelve URL firmada de subida |
| GET | `/api/v1/videos` | historial del usuario autenticado |
| GET | `/api/v1/videos/:id` | metadata + URL firmada de reproducción (1h) |
| PATCH | `/api/v1/videos/:id/complete` | confirma que la subida terminó |
| PATCH | `/api/v1/videos/:id/fail` | marca la subida como fallida |

## 7. Cómo probarlo manualmente

1. `cd api && npm install && npx prisma migrate dev --name add_video_sessions && npm run dev`
2. Web: `cd web && npm install && npm run dev`, entra a `/profile` → "Mis
   videos" → elige disciplina → "Importar desde galería" → selecciona
   cualquier archivo `.mp4` de tu computador.
3. Verifica en Supabase Dashboard → Storage → bucket `videos` que el archivo
   aparece en una carpeta con tu `userId`.
4. En la web, dale "Reproducir" al video recién subido: debe abrirse y
   reproducirse.
5. Mobile: `cd mobile && npm install && npx expo start`, entra a Perfil →
   "Mis videos" → "Grabar" (usa la cámara) o "Importar" (usa la galería del
   teléfono) → verifica que aparece en el historial y se reproduce con "Ver".

## 8. Riesgos y deuda técnica conocida

- **Sin generación de miniaturas (thumbnails):** el historial muestra texto,
  no una imagen previa del video. Se resuelve en una fase con FFmpeg (ya
  está en el stack, se conecta cuando se procese el video para pose/ángulos
  en la Fase 3).
- **Límite de tamaño:** se validó hasta 2GB por archivo a nivel de API, pero
  no se probó el comportamiento con archivos muy grandes en redes móviles
  lentas (sin reintento automático de subida todavía).
- **GoPro/Insta360/DJI:** solo vía exportación manual a galería, según lo
  explicado en la sección 2.
- **Borrado de videos:** todavía no hay endpoint para eliminar un video (ni
  en BD ni en Storage) — se agrega si se necesita antes de la Fase 3, o se
  deja documentado para una fase de "gestión de biblioteca".

## 9. Qué queda explícitamente fuera de esta fase

Cualquier procesamiento del contenido del video (pose, esqueleto, ángulos,
errores, comparación) — eso es la Fase 3 en adelante. Esta fase solo
garantiza que el video llega, se guarda, y se puede volver a ver.
