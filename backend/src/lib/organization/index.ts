import { OrganizationService } from "./organization.service";
import { PrismaOrganizationStore } from "./prisma-store";

let singleton: OrganizationService | null = null;

export function getOrganizationService(): OrganizationService {
  singleton ??= new OrganizationService(new PrismaOrganizationStore());
  return singleton;
}
