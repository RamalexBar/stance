import { Discipline, SkillLevel } from "@prisma/client";

export type ShoreClassification =
  | "ONSHORE"
  | "CROSS_ONSHORE"
  | "CROSS"
  | "CROSS_OFFSHORE"
  | "OFFSHORE";

export interface ShoreClassificationResult {
  classification: ShoreClassification;
  angleDiffDeg: number;
  safetyLevel: "SEGURO" | "PRECAUCION" | "PELIGROSO";
  safetyNote: string;
}

function angularDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Clasifica el viento respecto a la costa comparando de dónde SOPLA el viento
 * (windDirectionFromDeg, convención meteorológica) contra hacia dónde mira el
 * mar abierto desde la playa (seaDirectionDeg). Si el viento viene DESDE la
 * dirección del mar, empuja al deportista HACIA la playa (más seguro). Si
 * viene desde tierra, empuja HACIA el mar abierto (más peligroso: alejarse
 * de la costa sin poder volver remando/nadando fácilmente).
 */
export function classifyShoreWind(
  windDirectionFromDeg: number,
  seaDirectionDeg: number
): ShoreClassificationResult {
  const diff = angularDifference(windDirectionFromDeg, seaDirectionDeg);

  if (diff <= 22.5) {
    return {
      classification: "ONSHORE",
      angleDiffDeg: diff,
      safetyLevel: "SEGURO",
      safetyNote: "El viento sopla desde el mar hacia la playa: si pierdes el control, la corriente de aire te acerca a la orilla.",
    };
  }
  if (diff <= 67.5) {
    return {
      classification: "CROSS_ONSHORE",
      angleDiffDeg: diff,
      safetyLevel: "SEGURO",
      safetyNote: "Viento cruzado con componente hacia la playa: en general manejable, cuidado con la deriva lateral.",
    };
  }
  if (diff <= 112.5) {
    return {
      classification: "CROSS",
      angleDiffDeg: diff,
      safetyLevel: "PRECAUCION",
      safetyNote: "Viento paralelo a la costa: puede arrastrarte lateralmente lejos de tu punto de entrada al agua.",
    };
  }
  if (diff <= 157.5) {
    return {
      classification: "CROSS_OFFSHORE",
      angleDiffDeg: diff,
      safetyLevel: "PELIGROSO",
      safetyNote: "Viento cruzado con componente hacia el mar abierto: si pierdes el control, te aleja de la costa. No recomendado sin experiencia y equipo de rescate.",
    };
  }
  return {
    classification: "OFFSHORE",
    angleDiffDeg: diff,
    safetyLevel: "PELIGROSO",
    safetyNote: "El viento sopla desde tierra hacia el mar: si pierdes el control, te aleja de la costa sin forma fácil de volver. Evítalo salvo que tengas rescate/bote de apoyo.",
  };
}

/**
 * Aviso adicional según el nivel del deportista — la misma condición de
 * viento no representa el mismo riesgo para un principiante que para un
 * avanzado. Es una capa de criterio simple sobre la clasificación de costa
 * ya calculada, no un modelo de seguridad certificado.
 */
export function levelCaution(
  level: SkillLevel | null,
  windSpeedKt: number,
  windGustsKt: number,
  safetyLevel: ShoreClassificationResult["safetyLevel"]
): string | null {
  if (level === "BEGINNER") {
    if (safetyLevel !== "SEGURO") {
      return "No recomendado para tu nivel: sal solo si vas acompañado de alguien con más experiencia, o espera mejores condiciones.";
    }
    if (windSpeedKt > 13 || windGustsKt > 19) {
      return "Viento fuerte para tu nivel — considera ir acompañado o esperar un día con menos ráfagas.";
    }
    return null;
  }

  if (level === "INTERMEDIATE") {
    if (safetyLevel === "PELIGROSO") {
      return "Condiciones peligrosas incluso para nivel intermedio — evalúa con cuidado y considera ir acompañado.";
    }
    if (safetyLevel === "PRECAUCION" && windGustsKt > 22) {
      return "Ráfagas fuertes con viento paralelo a la costa — puede arrastrarte lejos de tu punto de entrada.";
    }
    if (windGustsKt > 30) {
      return "Ráfagas muy fuertes — aunque el viento venga hacia la playa, considera equipo más pequeño y estar atento a golpes de viento.";
    }
    return null;
  }

  return null;
}

export type WindSpeedBandId =
  | "INVIABLE"
  | "MARGINAL"
  | "BUENO"
  | "PERFECTO"
  | "AVANZADO"
  | "EXIGENTE"
  | "PELIGROSO";

