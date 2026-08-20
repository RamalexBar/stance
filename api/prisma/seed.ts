import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles: RoleName[] = ["ADMIN", "TRAINER", "ATHLETE", "SCHOOL", "GUEST"];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Roles asegurados: ${roles.join(", ")}`);
}

main()
  .catch((err) => {
    console.error("Error corriendo el seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
