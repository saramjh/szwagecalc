# 브랜치 보호 규칙 설정 (선택사항)

더 안정적인 배포를 위해 master 브랜치 보호 규칙을 설정할 수 있습니다:

## GitHub 설정 방법

1. **Repository Settings**
2. **Branches** 
3. **Add rule** 클릭
4. **Branch name pattern**: `master`
5. 다음 옵션들 체크:
   - ✅ **Require status checks to pass**
   - ✅ **Require branches to be up to date**
   - ✅ **Require deployments to succeed**

## 권장 워크플로우

```bash
# 1. 새 기능 브랜치 생성
git checkout -b feature/new-feature

# 2. 개발 및 커밋
git add .
git commit -m "feat: 새로운 기능 구현"

# 3. 푸시 및 PR 생성
git push origin feature/new-feature

# 4. GitHub에서 Pull Request 생성
# 5. CI 통과 후 master에 머지
# 6. 자동 배포 실행
```

이렇게 하면 모든 변경사항이 검토를 거쳐 안전하게 배포됩니다.
