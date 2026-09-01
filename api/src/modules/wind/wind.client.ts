import { AppError } from "../../shared/errors";

// Open-Meteo: API pública gratuita, sin API key. https://open-meteo.com
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export interface WindForecast {
  current: {
    time: string;
    windSpeedKmh: number;
    windDirectionFromDeg: number;
    windGustsKmh: number;
  };
  hourly: {
    time: string;
    windSpeedKmh: number;
    windDirectionFromDeg: number;
    windGustsKmh: number;
  }[];
}

export interface SpotSearchResult {
  name: string;
  admin1: string | null;
  country: string | null;
  lat: number;
  lon: number;
}

export async function fetchWindForecast(lat: number, lon: number): Promise<WindForecast> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "wind_speed_10m,wind_direction_10m,wind_gusts_10m");
  url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m,wind_gusts_10m");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("wind_speed_unit", "kmh");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new AppError("No se pudo obtener el pronóstico de viento (Open-Meteo).", 502);
  }
  const data = (await response.json()) as {
    current: { time: string; wind_speed_10m: number; wind_direction_10m: number; wind_gusts_10m: number };
    hourly: { time: string[]; wind_speed_10m: number[]; wind_direction_10m: number[]; wind_gusts_10m: number[] };
  };

  return {
    current: {
      time: data.current.time,
      windSpeedKmh: data.current.wind_speed_10m,
      windDirectionFromDeg: data.current.wind_direction_10m,
      windGustsKmh: data.current.wind_gusts_10m,
    },
    hourly: data.hourly.time.map((time, i) => ({
      time,
      windSpeedKmh: data.hourly.wind_speed_10m[i],
      windDirectionFromDeg: data.hourly.wind_direction_10m[i],
      windGustsKmh: data.hourly.wind_gusts_10m[i],
    })),
  };
}

export async function searchSpots(query: string): Promise<SpotSearchResult[]> {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "es");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new AppError("No se pudo buscar el spot (Open-Meteo Geocoding).", 502);
  }
  const data = (await response.json()) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  };

  return (data.results ?? []).map((r) => ({
    name: r.name,
    admin1: r.admin1 ?? null,
    country: r.country ?? null,
    lat: r.latitude,
    lon: r.longitude,
  }));
}
