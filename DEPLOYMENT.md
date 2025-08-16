# 🚀 배포 가이드

## 자동 배포 (권장)

### GitHub Actions 자동 배포
- **트리거**: `master` 브랜치에 푸시할 때마다 자동 실행
- **과정**: 빌드 → GitHub Pages 배포
- **URL**: https://saramjh.github.io/szwagecalc

```bash
# 코드 변경 후
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin master
# → 자동으로 배포됨!
```

### 수동 트리거
GitHub 저장소 → Actions 탭 → "Deploy to GitHub Pages" → "Run workflow" 클릭

## 수동 배포 (긴급시만)

```bash
# 로컬에서 직접 배포 (비권장)
npm run deploy:manual
```

## 환경별 설정

### 개발 환경
```bash
npm start
# → http://localhost:3000
```

### 프로덕션 빌드 테스트
```bash
npm run build:prod
npm install -g serve
serve -s build
```

## 트러블슈팅

### 1. GitHub Actions 실패 시
- Actions 탭에서 에러 로그 확인
- Secrets 설정 확인:
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`

### 2. 배포 후 빈 페이지 시
- `PUBLIC_URL` 설정 확인
- 브라우저 캐시 삭제

### 3. 권한 오류 시
- Repository Settings → Actions → General
- "Workflow permissions"에서 "Read and write permissions" 선택

## 배포 상태 확인

1. **GitHub Actions**: 빌드/배포 로그
2. **GitHub Pages**: Settings → Pages에서 배포 상태
3. **실제 사이트**: https://saramjh.github.io/szwagecalc

## 모니터링

- 배포 실패 시 GitHub에서 이메일 알림
- Actions 탭에서 배포 히스토리 확인 가능
- 실시간 배포 상태 확인
