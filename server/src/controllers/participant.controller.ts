import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const joinEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode, name } = req.body;

    if (!roomCode || !name) {
      res.status(400).json({ message: 'Room code and participant name are required.' });
      return;
    }

    const formattedCode = roomCode.trim().toUpperCase();

    const event = await prisma.event.findUnique({
      where: { roomCode: formattedCode },
      select: {
        id: true,
        title: true,
        isLive: true,
        currentQuestionId: true,
      },
    });

    if (!event) {
      res.status(404).json({ message: 'Invalid room code. Event not found.' });
      return;
    }

    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        name: name.trim(),
      },
    });

    res.status(201).json({
      message: 'Joined event successfully',
      participant: {
        id: participant.id,
        name: participant.name,
      },
      event,
    });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const submitResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantId, questionId, selectedOption } = req.body;

    if (!participantId || !questionId || selectedOption === undefined) {
      res.status(400).json({ message: 'Participant ID, question ID, and selected option are required.' });
      return;
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      res.status(404).json({ message: 'Question not found.' });
      return;
    }

    // Check if participant already answered
    const existingResponse = await prisma.response.findUnique({
      where: {
        questionId_participantId: {
          questionId,
          participantId,
        },
      },
    });

    if (existingResponse) {
      res.status(400).json({ message: 'You have already submitted an answer for this question.' });
      return;
    }

    const isCorrect = question.correctOption === Number(selectedOption);

    const response = await prisma.response.create({
      data: {
        participantId,
        questionId,
        selectedOption: Number(selectedOption),
        isCorrect,
      },
    });

    res.status(201).json({ message: 'Response submitted successfully', response });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
