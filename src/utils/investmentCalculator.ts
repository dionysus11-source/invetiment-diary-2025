import { InvestmentRecord, ProfitRecord } from '@/types/investment';

export function findMatchingBuyRecord(
  sellRecord: InvestmentRecord,
  buyRecords: InvestmentRecord[]
): InvestmentRecord | null {
  // 같은 외화 금액과 환율을 가진 매수 기록 찾기
  return buyRecords.find(record => 
    record.type === 'USD 사기' &&
    record.foreignAmount === sellRecord.foreignAmount &&
    record.exchangeRate === sellRecord.exchangeRate &&
    new Date(record.date) < new Date(sellRecord.date)
  ) || null;
}

export function calculateProfit(
  buyRecord: InvestmentRecord,
  sellRecord: InvestmentRecord
): ProfitRecord {
  const buyAmount = buyRecord.foreignAmount * buyRecord.exchangeRate;
  const sellAmount = sellRecord.foreignAmount * sellRecord.exchangeRate;
  const profit = sellAmount - buyAmount;
  const profitRate = (profit / buyAmount) * 100;
  
  return {
    id: `profit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sellDate: sellRecord.date,
    buyDate: buyRecord.date,
    buyRecordId: buyRecord.id,
    sellRecordId: sellRecord.id,
    foreignAmount: sellRecord.foreignAmount,
    buyRate: buyRecord.exchangeRate,
    sellRate: sellRecord.exchangeRate,
    buyWonAmount: buyRecord.foreignAmount * buyRecord.exchangeRate,
    sellWonAmount: sellRecord.foreignAmount * sellRecord.exchangeRate,
    profit,
    profitRate
  };
}

export function groupRecordsByMonth(records: InvestmentRecord[]): Record<string, InvestmentRecord[]> {
  return records.reduce((acc, record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(record);
    
    return acc;
  }, {} as Record<string, InvestmentRecord[]>);
}

export function isDuplicateRecord(
  newRecord: Omit<InvestmentRecord, 'id'>,
  existingRecords: InvestmentRecord[]
): boolean {
  return existingRecords.some(record =>
    record.date === newRecord.date &&
    record.type === newRecord.type &&
    record.foreignAmount === newRecord.foreignAmount &&
    record.exchangeRate === newRecord.exchangeRate
  );
} 