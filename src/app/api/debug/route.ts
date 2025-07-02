import { NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';

export async function GET() {
  try {
    const investments = dbUtils.getAllInvestments();
    const profits = dbUtils.getAllProfits();

    // 이미지 데이터 제외하고 간단한 정보만
    const simplifiedInvestments = investments.map(inv => ({
      id: inv.id,
      date: inv.date,
      type: inv.type,
      foreignAmount: inv.foreignAmount,
      exchangeRate: inv.exchangeRate,
      wonAmount: inv.wonAmount,
      source: inv.source,
      createdAt: inv.createdAt
    }));

    const simplifiedProfits = profits.map(p => ({
      id: p.id,
      buyDate: p.buyDate,
      sellDate: p.sellDate,
      buyRecordId: p.buyRecordId,
      sellRecordId: p.sellRecordId,
      foreignAmount: p.foreignAmount,
      buyRate: p.buyRate,
      sellRate: p.sellRate,
      profit: p.profit,
      profitRate: p.profitRate,
      createdAt: p.createdAt
    }));

    return NextResponse.json({
      investments: simplifiedInvestments,
      profits: simplifiedProfits,
      summary: {
        totalInvestments: investments.length,
        totalProfits: profits.length,
        investmentsByType: {
          buy: investments.filter(i => i.type === 'USD 사기').length,
          sell: investments.filter(i => i.type === 'USD 팔기').length
        }
      }
    });
  } catch (error) {
    console.error('Debug API 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
} 