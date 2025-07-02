export interface InvestmentRecord {
  id: string;
  date: string;
  type: 'USD 사기' | 'USD 팔기';
  foreignAmount: number; // 외화 금액
  exchangeRate: number; // 적용 환율
  wonAmount: number; // 원화 금액
  source: 'photo' | 'manual'; // 입력 방식
  createdAt?: string; // 생성 시간
}

export interface ProfitRecord {
  id: string;
  buyDate: string;
  sellDate: string;
  buyRecordId: string;
  sellRecordId: string;
  foreignAmount: number;
  buyRate: number;
  sellRate: number;
  buyWonAmount: number; // 매수시 원화 금액
  sellWonAmount: number; // 매도시 원화 금액
  profit: number; // 원화 수익
  profitRate: number; // 수익률 (%)
  createdAt?: string; // 생성 시간
}

export interface OCRResult {
  date: string;
  foreignAmount: number;
  exchangeRate: number;
  type: 'USD 사기' | 'USD 팔기';
  confidence: number;
  wonAmount?: number;
} 