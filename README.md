# szwagecalc

szwagecalc는 아르바이트 급여를 편리하게 계산하고 관리할 수 있도록 돕는 웹 애플리케이션입니다. 달력 기반의 직관적인 인터페이스를 통해 근무 기록을 쉽게 추가하고, 여러 직업의 시급을 개별적으로 설정 및 관리할 수 있습니다. 또한, 월별 근무 기록과 급여를 요약한 리포트를 제공하여 수입을 한눈에 파악할 수 있도록 돕습니다.

## 주요 기능:

*   **직업 및 시급 관리**: 여러 직업을 등록하고 각 직업의 시급을 기간별로 설정할 수 있습니다.
*   **근무 기록**: 달력에서 날짜를 선택하여 간편하게 근무 시간과 특이사항(식대 등)을 기록할 수 있습니다.
*   **급여 자동 계산**: 기록된 근무 시간과 설정된 시급을 바탕으로 일급 및 월급을 자동으로 계산합니다.
*   **월별 리포트**: 월별 총 근무 시간, 총 급여, 평균 시급 등 유용한 통계 정보를 제공합니다.
*   **데이터 동기화**: Supabase를 백엔드로 사용하여 데이터의 안전한 저장과 동기화를 지원합니다.

## 기술 스택:

*   **프론트엔드**: React, Tailwind CSS
*   **백엔드**: Supabase
*   **배포**: GitHub Pages

---

## 개발자 가이드

이 프로젝트는 React 기반의 웹 애플리케이션입니다. 개발 환경 설정 및 배포에 대한 가이드는 다음과 같습니다.

### 1. 프로젝트 설정

프로젝트를 로컬 환경에서 실행하기 위해 다음 단계를 따르세요.

1.  **저장소 클론:**
    ```bash
    git clone https://github.com/your-username/szwagecalc.git
    cd szwagecalc
    ```

2.  **의존성 설치:**
    ```bash
    npm install
    ```

3.  **환경 변수 설정:**
    프로젝트 루트에 `.env.local` 파일을 생성하고 Supabase 관련 환경 변수를 설정합니다. 이 변수들은 Supabase 프로젝트 설정에서 확인할 수 있습니다.
    ```
    REACT_APP_SUPABASE_URL=YOUR_SUPABASE_URL
    REACT_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

### 2. 개발 서버 실행

개발 모드로 애플리케이션을 실행합니다. 변경 사항이 있을 때마다 자동으로 새로고침됩니다.

```bash
npm start
```

애플리케이션은 일반적으로 `http://localhost:3000`에서 실행됩니다.

### 3. 프로덕션 빌드

배포를 위한 프로덕션 빌드를 생성합니다. 빌드된 파일들은 `build/` 디렉토리에 생성됩니다.

```bash
npm run build
```

**중요:** 서비스 워커가 올바르게 작동하도록 `package.json` 파일의 `homepage` 필드를 배포될 도메인으로 설정해야 합니다. 예를 들어, `https://hrwage.run.place`에 배포한다면 `package.json`에 다음을 추가합니다.

```json
{
  "name": "szwagecalc",
  "version": "0.1.0",
  "private": true,
  "homepage": "https://hrwage.run.place",
  "dependencies": {
    // ...
  }
}
```

### 4. 배포

`npm run build` 명령으로 생성된 `build` 디렉토리의 내용을 웹 서버에 업로드하여 배포합니다. GitHub Pages를 사용하는 경우, `gh-pages` 라이브러리 등을 활용할 수 있습니다.

### 5. 데이터베이스 스키마 (Supabase)

애플리케이션에서 사용하는 주요 데이터베이스 테이블 스키마는 다음과 같습니다.

#### `jobs`
- `id`: `uuid` (PK)
- `user_id`: `uuid` (FK, `auth.users.id`)
- `job_name`: `text`
- `description`: `text` (nullable)
- `created_at`: `timestamptz`

#### `hourly_rate_history`
- `id`: `bigint` (PK)
- `user_id`: `uuid` (FK, `auth.users.id`)
- `job_id`: `uuid` (FK, `jobs.id`)
- `hourly_rate`: `numeric`
- `effective_date`: `date`
- `end_date`: `date` (nullable)

#### `work_records`
- `id`: `bigint` (PK)
- `user_id`: `uuid` (FK, `auth.users.id`)
- `job_id`: `uuid` (FK, `jobs.id`)
- `date`: `date`
- `start_time`: `time`
- `end_time`: `time`
- `meal_allowance`: `numeric`
- `notes`: `text` (nullable)
- `daily_wage`: `numeric`

#### `profiles`
- `user_id`: `uuid` (PK, FK, `auth.users.id`)
- `username`: `text`

### 6. 버그 수정 및 개선 작업 목록

현재 진행 중이거나 완료된 주요 작업 목록입니다.

-   **직업 관리 (`JobManagementModal`)**
    -   [x] **A. 직업 삭제 오류 해결:** Foreign Key 제약 조건 위반 문제 해결 (참조 레코드 선 삭제)
    -   [x] **B. 직업 설명 저장 오류 해결:** `description` 필드 저장 및 로드 기능 수정

-   **근무 추가 (`DailyRecordModal`)**
    -   [x] **A. 적용 시급 미표시 문제 해결:** 조회된 시급이 UI에 정상적으로 표시되도록 수정
    -   [x] **B. 시간 미입력 시 UX 개선:** 시간 미입력 상태로 저장 시도 시 사용자에게 알림 처리

-   **데이터 동기화**
    -   [x] **A. 근무 목록 데이터 비동기화 문제 해결:** 시급 변경 시 `DailyRecordListModal`의 일급 정보가 즉시 재계산 및 반영되도록 수정

-   **모달 스크롤 문제 해결**
    -   [x] **A. 모달 배경 스크롤 잠금:** 모달 활성화 시 `body` 스크롤 비활성화
    -   [x] **B. `UsageGuideModal` 뷰포트 넘침 문제 해결:** 모달 내부 스크롤 가능하도록 `max-height` 및 `overflow-y-auto` 적용

-   **ESLint 경고 해결**
    -   [x] **A. `DailyRecordModal.js` 의존성 경고 해결:** `useEffect` 의존성 배열에 `mealAllowance` 추가
    -   [x] **B. `HourlyRateSettingModal.js` 의존성 경고 해결:** `useEffect` 의존성 배열에 `selectedJobId` 추가

-   **Supabase 406 에러 해결**
    -   [x] **A. `HourlyRateSettingModal.js` `single()` 메서드 사용 오류 해결:** `single()` 제거 및 `data.length`로 데이터 존재 여부 확인

-   **서비스 워커 404 에러 해결**
    -   [ ] **A. `package.json` `homepage` 설정 확인 및 재빌드/재배포 안내**

-   **홈 화면 추가 기능 (PWA)**
    -   [ ] **A. `UsageGuideModal`에 플랫폼별 홈 화면 추가 가이드 및 기능 추가**

---

## 기여

이 프로젝트에 기여하고 싶으시다면, 언제든지 Pull Request를 보내주세요. 버그 리포트나 기능 제안도 환영합니다.

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.