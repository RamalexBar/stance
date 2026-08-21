import { Discipline, Prisma, RoleName } from "@prisma/client";
import { prisma } from "../../shared/prisma";

const userWithRelations = {
  roles: { include: { role: true } },
  disciplines: true,
} satisfies Prisma.UserInclude;

export type UserWithRelations = Prisma.UserGetPayload<{
  include: typeof userWithRelations;
}>;

export const userRepository = {
  findByFirebaseUid(firebaseUid: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { firebaseUid },
      include: userWithRelations,
    });
  },

  findById(id: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { id },
      include: userWithRelations,
    });
  },

  async createFromFirebase(params: {
    firebaseUid: string;
    email: string;
    provider: "EMAIL" | "GOOGLE" | "APPLE" | "FACEBOOK";
    defaultRole?: RoleName;
  }): Promise<UserWithRelations> {
    return prisma.user.create({
      data: {
        firebaseUid: params.firebaseUid,
        email: params.email,
        provider: params.provider,
        roles: {
          create: {
            role: { connect: { name: params.defaultRole ?? "ATHLETE" } },
          },
        },
      },
      include: userWithRelations,
    });
  },

  async updateProfile(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      age?: number;
      weightKg?: number;
      heightCm?: number;
      gender?: Prisma.UserUpdateInput["gender"];
      level?: Prisma.UserUpdateInput["level"];
      dominance?: Prisma.UserUpdateInput["dominance"];
      disciplines?: Discipline[];
      homeSpotName?: string;
      homeSpotLat?: number;
      homeSpotLon?: number;
      homeSpotSeaDirectionDeg?: number;
    }
  ): Promise<UserWithRelations> {
    const { disciplines, ...profileFields } = data;

    return prisma.$transaction(async (tx) => {
      if (disciplines) {
        await tx.userDiscipline.deleteMany({ where: { userId: id } });
        await tx.userDiscipline.createMany({
          data: disciplines.map((discipline) => ({ userId: id, discipline })),
        });
      }

      return tx.user.update({
        where: { id },
        data: profileFields,
        include: userWithRelations,
      });
    });
  },
};
