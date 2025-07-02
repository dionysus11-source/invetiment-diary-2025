'use client';

import { InvestmentRecord, ProfitRecord } from '@/types/investment';
import { formatCurrency, formatDate } from '@/utils/ocrParser';
import { CalendarDays, TrendingUp, TrendingDown, DollarSign, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface MonthlyViewProps {
  records: InvestmentRecord[];
  profits: ProfitRecord[];
  onDeleteProfit?: (profitId: string) => void;
}

export default function MonthlyView({ records, profits, onDeleteProfit }: MonthlyViewProps) {
  // records와 profits 모두에서 월 정보 추출
  const getMonthsFromData = () => {
    const monthsSet = new Set<string>();
    
    console.log('MonthlyView - records:', records);
    console.log('MonthlyView - profits:', profits);
    
    // records에서 월 추출 (미완료 거래)
    records.forEach(record => {
      try {
        const date = new Date(record.date);
        console.log('Processing record date:', record.date, 'parsed:', date);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          console.log('Adding month from record:', monthKey);
          monthsSet.add(monthKey);
        }
      } catch (error) {
        console.error('Error processing record date:', record.date, error);
      }
    });
    
    // profits에서 월 추출 (매도 날짜와 매수 날짜 기준)
    profits.forEach(profit => {
      try {
        // 매도 날짜로 월 추출
        const sellDate = new Date(profit.sellDate);
        console.log('Processing profit sellDate:', profit.sellDate, 'parsed:', sellDate);
        if (!isNaN(sellDate.getTime())) {
          const sellMonthKey = `${sellDate.getFullYear()}-${(sellDate.getMonth() + 1).toString().padStart(2, '0')}`;
          console.log('Adding month from profit sellDate:', sellMonthKey);
          monthsSet.add(sellMonthKey);
        }
        
        // 매수 날짜로도 월 추출
        if (profit.buyDate) {
          const buyDate = new Date(profit.buyDate);
          console.log('Processing profit buyDate:', profit.buyDate, 'parsed:', buyDate);
          if (!isNaN(buyDate.getTime())) {
            const buyMonthKey = `${buyDate.getFullYear()}-${(buyDate.getMonth() + 1).toString().padStart(2, '0')}`;
            console.log('Adding month from profit buyDate:', buyMonthKey);
            monthsSet.add(buyMonthKey);
          }
        }
      } catch (error) {
        console.error('Error processing profit dates:', profit, error);
      }
    });
    
    const months = Array.from(monthsSet).sort().reverse();
    console.log('Final months list:', months);
    return months;
  };

  const months = getMonthsFromData();
  const [selectedMonth, setSelectedMonth] = useState(months[0] || '');

  const getMonthlyStats = (monthProfits: ProfitRecord[]) => {
    const totalProfit = monthProfits.reduce((sum, p) => sum + p.profit, 0);
    const totalBuyAmount = monthProfits.reduce((sum, p) => sum + p.buyWonAmount, 0);
    const totalSellAmount = monthProfits.reduce((sum, p) => sum + p.sellWonAmount, 0);
    
    return {
      profitCount: monthProfits.length,
      totalProfit,
      totalBuyAmount,
      totalSellAmount,
      avgProfitRate: monthProfits.length > 0 
        ? monthProfits.reduce((sum, p) => sum + p.profitRate, 0) / monthProfits.length 
        : 0
    };
  };

  if (months.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        완료된 투자 기록이 없습니다.
      </div>
    );
  }
  
  // 해당 월의 수익 기록 필터링 (매도 날짜 기준)
  const selectedProfits = profits.filter(profit => {
    const sellDate = new Date(profit.sellDate);
    const monthKey = `${sellDate.getFullYear()}-${(sellDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return monthKey === selectedMonth;
  });
  
  const stats = getMonthlyStats(selectedProfits);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center">
        <CalendarDays className="w-5 h-5 mr-2 text-purple-500" />
        월별 완료된 투자 기록
      </h3>
      
      {/* 월 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          조회 월 선택
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {months.map(month => {
            const [year, monthNum] = month.split('-');
            return (
              <option key={month} value={month}>
                {year}년 {parseInt(monthNum)}월
              </option>
            );
          })}
        </select>
      </div>
      
      {/* 월별 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm text-green-600">완료된 투자</p>
              <p className="font-bold text-green-800">{stats.profitCount}건</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm text-blue-600">총 투자금</p>
              <p className="font-bold text-blue-800">{formatCurrency(stats.totalBuyAmount)}원</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingDown className="w-5 h-5 text-purple-500 mr-2" />
            <div>
              <p className="text-sm text-purple-600">총 회수금</p>
              <p className="font-bold text-purple-800">{formatCurrency(stats.totalSellAmount)}원</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CalendarDays className="w-5 h-5 text-yellow-500 mr-2" />
            <div>
              <p className="text-sm text-yellow-600">총 수익</p>
              <p className={`font-bold ${
                stats.totalProfit >= 0 ? 'text-green-800' : 'text-red-800'
              }`}>
                {formatCurrency(Math.floor(stats.totalProfit))}원
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 완료된 투자 목록 */}
      {selectedProfits.length > 0 ? (
        <div>
          <h4 className="font-medium mb-3">완료된 투자 내역 ({selectedProfits.length}건)</h4>
          <div className="space-y-3">
            {selectedProfits.map((profit) => (
              <div
                key={profit.id}
                className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-l-green-500"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                    <span className="font-medium text-green-600">투자 완료</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`font-bold text-lg ${
                      profit.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profit.profit >= 0 ? '+' : ''}{formatCurrency(Math.floor(profit.profit))}원
                    </span>
                    {onDeleteProfit && (
                      <button
                        onClick={() => {
                          if (confirm('이 완료된 투자 기록을 삭제하시겠습니까?')) {
                            onDeleteProfit(profit.id);
                          }
                        }}
                        className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="완료된 투자 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">매수일</p>
                    <p className="font-medium">{formatDate(profit.buyDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">매도일</p>
                    <p className="font-medium">{formatDate(profit.sellDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">외화 금액</p>
                    <p className="font-medium">${formatCurrency(profit.foreignAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">수익률</p>
                    <p className={`font-medium ${
                      profit.profitRate >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profit.profit >= 0 ? '+' : ''}{profit.profitRate.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">매수 환율</p>
                    <p className="font-medium">{formatCurrency(profit.buyRate)}원</p>
                  </div>
                  <div>
                    <p className="text-gray-600">매도 환율</p>
                    <p className="font-medium">{formatCurrency(profit.sellRate)}원</p>
                  </div>
                  <div>
                    <p className="text-gray-600">매수금</p>
                    <p className="font-medium">{formatCurrency(profit.buyWonAmount)}원</p>
                  </div>
                  <div>
                    <p className="text-gray-600">매도금</p>
                    <p className="font-medium">{formatCurrency(profit.sellWonAmount)}원</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {selectedMonth ? 
            `${selectedMonth.split('-')[0]}년 ${parseInt(selectedMonth.split('-')[1])}월에 완료된 투자가 없습니다.` :
            '완료된 투자가 없습니다.'
          }
        </div>
      )}
    </div>
  );
} 