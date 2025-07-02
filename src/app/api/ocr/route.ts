import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    // 임시 파일 경로 (Windows라면 C:\temp 등으로 변경)
    const filename = `C:\Users\dionysus11\Documents\exchange-watcher-2025\ocr_${randomUUID()}.png`;
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    await writeFile(filename, Buffer.from(base64Data, 'base64'));

    // Python EasyOCR 실행
    const python = spawn('python3', ['easyocr_ocr.py', filename]);
    let output = '';
    for await (const chunk of python.stdout) output += chunk;
    let error = '';
    for await (const chunk of python.stderr) error += chunk;
    const exitCode = await new Promise((resolve) => python.on('close', resolve));

    // 임시 파일 삭제
    await unlink(filename);

    if (exitCode !== 0) {
      return NextResponse.json({ error: 'EasyOCR 실행 오류', detail: error }, { status: 500 });
    }

    const { text } = JSON.parse(output);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: '서버 오류', detail: String(e) }, { status: 500 });
  }
} 