import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { responseBatcher } from '../utils/responseBatcher';
import { isSubmitAllowed, recordResponder } from '../utils/liveState';

export const joinEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode, name } = req.body;

    if (!roomCode || !name) {
      res.status(400).json({ message: 'Room code and participant name are required.' });
      return;
    }

    const formattedCode = roomCode.trim().toUpperCase();
    const trimmedName = String(name).trim().slice(0, 25);

    if (trimmedName.length < 2) {
      res.status(400).json({ message: 'Please enter a name of at least 2 characters.' });
      return;
    }

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

    const existing = await prisma.participant.findFirst({
      where: { eventId: event.id, name: trimmedName },
    });

    const participant = existing
      ? existing
      : await prisma.participant.create({
          data: {
            eventId: event.id,
            name: trimmedName,
          },
        });

    res.status(201).json({
      message: existing ? 'Rejoined event successfully' : 'Joined event successfully',
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

    const optionIndex = Number(selectedOption);
    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      res.status(400).json({ message: 'Invalid selected option.' });
      return;
    }

    const [participant, question] = await Promise.all([
      prisma.participant.findUnique({ where: { id: participantId } }),
      prisma.question.findUnique({
        where: { id: questionId },
        include: { event: true },
      }),
    ]);

    if (!participant || !question) {
      res.status(404).json({ message: 'Participant or question not found.' });
      return;
    }

    if (participant.eventId !== question.eventId) {
      res.status(403).json({ message: 'Participant does not belong to this event.' });
      return;
    }

    if (optionIndex >= question.options.length) {
      res.status(400).json({ message: 'Invalid selected option.' });
      return;
    }

    if (!question.event.isLive || question.event.currentQuestionId !== questionId) {
      res.status(400).json({ message: 'This question is no longer active.' });
      return;
    }

    const timed = isSubmitAllowed(question.eventId, questionId);
    if (!timed.ok) {
      res.status(400).json({ message: timed.message });
      return;
    }

    const isCorrect = question.correctOption === optionIndex;

    responseBatcher.addResponse({
      questionId,
      participantId,
      selectedOption: optionIndex,
      isCorrect,
    });

    const uniqueCount = recordResponder(question.eventId, participantId);

    res.status(200).json({
      message: 'Response queued successfully',
      batched: true,
      uniqueCount,
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
