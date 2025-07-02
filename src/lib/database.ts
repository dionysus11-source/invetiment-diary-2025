import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { InvestmentRecord, ProfitRecord } from '@/types/investment';

// 데이터베이스 파일 경로
const dbPath = path.join(process.cwd(), 'data', 'exchange-diary.db');

// data 디렉토리가 없으면 생성
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 데이터베이스 연결
const db = new Database(dbPath);

// 테이블 생성
const initTables = () => {
  // 투자 기록 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('USD 사기', 'USD 팔기')),
      foreignAmount REAL NOT NULL,
      exchangeRate REAL NOT NULL,
      wonAmount REAL NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('photo', 'manual')),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 수익 기록 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS profits (
      id TEXT PRIMARY KEY,
      sellDate TEXT NOT NULL,
      buyRecordId TEXT NOT NULL,
      sellRecordId TEXT NOT NULL,
      foreignAmount REAL NOT NULL,
      buyRate REAL NOT NULL,
      sellRate REAL NOT NULL,
      profit REAL NOT NULL,
      profitRate REAL NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 기존 테이블에 새 컬럼 추가 (마이그레이션)
  try {
    // 테이블 구조 확인
    const tableInfo = db.prepare("PRAGMA table_info(profits)").all() as Array<{name: string}>;
    const columnNames = tableInfo.map(col => col.name);
    
    // 새 컬럼들이 없으면 추가
    if (!columnNames.includes('buyDate')) {
      db.exec(`ALTER TABLE profits ADD COLUMN buyDate TEXT`);
      console.log('buyDate 컬럼 추가됨');
    }
    if (!columnNames.includes('buyWonAmount')) {
      db.exec(`ALTER TABLE profits ADD COLUMN buyWonAmount REAL`);
      console.log('buyWonAmount 컬럼 추가됨');
    }
    if (!columnNames.includes('sellWonAmount')) {
      db.exec(`ALTER TABLE profits ADD COLUMN sellWonAmount REAL`);
      console.log('sellWonAmount 컬럼 추가됨');
    }
  } catch (error) {
    console.log('테이블 마이그레이션 오류:', error);
  }
};

// 앱 시작시 테이블 초기화
initTables();

export { db };

