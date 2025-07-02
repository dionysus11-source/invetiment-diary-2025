'use client';

import { InvestmentRecord, ProfitRecord } from '@/types/investment';
import { formatCurrency, formatDate } from '@/utils/ocrParser';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Trash2 } from 'lucide-react';

interface InvestmentListProps {
  records: InvestmentRecord[];
  profits: ProfitRecord[];
  onDeleteRecord?: (recordId: string) => void;
}

export default function InvestmentList({ records, profits, onDeleteRecord }: InvestmentListProps) {
  // 날짜 순으로 정렬 (최신순)
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getProfitForRecord = (recordId: string) => {
    return profits.find(profit => 
      profit.buyRecordId === recordId || profit.sellRecordId === recordId
    );
  };

  const handleDeleteClick = (recordId: string, recordType: string) => {
    if (confirm(`정말로 이 ${recordType} 기록을 삭제하시겠습니까?\n관련된 수익 기록도 함께 삭제됩니다.`)) {
      onDeleteRecord?.(recordId);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center">
        <Calendar className="w-5 h-5 mr-2 text-blue-500" />
        투자 기록 ({records.length}건)
      </h3>
      
      {sortedRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          아직 투자 기록이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRecords.map((record) => {
            const profit = getProfitForRecord(record.id);
            const isBuy = record.type === 'USD 사기';
            
            return (
              <div
                key={record.id}
                className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${
                  isBuy ? 'border-l-blue-500' : 'border-l-red-500'
                }`}
              >
                                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center">
                     {isBuy ? (
                       <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                     ) : (
                       <TrendingDown className="w-5 h-5 text-red-500 mr-2" />
                     )}
                     <span className={`font-semibold ${
                       isBuy ? 'text-blue-600' : 'text-red-600'
                     }`}>
                       {record.type}
                     </span>
                   </div>
                   <div className="flex items-center space-x-2">
                     <span className="text-sm text-gray-500">
                       #{record.id.slice(-8)}
                     </span>
                     {onDeleteRecord && (
                       <button
                         onClick={() => handleDeleteClick(record.id, record.type)}
                         className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                         title="기록 삭제"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                   </div>
                 </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">거래 일시</p>
                    <p className="font-medium">{formatDate(record.date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">입력 방식</p>
                    <p className="font-medium">
                      {record.source === 'photo' ? '사진 업로드' : '직접 입력'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">외화 금액</p>
                    <p className="font-medium flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {formatCurrency(record.foreignAmount)} USD
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">적용 환율</p>
                    <p className="font-medium">{formatCurrency(record.exchangeRate)}원</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">원화 금액</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(record.wonAmount)}원
                    </p>
                  </div>
                </div>
                
                {profit && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">수익 정보</span>
                      <span className={`text-sm font-bold ${
                        profit.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {profit.profit >= 0 ? '+' : ''}{formatCurrency(profit.profit)}원
                        ({profit.profitRate >= 0 ? '+' : ''}{profit.profitRate.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 