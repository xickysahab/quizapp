import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { Parser } from 'json2csv';

export const getQuestionAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questionId = req.params.id as string;
    
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        event: true,
        responses: true
      }
    });

    if (!question || question.event.hostId !== req.user?.userId) {
      res.status(403).json({ message: 'Forbidden or not found' });
      return;
    }

    const totalResponses = question.responses.length;
    const optionCounts = Array(question.options.length).fill(0);
    
    question.responses.forEach(response => {
      if (response.selectedOption >= 0 && response.selectedOption < optionCounts.length) {
        optionCounts[response.selectedOption]++;
      }
    });

    const percentages = optionCounts.map(count => 
      totalResponses === 0 ? 0 : Math.round((count / totalResponses) * 100)
    );

    res.status(200).json({
      totalResponses,
      optionCounts,
      percentages
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const exportEventAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id as string;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        participants: {
          include: {
            responses: true
          }
        }
      }
    });

    if (!event || event.hostId !== req.user?.userId) {
      res.status(403).json({ message: 'Forbidden or not found' });
      return;
    }

    // Format data for CSV
    const csvData = event.participants.map(p => {
      const row: any = {
        ParticipantName: p.name,
        JoinedAt: p.joinedAt.toISOString(),
        TotalScore: p.responses.filter(r => r.isCorrect).length
      };

      event.questions.forEach((q, index) => {
        const response = p.responses.find(r => r.questionId === q.id);
        row[`Q${index + 1} (${q.text})`] = response ? q.options[response.selectedOption] : 'No Answer';
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
