import prisma from '../config/prisma';

export async function findUser(userId: string | undefined) {
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export function canManageEvent(
  user: { id: string; role: string },
  event: { hostId: string }
): boolean {
  return user.role === 'ADMIN' || event.hostId === user.id;
}
