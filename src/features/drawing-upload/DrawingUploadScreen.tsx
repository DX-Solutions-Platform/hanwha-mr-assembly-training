'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Stage } from '@/components/common/Stage';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { BackButton } from '@/components/common/BackButton';
import { addCustomProduct } from '@/store/trainingStore';
import type { Product } from '@/types/training';
import { UploadStepper } from './UploadStepper';
import { UploadPanel } from './upload/UploadPanel';
import { AnalyzePanel } from './analyze/AnalyzePanel';
import { ReviewPanel } from './review/ReviewPanel';
import { analyzeDrawing } from './analyzeDrawing';

type UploadStage = 'upload' | 'analyze' | 'review';

export function DrawingUploadScreen() {
  const router = useRouter();
  const [uploadStage, setUploadStage] = useState<UploadStage>('upload');
  const [fileList, setFileList] = useState<File[]>([]);
  const [productName, setProductName] = useState('');
  const [generatedProduct, setGeneratedProduct] = useState<Product | null>(null);

  const handleAnalyzeDone = async () => { setGeneratedProduct(await analyzeDrawing(productName)); setUploadStage('review'); };
  const handleCreate = () => { if (!generatedProduct) return; addCustomProduct(generatedProduct); router.push('/training?new=1'); };

  return (
    <Stage>
      <ScreenHeader title={uploadStage === 'review' ? productName || '새 교육' : '도면 업데이트'} subtitle="도면을 올리면 부품을 3D로 모델링하고 조립 순서에 맞춰 교육을 만듭니다" action={<BackButton href="/training" label="교육 선택" />} />
      <UploadStepper activeIndex={['upload', 'analyze', 'review'].indexOf(uploadStage)} />
      <Body>
        {uploadStage === 'upload' && <UploadPanel fileList={fileList} onChangeFileList={setFileList} productName={productName} onChangeProductName={setProductName} onStart={() => setUploadStage('analyze')} />}
        {uploadStage === 'analyze' && <AnalyzePanel fileList={fileList} onDone={handleAnalyzeDone} />}
        {uploadStage === 'review' && generatedProduct && <ReviewPanel product={generatedProduct} onReset={() => { setFileList([]); setUploadStage('upload'); }} onCreate={handleCreate} />}
      </Body>
    </Stage>
  );
}

const Body = styled.div`position: absolute; left: 64px; top: 280px; width: 1792px; height: 740px;`;
