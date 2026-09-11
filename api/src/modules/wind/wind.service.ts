import { Discipline } from "@prisma/client";
import { userRepository } from "../users/user.repository";
import { fetchWindForecast, searchSpots, SpotSearchResult } from "./wind.client";
import {
  classifyShoreWind,
  classifyWindSpeedBand,
  recommendEquipment,
  levelCaution,
  EquipmentRecommendation,
  ShoreClassificationResult,
  WindSpeedBandId,
} from "./wind.compute";
import { AppError, NotFoundError } from "../../shared/errors";

export interface TodayWindResult {
  spot: { name: string | null; lat: number; lon: number; seaDirectionDeg: number };
  date: string;
  isToday: boolean;
  current: {
    time: string;
    windSpeedKt: number;
    windGustsKt: number;
    windDirectionFromDeg: number;
    shore: ShoreClassificationResult;
    levelCaution: string | null;
  };
  hourly: {
    time: string;
    windSpeedKt: number;
    windGustsKt: number;
    windDirectionFromDeg: number;
    shore: ShoreClassificationResult["classification"];
    shoreSafetyLevel: ShoreClassificationResult["safetyLevel"];
    band: WindSpeedBandId;
    gustBand: WindSpeedBandId;
  }[];
  recommendation: EquipmentRecommendation;
}

export const windService = {
  async searchSpots(query: string): Promise<SpotSearchResult[]> {
    if (!query || query.trim().length < 2) {
      throw new AppError("Escribe al menos 2 caracteres para buscar un spot.", 400);
    }
    return searchSpots(query.trim());
  },

  async getToday(userId: string, disciplineOverride?: Discipline, dateISO?: string): Promise<TodayWindResult> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Perfil no encontrado");

    if (user.homeSpotLat == null || user.homeSpotLon == null || user.homeSpotSeaDirectionDeg == null) {
      throw new AppError(
        "Configura tu spot habitual en el perfil (ubicación y orientación del mar) para ver el viento de hoy.",
        409
      );
    }

    // Se pide toda la ventana disponible (7 días) y se filtra por día local del
    // spot (Open-Meteo ya devuelve las horas en su huso horario, timezone=auto),
    // en vez de pedir un rango exacto — así "hoy" y "en 5 días" comparten la
    // misma llamada y la misma lógica de filtrado.
    const forecast = await fetchWindForecast(user.homeSpotLat, user.homeSpotLon, 7);
    const seaDirectionDeg = user.homeSpotSeaDirectionDeg;

    const todayLocalDate = forecast.current.time.slice(0, 10);
    const targetDate = dateISO ?? todayLocalDate;
    const isToday = targetDate === todayLocalDate;

    const dayHours = forecast.hourly.filter((h) => h.time.slice(0, 10) === targetDate);
    if (dayHours.length === 0) {
      throw new AppError(
        `No hay pronóstico disponible para ${targetDate}. El rango disponible va de hoy (${todayLocalDate}) hasta 6 días después.`,
        400
      );
    }

    // Para "hoy" se usa la lectura en vivo; para otro día no existe un "ahora",
    // así que se toma la hora de mediodía como referencia representativa del día.
    const referenceHour = isToday
      ? forecast.current
      : dayHours.find((h) => h.time.slice(11, 13) === "12") ?? dayHours[Math.floor(dayHours.length / 2)];

    const discipline = disciplineOverride ?? (user.disciplines[0]?.discipline as Discipline | undefined) ?? "KITESURF";

    const currentShore = classifyShoreWind(referenceHour.windDirectionFromDeg, seaDirectionDeg);

    return {
      spot: {
        name: user.homeSpotName,
        lat: user.homeSpotLat,
        lon: user.homeSpotLon,
        seaDirectionDeg,
      },
      date: targetDate,
      isToday,
      current: {
        time: referenceHour.time,
        windSpeedKt: referenceHour.windSpeedKt,
        windGustsKt: referenceHour.windGustsKt,
        windDirectionFromDeg: referenceHour.windDirectionFromDeg,
        shore: currentShore,
        levelCaution: levelCaution(
          user.level,
          referenceHour.windSpeedKt,
          referenceHour.windGustsKt,
          currentShore.safetyLevel
        ),
      },
      hourly: dayHours.map((h) => {
        const hourShore = classifyShoreWind(h.windDirectionFromDeg, seaDirectionDeg);
        return {
          time: h.time,
          windSpeedKt: h.windSpeedKt,
          windGustsKt: h.windGustsKt,
          windDirectionFromDeg: h.windDirectionFromDeg,
          shore: hourShore.classification,
          shoreSafetyLevel: hourShore.safetyLevel,
          band: classifyWindSpeedBand(h.windSpeedKt).id,
          gustBand: classifyWindSpeedBand(h.windGustsKt).id,
        };
      }),
      recommendation: recommendEquipment({
        discipline,
        weightKg: user.weightKg,
        level: user.level,
        windSpeedKt: referenceHour.windSpeedKt,
      }),
    };
  },
};
