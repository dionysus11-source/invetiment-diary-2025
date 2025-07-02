'use client';

import { useState, useEffect } from 'react';
import { InvestmentRecord, ProfitRecord, OCRResult } from '@/types/investment';

export function useInvestmentData() {
  const [records, setRecords] = useState<InvestmentRecord[]>([]);
  const [profits, setProfits] = useState<ProfitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // API에서 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/investments');
      const result = await response.json();
      
      // 새로운 API 응답 형식에 맞게 수정
      setRecords(result.investments || []);
      setProfits(result.profits || []);
    } catch (error) {
      console.error('API 호출 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const addRecord = async (
    ocrResult: OCRResult,
    source: 'photo' | 'manual'
  ): Promise<{ success: boolean; message: string; record?: InvestmentRecord }> => {
    try {
      // OCR 결과를 새로운 API 형식에 맞게 변환
      const recordData = {
        date: ocrResult.date,
        type: ocrResult.type,
        foreignAmount: ocrResult.foreignAmount,
        exchangeRate: ocrResult.exchangeRate,
        wonAmount: ocrResult.wonAmount !== undefined
          ? ocrResult.wonAmount
          : Math.floor(ocrResult.foreignAmount * ocrResult.exchangeRate)
      };

      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [recordData], // 배열 형태로 전송
          source
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // 데이터 다시 로드
        await loadData();
        
        // 성공 메시지 생성
        let message = '거래가 성공적으로 추가되었습니다.';
        let recordData = undefined;
        
        if (result.results && result.results[0]) {
          const firstResult = result.results[0];
          recordData = firstResult?.data;
          
          if (firstResult.success) {
            // 매칭 완료 여부 확인 (매칭이 완료되면 records가 비어있을 것)
            const currentRecords = await fetch('/api/investments').then(r => r.json());
            if (currentRecords.profits && currentRecords.profits.length > profits.length) {
              message = '매칭 완료! 수익이 계산되었습니다. 월별 조회에서 확인하세요.';
            }
          } else {
            message = firstResult.error || '거래 추가에 실패했습니다.';
          }
        }
        
        return {
          success: true,
          message,
          record: recordData
        };
      } else {
        return {
          success: false,
          message: result.error || '거래 추가에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('API 호출 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  };

  const addManualRecord = async (data: {
    type: 'USD 사기' | 'USD 팔기';
    foreignAmount: number;
    exchangeRate: number;
  }) => {
    const ocrResult: OCRResult = {
      date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm 형식
      type: data.type,
      foreignAmount: data.foreignAmount,
      exchangeRate: data.exchangeRate,
      confidence: 1.0
    };

    return await addRecord(ocrResult, 'manual');
  };

  const deleteRecord = async (recordId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`/api/investments/${recordId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // 데이터 다시 로드
        await loadData();
        return {
          success: true,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || '기록 삭제에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('API 호출 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  };

  const deleteProfit = async (profitId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`/api/investments?profitId=${profitId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // 데이터 다시 로드
        await loadData();
        return {
          success: true,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.error || '수익 기록 삭제에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('API 호출 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  };

  const clearAllData = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/investments', {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // 데이터 다시 로드
        await loadData();
        return {
          success: true,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.error || '데이터 삭제에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('API 호출 오류:', error);
      return {
        success: false,
        message: '서버 오류가 발생했습니다.'
      };
    }
  };

  return {
    records,
    profits,
    loading,
    addRecord,
    addManualRecord,
    deleteRecord,
    deleteProfit,
    clearAllData,
    refreshData: loadData
  };
} 