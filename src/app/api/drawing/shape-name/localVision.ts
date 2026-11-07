import { AWQ_SHAPE_NAME_MODEL, SHAPE_NAME_MODEL, type ShapeNameModel } from '@/features/drawing-upload-dev/shape-name/shapeNameTypes';
import { OLLAMA_URL as OLLAMA, VLLM_URL as VLLM, prepareLocalModel } from './localModelSwitch';

export class LocalVisionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function inferShapeNameContent(model: ShapeNameModel, image: string, prompt: string, format: object, signal: AbortSignal): Promise<unknown> {
  try { await prepareLocalModel(model, signal); }
  catch (error) { throw new LocalVisionError(error instanceof Error ? error.message : '로컬 모델을 전환하지 못했습니다.', 503); }
  const local = { signal, redirect: 'error', cache: 'no-store' } as const;
  const post = { ...local, method: 'POST', headers: { 'Content-Type': 'application/json' } };
  if (model === AWQ_SHAPE_NAME_MODEL) {
    const modelsResponse = await fetch(VLLM + '/models', local);
    if (!modelsResponse.ok) throw new LocalVisionError('WSL2의 vLLM 모델 목록을 읽을 수 없습니다.', 503);
    const { data } = await modelsResponse.json();
    if (!Array.isArray(data) || !data.some((entry) => entry?.id === model)) {
      throw new LocalVisionError('WSL2에서 Qwen3.5-27B-AWQ-4bit를 실행해 주세요.', 503);
    }
    const response = await fetch(VLLM + '/chat/completions', {
      ...post,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + image } },
        ] }],
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: 'json_schema', json_schema: { name: 'drawing_part_name', schema: format } },
        temperature: 0,
        seed: 42,
        max_tokens: 1920,
      }),
    });
    if (!response.ok) throw new LocalVisionError('WSL2의 Qwen 27B AWQ가 도면을 처리하지 못했습니다.', 502);
    const result = await response.json();
    if (result.model !== model) throw new LocalVisionError('vLLM 응답 모델이 선택한 AWQ 모델과 다릅니다.', 502);
    return result.choices?.[0]?.message?.content;
  }

  const tags = await fetch(OLLAMA + '/api/tags', local);
  if (!tags.ok) throw new LocalVisionError('Ollama 모델 목록을 읽을 수 없습니다.', 503);
  const { models } = await tags.json();
  if (!Array.isArray(models) || !models.some((entry) => entry?.name === SHAPE_NAME_MODEL && entry.size > 0 && entry.details?.family === 'qwen3vl' && !entry.remote_host && !entry.remote_model)) {
    throw new LocalVisionError('이 PC의 Ollama에 qwen3-vl:8b 비전 모델을 설치해 주세요.', 503);
  }
  const response = await fetch(OLLAMA + '/api/chat', {
    ...post,
    body: JSON.stringify({
      model: SHAPE_NAME_MODEL,
      messages: [{ role: 'user', content: prompt, images: [image] }],
      stream: false,
      think: false,
      format,
      options: { temperature: 0, seed: 42, num_ctx: 4096, num_predict: 1920 },
      keep_alive: '5m',
    }),
  });
  if (!response.ok) throw new LocalVisionError('로컬 Qwen이 도면 이미지를 처리하지 못했습니다. 잠시 후 다시 시도하세요.', 502);
  const result = await response.json();
  if (result.done !== true || result.model !== model) throw new LocalVisionError('Ollama 응답이 완료되지 않았거나 모델이 일치하지 않습니다.', 502);
  return result.message?.content;
}
