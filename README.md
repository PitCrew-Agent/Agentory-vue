# Agentory

Agentory는 반도체 생산 설비를 실시간으로 관제하고, 알림 대응과 작업 이력을 관리하며,
설비 컨텍스트 기반 AI 지원을 제공하는 Vue 3 프론트엔드입니다.

## 핵심 기능

### 실시간 설비 관제

- Three.js 기반 라인별 3D 공장·설비 모니터링
- 설비 상태, 센서 상세 정보, 수리 이력, 알람 집계 조회
- 선택 설비의 실시간·과거 시계열 차트와 동적 SPC 밴드·하드 리밋 표시
- 위험 알람과 3D 설비 포커싱 연동
- `ERR-402` 복합 냉각 이상 전용 마커와 온도·압력 강조 표시

### 편집형 대시보드

- 공장, 설비 상세, 센서 차트, AI, 설비 분석, 알람 집계, 수리 이력 위젯 제공
- 마우스와 태블릿 터치로 위젯 이동·크기 조절
- 위젯 보관함과 브라우저 로컬 스토리지 기반 레이아웃 복원
- 한국어·영어 전환과 라이트·다크 테마 지원

### 알림과 대응 관리

- SSE 기반 실시간 알림 토스트와 읽음 처리
- 페이지네이션, 미확인 필터, KST 기준 캘린더 날짜 조회
- 알림 기반 대응 계획 생성과 작업 로그 초안 연계
- 작업 로그 작성·조회·수정·삭제

### 설비 컨텍스트 AI

- 설비별 추천 질문과 스트리밍 답변
- 대화 이력 조회·삭제와 백그라운드 답변 완료 알림
- 대화 중 최초 선택한 설비 컨텍스트 유지

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| 프론트엔드 | Vue 3, Composition API, JavaScript, Vite |
| 상태·라우팅 | Pinia, Vue Router |
| 데이터 통신 | Axios, Server-Sent Events |
| 시각화 | Three.js, Chart.js |
| 국제화 | Vue I18n |
| 테스트 | Vitest, Vue Test Utils, Playwright |
| 코드 품질 | ESLint, oxlint, Prettier |
| 배포 | GitHub Actions, Amazon S3, CloudFront |

TypeScript는 사용하지 않습니다. Node.js는 `package.json`의 `engines` 기준을 따릅니다.

```txt
^22.18.0 || >=24.12.0
```

## 시작하기

### 1. 의존성 설치

```sh
npm install
```

### 2. 환경 변수 설정

프로젝트 루트의 `.env-example`을 복사해 `.env`를 만들고 다음 값을 입력합니다.

```dotenv
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT_MS=10000
```

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 예 | 백엔드 API의 절대 URL |
| `VITE_API_TIMEOUT_MS` | 예 | Axios 요청 제한 시간(밀리초) |

두 값은 애플리케이션 초기화 시 검증됩니다. 값이 비어 있거나 제한 시간이 숫자가 아니면
애플리케이션이 시작되지 않습니다.

### 3. 개발 서버 실행

```sh
npm run dev
```

기본 개발 서버 주소는 `http://localhost:5173`입니다.

## 실행 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 생성 |
| `npm run preview` | 프로덕션 빌드 미리보기 |
| `npm run test:unit` | Vitest watch 모드 실행 |
| `npm run test:unit -- --run` | 단위 테스트 1회 실행 |
| `npm run test:e2e` | Chromium·Firefox·WebKit E2E 테스트 실행 |
| `npm run lint` | oxlint와 ESLint 검사 후 자동 수정 |
| `npm run format` | `src/`의 파일을 Prettier로 포맷 |

Playwright 브라우저가 설치되지 않은 환경에서는 먼저 다음 명령을 실행합니다.

```sh
npx playwright install
```

## 화면 경로

| 경로 | 화면 | 접근 |
| --- | --- | --- |
| `/login` | Microsoft Azure SSO 로그인 | 공개 |
| `/dashboard` | 3D 공장 및 설비 모니터링 대시보드 | 인증 필요 |
| `/work-log` | 작업 로그 조회 및 관리 | 인증 필요 |
| `/equipment` | 라인별 설비 목록 | 인증 필요 |
| `/notifications` | 알림 이력 조회 및 관리 | 인증 필요 |

인증된 사용자가 `/login`에 접근하면 `/dashboard`로 이동합니다. 인증되지 않은 사용자가
보호 화면에 접근하거나 세션이 만료되면 `/login`으로 이동합니다.

## 프로젝트 구조

```txt
agentory/
├─ .github/
│  ├─ ISSUE_TEMPLATE/
│  ├─ workflows/                 # CI 및 AWS 배포 워크플로우
│  └─ PULL_REQUEST_TEMPLATE.md
├─ e2e/                          # Playwright E2E 및 태블릿 터치 테스트
├─ public/                       # favicon 등 정적 공개 파일
├─ src/
│  ├─ assets/
│  │  ├─ fonts/                  # Pretendard 로컬 폰트
│  │  ├─ icons/                  # 공통·대시보드 아이콘
│  │  ├─ images/                 # 로고와 온보딩 이미지
│  │  └─ styles/
│  │     ├─ reset.css
│  │     ├─ tokens.css           # 색상·간격·타이포·그림자 토큰
│  │     └─ global.css           # 전역 레이아웃과 공통 스타일
│  ├─ constants/                 # 설비·알림·작업 로그 상태 상수
│  ├─ features/
│  │  ├─ auth/                   # SSO 인증 화면과 인증 API
│  │  ├─ dashboard/              # 위젯, 3D 공장, 차트, AI 대화
│  │  ├─ equipment/              # 설비 목록과 설비 API
│  │  ├─ i18n/                   # 번역 메시지와 언어 설정
│  │  ├─ incident/               # 알림 대응 계획 생성 흐름
│  │  ├─ notification/           # 알림 센터, 이력, 실시간 스트림
│  │  └─ workLog/                # 작업 로그 화면과 CRUD API
│  ├─ router/
│  │  └─ index.js                # 라우트와 인증 가드
│  ├─ services/
│  │  ├─ api/                    # Axios, 응답 정규화, SSE 공통 모듈
│  │  └─ datetime/               # KST 날짜·시간 변환
│  ├─ stores/                    # 인증, AI, UI 전역 Pinia 상태
│  ├─ __tests__/                 # 애플리케이션 단위 테스트
│  ├─ App.vue                    # 전역 라우트 셸과 토스트
│  └─ main.js                    # Pinia, Router, i18n 초기화
├─ .env-example
├─ package.json
├─ playwright.config.js
├─ vite.config.js
└─ vitest.config.js
```

