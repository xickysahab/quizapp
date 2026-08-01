import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateRoomCode } from '../utils/roomCode';

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    const hostId = req.user?.userId;

    if (!title) {
      res.status(400).json({ message: 'Event title is required.' });
      return;
    }

    if (!hostId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Ensure host user exists in DB before creating event
    try {
      const existingHost = await prisma.user.findUnique({ where: { id: hostId } });
      if (!existingHost) {
        await prisma.user.create({
          data: {
            id: hostId,
            name: 'Admin Host',
            email: req.user?.email || 'admin@admin.com',
            password: 'admin',
          },
        });
      }
    } catch (e) {
      console.warn('Could not check/create host user in DB:', e);
    }

    // Generate unique room code
    let roomCode = generateRoomCode();
    let existingRoom = await prisma.event.findUnique({ where: { roomCode } });

    while (existingRoom) {
      roomCode = generateRoomCode();
      existingRoom = await prisma.event.findUnique({ where: { roomCode } });
    }

    const event = await prisma.event.create({
      data: {
        title,
        roomCode,
        hostId,
      },
    });

    res.status(201).json({
      message: 'Event created successfully',
      event,
    });
  } catch (error: any) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message || String(error) });
  }
};

export const getHostEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hostId = req.user?.userId;

    if (!hostId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const events = await prisma.event.findMany({
      where: { hostId },
      include: {
        _count: {
          select: { questions: true, participants: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ events });
  } catch (error) {
    console.error('Get host events error:', error);
    res.status(200).json({ events: [] });
  }
};

export const getEventById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    res.status(200).json({ event });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const hostId = req.user?.userId;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    if (event.hostId !== hostId) {
      res.status(403).json({ message: 'Forbidden. You do not own this event.' });
      return;
    }

    await prisma.event.delete({ where: { id } });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
