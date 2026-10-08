import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { responseBatcher } from '../utils/responseBatcher';
import { isSubmitAllowed, recordResponder } from '../utils/liveState';



/**
 * Resolve the participant for a request and check the join token issued at join
 * time. Rows created before the token column existed have a null token and are
 * still accepted on id alone.
 */
async function authenticateParticipant(participantId: string, joinToken: unknown) {
  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant) return null;
  if (participant.joinToken && participant.joinToken !== joinToken) return null;
  return participant;
}

function generateJoinToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const joinEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode, name, joinToken } = req.body;

    if (!roomCode || !name) {
      res.status(400).json({ message: 'Room code and participant name are required.' });
      return;
    }

    const formattedCode = String(roomCode).trim().toUpperCase();
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

    if (joinToken) {
      const existing = await prisma.participant.findUnique({
        where: { joinToken: String(joinToken) },
      });

      if (existing && existing.eventId === event.id) {
        if (existing.name !== trimmedName) {
           await prisma.participant.update({
             where: { id: existing.id },
             data: { name: trimmedName }
           });
           existing.name = trimmedName;
        }

        res.status(200).json({
          message: 'Rejoined event successfully',
          participant: {
            id: existing.id,
            name: existing.name,
            joinToken: existing.joinToken,
          },
          event,
        });
        return;
      }
    }

    try {
      const participant = await prisma.participant.create({
        data: {
          eventId: event.id,
          name: trimmedName,
          joinToken: generateJoinToken(),
        },
      });

      res.status(201).json({
        message: 'Joined event successfully',
        participant: {
          id: participant.id,
          name: participant.name,
          joinToken: participant.joinToken,
        },
        event,
      });
    } catch (error) {
      console.error('Create participant error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const submitResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantId, questionId, selectedOption, joinToken } = req.body;

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
      authenticateParticipant(String(participantId), joinToken),
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

    // The persisted start time is the fallback when in-memory state was lost to a
    // restart, so a reboot cannot quietly disable time limits.
    const timed = await isSubmitAllowed(question.eventId, questionId, {
      startedAt: question.event.currentQuestionStartedAt,
      timeLimit: question.timeLimit,
    });
    if (!timed.ok) {
      res.status(400).json({ message: timed.message });
      return;
    }

    const isCorrect = question.correctOption === optionIndex;

    responseBatcher.addResponse({
      questionId,
      participantId: participant.id,
      selectedOption: optionIndex,
      isCorrect,
    });

    const uniqueCount = await recordResponder(question.eventId, participant.id);

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
