import { NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';

// DELETE: 특정 투자 기록 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 삭제할 기록 조회
    const recordToDelete = dbUtils.getInvestmentById(id);
    if (!recordToDelete) {
      return NextResponse.json({
        success: false,
        message: '삭제할 기록을 찾을 수 없습니다.'
      }, { status: 404 });
    }

    // 관련 수익 기록 먼저 삭제
    const deletedProfits = dbUtils.deleteProfitsByInvestmentId(id);
    
    // 투자 기록 삭제
    const deletedInvestment = dbUtils.deleteInvestment(id);

    if (deletedInvestment.changes === 0) {
      return NextResponse.json({
        success: false,
        message: '기록을 삭제할 수 없습니다.'
      }, { status: 400 });
    }

    const message = `${recordToDelete.type} 기록이 삭제되었습니다.${
      deletedProfits.changes > 0 ? ' (관련 수익 기록도 함께 삭제됨)' : ''
    }`;

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: '기록을 삭제하는 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 