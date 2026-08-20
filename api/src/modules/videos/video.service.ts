import { randomUUID } from "crypto";
import { videoRepository } from "./video.repository";
import { supabaseAdmin, VIDEOS_BUCKET } from "../../config/supabase";
import { CreateVideoInput, CompleteVideoInput } from "./video.dto";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors";
import { subscriptionsService } from "../subscriptions/subscriptions.service";
import { prisma } from "../../shared/prisma";

const SIGNED_PLAYBACK_EXPIRY_SECONDS = 60 * 60; // 1 hora

function inferExtension(originalName: string): string {
  const match = originalName.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "mp4";
}

export interface VideoDto {
  id: string;
  discipline: string;
  source: string;
  status: string;
  originalName: string | null;
  durationSeconds: number | null;
  createdAt: Date;
}

function toDto(video: {
  id: string;
  discipline: string;
  source: string;
  status: string;
  originalName: string | null;
  durationSeconds: number | null;
  createdAt: Date;
}): VideoDto {
  return {
    id: video.id,
    discipline: video.discipline,
    source: video.source,
    status: video.status,
    originalName: video.originalName,
    durationSeconds: video.durationSeconds,
    createdAt: video.createdAt,
  };
}

export const videoService = {
  /**
   * Paso 1 de la subida: crea el registro en BD (status PENDING) y devuelve
   * una URL firmada de subida directa a Supabase Storage. El cliente sube
   * el archivo a esa URL sin pasar por este servidor.
   */
  async requestUpload(userId: string, input: CreateVideoInput) {
    const videoId = randomUUID();
    const extension = inferExtension(input.originalName);
    const storagePath = `${userId}/${videoId}.${extension}`;

    const { data, error } = await supabaseAdmin.storage
      .from(VIDEOS_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error("Supabase createSignedUploadUrl falló:", error?.message);
      throw new AppError("No se pudo generar la URL de subida", 502);
    }

    // El chequeo del límite del plan y la creación del registro se hacen en la
    // misma transacción Serializable: si dos subidas concurrentes del mismo
    // usuario pasan el chequeo a la vez, Postgres aborta una de las dos en
    // vez de dejar que ambas superen el límite mensual del plan.
    const video = await prisma.$transaction(
      async (tx) => {
        await subscriptionsService.assertCanUploadVideo(userId, tx);
        return videoRepository.create(
          {
            userId,
            discipline: input.discipline,
            source: input.source,
            storagePath,
            originalName: input.originalName,
            fileSizeBytes: input.fileSizeBytes,
          },
          tx
        );
      },
      { isolationLevel: "Serializable" }
    );

    return {
      videoId: video.id,
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
      bucket: VIDEOS_BUCKET,
      expiresInSeconds: 60 * 5,
    };
  },

  /** Paso 2: el cliente confirma que la subida a Supabase terminó con éxito. */
  async completeUpload(userId: string, videoId: string, input: CompleteVideoInput) {
    const video = await videoRepository.findById(videoId);
    if (!video) throw new NotFoundError("Video no encontrado");
    if (video.userId !== userId) throw new ForbiddenError();

    const updated = await videoRepository.markUploaded(videoId, input.durationSeconds);
    return toDto(updated);
  },

  async markFailed(userId: string, videoId: string) {
    const video = await videoRepository.findById(videoId);
    if (!video) throw new NotFoundError("Video no encontrado");
    if (video.userId !== userId) throw new ForbiddenError();

    const updated = await videoRepository.markFailed(videoId);
    return toDto(updated);
  },

  async listMine(userId: string) {
    const videos = await videoRepository.findManyByUser(userId);
    return videos.map(toDto);
  },

  /** Devuelve metadata + una URL firmada de LECTURA válida por 1 hora, para reproducir. */
  async getPlayable(userId: string, videoId: string) {
    const video = await videoRepository.findById(videoId);
    if (!video) throw new NotFoundError("Video no encontrado");
    if (video.userId !== userId) throw new ForbiddenError();

    const { data, error } = await supabaseAdmin.storage
      .from(VIDEOS_BUCKET)
      .createSignedUrl(video.storagePath, SIGNED_PLAYBACK_EXPIRY_SECONDS);

    if (error || !data) {
      console.error("Supabase createSignedUrl falló:", error?.message);
      throw new AppError("No se pudo generar la URL de reproducción", 502);
    }

    return { ...toDto(video), playbackUrl: data.signedUrl };
  },
};