export interface WindSpeedBand {
  id: WindSpeedBandId;
  color: string;
  label: string;
}

/**
 * Escala de 7 colores estilo Windy/Windfinder para foil (wing/kite), en
 * nudos — mismos rangos para ambas disciplinas por ahora, a falta de una
 * tabla específica de kitesurf.
 */
const WIND_SPEED_BANDS: { id: WindSpeedBandId; maxKt: number; color: string; label: string }[] = [
  { id: "INVIABLE", maxKt: 7, color: "#8ECFEA", label: "Inviable" },
  { id: "MARGINAL", maxKt: 11, color: "#9CCB4A", label: "Marginal" },
  { id: "BUENO", maxKt: 15, color: "#2E7D32", label: "Bueno" },
  { id: "PERFECTO", maxKt: 20, color: "#FFD600", label: "Perfecto (sweet spot)" },
  { id: "AVANZADO", maxKt: 25, color: "#FF9800", label: "Avanzado" },
  { id: "EXIGENTE", maxKt: 30, color: "#E53935", label: "Exigente" },
  { id: "PELIGROSO", maxKt: Infinity, color: "#8E24AA", label: "Peligroso" },
];

export function classifyWindSpeedBand(windSpeedKt: number): WindSpeedBand {
  const band = WIND_SPEED_BANDS.find((b) => windSpeedKt <= b.maxKt) ?? WIND_SPEED_BANDS[WIND_SPEED_BANDS.length - 1];
  return { id: band.id, color: band.color, label: band.label };
}

export interface EquipmentRecommendation {
  discipline: Discipline;
  windSpeedKt: number;
  kiteSizeM2?: { min: number; max: number };
  wingSizeM2?: { min: number; max: number };
  boardVolumeLiters?: { min: number; max: number };
  notes: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Recomendación de equipo APROXIMADA a partir de fórmulas de referencia
 * usadas comúnmente en la comunidad (regla peso/viento para superficie de
 * cometa o ala, y peso×factor-de-nivel para volumen de tabla). No reemplaza
 * las tablas específicas del fabricante de tu equipo — varían por diseño,
 * aspect ratio y condiciones locales.
 */
export function recommendEquipment(params: {
  discipline: Discipline;
  weightKg: number | null;
  level: SkillLevel | null;
  windSpeedKt: number;
}): EquipmentRecommendation {
  const { discipline, weightKg, level, windSpeedKt } = params;
  const notes: string[] = [];

  if (!weightKg) {
    notes.push("Agrega tu peso en el perfil para obtener un rango de tamaño recomendado.");
    return { discipline, windSpeedKt, notes };
  }

  const windKnots = Math.max(windSpeedKt, 3);

  if (discipline === "KITESURF") {
    const mid = (weightKg * 3.0) / windKnots;
    const kiteSizeM2 = { min: clamp(mid * 0.85, 4, 17), max: clamp(mid * 1.15, 4, 17) };
    if (mid * 0.85 > 17) notes.push("Viento débil para tu peso: incluso la cometa más grande recomendada podría no ser suficiente.");
    if (mid * 1.15 < 4) notes.push("Viento fuerte para tu peso: incluso la cometa más pequeña recomendada puede ser demasiada potencia — sal solo si tienes experiencia.");
    return { discipline, windSpeedKt, kiteSizeM2, notes };
  }

  // WINGFOIL
  const wingMid = (weightKg * 0.9) / windKnots;
  const wingSizeM2 = { min: clamp(wingMid * 0.85, 2, 7), max: clamp(wingMid * 1.15, 2, 7) };
  if (wingMid * 0.85 > 7) notes.push("Viento débil para tu peso: incluso el ala más grande recomendada podría no ser suficiente.");
  if (wingMid * 1.15 < 2) notes.push("Viento fuerte para tu peso: incluso el ala más pequeña recomendada puede ser demasiada potencia — sal solo si tienes experiencia.");

  const volumeFactor =
    level === "BEGINNER" ? 1.4 : level === "INTERMEDIATE" ? 1.05 : level === "ADVANCED" ? 0.8 : level === "PRO" ? 0.65 : 1.1;
  const volumeMid = weightKg * volumeFactor;
  const boardVolumeLiters = { min: Math.round(volumeMid * 0.9), max: Math.round(volumeMid * 1.1) };

  if (!level) notes.push("Agrega tu nivel en el perfil para afinar el volumen de tabla recomendado.");

  return { discipline, windSpeedKt, wingSizeM2, boardVolumeLiters, notes };
}
