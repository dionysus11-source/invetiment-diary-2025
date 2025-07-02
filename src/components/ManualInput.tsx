'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';

interface ManualInputProps {
  onSubmit: (data: {
    type: 'USD 사기' | 'USD 팔기';
    foreignAmount: number;
    exchangeRate: number;
  }) => void;
}

export default function ManualInput({ onSubmit }: ManualInputProps) {
  const [type, setType] = useState<'USD 사기' | 'USD 팔기'>('USD 사기');
  const [foreignAmount, setForeignAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(foreignAmount);
    const rate = parseFloat(exchangeRate);
    
    if (isNaN(amount) || amount <= 0) {
      alert('올바른 외화 금액을 입력해주세요.');
      return;
    }
    
    if (isNaN(rate) || rate <= 0) {
      alert('올바른 환율을 입력해주세요.');
      return;
    }
    
    onSubmit({
      type,
      foreignAmount: amount,
      exchangeRate: rate
    });
    
    // 폼 초기화
    setForeignAmount('');
    setExchangeRate('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <PlusCircle className="w-5 h-5 mr-2 text-green-500" />
        직접 입력
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            거래 유형
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'USD 사기' | 'USD 팔기')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD 사기">USD 사기</option>
            <option value="USD 팔기">USD 팔기</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            외화 금액 (USD)
          </label>
          <input
            type="number"
            step="0.01"
            value={foreignAmount}
            onChange={(e) => setForeignAmount(e.target.value)}
            placeholder="예: 1847.82"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            적용 환율 (원)
          </label>
          <input
            type="number"
            step="0.01"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            placeholder="예: 1355.62"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
        >
          추가하기
        </button>
      </form>
    </div>
  );
} 