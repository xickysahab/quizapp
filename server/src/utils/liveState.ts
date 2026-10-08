import type Redis from 'ioredis';
import { getRedis } from '../config/redis';

export type LiveQuestionState = {
  questionId: string;
  startedAt: number;
  timeLimit: number | null;
};

type SocketOwner = { eventId: string; participantId: string };

/**
 * Live quiz state. Backed by Redis when REDIS_URL is set, which is what allows
 * more than one server instance to share a quiz; otherwise it falls back to
 * process memory and the deployment must stay at a single instance.
 */
interface LiveStateBackend {
  startLiveQuestion(eventId: string, questionId: string, timeLimit: number | null): Promise<LiveQuestionState>;
  rehydrateLiveQuestion(
    eventId: string,
    questionId: string,
    startedAt: Date | null,
    timeLimit: number | null
  ): Promise<LiveQuestionState | undefined>;
  endLiveEvent(eventId: string): Promise<void>;
  getLiveQuestion(eventId: string): Promise<LiveQuestionState | undefined>;
  recordResponder(eventId: string, participantId: string): Promise<number>;
  getResponderCount(eventId: string): Promise<number>;
  trackConnection(eventId: string, participantId: string, socketId: string): Promise<number>;
  dropConnection(socketId: string): Promise<{ eventId: string; count: number } | null>;
  getConnectedCount(eventId: string): Promise<number>;
}

function normalizeTimeLimit(timeLimit: number | null | undefined): number | null {
  return timeLimit && timeLimit > 0 ? timeLimit : null;
}

// ---------------------------------------------------------------------------
// In-memory backend (single instance)
// ---------------------------------------------------------------------------

class MemoryBackend implements LiveStateBackend {
  private liveQuestionByEvent = new Map<string, LiveQuestionState>();
  private uniqueRespondersByEvent = new Map<string, Set<string>>();
  // eventId -> participantId -> set of socketIds (a participant may have several tabs open)
  private connectedByEvent = new Map<string, Map<string, Set<string>>>();
  private socketOwner = new Map<string, SocketOwner>();

  async startLiveQuestion(eventId: string, questionId: string, timeLimit: number | null) {
    const state: LiveQuestionState = {
      questionId,
      startedAt: Date.now(),
      timeLimit: normalizeTimeLimit(timeLimit),
    };
    this.liveQuestionByEvent.set(eventId, state);
    this.uniqueRespondersByEvent.set(eventId, new Set());
    return state;
  }

  async rehydrateLiveQuestion(
    eventId: string,
    questionId: string,
    startedAt: Date | null,
    timeLimit: number | null
  ) {
    const existing = this.liveQuestionByEvent.get(eventId);
    if (existing) return existing;
    if (!startedAt) return undefined;

    const state: LiveQuestionState = {
      questionId,
      startedAt: startedAt.getTime(),
      timeLimit: normalizeTimeLimit(timeLimit),
    };
    this.liveQuestionByEvent.set(eventId, state);
    if (!this.uniqueRespondersByEvent.has(eventId)) {
      this.uniqueRespondersByEvent.set(eventId, new Set());
    }
    return state;
  }

  async endLiveEvent(eventId: string) {
    this.liveQuestionByEvent.delete(eventId);
    this.uniqueRespondersByEvent.delete(eventId);
  }

  async getLiveQuestion(eventId: string) {
    return this.liveQuestionByEvent.get(eventId);
  }

  async recordResponder(eventId: string, participantId: string) {
    let set = this.uniqueRespondersByEvent.get(eventId);
    if (!set) {
      set = new Set();
      this.uniqueRespondersByEvent.set(eventId, set);
    }
    set.add(participantId);
    return set.size;
  }

  async getResponderCount(eventId: string) {
    return this.uniqueRespondersByEvent.get(eventId)?.size ?? 0;
  }

  async trackConnection(eventId: string, participantId: string, socketId: string) {
    let participants = this.connectedByEvent.get(eventId);
    if (!participants) {
      participants = new Map();
      this.connectedByEvent.set(eventId, participants);
    }

    let sockets = participants.get(participantId);
    if (!sockets) {
      sockets = new Set();
      participants.set(participantId, sockets);
    }
    sockets.add(socketId);
    this.socketOwner.set(socketId, { eventId, participantId });

    return participants.size;
  }

