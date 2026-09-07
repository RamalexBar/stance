import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  firebase: {
    projectId: required("FIREBASE_PROJECT_ID"),
    clientEmail: required("FIREBASE_CLIENT_EMAIL"),
    // Las claves privadas en .env suelen traer "\n" escapado; se restauran aquí.
    privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map((origin) => origin.trim()),
  supabase: {
    url: required("SUPABASE_URL"),
    // Service Role Key: SOLO en el backend. Nunca se envía al cliente.
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    videosBucket: process.env.SUPABASE_VIDEOS_BUCKET ?? "videos",
  },
  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
    model: process.env.ANTHROPIC_COACH_MODEL ?? "claude-sonnet-5",
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? "Easy Kite <no-reply@easykite.app>",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
};
