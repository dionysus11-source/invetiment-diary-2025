import { OCRResult } from '@/types/investment';

// 6자리 숫자(4+2) → 소수점 보정 함수 (문자 무시)
function extractSixDigitFloatFromLine(line: string): number | null {
  const digits = line.replace(/[^0-9]/g, '');
  if (digits.length === 6) {
    return Number(digits.slice(0, 4) + '.' + digits.slice(4, 6));
  }
  return null;
}

export function parseOCRText(text: string): OCRResult | null {
  try {
    // 한국어 OCR 텍스트에서 필요한 정보 추출
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let date = '';
    let foreignAmount = 0;
    let exchangeRate = 0;
    let type: 'USD 사기' | 'USD 팔기' | null = null;
    let wonAmount = 0;
    const foreignAmountCandidates: number[] = [];
    
    console.log('OCR 텍스트 라인들:', lines); // 디버깅용
    
    // 날짜 패턴 찾기 (예: 2025년 7월 1일 15:08)
    const datePattern = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2}):(\d{2})/;
    
    // USD 사기/팔기 패턴 찾기
    const typePattern = /(USD\s*[사팔][기리])/;
    
    for (const line of lines) {
      // 날짜 추출
      const dateMatch = line.match(datePattern);
      if (dateMatch) {
        const [, year, month, day, hour, minute] = dateMatch;
        date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute}`;
      }
      
      // 거래 외화 금액 추출
      if (/거래 ?외화 ?금액|외화 ?금액/.test(line)) {
        const val = extractSixDigitFloatFromLine(line);
        if (val) foreignAmount = val;
      }
      
      // 적용 환율 추출
      if (exchangeRate === 0 && /적용 ?환율/.test(line)) {
        const val = extractSixDigitFloatFromLine(line);
        if (val && val >= 1000 && val <= 2000) exchangeRate = val;
      }
      
      // 원화 출금/입금 금액 추출 (정확히 해당 라인만)
      const wonOutMatch = line.match(/원화 출금 금액\s*([\d,]+)원/);
      const wonInMatch = line.match(/원화 입금 금액\s*([\d,]+)원/);
      if (wonOutMatch) {
        wonAmount = parseInt(wonOutMatch[1].replace(/,/g, ''), 10);
      } else if (wonInMatch) {
        wonAmount = parseInt(wonInMatch[1].replace(/,/g, ''), 10);
      }
      
      // 거래 유형 추출
      const typeMatch = line.match(typePattern);
      if (typeMatch) {
        if (typeMatch[1].includes('사기')) {
          type = 'USD 사기';
        } else if (typeMatch[1].includes('팔기')) {
          type = 'USD 팔기';
        }
      }
    }
    
    // 1. USD 사기/팔기 밑에 + 또는 -로 시작하는 숫자 파싱
    for (let i = 0; i < lines.length; i++) {
      if (/USD\s*사기|USD\s*팔기/.test(lines[i])) {
        const nextLine = lines[i + 1] || '';
        const match = nextLine.match(/[+-]?\d{1,3}(?:,\d{3})*\.\d{2}/);
        if (match) {
          foreignAmount = Math.abs(parseFloat(match[0].replace(/,/g, '')));
          break;
        }
      }
    }
    // 2. 백업: 기존 거래 외화 금액 라인 파싱 (없을 때만)
    if (foreignAmount === 0) {
      for (const line of lines) {
        if (/거래 ?외화 ?금액|외화 ?금액/.test(line)) {
          const val = extractSixDigitFloatFromLine(line);
          if (val) foreignAmount = val;
        }
      }
    }
    
    // 후보 중 가장 큰 값 사용
    if (foreignAmountCandidates.length > 0) {
      foreignAmount = Math.max(...foreignAmountCandidates);
    }
    
    console.log('파싱 결과:', { date, foreignAmount, exchangeRate, type, wonAmount }); // 디버깅용
    
    // 필수 정보가 일부라도 있으면 항상 반환
    return {
      date,
      foreignAmount,
      exchangeRate,
      type: type || 'USD 사기',
      confidence: 0.8,
      wonAmount
    };
  } catch (error) {
    console.error('OCR 파싱 에러:', error);
    return null;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
} 