  async dropConnection(socketId: string) {
    const owner = this.socketOwner.get(socketId);
    if (!owner) return null;
    this.socketOwner.delete(socketId);

    const participants = this.connectedByEvent.get(owner.eventId);
    if (!participants) return { eventId: owner.eventId, count: 0 };

    const sockets = participants.get(owner.participantId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) participants.delete(owner.participantId);
    }

    if (participants.size === 0) this.connectedByEvent.delete(owner.eventId);

    return { eventId: owner.eventId, count: participants.size };
  }

  async getConnectedCount(eventId: string) {
    return this.connectedByEvent.get(eventId)?.size ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Redis backend (shared across instances)
// ---------------------------------------------------------------------------

// Everything is scoped to one event and one day; the TTL is a safety net so a
// crashed instance cannot leak keys forever.
const KEY_TTL_SECONDS = 24 * 60 * 60;

class RedisBackend implements LiveStateBackend {
  constructor(private redis: Redis) {}

  private liveKey(eventId: string) {
    return `sm:live:${eventId}`;
  }
  private responderKey(eventId: string) {
    return `sm:resp:${eventId}`;
  }
  private connectionKey(eventId: string) {
    return `sm:conn:${eventId}`;
  }
  private socketKey(socketId: string) {
    return `sm:sock:${socketId}`;
  }

  private parseState(raw: string | null): LiveQuestionState | undefined {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as LiveQuestionState;
    } catch {
      return undefined;
    }
  }

  private numberAt(results: unknown, index: number): number {
    const rows = results as Array<[Error | null, unknown]> | null;
    const value = rows?.[index]?.[1];
    return typeof value === 'number' ? value : 0;
  }

  async startLiveQuestion(eventId: string, questionId: string, timeLimit: number | null) {
    const state: LiveQuestionState = {
      questionId,
      startedAt: Date.now(),
      timeLimit: normalizeTimeLimit(timeLimit),
    };

    await this.redis
      .multi()
      .set(this.liveKey(eventId), JSON.stringify(state), 'EX', KEY_TTL_SECONDS)
      .del(this.responderKey(eventId))
      .exec();

    return state;
  }

  async rehydrateLiveQuestion(
    eventId: string,
    questionId: string,
    startedAt: Date | null,
    timeLimit: number | null
  ) {
    const existing = await this.getLiveQuestion(eventId);
    if (existing) return existing;
    if (!startedAt) return undefined;

    const state: LiveQuestionState = {
      questionId,
      startedAt: startedAt.getTime(),
      timeLimit: normalizeTimeLimit(timeLimit),
    };

    // NX so two instances rehydrating at once converge on one stored value
    // rather than each overwriting the other's start time.
    await this.redis.set(
      this.liveKey(eventId),
      JSON.stringify(state),
      'EX',
      KEY_TTL_SECONDS,
      'NX'
    );

    return (await this.getLiveQuestion(eventId)) ?? state;
  }

  async endLiveEvent(eventId: string) {
    await this.redis.del(this.liveKey(eventId), this.responderKey(eventId));
  }

  async getLiveQuestion(eventId: string) {
    return this.parseState(await this.redis.get(this.liveKey(eventId)));
  }

  async recordResponder(eventId: string, participantId: string) {
    const key = this.responderKey(eventId);
    const results = await this.redis
      .multi()
      .sadd(key, participantId)
      .expire(key, KEY_TTL_SECONDS)
      .scard(key)
      .exec();
    return this.numberAt(results, 2);
  }

  async getResponderCount(eventId: string) {
    return this.redis.scard(this.responderKey(eventId));
  }

  async trackConnection(eventId: string, participantId: string, socketId: string) {
    const connKey = this.connectionKey(eventId);
    const results = await this.redis
      .multi()
      .set(
        this.socketKey(socketId),
        JSON.stringify({ eventId, participantId } satisfies SocketOwner),
        'EX',
        KEY_TTL_SECONDS
      )
      .hincrby(connKey, participantId, 1)
      .expire(connKey, KEY_TTL_SECONDS)
      .hlen(connKey)
      .exec();
    return this.numberAt(results, 3);
  }

  async dropConnection(socketId: string) {
    const raw = await this.redis.get(this.socketKey(socketId));
    if (!raw) return null;

    let owner: SocketOwner;
    try {
      owner = JSON.parse(raw) as SocketOwner;
    } catch {
      return null;
    }

    const connKey = this.connectionKey(owner.eventId);
    const results = await this.redis
      .multi()
      .del(this.socketKey(socketId))
      .hincrby(connKey, owner.participantId, -1)
      .exec();

    // Last tab for this participant closed, so drop them from the count entirely.
    if (this.numberAt(results, 1) <= 0) {
      await this.redis.hdel(connKey, owner.participantId);
    }

    return { eventId: owner.eventId, count: await this.redis.hlen(connKey) };
  }

  async getConnectedCount(eventId: string) {
    return this.redis.hlen(this.connectionKey(eventId));
  }
}