// 데이터베이스 유틸리티 함수들
export const dbUtils = {
  // 모든 투자 기록 조회
  getAllInvestments: (): InvestmentRecord[] => {
    const stmt = db.prepare('SELECT * FROM investments ORDER BY date DESC');
    return stmt.all() as InvestmentRecord[];
  },

  // 모든 수익 기록 조회
  getAllProfits: (): ProfitRecord[] => {
    const stmt = db.prepare('SELECT * FROM profits ORDER BY sellDate DESC');
    return stmt.all() as ProfitRecord[];
  },

  // 투자 기록 추가
  insertInvestment: (investment: InvestmentRecord) => {
    const stmt = db.prepare(`
      INSERT INTO investments (id, date, type, foreignAmount, exchangeRate, wonAmount, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      investment.id,
      investment.date,
      investment.type,
      investment.foreignAmount,
      investment.exchangeRate,
      investment.wonAmount,
      investment.source
    );
  },

  // 수익 기록 추가
  insertProfit: (profit: ProfitRecord) => {
    const stmt = db.prepare(`
      INSERT INTO profits (id, buyDate, sellDate, buyRecordId, sellRecordId, foreignAmount, buyRate, sellRate, buyWonAmount, sellWonAmount, profit, profitRate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      profit.id,
      profit.buyDate,
      profit.sellDate,
      profit.buyRecordId,
      profit.sellRecordId,
      profit.foreignAmount,
      profit.buyRate,
      profit.sellRate,
      profit.buyWonAmount,
      profit.sellWonAmount,
      profit.profit,
      profit.profitRate
    );
  },

  // 투자 기록 삭제
  deleteInvestment: (id: string) => {
    const stmt = db.prepare('DELETE FROM investments WHERE id = ?');
    return stmt.run(id);
  },

  // 관련 수익 기록 삭제
  deleteProfitsByInvestmentId: (investmentId: string) => {
    const stmt = db.prepare('DELETE FROM profits WHERE buyRecordId = ? OR sellRecordId = ?');
    return stmt.run(investmentId, investmentId);
  },

  // 특정 수익 기록 삭제
  deleteProfitById: (profitId: string) => {
    const stmt = db.prepare('DELETE FROM profits WHERE id = ?');
    return stmt.run(profitId);
  },

  // 특정 투자 기록 조회
  getInvestmentById: (id: string): InvestmentRecord | undefined => {
    const stmt = db.prepare('SELECT * FROM investments WHERE id = ?');
    return stmt.get(id) as InvestmentRecord | undefined;
  },

  // 매칭되는 매수 기록 찾기 (외화 금액 오차 허용)
  findMatchingBuyRecord: (sellRecord: InvestmentRecord): InvestmentRecord | undefined => {
    console.log('=== 매칭 검색 시작 ===');
    console.log('매도 기록 정보:', {
      foreignAmount: sellRecord.foreignAmount,
      date: sellRecord.date,
      roundedAmount: Math.round(sellRecord.foreignAmount * 100)
    });
    
    // 먼저 모든 USD 사기 기록 조회
    const allBuyStmt = db.prepare(`SELECT * FROM investments WHERE type = 'USD 사기'`);
    const allBuyRecords = allBuyStmt.all() as InvestmentRecord[];
    console.log('데이터베이스의 모든 USD 사기 기록:', allBuyRecords.map(r => ({
      id: r.id,
      date: r.date,
      foreignAmount: r.foreignAmount,
      roundedAmount: Math.round(r.foreignAmount * 100)
    })));
    
    // 소수점 오차 허용 매칭 쿼리
    const stmt = db.prepare(`
      SELECT * FROM investments 
      WHERE type = 'USD 사기' 
        AND ABS(foreignAmount - ?) < 0.01
        AND date < ?
      ORDER BY date ASC
      LIMIT 1
    `);
    
    console.log('매칭 쿼리 파라미터:', {
      targetForeignAmount: sellRecord.foreignAmount,
      targetRoundedAmount: Math.round(sellRecord.foreignAmount * 100),
      beforeDate: sellRecord.date
    });
    
    const result = stmt.get(sellRecord.foreignAmount, sellRecord.date) as InvestmentRecord | undefined;
    console.log('매칭 쿼리 결과:', result ? {
      id: result.id,
      date: result.date,
      foreignAmount: result.foreignAmount,
      roundedAmount: Math.round(result.foreignAmount * 100)
    } : 'NO_MATCH');
    
    return result;
  },

  // 모든 데이터 삭제
  clearAllData: () => {
    db.exec('DELETE FROM profits');
    db.exec('DELETE FROM investments');
  },

  // 중복 기록 체크
  checkDuplicate: (record: Omit<InvestmentRecord, 'id'>) => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM investments 
      WHERE date = ? AND type = ? AND foreignAmount = ? AND exchangeRate = ?
    `);
    const result = stmt.get(record.date, record.type, record.foreignAmount, record.exchangeRate) as { count: number };
    return result.count > 0;
  },

  // 다음 사용 가능한 ID 생성
  getNextId: (): string => {
    const stmt = db.prepare(`
      SELECT id FROM investments 
      WHERE id LIKE 'INV_%' 
      ORDER BY CAST(SUBSTR(id, 5) AS INTEGER) DESC 
      LIMIT 1
    `);
    const lastRecord = stmt.get() as { id: string } | undefined;
    
    if (!lastRecord) {
      return 'INV_0001';
    }
    
    const lastNumber = parseInt(lastRecord.id.replace('INV_', ''), 10);
    const nextNumber = lastNumber + 1;
    return `INV_${nextNumber.toString().padStart(4, '0')}`;
  },

  // profits에 동일한 매수/매도 조합이 있는지 확인
  hasProfitRecord: (buyRecordId: string, sellRecordId: string) => {
    console.log('=== profit 중복 체크 ===');
    console.log('체크할 buyRecordId:', buyRecordId);
    console.log('체크할 sellRecordId:', sellRecordId);
    
    // 먼저 모든 profits 조회
    const allProfits = db.prepare('SELECT * FROM profits').all() as ProfitRecord[];
    console.log('현재 모든 profits:', allProfits.map(p => ({
      id: p.id,
      buyRecordId: p.buyRecordId,
      sellRecordId: p.sellRecordId,
      buyDate: p.buyDate,
      sellDate: p.sellDate
    })));
    
    const stmt = db.prepare('SELECT COUNT(*) as count FROM profits WHERE buyRecordId = ? AND sellRecordId = ?');
    const result = stmt.get(buyRecordId, sellRecordId) as { count: number };
    console.log('중복 체크 결과:', result.count > 0);
    return result.count > 0;
  },

  // profits 중복 정리: buyRecordId, sellRecordId가 같은 것이 여러 개면 하나만 남기고 삭제
  cleanupDuplicateProfits: () => {
    const duplicates = db.prepare(`
      SELECT buyRecordId, sellRecordId, COUNT(*) as cnt
      FROM profits
      GROUP BY buyRecordId, sellRecordId
      HAVING cnt > 1
    `).all() as { buyRecordId: string, sellRecordId: string, cnt: number }[];
    for (const dup of duplicates) {
      // 중복 profit id들 중 가장 오래된 1개만 남기고 삭제
      const ids = db.prepare(`
        SELECT id FROM profits
        WHERE buyRecordId = ? AND sellRecordId = ?
        ORDER BY createdAt ASC
      `).all(dup.buyRecordId, dup.sellRecordId) as { id: string }[];
      const idsToDelete = ids.slice(1).map(row => row.id);
      for (const id of idsToDelete) {
        db.prepare('DELETE FROM profits WHERE id = ?').run(id);
      }
    }
  },
}; 