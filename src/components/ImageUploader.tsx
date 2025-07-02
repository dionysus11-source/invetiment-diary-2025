'use client';

import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { parseOCRText } from '@/utils/ocrParser';
import { OCRResult } from '@/types/investment';

interface ImageUploaderProps {
  onOCRResult: (result: OCRResult) => void;
  onError: (error: string) => void;
}

export default function ImageUploader({ onOCRResult, onError }: ImageUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<OCRResult | null>(null);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setIsProcessing(true);

    try {
      // Tesseract.js로 OCR 처리
      const worker = await createWorker('kor+eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // OCR 결과 파싱
      const ocrResult = parseOCRText(text);
      if (ocrResult) {
        setOcrPreview(ocrResult);
        // onOCRResult는 저장 버튼에서 호출
      } else {
        setOcrPreview(null);
        onError('이미지에서 필요한 정보를 찾을 수 없습니다. 직접 입력을 사용해주세요.');
      }
    } catch (error) {
      console.error('OCR 처리 오류:', error);
      setOcrPreview(null);
      onError('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [onError]);

  const handleSave = () => {
    if (ocrPreview) {
      onOCRResult(ocrPreview);
      setOcrPreview(null);
    }
  };

  const handleCancel = () => {
    setOcrPreview(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const isMissing = (val: unknown) => val === 0 || val === '' || val === undefined;

  const isReadyToSave =
    ocrPreview &&
    ocrPreview.exchangeRate > 0 &&
    ocrPreview.foreignAmount > 0 &&
    (ocrPreview.wonAmount ?? 0) > 0 &&
    ocrPreview.type &&
    ocrPreview.date;

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {isProcessing ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600">이미지를 분석하고 있습니다...</p>
        </div>
      ) : (
        <>
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            환전 거래 내역 이미지 업로드
          </p>
          <p className="text-sm text-gray-500 mb-4">
            이미지를 드래그하거나 클릭하여 업로드하세요
          </p>
          <label className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            파일 선택
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {ocrPreview && (
            <div className="mt-4 p-4 bg-gray-50 rounded border text-sm text-left max-w-md mx-auto">
              <div>
                <b>적용 환율:</b>
                <input
                  type="number"
                  step="0.01"
                  value={ocrPreview.exchangeRate ?? ''}
                  onChange={e =>
                    setOcrPreview({ ...ocrPreview, exchangeRate: parseFloat(e.target.value) || 0 })
                  }
                  className="ml-2 border px-2 py-1 rounded w-32"
                  placeholder="적용 환율 입력"
                /> 원
                {isMissing(ocrPreview.exchangeRate) && <span className="text-red-500 ml-2">필수</span>}
              </div>
              <div>
                <b>외화 금액:</b>
                <input
                  type="number"
                  step="0.01"
                  value={ocrPreview.foreignAmount ?? ''}
                  onChange={e =>
                    setOcrPreview({ ...ocrPreview, foreignAmount: parseFloat(e.target.value) || 0 })
                  }
                  className="ml-2 border px-2 py-1 rounded w-32"
                  placeholder="외화 금액 입력"
                /> USD
                {isMissing(ocrPreview.foreignAmount) && <span className="text-red-500 ml-2">필수</span>}
              </div>
              <div>
                <b>원화 금액:</b>
                <input
                  type="number"
                  value={ocrPreview.wonAmount ?? ''}
                  onChange={e =>
                    setOcrPreview({ ...ocrPreview, wonAmount: Number(e.target.value) || 0 })
                  }
                  className="ml-2 border px-2 py-1 rounded w-32"
                  placeholder="원화 금액 입력"
                /> 원
                {isMissing(ocrPreview.wonAmount) && <span className="text-red-500 ml-2">필수</span>}
              </div>
              <div><b>거래 유형:</b> {ocrPreview.type}</div>
              <div><b>일시:</b> {ocrPreview.date}</div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                  disabled={!isReadyToSave}
                >
                  저장
                </button>
                <button onClick={handleCancel} className="px-4 py-2 bg-gray-300 rounded">취소</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 