// ---------------------------------------------------------------------------

const redis = getRedis();
const backend: LiveStateBackend = redis ? new RedisBackend(redis) : new MemoryBackend();

export const liveStateBackend = redis ? 'redis' : 'memory';

export const startLiveQuestion: LiveStateBackend['startLiveQuestion'] = (...args) =>
  backend.startLiveQuestion(...args);

/**
 * Restore live state from the values persisted on the Event row, so a restart
 * (or an instance that has never seen this event) keeps the original countdown
 * instead of resetting it. Never overwrites state that already exists.
 */
export const rehydrateLiveQuestion: LiveStateBackend['rehydrateLiveQuestion'] = (...args) =>
  backend.rehydrateLiveQuestion(...args);

export const endLiveEvent: LiveStateBackend['endLiveEvent'] = (...args) => backend.endLiveEvent(...args);
export const getLiveQuestion: LiveStateBackend['getLiveQuestion'] = (...args) => backend.getLiveQuestion(...args);
export const recordResponder: LiveStateBackend['recordResponder'] = (...args) => backend.recordResponder(...args);
export const getResponderCount: LiveStateBackend['getResponderCount'] = (...args) =>
  backend.getResponderCount(...args);

/** Register a live socket for a participant. Returns the connected-participant count. */
export const trackConnection: LiveStateBackend['trackConnection'] = (...args) => backend.trackConnection(...args);

/** Drop a socket and report the event's new connected count, or null if unknown. */
export const dropConnection: LiveStateBackend['dropConnection'] = (...args) => backend.dropConnection(...args);

export const getConnectedCount: LiveStateBackend['getConnectedCount'] = (...args) =>
  backend.getConnectedCount(...args);

/**
 * Decide whether an answer may still be accepted.
 *
 * `fallback` carries the values persisted on the Event/Question rows. It is used
 * when shared state is missing (restart, or Redis lost the key). If neither source
 * knows when the question started we fail closed rather than accepting late answers.
 */
export async function isSubmitAllowed(
  eventId: string,
  questionId: string,
  fallback?: { startedAt: Date | null; timeLimit: number | null }
): Promise<{ ok: boolean; message?: string }> {
  const live = await backend.getLiveQuestion(eventId);

  if (!live) {
    if (!fallback?.startedAt) {
      return { ok: false, message: 'This question is not accepting answers right now.' };
    }
    const limit = normalizeTimeLimit(fallback.timeLimit);
    if (limit) {
      const elapsed = (Date.now() - fallback.startedAt.getTime()) / 1000;
      if (elapsed > limit + 2) {
        return { ok: false, message: 'Time is up for this question.' };
      }
    }
    return { ok: true };
  }

  if (live.questionId !== questionId) {
    return { ok: false, message: 'This question is no longer active.' };
  }
  if (live.timeLimit) {
    const elapsed = (Date.now() - live.startedAt) / 1000;
    if (elapsed > live.timeLimit + 2) {
      return { ok: false, message: 'Time is up for this question.' };
    }
  }
  return { ok: true };
}
