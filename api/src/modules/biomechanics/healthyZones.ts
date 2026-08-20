// Fuente única de verdad para los umbrales biomecánicos usados tanto en la
// detección de errores (Fase 6) como en la puntuación de comparación (Fase 7).
// Cambiar un umbral aquí lo actualiza en ambos lugares consistentemente.

export const HEALTHY_ZONES = {
  kneeAngleMaxDeg: 165, // por encima: "rodillas rígidas"
  balanceOffsetAbsMax: 0.35, // por encima (abs): CG adelantado/retrasado
  shoulderDiffMaxDeg: 20, // por encima: hombros desalineados
  hipAngleMinDeg: 95, // por debajo: proxy de espalda curvada
  handHeightMinRelative: -0.2, // por debajo: barra muy alta
  handHeightMaxRelative: 1.3, // por encima: barra muy baja
};
