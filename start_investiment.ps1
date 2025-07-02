# PowerShell 스크립트: start-exchange-diary.ps1

# 1. 절대 경로로 이동
Set-Location -Path "C:\Users\dionysus12\Documents\exchange_monitor"

# 2. 환경변수(필요시) 설정 예시
# $env:NODE_ENV = "production"

# 3. 빌드 (최초 1회 또는 코드 변경시)
npm install
npm run build

# 4. 프로덕션 서버 실행 (백그라운드 실행)
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "start"