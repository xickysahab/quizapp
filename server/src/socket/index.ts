import { Server, Socket } from 'socket.io';
import prisma from '../config/prisma';
import { verifyToken } from '../utils/auth';
import { canManageEvent, findUser } from '../utils/eventAccess';
import { responseBatcher } from '../utils/responseBatcher';
import {
  endLiveEvent,
  getLiveQuestion,
  getResponderCount,
  recordResponder,
  startLiveQuestion,
  toPublicQuestion,
} from '../utils/liveState';

type AuthedSocket = Socket & {
  data: {
    user?: { userId: string; email: string };
  };
};

async function requireEventHost(socket: AuthedSocket, eventId: string) {
  const authed = socket.data.user;
  if (!authed || !eventId) return null;

  const [user, event] = await Promise.all([
    findUser(authed.userId),
    prisma.event.findUnique({ where: { id: eventId } }),
  ]);

  if (!user || !event || !canManageEvent(user, event)) return null;
  return { user, event };
}

export const initializeSocket = (io: Server) => {
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next();
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }
    socket.data.user = decoded;
    next();
  });

  io.on('connection', (socket: AuthedSocket) => {
    socket.on('host:join', async (eventId: string) => {
      try {
        const access = await requireEventHost(socket, eventId);
        if (!access) return;

        socket.join(`host-${eventId}`);

        const participantCount = await prisma.participant.count({ where: { eventId } });
        const live = getLiveQuestion(eventId);

        socket.emit('host:sync', {
          participantCount,
          responseCount: getResponderCount(eventId),
          startedAt: live?.startedAt ?? null,
          timeLimit: live?.timeLimit ?? null,
          currentQuestionId: access.event.currentQuestionId,
          isLive: access.event.isLive,
        });
      } catch (error) {
        console.error('host:join error:', error);
      }
    });

    socket.on('participant:join', async (eventId: string, participantId: string) => {
      try {
        if (!eventId || !participantId) return;

        const participant = await prisma.participant.findUnique({ where: { id: participantId } });
        if (!participant || participant.eventId !== eventId) return;

        socket.join(`event-${eventId}`);

        await prisma.participant.update({
          where: { id: participantId },
          data: { socketId: socket.id },
        });

        const event = await prisma.event.findUnique({
          where: { id: eventId },
          include: { questions: true },
        });

        if (event?.isLive && event.currentQuestionId) {
          const activeQuestion = event.questions.find((q) => q.id === event.currentQuestionId);
          if (activeQuestion) {
            const response = await prisma.response.findUnique({
              where: {
                questionId_participantId: {
                  questionId: activeQuestion.id,
                  participantId,
                },
              },
            });

            const live = getLiveQuestion(eventId);

            socket.emit('participant:questionActive', {
              question: toPublicQuestion(activeQuestion),
              selectedOption: response ? response.selectedOption : null,
              startedAt: live?.startedAt ?? null,
            });
          }
        }

        const participantCount = await prisma.participant.count({ where: { eventId } });
        io.to(`host-${eventId}`).emit('host:participantCount', { count: participantCount });
      } catch (error) {
        console.error('participant:join error:', error);
      }
    });

    socket.on('host:nextQuestion', async (eventId: string, questionId: string) => {
      try {
        const access = await requireEventHost(socket, eventId);
        if (!access || !questionId) return;

        const question = await prisma.question.findFirst({
          where: { id: questionId, eventId },
        });
        if (!question) return;

        startLiveQuestion(eventId, question.id, question.timeLimit);

        await prisma.event.update({
          where: { id: eventId },
          data: { currentQuestionId: question.id, isLive: true },
        });

        const live = getLiveQuestion(eventId);
        io.to(`event-${eventId}`).emit('participant:questionActive', {
          question: toPublicQuestion(question),
          startedAt: live?.startedAt ?? Date.now(),
        });
        io.to(`host-${eventId}`).emit('host:questionStarted', {
          questionId: question.id,
          startedAt: live?.startedAt ?? Date.now(),
          timeLimit: question.timeLimit,
        });
        io.to(`host-${eventId}`).emit('host:responseCount', { count: 0 });
      } catch (error) {
        console.error('host:nextQuestion error:', error);
      }
    });

    socket.on('host:endQuiz', async (eventId: string, ack?: (result: { ok: boolean }) => void) => {
      try {
        const access = await requireEventHost(socket, eventId);
        if (!access) {
          if (typeof ack === 'function') ack({ ok: false });
          return;
        }

        await responseBatcher.flush();
        endLiveEvent(eventId);

        io.to(`event-${eventId}`).emit('participant:quizEnded');

        await prisma.event.update({
          where: { id: eventId },
          data: { isLive: false, currentQuestionId: null },
        });

        if (typeof ack === 'function') ack({ ok: true });
      } catch (error) {
        console.error('host:endQuiz error:', error);
        if (typeof ack === 'function') ack({ ok: false });
      }
    });

    socket.on('participant:submitAnswer', async (eventId: string, participantId: string) => {
      try {
        if (!eventId || !participantId) return;
        const participant = await prisma.participant.findUnique({ where: { id: participantId } });
        if (!participant || participant.eventId !== eventId) return;

        const count = recordResponder(eventId, participantId);
        io.to(`host-${eventId}`).emit('host:responseCount', { count });
      } catch (error) {
        console.error('participant:submitAnswer error:', error);
      }
    });

    socket.on('disconnect', () => {
      // socketId cleanup is optional; next join overwrites it
    });
  });
};
