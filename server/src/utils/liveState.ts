export type LiveQuestionState = {
  questionId: string;
  startedAt: number;
  timeLimit: number | null;
};

const liveQuestionByEvent = new Map<string, LiveQuestionState>();
const uniqueRespondersByEvent = new Map<string, Set<string>>();

export function startLiveQuestion(eventId: string, questionId: string, timeLimit: number | null) {
  liveQuestionByEvent.set(eventId, {
    questionId,
    startedAt: Date.now(),
    timeLimit: timeLimit && timeLimit > 0 ? timeLimit : null,
  });
  uniqueRespondersByEvent.set(eventId, new Set());
}

export function endLiveEvent(eventId: string) {
  liveQuestionByEvent.delete(eventId);
  uniqueRespondersByEvent.delete(eventId);
}

export function getLiveQuestion(eventId: string): LiveQuestionState | undefined {
  return liveQuestionByEvent.get(eventId);
}

export function recordResponder(eventId: string, participantId: string): number {
  let set = uniqueRespondersByEvent.get(eventId);
  if (!set) {
    set = new Set();
    uniqueRespondersByEvent.set(eventId, set);
  }
  set.add(participantId);
  return set.size;
}

export function getResponderCount(eventId: string): number {
  return uniqueRespondersByEvent.get(eventId)?.size ?? 0;
}

export function isSubmitAllowed(eventId: string, questionId: string): { ok: boolean; message?: string } {
  const live = liveQuestionByEvent.get(eventId);
  if (!live) {
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

export function toPublicQuestion<T extends { correctOption?: number | null }>(question: T): Omit<T, 'correctOption'> {
  const { correctOption: _correctOption, ...rest } = question;
  return rest;
}
