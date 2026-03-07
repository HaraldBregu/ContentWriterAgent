import { ChatOpenAI } from '@langchain/openai';
import { config } from '@/config';
import type { WritingStateValue, AttemptRecord } from '@/state';

export async function evaluatorNode(
  state: WritingStateValue,
): Promise<Partial<WritingStateValue>> {
  const model = new ChatOpenAI({
    model: config.model,
    temperature: config.evaluatorTemperature,
  });

  const response = await model.invoke([
    {
      role: 'system',
      content:
        'Evaluate this text continuation. Respond with JSON: {"score": <1-10>, "feedback": "<brief feedback>"}',
    },
    {
      role: 'user',
      content: `Original:\n${state.inputText}\n\nContinuation:\n${state.continuation}`,
    },
  ]);

  const content = typeof response.content === 'string' ? response.content : '';

  let score = 0;
  let feedback = '';

  try {
    const parsed = JSON.parse(content);
    score = parsed.score;
    feedback = parsed.feedback;
  } catch {
    score = 5;
    feedback = content;
  }

  const passed = score >= config.passThreshold;
  const record: AttemptRecord = {
    continuation: state.continuation,
    score,
    feedback,
  };

  return {
    evaluationScore: score,
    evaluationFeedback: feedback,
    passed,
    history: [record],
  };
}
