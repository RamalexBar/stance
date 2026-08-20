import { injuriesRepository } from "./injuries.repository";
import { CreateInjuryInput } from "./injuries.dto";
import { ForbiddenError, NotFoundError } from "../../shared/errors";

export const injuriesService = {
  create(userId: string, input: CreateInjuryInput) {
    return injuriesRepository.create(userId, input);
  },

  list(userId: string) {
    return injuriesRepository.findManyByUser(userId);
  },

  async delete(userId: string, injuryId: string) {
    const injury = await injuriesRepository.findById(injuryId);
    if (!injury) throw new NotFoundError("Registro de lesión no encontrado");
    if (injury.userId !== userId) throw new ForbiddenError();
    await injuriesRepository.delete(injuryId);
  },
};
