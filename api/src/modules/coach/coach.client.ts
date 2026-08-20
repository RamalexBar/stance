import { env } from "../../config/env";
import { AppError } from "../../shared/errors";

/**
 * Llama a la API de Anthropic directamente vía fetch (evita añadir el SDK
 * completo solo para un caso de uso). Pide salida SOLO en JSON y la parsea,
 * tolerando que el modelo la envuelva en un bloque ```json``` por accidente.
 */
export async function callCoachModel(system: string, user: string): Promise<unknown> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.anthropic.model,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Anthropic API respondió ${response.status}:`, text);
    throw new AppError(`El entrenador IA no respondió correctamente (${response.status})`, 502);
  }

  const data = (await response.json()) as { content?: { type: string; text: string }[] };
  const textBlock = data.content?.find((b) => b.type === "text")?.text ?? "";
  const cleaned = textBlock.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Respuesta del entrenador IA no parseable:", cleaned);
    throw new AppError("El entrenador IA devolvió una respuesta que no se pudo interpretar.", 502);
  }
}
