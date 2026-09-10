// Paleta de color para SERIES DE DATOS (izquierda/derecha), separada a
// propósito de la paleta semántica de severidad (OK/LEVE/MODERADO/ALTO en
// postureEvaluator.ts) y de los acentos de marca (turquesa/coral). Ningún
// tono de acá debe parecerse a esas otras rampas — si el ojo puede confundir
// "qué lado es" con "qué tan grave es", el sistema de color falló.
export const DATA_SERIES_LEFT = { color: "#2A78D6", dash: undefined as string | undefined };
export const DATA_SERIES_RIGHT = { color: "#EB6834", dash: "6,4" };
