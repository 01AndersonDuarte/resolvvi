import type { PrismaClient } from '../generated/prisma/client.js';
import { summaryApplicationError } from '../errors/process-ai-summary-errors.js';
import { saveSummaryFeedback } from '../repositories/summary-feedback-repository.js';
import type { SummaryFeedback, SummaryFeedbackCommand } from '../types/process-ai-summary.js';
import { SUMMARY_RULES_VERSION } from './summary-prompt-service.js';
import type { ProcessAiSummaryServiceDependencies } from './process-ai-summary-service.js';
import { logSummaryOperationalEvent } from './summary-operational-event-service.js';

type FeedbackResult = { outcome: 'created' | 'updated' | 'unchanged'; feedback: SummaryFeedback };

function feedbackFailure(message: string): Error {
  return summaryApplicationError({ code: 'SUMMARY_FEEDBACK_FAILED', message, status: 503 });
}

async function rejectObsoleteFeedback(input: SummaryFeedbackCommand, client: PrismaClient): Promise<never> {
  const summary = await client.processAiSummary.findUnique({ where: { id: input.summaryId }, select: { processId: true } });
  if (summary?.processId !== input.processId) {
    throw summaryApplicationError({ code: 'SUMMARY_NOT_FOUND', message: 'O resumo não foi encontrado.', status: 404 });
  }
  throw summaryApplicationError({ code: 'SUMMARY_NOT_CURRENT', message: 'Este resumo foi substituído. Carregue o resumo atualizado', status: 409 });
}

export async function saveProcessAiSummaryFeedback(
  input: SummaryFeedbackCommand,
  dependencies: ProcessAiSummaryServiceDependencies,
): Promise<FeedbackResult> {
  const now = dependencies.now?.() ?? new Date();
  try {
    const command = {
      processId: input.processId, summaryId: input.summaryId, userId: input.userId, helpful: input.helpful,
    };
    const result = await saveSummaryFeedback({ ...command, rulesVersion: SUMMARY_RULES_VERSION, now }, dependencies.client);
    if (!result) return rejectObsoleteFeedback(input, dependencies.client);
    logSummaryOperationalEvent({
      event: 'summary_feedback_saved', requestId: input.requestId, processId: input.processId,
      summaryId: input.summaryId, helpful: input.helpful, result: result.outcome,
    });
    return {
      outcome: result.outcome,
      feedback: {
        helpful: result.feedback.helpful,
        createdAt: result.feedback.createdAt.toISOString(),
        updatedAt: result.feedback.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ApplicationError') throw error;
    throw feedbackFailure('Não foi possível salvar sua avaliação');
  }
}
