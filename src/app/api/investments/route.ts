import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';
import { InvestmentRecord, ProfitRecord } from '@/types/investment';

// 서버 시작 시 profits 중복 정리
dbUtils.cleanupDuplicateProfits();

// GET: 모든 투자 기록과 수익 기록 조회
export async function GET() {
  try {
    const investments = dbUtils.getAllInvestments();
    const profits = dbUtils.getAllProfits();

    // 디버깅: investments 데이터 확인
    console.log('Investments 데이터:', investments);
    console.log('Profits 데이터 개수:', profits.length);

    return NextResponse.json({
      investments,
      profits
    });
  } catch (error) {
    console.error('투자 기록 조회 실패:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// POST: 새 투자 기록 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('POST 요청 받음:', body);

    const { records, source = 'photo' } = body;

    if (!records || !Array.isArray(records)) {
      console.log('잘못된 데이터 형식:', records);
      return NextResponse.json({ error: '잘못된 데이터 형식입니다.' }, { status: 400 });
    }

    const results = [];

    for (const recordData of records) {
      console.log('처리 중인 기록:', recordData);
      
      // 중복 체크
      const isDuplicate = dbUtils.checkDuplicate(recordData);
      console.log('중복 체크 결과:', isDuplicate);
      
      if (isDuplicate) {
        console.log('중복 기록 발견, 건너뜀');
        results.push({
          success: false,
          error: '중복된 기록입니다.',
          data: recordData
        });
        continue;
      }

      // ID 생성
      const id = dbUtils.getNextId();
      console.log('생성된 ID:', id);
      
      const record: InvestmentRecord = {
        id,
        ...recordData,
        source,
        createdAt: new Date().toISOString()
      };

      console.log('저장할 기록:', record);

      // 데이터베이스에 저장
      dbUtils.insertInvestment(record);
      console.log('저장 완료');

      // USD 팔기인 경우 매칭 확인
      if (record.type === 'USD 팔기') {
        console.log('=== USD 팔기 매칭 프로세스 시작 ===');
        console.log('매도 기록:', {
          id: record.id,
          date: record.date,
          foreignAmount: record.foreignAmount,
          exchangeRate: record.exchangeRate,
          wonAmount: record.wonAmount
        });
        
        // 현재 사용 가능한 매수 기록들 조회
        const allBuyRecords = dbUtils.getAllInvestments().filter(inv => inv.type === 'USD 사기');
        console.log('현재 사용 가능한 매수 기록들:', allBuyRecords.map(r => ({
          id: r.id,
          date: r.date,
          foreignAmount: r.foreignAmount,
          exchangeRate: r.exchangeRate
        })));
        
        const matchingBuyRecord = dbUtils.findMatchingBuyRecord(record);
        console.log('매칭 결과:', matchingBuyRecord ? {
          id: matchingBuyRecord.id,
          date: matchingBuyRecord.date,
          foreignAmount: matchingBuyRecord.foreignAmount,
          exchangeRate: matchingBuyRecord.exchangeRate
        } : 'NO_MATCH');
        
        if (matchingBuyRecord) {
          console.log('=== 매칭 성공 - 수익 계산 시작 ===');
          
          // profits 중복 체크
          const isProfitExist = dbUtils.hasProfitRecord(matchingBuyRecord.id, record.id);
          console.log('기존 profit 기록 존재 여부:', isProfitExist);
          
          if (!isProfitExist) {
            // 수익 계산 및 저장
            const buyAmount = matchingBuyRecord.foreignAmount * matchingBuyRecord.exchangeRate;
            const sellAmount = record.foreignAmount * record.exchangeRate;
            const profit = sellAmount - buyAmount;
            const profitRate = (profit / buyAmount) * 100;

            console.log('수익 계산:', {
              buyAmount,
              sellAmount,
              profit,
              profitRate
            });

            const profitRecord: ProfitRecord = {
              id: `profit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              buyDate: matchingBuyRecord.date,
              sellDate: record.date,
              buyRecordId: matchingBuyRecord.id,
              sellRecordId: record.id,
              foreignAmount: record.foreignAmount,
              buyRate: matchingBuyRecord.exchangeRate,
              sellRate: record.exchangeRate,
              buyWonAmount: matchingBuyRecord.wonAmount,
              sellWonAmount: record.wonAmount,
              profit,
              profitRate,
              createdAt: new Date().toISOString()
            };

            console.log('=== 수익 기록 저장 ===');
            console.log('저장할 profit 기록:', profitRecord);
            dbUtils.insertProfit(profitRecord);
            console.log('수익 기록 저장 완료');
            
            // 매칭된 기록들 삭제
            console.log('=== 매칭된 원본 기록들 삭제 시작 ===');
            console.log('삭제할 매수 기록:', matchingBuyRecord.id);
            console.log('삭제할 매도 기록:', record.id);
            
            const buyDeleteResult = dbUtils.deleteInvestment(matchingBuyRecord.id);
            const sellDeleteResult = dbUtils.deleteInvestment(record.id);
            
            console.log('매수 기록 삭제 결과:', buyDeleteResult);
            console.log('매도 기록 삭제 결과:', sellDeleteResult);
            console.log('=== 매칭 프로세스 완료 ===');
          } else {
            console.log('WARNING: 중복된 profit 기록이 이미 존재합니다. 저장하지 않음.');
          }
        } else {
          console.log('=== 매칭 실패 - 대응하는 매수 기록 없음 ===');
          console.log('매도 기록은 investments 테이블에 그대로 유지됩니다.');
        }
      } else {
        console.log('=== USD 사기 기록 저장 ===');
        console.log('매수 기록 저장:', {
          id: record.id,
          date: record.date,
          foreignAmount: record.foreignAmount,
          exchangeRate: record.exchangeRate
        });
      }

      results.push({
        success: true,
        data: record
      });
    }

    // profits 중복 정리(혹시라도 동시성 등으로 중복이 생겼을 경우)
    dbUtils.cleanupDuplicateProfits();

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('투자 기록 저장 실패:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// DELETE: 모든 데이터 삭제 또는 특정 수익 기록 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profitId = searchParams.get('profitId');
    
    if (profitId) {
      // 특정 수익 기록 삭제
      const result = dbUtils.deleteProfitById(profitId);
      
      if (result.changes > 0) {
        return NextResponse.json({
          success: true,
          message: '수익 기록이 삭제되었습니다.'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: '해당 수익 기록을 찾을 수 없습니다.'
        }, { status: 404 });
      }
    } else {
      // 모든 데이터 삭제
      dbUtils.clearAllData();
      return NextResponse.json({
        success: true,
        message: '모든 데이터가 삭제되었습니다.'
      });
    }
  } catch (error) {
    console.error('데이터 삭제 실패:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
} 