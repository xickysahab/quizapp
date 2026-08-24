import { Server, Socket } from 'socket.io';
import prisma from '../config/prisma';
import { verifyToken } from '../utils/auth';
import { canManageEvent, findUser } from '../utils/eventAccess';
import { responseBatcher } from '../utils/responseBatcher';
import {
  dropConnection,
  endLiveEvent,
  getConnectedCount,
  getLiveQuestion,
  getResponderCount,
  recordResponder,
  rehydrateLiveQuestion,
  startLiveQuestion,
  toPublicQuestion,
  trackConnection,
} from '../utils/liveState';

type AuthedSocket = Socket & {
  data: {
    user?: { userId: string; email: string };
    // Set once the participant proves ownership in `participant:join`, so the
    // per-answer path never has to hit the database again.
    participant?: { id: string; eventId: string };
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

/**
 * Load the participant named by the socket payload, rejecting anyone who cannot
 * present the join token issued when the row was created. Rows predating the
 * token column have a null token and stay reachable by id alone.
 */
async function authenticateParticipant(eventId: string, participantId: string, joinToken?: string) {
  if (!eventId || !participantId) return null;

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant || participant.eventId !== eventId) return null;
  if (participant.joinToken && participant.joinToken !== joinToken) return null;

  return participant;
}

type HostCounters = { responseCount?: number; participantCount?: number };

const HOST_UPDATE_INTERVAL_MS = 1000;

export const initializeSocket = (io: Server) => {
  // Counters carry an absolute value, not a delta, so collapsing a burst down to
  // one emit per second per event is lossless. Without this a 1500-person answer
  // spike becomes 1500 separate emits to the host.
  const pendingHostCounters = new Map<string, HostCounters>();

  const queueHostCounters = (eventId: string, counters: HostCounters) => {
    const pending = pendingHostCounters.get(eventId);
    if (pending) {
      Object.assign(pending, counters);
    } else {
      pendingHostCounters.set(eventId, { ...counters });
    }
  };

  const counterTimer = setInterval(() => {
    if (pendingHostCounters.size === 0) return;
    for (const [eventId, counters] of pendingHostCounters) {
      if (counters.responseCount !== undefined) {
        io.to(`host-${eventId}`).emit('host:responseCount', { count: counters.responseCount });
      }
      if (counters.participantCount !== undefined) {
        io.to(`host-${eventId}`).emit('host:participantCount', { count: counters.participantCount });
      }
    }
    pendingHostCounters.clear();
  }, HOST_UPDATE_INTERVAL_MS);
  counterTimer.unref();

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

        // After a restart the in-memory countdown is gone; rebuild it from the row.
        const { event } = access;
        if (event.isLive && event.currentQuestionId) {
          const question = await prisma.question.findUnique({
            where: { id: event.currentQuestionId },
            select: { timeLimit: true },
          });
          await rehydrateLiveQuestion(
            eventId,
            event.currentQuestionId,
            event.currentQuestionStartedAt,
            question?.timeLimit ?? null
          );
        }

        const [live, participantCount, responseCount] = await Promise.all([
          getLiveQuestion(eventId),
          getConnectedCount(eventId),
          getResponderCount(eventId),
        ]);

        socket.emit('host:sync', {
          participantCount,
          responseCount,
          startedAt: live?.startedAt ?? null,
          timeLimit: live?.timeLimit ?? null,
          currentQuestionId: event.currentQuestionId,
          isLive: event.isLive,
        });
      } catch (error) {
        console.error('host:join error:', error);
      }
    });

    socket.on('participant:join', async (eventId: string, participantId: string, joinToken?: string) => {
      try {
        const participant = await authenticateParticipant(eventId, participantId, joinToken);
        if (!participant) {
          socket.emit('participant:rejected', { message: 'This session is no longer valid. Please join again.' });
          return;
        }

        socket.join(`event-${eventId}`);
        socket.data.participant = { id: participant.id, eventId };

        // Only the active question is needed. Pulling `questions: true` here meant
        // every one of 1500 joins dragged the whole question set out of the
        // database, and during the join rush the quiz is not even live yet.
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { isLive: true, currentQuestionId: true, currentQuestionStartedAt: true },
        });

        if (event?.isLive && event.currentQuestionId) {
          const activeQuestion = await prisma.question.findUnique({
            where: { id: event.currentQuestionId },
          });

          if (activeQuestion) {
            const response = await prisma.response.findUnique({
              where: {
                questionId_participantId: {
                  questionId: activeQuestion.id,
                  participantId,
                },
              },
            });

            const live = await rehydrateLiveQuestion(
              eventId,
              activeQuestion.id,
              event.currentQuestionStartedAt,
              activeQuestion.timeLimit
            );

            socket.emit('participant:questionActive', {
              question: toPublicQuestion(activeQuestion),
              selectedOption: response ? response.selectedOption : null,
              startedAt: live?.startedAt ?? null,
            });
          }
        }

        // Counted in memory: a DB count here would run on every one of a few
        // hundred near-simultaneous joins.
        const participantCount = await trackConnection(eventId, participantId, socket.id);
        queueHostCounters(eventId, { participantCount });
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

        const live = await startLiveQuestion(eventId, question.id, question.timeLimit);

        await prisma.event.update({
          where: { id: eventId },
          data: {
            currentQuestionId: question.id,
            currentQuestionStartedAt: new Date(live.startedAt),
            isLive: true,
          },
        });

        io.to(`event-${eventId}`).emit('participant:questionActive', {
          question: toPublicQuestion(question),
          startedAt: live.startedAt,
        });
        io.to(`host-${eventId}`).emit('host:questionStarted', {
          questionId: question.id,
          startedAt: live.startedAt,
          timeLimit: question.timeLimit,
        });
        queueHostCounters(eventId, { responseCount: 0 });
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
        await endLiveEvent(eventId);

        io.to(`event-${eventId}`).emit('participant:quizEnded');

        await prisma.event.update({
          where: { id: eventId },
          data: { isLive: false, currentQuestionId: null, currentQuestionStartedAt: null },
        });

        if (typeof ack === 'function') ack({ ok: true });
      } catch (error) {
        console.error('host:endQuiz error:', error);
        if (typeof ack === 'function') ack({ ok: false });
      }
    });

    // The hottest path of the whole event: 1500 of these land within a few
    // seconds of each question. Identity was already verified at join time and
    // cached on the socket, so this stays entirely in memory.
    socket.on('participant:submitAnswer', async (eventId: string) => {
      try {
        const participant = socket.data.participant;
        if (!participant || participant.eventId !== eventId) return;

        const count = await recordResponder(eventId, participant.id);
        queueHostCounters(eventId, { responseCount: count });
      } catch (error) {
        console.error('participant:submitAnswer error:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const dropped = await dropConnection(socket.id);
        if (!dropped) return;
        queueHostCounters(dropped.eventId, { participantCount: dropped.count });
      } catch (error) {
        console.error('disconnect cleanup error:', error);
      }
    });
  });
};