기능 코드는 `src/features/{featureName}` 아래에서 컴포넌트, composable, 상수, 서비스,
store, 유틸, view 역할로 나눕니다. 모든 기능이 각 폴더를 전부 가질 필요는 없습니다.

## 데이터 흐름

- 공통 Axios 인스턴스는 세션 쿠키와 현재 언어의 `Accept-Language` 헤더를 전송합니다.
- 백엔드 공통 응답은 `src/services/api/apiResponse.js`에서 실제 데이터로 정규화합니다.
- `401` 응답은 세션 만료 이벤트로 전환해 인증 상태와 라우팅을 정리합니다.
- 알림은 SSE로 수신하고 관련 설비·센서·그래프 데이터를 즉시 갱신합니다.
- 실시간 텔레메트리는 선택 설비 기준으로 주기 갱신하며, 과거 조회 시 실시간 모드와 분리합니다.
- 알림과 작업 로그의 날짜·시간은 `src/services/datetime/kstDateTime.js`에서 KST 기준으로 처리합니다.
- 화면 컴포넌트는 API 경로를 직접 다루지 않고 기능별 `services` 함수를 호출합니다.

## 대시보드 레이아웃

대시보드는 1024px 이상의 운영 화면을 기준으로 하며 태블릿 포인터 입력을 지원합니다.
위젯 배치와 노출 상태는 `agentory-dashboard-layout` 키로 로컬 스토리지에 저장됩니다.
저장 데이터에는 버전이 포함되어 호환되지 않는 레이아웃을 안전하게 무시합니다.

## 디자인 및 코드 기준

UI 구현 기준은 [Final Figma](https://www.figma.com/design/I7xSvPb3QvRyXDY73faOQl/Final-Figma?node-id=284-651&t=5hE9jo2F3mtTwCK1-1)입니다.

- Vue 3 Composition API와 JavaScript를 사용합니다.
- 색상, 폰트, 간격, radius, shadow는 `tokens.css`의 `--agentory-*` 변수를 우선 사용합니다.
- 공통 스타일은 `reset.css`, `tokens.css`, `global.css` 순서로 불러옵니다.
- 기능 컴포넌트 스타일은 scoped CSS로 작성하고 서비스 전체 규칙만 전역 스타일에 둡니다.
- 아이콘, 이미지, 폰트는 `src/assets` 하위에서 관리합니다.

## 테스트와 CI

- 단위 테스트는 Vitest와 Vue Test Utils를 사용합니다.
- E2E 테스트는 Playwright의 Chromium, Firefox, WebKit 프로젝트를 지원합니다.
- 태블릿 편집 동작은 터치 포인터와 `1180 × 820` viewport 전용 시나리오로 검증합니다.
- `dev` 또는 `main` 대상 PR과 push에서 lint, 단위 테스트, 빌드, E2E job을 실행합니다.
- CI의 E2E는 현재 Chromium만 실행하며, 백엔드 API mocking 전까지 임시로 non-blocking입니다.

## 배포

`dev` 브랜치 push 또는 수동 실행으로 GitHub Actions의 배포 워크플로우가 동작합니다.
빌드 결과를 S3에 동기화하고 CloudFront 캐시를 무효화합니다.

| GitHub 설정 | 종류 | 용도 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Variable | 프로덕션 API URL |
| `VITE_API_TIMEOUT_MS` | Variable | 프로덕션 API 요청 제한 시간 |
| `AWS_REGION` | Variable | AWS 리전 |
| `S3_BUCKET` | Variable | 정적 파일 배포 버킷 |
| `CLOUDFRONT_DISTRIBUTION_ID` | Variable | 캐시 무효화 대상 배포 ID |
| `AWS_ROLE_ARN` | Secret | GitHub OIDC가 사용할 IAM Role ARN |

## Git 작업 기준

기준 브랜치는 `dev`이며, 최신 `dev`에서 기능 브랜치를 만듭니다.

```sh
git switch dev
git pull --ff-only origin dev
git switch -c feat-{이슈번호}-{기능명}
```

- 브랜치명은 `feat-{이슈번호}-{기능명}` 형식을 사용합니다.
- 커밋은 기능 단위로 나누고 작업 내용을 한국어로 작성합니다.
- Pull Request의 base 브랜치는 `dev`로 지정합니다.
- `dev` 브랜치에 직접 작업하거나 push하지 않습니다.

커밋 메시지 예시:

```txt
feat: 설비 상태 실시간 연동 추가
fix: AI 대화 세션 컨텍스트 오류 수정
style: 대시보드 위젯 간격 조정
docs: 프로젝트 구조와 실행 방법 갱신
```
