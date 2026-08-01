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

    await prisma.event.delete({ where: { id } });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateEventConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { concludeConfig } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { concludeConfig },
    });

    res.status(200).json({ message: 'Event config updated successfully', event: updatedEvent });
  } catch (error) {
    console.error('Update event config error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const clearEventData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    // Check if user is an ADMIN
    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: Only ADMIN users can clear data.' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    if (event.hostId !== user.id) {
      res.status(403).json({ message: 'Forbidden: You do not own this event.' });
      return;
    }

    // Delete participants. Because of onDelete: Cascade in schema, this will automatically delete all Responses.
    await prisma.participant.deleteMany({ where: { eventId: id } });

    // Optionally reset the current question pointer
    await prisma.event.update({
      where: { id },
      data: { currentQuestionId: null }
    });

    res.status(200).json({ message: 'Quiz data cleared successfully' });
  } catch (error) {
    console.error('Clear event data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
