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
  current: {
    time: string;
    windSpeedKmh: number;
    windGustsKmh: number;
    windDirectionFromDeg: number;
    shore: ShoreClassificationResult;
    levelCaution: string | null;
  };
  hourly: {
    time: string;
    windSpeedKmh: number;
    windGustsKmh: number;
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

  async getToday(userId: string, disciplineOverride?: Discipline): Promise<TodayWindResult> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Perfil no encontrado");

    if (user.homeSpotLat == null || user.homeSpotLon == null || user.homeSpotSeaDirectionDeg == null) {
      throw new AppError(
        "Configura tu spot habitual en el perfil (ubicación y orientación del mar) para ver el viento de hoy.",
        409
      );
    }

    const forecast = await fetchWindForecast(user.homeSpotLat, user.homeSpotLon);
    const seaDirectionDeg = user.homeSpotSeaDirectionDeg;

    const discipline = disciplineOverride ?? (user.disciplines[0]?.discipline as Discipline | undefined) ?? "KITESURF";

    const currentShore = classifyShoreWind(forecast.current.windDirectionFromDeg, seaDirectionDeg);

    return {
      spot: {
        name: user.homeSpotName,
        lat: user.homeSpotLat,
        lon: user.homeSpotLon,
        seaDirectionDeg,
      },
      current: {
        time: forecast.current.time,
        windSpeedKmh: forecast.current.windSpeedKmh,
        windGustsKmh: forecast.current.windGustsKmh,
        windDirectionFromDeg: forecast.current.windDirectionFromDeg,
        shore: currentShore,
        levelCaution: levelCaution(
          user.level,
          forecast.current.windSpeedKmh,
          forecast.current.windGustsKmh,
          currentShore.safetyLevel
        ),
      },
      hourly: forecast.hourly.map((h) => {
        const hourShore = classifyShoreWind(h.windDirectionFromDeg, seaDirectionDeg);
        return {
          time: h.time,
          windSpeedKmh: h.windSpeedKmh,
          windGustsKmh: h.windGustsKmh,
          windDirectionFromDeg: h.windDirectionFromDeg,
          shore: hourShore.classification,
          shoreSafetyLevel: hourShore.safetyLevel,
          band: classifyWindSpeedBand(h.windSpeedKmh).id,
          gustBand: classifyWindSpeedBand(h.windGustsKmh).id,
        };
      }),
      recommendation: recommendEquipment({
        discipline,
        weightKg: user.weightKg,
        level: user.level,
        windSpeedKmh: forecast.current.windSpeedKmh,
      }),
    };
  },
};
