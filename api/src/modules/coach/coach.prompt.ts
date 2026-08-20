export interface CoachContext {
  discipline: string;
  userLevel: string | null;
  userAge: number | null;
  userDominance: string | null;
  techniqueScore: number | null;
  biomechanicsSummary: Record<string, { min: number; max: number; mean: number }>;
  errorFindings: { type: string; level: string; description: string }[];
  movementSummary: { navegacion: number; saltos: number; aterrizajes: number; cambiosDireccion: number };
  userNotes?: string;
}

export const COACH_OUTPUT_SCHEMA_DESCRIPTION = `
Responde ÚNICAMENTE con un objeto JSON válido (sin texto antes o después, sin bloques de código markdown) con esta forma exacta:
{
  "resumen": string (2-3 frases resumiendo la sesión, en español, tono profesional y directo),
  "fortalezas": string[] (2-4 puntos concretos, basados en los datos, no genéricos),
  "erroresExplicados": [{ "type": string, "explicacion": string (por qué importa ESTE valor medido, no un texto genérico) }],
  "planMejora": string (párrafo corto con la prioridad #1 a trabajar),
  "planSemanal": [{ "dia": string, "enfoque": string, "ejercicios": string[] }] (7 elementos, lunes a domingo, incluyendo días de descanso),
  "planMensual": [{ "semana": number, "objetivo": string }] (4 elementos),
  "ejerciciosPrioritarios": string[] (3-5 ejercicios concretos),
  "sugerenciasBusqueda": string[] (3-5 CONSULTAS de búsqueda de YouTube, ej. "ejercicios de flexion de rodilla kitesurf", NUNCA un título de video específico ni una URL, porque no podemos verificar que ese video exista)
}
`.trim();

export function buildCoachPrompt(ctx: CoachContext): { system: string; user: string } {
  const system = `Eres un entrenador profesional de kitesurf y wing foil, y también fisioterapeuta deportivo. Recibes datos MEDIDOS de un análisis biomecánico automático (no interpretaciones subjetivas) y debes generar un plan de entrenamiento personalizado. Reglas estrictas:
- Basa cada afirmación en los números que se te dan. No inventes datos que no están en el contexto.
- No hagas diagnósticos médicos. Si algo sugiere riesgo de lesión, recomienda consultar a un profesional, no lo diagnostiques.
- Nunca sugieras un título de video o URL específica: solo consultas de búsqueda genéricas.
- Sé directo y concreto, evita frases de relleno tipo "sigue practicando".
${COACH_OUTPUT_SCHEMA_DESCRIPTION}`;

  const user = JSON.stringify(
    {
      disciplina: ctx.discipline,
      nivelDelUsuario: ctx.userLevel,
      edad: ctx.userAge,
      dominancia: ctx.userDominance,
      puntuacionTecnica: ctx.techniqueScore,
      resumenBiomecanico: ctx.biomechanicsSummary,
      erroresDetectados: ctx.errorFindings,
      resumenDeMovimiento: ctx.movementSummary,
      notasDelUsuario: ctx.userNotes ?? null,
    },
    null,
    2
  );

  return { system, user };
}
