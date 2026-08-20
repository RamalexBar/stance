export type ErrorType =
  | "RODILLAS_RIGIDAS"
  | "CENTRO_GRAVEDAD_ADELANTADO"
  | "CENTRO_GRAVEDAD_RETRASADO"
  | "HOMBROS_DESALINEADOS"
  | "EXCESO_ROTACION"
  | "MALA_RECEPCION"
  | "ESPALDA_CURVADA"
  | "RIESGO_LESION"
  | "BARRA_MUY_ALTA"
  | "BARRA_MUY_BAJA"
  | "POSTURA_INCORRECTA";

export type ErrorLevel = "LEVE" | "MODERADO" | "ALTO";

export interface ErrorCatalogEntry {
  description: string;
  impact: string;
  howToFix: string;
  exercises: string[];
}

export const ERROR_CATALOG: Record<ErrorType, ErrorCatalogEntry> = {
  RODILLAS_RIGIDAS: {
    description: "Las rodillas permanecen casi completamente extendidas durante la navegación.",
    impact: "Reduce la capacidad de absorber el oleaje y las rachas de viento, y aumenta el estrés en la articulación de la rodilla.",
    howToFix: "Mantén una flexión ligera y constante de rodillas, como si estuvieras listo para saltar en cualquier momento.",
    exercises: ["Sentadillas con isometría (mantener la posición)", "Práctica de equilibrio en posición flexionada sobre superficie inestable"],
  },
  CENTRO_GRAVEDAD_ADELANTADO: {
    description: "El peso del cuerpo está desplazado hacia adelante respecto a la base de apoyo.",
    impact: "Puede provocar pérdida de control y caídas hacia adelante, especialmente ante rachas de viento.",
    howToFix: "Lleva las caderas un poco más atrás, manteniendo el peso centrado sobre los pies.",
    exercises: ["Ejercicios de propiocepción en plancha de equilibrio", "Práctica de postura frente a espejo o video en tierra"],
  },
  CENTRO_GRAVEDAD_RETRASADO: {
    description: "El peso del cuerpo está desplazado hacia atrás respecto a la base de apoyo.",
    impact: "Reduce el control de la vela/tabla y puede provocar pérdida de planeo o caídas hacia atrás.",
    howToFix: "Adelanta ligeramente las caderas y mantén el pecho orientado hacia la dirección de avance.",
    exercises: ["Ejercicios de core para sostener la cadera adelantada sin tensión lumbar excesiva"],
  },
  HOMBROS_DESALINEADOS: {
    description: "Un hombro está notablemente más alto o adelantado que el otro de forma sostenida.",
    impact: "Genera compensaciones posturales y puede afectar el control de la vela/kite con simetría reducida.",
    howToFix: "Trabaja en mantener ambos hombros a la misma altura, revisando la postura periódicamente durante la sesión.",
    exercises: ["Ejercicios de movilidad y activación escapular bilateral"],
  },
  EXCESO_ROTACION: {
    description: "El tronco rota más de lo esperado durante los cambios de dirección (medición aproximada).",
    impact: "Puede generar pérdida de equilibrio momentánea durante la maniobra.",
    howToFix: "Practica cambios de dirección controlando la rotación del tronco de forma progresiva, no brusca.",
    exercises: ["Rotaciones de tronco controladas en tierra con banda elástica"],
  },
  MALA_RECEPCION: {
    description: "Al aterrizar de un salto, las rodillas no se flexionan lo suficiente para absorber el impacto.",
    impact: "Aumenta significativamente el riesgo de lesión en rodillas y tobillos.",
    howToFix: "Practica aterrizajes flexionando activamente las rodillas y cadera en el momento del contacto.",
    exercises: ["Saltos con aterrizaje controlado en tierra (drop landings)", "Ejercicios de fuerza excéntrica de cuádriceps"],
  },
  ESPALDA_CURVADA: {
    description: "El tronco se flexiona de forma muy pronunciada hacia adelante de forma sostenida (medición aproximada a partir del ángulo cadera-tronco, no de la curvatura real de la columna).",
    impact: "Puede generar fatiga lumbar y reduce la eficiencia de transmisión de fuerza hacia la vela/tabla.",
    howToFix: "Mantén el pecho más erguido, activando el core en vez de flexionar la zona lumbar.",
    exercises: ["Fortalecimiento de core (plancha, bird-dog)", "Movilidad de cadera para reducir la compensación lumbar"],
  },
  RIESGO_LESION: {
    description: "Se detectó una combinación de señales (rodillas rígidas + mala recepción) asociada a mayor riesgo de lesión en aterrizajes.",
    impact: "Esta es una señal de atención, no un diagnóstico médico. Combina patrones biomecánicos conocidos, no un análisis clínico individual.",
    howToFix: "Prioriza practicar la técnica de aterrizaje en tierra antes de repetir saltos en el agua, y considera consultar con un profesional de biomecánica deportiva si el patrón persiste.",
    exercises: ["Trabajo de aterrizaje controlado", "Fortalecimiento general de tren inferior"],
  },
  BARRA_MUY_ALTA: {
    description: "Las manos (proxy de la posición de la barra o agarre de vela) se mantienen de forma sostenida por encima de los hombros.",
    impact: "Reduce la palanca de control sobre la vela/kite y puede sobrecargar los hombros.",
    howToFix: "Baja las manos a la altura del pecho o por debajo, manteniendo los brazos más relajados y cercanos al cuerpo.",
    exercises: ["Práctica de postura de brazos en tierra frente a espejo o video"],
  },
  BARRA_MUY_BAJA: {
    description: "Las manos (proxy de la posición de la barra o agarre de vela) se mantienen de forma sostenida muy por debajo de la cadera.",
    impact: "Puede generar pérdida de control de potencia y sobrecarga en la zona lumbar por la postura flexionada asociada.",
    howToFix: "Sube ligeramente las manos hacia la altura de la cadera/cintura mientras navegas.",
    exercises: ["Ejercicios de conciencia postural con retroalimentación en video"],
  },
  POSTURA_INCORRECTA: {
    description: "Indicador compuesto: se detectaron dos o más errores específicos de forma simultánea en la misma sesión, lo que sugiere una postura general a revisar (no es un error independiente, resume los de arriba).",
    impact: "La combinación de varios desajustes suele tener mayor efecto conjunto que cada uno por separado.",
    howToFix: "Revisa primero el error de mayor nivel de esta lista; suele ser el que más influye en los demás.",
    exercises: ["Sesión de análisis postural completa en tierra antes de la siguiente salida al agua"],
  },
};

// Con esta mejora, los 11 errores del módulo original ya están cubiertos.
export const ERROR_NOT_DETECTED_YET: { type: string; reason: string }[] = [];
