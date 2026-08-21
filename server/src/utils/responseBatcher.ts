import prisma from '../config/prisma';

interface PendingResponse {
  questionId: string;
  participantId: string;
  selectedOption: number;
  isCorrect: boolean;
}

class ResponseBatcher {
  private queue = new Map<string, PendingResponse>();
  private flushIntervalMs = 2000;
  private timer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor() {
    this.start();
  }

  public addResponse(response: PendingResponse) {
    const key = `${response.questionId}_${response.participantId}`;
    this.queue.set(key, response);
  }

  private start() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }

  public async flush(): Promise<void> {
    while (this.isFlushing) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (this.queue.size === 0) return;

    this.isFlushing = true;
    const entries = Array.from(this.queue.values());
    this.queue.clear();

    try {
      const chunkSize = 50;
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize);
        await prisma.$transaction(
          chunk.map((e) =>
            prisma.response.upsert({
              where: {
                questionId_participantId: {
                  questionId: e.questionId,
                  participantId: e.participantId,
                },
              },
              create: {
                questionId: e.questionId,
                participantId: e.participantId,
                selectedOption: e.selectedOption,
                isCorrect: e.isCorrect,
              },
              update: {
                selectedOption: e.selectedOption,
                isCorrect: e.isCorrect,
                respondedAt: new Date(),
              },
            })
          )
        );
      }
    } catch (error) {
      console.error('Error flushing response batch:', error);
      for (const entry of entries) {
        const key = `${entry.questionId}_${entry.participantId}`;
        if (!this.queue.has(key)) {
          this.queue.set(key, entry);
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }
}

export const responseBatcher = new ResponseBatcher();
