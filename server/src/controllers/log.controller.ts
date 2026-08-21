import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: Only ADMIN users can view activity logs.' });
      return;
    }

    const take = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
    });

    res.status(200).json({ logs });
  } catch (error) {
    console.error('Fetch activity logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
