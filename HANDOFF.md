# Cómo retomar este proyecto en otro PC

Si estás leyendo esto en una sesión nueva de Claude Code: dale un resumen al usuario de este archivo y sigue desde la sección "Contexto para retomar" — no hace falta que vuelva a explicar nada.

## 1. Instalar dependencias y levantar Postgres

```
cd api && npm install
cd ../web && npm install
cd ../mobile && npm install

cd ../api
docker compose up -d          # levanta Postgres en localhost:5433
npx prisma migrate deploy     # aplica las migraciones (incluye GpsTrack)
```

## 2. Copiar los 3 archivos .env manualmente

Los `.env` tienen secretos reales (Firebase, Supabase, Stripe, Anthropic) y por diseño **no están en git**. Cópialos tal cual desde el PC anterior (USB, disco compartido, etc.):

- `api/.env`
- `web/.env.local`
- `mobile/.env`

Si no los tiene a mano, los valores de Supabase/Firebase están en el Notepad `Documents\mis cuentas.txt` del PC anterior.

## 3. Levantar todo

```
cd api && npm run dev      # puerto 4000
cd web && npm run dev      # puerto 3000
cd mobile && npx expo start
```

## Contexto para retomar

Proyecto Easy Kite (antes se llamó Stance, y antes de eso Foilio) — apps de kitesurf/wing foil con web (Next.js), mobile (Expo/React Native) y api (Express + Prisma + Postgres). El repo de GitHub y las carpetas locales siguen llamándose "stance" — solo se cambió el nombre visible de la app, no esos identificadores técnicos (ver sección de riesgos).

Lo último en lo que se trabajó:

- **Altura de salto en metros**: `api/src/modules/dashboard/dashboard.service.ts` calibra la escala del video con la estatura del usuario (`User.heightCm`) usando los landmarks de MediaPipe, para convertir la excursión vertical del salto de unidades relativas a metros reales.
- **Velocidad y distancia por GPS (Fase 13)**: modelo `GpsTrack` nuevo, endpoints `POST`/`GET /api/v1/videos/:id/gps-track`, cálculo de velocidad/distancia con Haversine en el dashboard. En `mobile/src/screens/VideosScreen.tsx` ya se captura el track GPS mientras se graba (con `expo-location`) y se sube después del video.
- **Dashboard web** (`web/app/dashboard/page.tsx`): recuadros nuevos para el récord de altura de salto y para velocidad punta/distancia total.
- **Pendiente de probar**: todo el flujo de GPS en un dispositivo físico real (permiso de ubicación + captura + subida) — no se pudo verificar solo compilando.
- También se subió, sin commitear de una sesión previa: funcionalidad de viento/equipo recomendado (`api/src/modules/wind/`, `web/app/wind/page.tsx`) y un toggle de mostrar/ocultar contraseña (`web/components/PasswordField.tsx`).

Repo: https://github.com/RamalexBar/stance — rama `master`.

Puedes borrar este archivo (`HANDOFF.md`) cuando ya no lo necesites — no es parte de la app.
