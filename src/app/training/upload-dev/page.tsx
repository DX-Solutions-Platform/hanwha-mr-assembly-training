import { DrawingUploadDevScreen } from '@/features/drawing-upload-dev/DrawingUploadDevScreen';
import { DEFAULT_SHAPE_NAME_MODEL, SHAPE_NAME_MODEL } from '@/features/drawing-upload-dev/shape-name/shapeNameTypes';

export default async function DrawingUploadPage({ searchParams }: { searchParams: Promise<{ example?: string | string[]; qwen?: string | string[] }> }) {
  const query = await searchParams;
  const model = query.qwen === '8b' ? SHAPE_NAME_MODEL : DEFAULT_SHAPE_NAME_MODEL;
  return <DrawingUploadDevScreen initialMode={query.example === 'assembly' ? 'assembly' : query.example === 'flange' ? 'generate' : 'analysis'} shapeNameModel={query.qwen === 'off' ? null : model} />;
}
