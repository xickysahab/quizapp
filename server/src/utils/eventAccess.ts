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

/** True when this user may manage the event. Collapses the load-user + check pair. */
export async function canManage(
  userId: string | undefined,
  event: { hostId: string }
): Promise<boolean> {
  const user = await findUser(userId);
  return !!user && canManageEvent(user, event);
}
