import { userRepository, UserWithRelations } from "./user.repository";
import { UpdateProfileInput } from "./user.dto";
import { FirebaseUserPayload } from "../../middlewares/auth.middleware";
import { NotFoundError } from "../../shared/errors";

export interface ProfileDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  gender: string | null;
  level: string | null;
  dominance: string | null;
  disciplines: string[];
  roles: string[];
  createdAt: Date;
  homeSpotName: string | null;
  homeSpotLat: number | null;
  homeSpotLon: number | null;
  homeSpotSeaDirectionDeg: number | null;
}

function toProfileDto(user: UserWithRelations): ProfileDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    age: user.age,
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    gender: user.gender,
    level: user.level,
    dominance: user.dominance,
    disciplines: user.disciplines.map((d) => d.discipline),
    roles: user.roles.map((r) => r.role.name),
    createdAt: user.createdAt,
    homeSpotName: user.homeSpotName,
    homeSpotLat: user.homeSpotLat,
    homeSpotLon: user.homeSpotLon,
    homeSpotSeaDirectionDeg: user.homeSpotSeaDirectionDeg,
  };
}

export const userService = {
  /**
   * Se llama en cada request autenticado. Si es la primera vez que este
   * usuario de Firebase llega al backend, se crea su perfil automáticamente
   * con el rol ATHLETE por defecto.
   */
  async getOrCreateProfile(firebaseUser: FirebaseUserPayload): Promise<ProfileDto> {
    let user = await userRepository.findByFirebaseUid(firebaseUser.uid);

    if (!user) {
      user = await userRepository.createFromFirebase({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        provider: "EMAIL",
      });
    }

    return toProfileDto(user);
  },

  async getProfileByFirebaseUid(firebaseUid: string): Promise<ProfileDto> {
    const user = await userRepository.findByFirebaseUid(firebaseUid);
    if (!user) throw new NotFoundError("Perfil no encontrado");
    return toProfileDto(user);
  },

  async updateProfile(
    firebaseUid: string,
    input: UpdateProfileInput
  ): Promise<ProfileDto> {
    const existing = await userRepository.findByFirebaseUid(firebaseUid);
    if (!existing) throw new NotFoundError("Perfil no encontrado");

    const updated = await userRepository.updateProfile(existing.id, input);
    return toProfileDto(updated);
  },
};
