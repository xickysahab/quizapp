import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { Parser } from 'json2csv';
import { canManageEvent, findUser } from '../utils/eventAccess';
import { responseBatcher } from '../utils/responseBatcher';

/**
 * Whole-number percentages that always add up to 100 (when anything was
 * answered). Plain rounding leaves the total at 99 or 101, which looks broken on
 * the results screen.
 */
function toPercentages(counts: number[], total: number): number[] {
  if (total <= 0) return counts.map(() => 0);

  const exact = counts.map((count) => (count / total) * 100);
  const result = exact.map((value) => Math.floor(value));
  let remaining = 100 - result.reduce((sum, value) => sum + value, 0);

  const byLargestRemainder = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const { index } of byLargestRemainder) {
    if (remaining <= 0) break;
    const current = result[index];
    if (current === undefined) continue;
    result[index] = current + 1;
    remaining -= 1;
  }

  return result;
}

export const getQuestionAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questionId = req.params.id as string;
    const user = await findUser(req.user?.userId);
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await responseBatcher.flush();

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        event: true,
        responses: true,
      },
    });

    if (!question || !canManageEvent(user, question.event)) {
      res.status(403).json({ message: 'Forbidden or not found' });
      return;
    }

    const totalResponses = question.responses.length;
    const optionCounts = Array(question.options.length).fill(0);

    question.responses.forEach((response) => {
      if (response.selectedOption >= 0 && response.selectedOption < optionCounts.length) {
        optionCounts[response.selectedOption] = (optionCounts[response.selectedOption] || 0) + 1;
      }
    });

    const percentages = toPercentages(optionCounts, totalResponses);

    res.status(200).json({
      totalResponses,
      optionCounts,
      percentages,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const exportEventAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id as string;
    const user = await findUser(req.user?.userId);
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await responseBatcher.flush();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        participants: {
          include: {
            responses: true,
          },
        },
      },
    });

    if (!event || !canManageEvent(user, event)) {
      res.status(403).json({ message: 'Forbidden or not found' });
      return;
    }

    const csvData = event.participants.map((p) => {
      const row: Record<string, string | number> = {
        ParticipantName: p.name,
        JoinedAt: p.joinedAt.toISOString(),
        TotalScore: p.responses.filter((r) => r.isCorrect).length,
      };

      event.questions.forEach((q, index) => {
        const response = p.responses.find((r) => r.questionId === q.id);
        // options[] can come up empty if the question was edited after answers
        // landed, so fall back rather than writing "undefined" into the CSV.
        const chosen = response ? q.options[response.selectedOption] : undefined;
        row[`Q${index + 1} (${q.text})`] = chosen ?? 'No Answer';
      });

      return row;
    });

    if (csvData.length === 0) {
      res.status(400).json({ message: 'No participants data to export' });
      return;
    }

    const parser = new Parser();
    const csv = parser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.attachment(`${event.title.replace(/\s+/g, '_')}_Analytics.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getEventSummaryAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id as string;
    const user = await findUser(req.user?.userId);
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await responseBatcher.flush();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { responses: true },
        },
      },
    });

    if (!event || !canManageEvent(user, event)) {
      res.status(403).json({ message: 'Forbidden or not found' });
      return;
    }

    const maxOptions = event.questions.reduce((max, q) => Math.max(max, q.options.length), 0);
    const optionCount = maxOptions || 0;
    let collectiveTotalResponses = 0;
    const collectiveOptionCounts: number[] = Array(optionCount).fill(0);

    const summary = event.questions.map((question) => {
      const totalResponses = question.responses.length;
      const optionCounts = Array(question.options.length).fill(0);

      question.responses.forEach((response) => {
        if (response.selectedOption >= 0 && response.selectedOption < optionCounts.length) {
          optionCounts[response.selectedOption] = (optionCounts[response.selectedOption] || 0) + 1;
        }
        if (response.selectedOption >= 0 && response.selectedOption < optionCount) {
          collectiveOptionCounts[response.selectedOption] =
            (collectiveOptionCounts[response.selectedOption] || 0) + 1;
          collectiveTotalResponses++;
        }
      });

      const percentages = toPercentages(optionCounts, totalResponses);

      return {
        id: question.id,
        text: question.text,
        options: question.options,
        correctOption: question.correctOption,
        totalResponses,
        optionCounts,
        percentages,
      };
    });

    // Share of all answers cast, not the average of each question's percentages:
    // the latter gives a 5-response question the same weight as a 500-response one.
    const collectivePercentages = toPercentages(collectiveOptionCounts, collectiveTotalResponses);

    res.status(200).json({
      eventId: event.id,
      title: event.title,
      totalParticipants: await prisma.participant.count({ where: { eventId } }),
      questions: summary,
      collective: {
        totalResponses: collectiveTotalResponses,
        optionCounts: collectiveOptionCounts,
        percentages: collectivePercentages,
        optionsText: event.questions[0]?.options ?? [],
      },
    });
  } catch (error) {
    console.error('Summary analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
