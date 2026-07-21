# Agentory

Agentory는 반도체 생산 설비의 상태를 실시간으로 확인하고, 알림 대응과 작업 이력을 관리하며, 설비 컨텍스트 기반 AI 지원을 제공하는 Vue 3 프론트엔드입니다.

## 주요 기능

- Microsoft Azure SSO 기반 인증 및 사용자 세션 관리
- Three.js 기반 라인별 3D 공장·설비 모니터링
- 설비 상태, 센서 상세 정보, 실시간 시계열 차트 제공
- 사용자 편집형 대시보드 위젯 배치와 로컬 레이아웃 저장
- 설비별 AI 추천 질문, 스트리밍 답변, 대화 이력 관리
- 실시간 알림 토스트, 알림 이력 조회 및 읽음 처리
- 알림 기반 대응 계획 생성과 작업 로그 작성·수정·삭제
- 설비 목록과 수리 이력, 센서 분석, 알람 집계 제공
- 한국어·영어 국제화 및 라이트·다크 테마 지원

## 기술 스택

- Vue 3, Composition API, JavaScript
- Vite, Vue Router, Pinia
- Axios, Server-Sent Events
- Three.js, Chart.js
- Vue I18n
- Vitest, Playwright
- ESLint, oxlint, Prettier

## 개발 환경

Node.js 버전은 `package.json`의 `engines` 기준을 따릅니다.

```txt
^22.18.0 || >=24.12.0
```

의존성을 설치하고 개발 서버를 실행합니다.

```sh
npm install
npm run dev
```

기본 환경 변수는 프로젝트 루트의 `.env`에서 관리합니다. 필요한 키는 `.env-example`에서 확인할 수 있습니다.

```dotenv
VITE_API_BASE_URL=
VITE_API_TIMEOUT_MS=
```

환경 변수가 비어 있거나 올바르지 않으면 애플리케이션 시작 또는 API 요청 단계에서 오류가 발생합니다.

## 실행 명령어

```sh
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# 단위 테스트
npm run test:unit

# E2E 테스트
npm run test:e2e

# 정적 검사
npm run lint

# 코드 포맷
npm run format
```

## 화면 경로

| 경로 | 화면 | 접근 |
| --- | --- | --- |
| `/login` | Microsoft Azure SSO 로그인 | 공개 |
| `/dashboard` | 3D 공장 및 설비 모니터링 대시보드 | 인증 필요 |
| `/work-log` | 작업 로그 조회 및 관리 | 인증 필요 |
| `/equipment` | 라인별 설비 목록 | 인증 필요 |
| `/notifications` | 알림 이력 조회 및 관리 | 인증 필요 |

인증된 사용자가 `/login`에 접근하면 대시보드로 이동하고, 인증되지 않은 사용자가 보호 화면에 접근하면 로그인 화면으로 이동합니다.

## 프로젝트 구조

```txt
agentory/
├─ .github/
│  ├─ ISSUE_TEMPLATE/
│  ├─ workflows/
│  └─ PULL_REQUEST_TEMPLATE.md
├─ e2e/                         # Playwright E2E 테스트
├─ public/                      # 정적 공개 파일과 favicon
├─ src/
│  ├─ assets/
│  │  ├─ fonts/                 # Pretendard 등 로컬 폰트
│  │  ├─ icons/                 # 공통·대시보드 SVG 아이콘
│  │  ├─ images/                # 온보딩 및 화면 이미지
│  │  └─ styles/
│  │     ├─ reset.css
│  │     ├─ tokens.css          # 색상·간격·타이포·그림자 토큰
│  │     └─ global.css          # 전역 레이아웃과 공통 스크롤바
│  ├─ constants/                # 상태 코드와 공통 상수
│  ├─ features/
│  │  ├─ auth/                  # SSO 인증 화면과 인증 API
│  │  ├─ dashboard/             # 위젯, 3D 공장, 차트, AI 대화
│  │  ├─ equipment/             # 설비 목록과 설비 API
│  │  ├─ factory/               # 공장 도메인 기능을 위한 모듈 경계
│  │  ├─ i18n/                  # 번역 메시지와 언어 설정
│  │  ├─ incident/              # 알림 대응 계획 생성 흐름
│  │  ├─ notification/          # 알림 센터, 이력, 실시간 스트림
│  │  └─ workLog/               # 작업 로그 화면과 CRUD API
│  ├─ router/
│  │  └─ index.js               # 라우트와 인증 가드
│  ├─ services/
│  │  └─ api/
│  │     ├─ http.js             # Axios 인스턴스와 공통 오류 처리
│  │     ├─ apiResponse.js       # 공통 API 응답 정규화
│  │     └─ sse.js               # SSE 연결과 이벤트 파싱
│  ├─ stores/
│  │  ├─ authStore.js           # 사용자 및 인증 상태
│  │  ├─ assistantStore.js      # AI 세션, 스트리밍, 완료 알림
│  │  └─ uiStore.js             # 테마와 UI 환경 설정
│  ├─ __tests__/                # 애플리케이션 단위 테스트
│  ├─ App.vue                   # 전역 라우트 셸과 토스트
│  └─ main.js                   # Pinia, Router, i18n 초기화
├─ .env-example
├─ package.json
├─ playwright.config.js
├─ vite.config.js
└─ vitest.config.js
```

## 기능 모듈 구조

기능 코드는 `src/features/{featureName}` 아래에서 역할별로 나눕니다.

```txt
features/{featureName}/
├─ components/     # 기능 전용 UI
├─ composables/    # 재사용 가능한 상태와 동작
├─ constants/      # 기능 전용 상수
├─ services/       # 백엔드 API 연동
├─ stores/         # 기능 전용 Pinia store
├─ utils/          # 순수 변환 함수
└─ views/          # Router와 연결되는 페이지
```

모든 기능이 위 폴더를 전부 가질 필요는 없습니다. 현재 필요한 역할만 생성하며, 여러 화면에서 공유되는 상태와 API 기반 로직은 각각 `src/stores`와 `src/services/api`에서 관리합니다.

## API 및 실시간 통신

- 일반 API 요청은 `src/services/api/http.js`의 Axios 인스턴스를 사용합니다.
- 백엔드 공통 응답은 `apiResponse.js`에서 실제 결과 데이터로 정규화합니다.
- 인증은 백엔드 주도 OIDC 흐름과 HttpOnly 세션 쿠키를 사용합니다.
- 요청에는 쿠키와 현재 언어의 `Accept-Language` 헤더가 포함됩니다.
- 알림은 SSE 스트림으로 수신하며 상세 정보, 그래프, 3D 상태에 반영합니다.
- AI 답변은 채팅 스트림 API를 사용하고 진행 상태와 답변 토큰을 순차 반영합니다.
- 화면 컴포넌트는 API 경로를 직접 다루지 않고 기능별 `services` 함수를 호출합니다.

## 상태 및 화면 관리

- 인증 사용자, AI 대화, 테마와 같은 전역 상태는 Pinia에서 관리합니다.
- 대시보드 위젯 위치·크기·보관함 상태는 브라우저 로컬 스토리지에 저장합니다.
- 서버에서 수신한 설비와 알림 데이터는 기능별 composable 또는 view 상태에서 정규화합니다.
- 한 AI 대화는 최초 선택한 설비 컨텍스트를 유지하며, 대화 화면에서는 해당 설비로 3D 카메라를 포커싱할 수 있습니다.

## 스타일 규칙

공통 스타일은 `src/main.js`에서 다음 순서로 불러옵니다.

```js
import './assets/styles/reset.css'
import './assets/styles/tokens.css'
import './assets/styles/global.css'
```

색상, 폰트, 간격, radius, shadow는 `tokens.css`의 `--agentory-*` 변수를 우선 사용합니다. 컴포넌트 스타일은 기능 컴포넌트의 scoped CSS로 작성하고, 서비스 전체에 적용되는 규칙만 `global.css`에서 관리합니다.

## Git 작업 기준

- 기준 브랜치는 `dev`입니다.
- 작업 브랜치는 최신 `dev`에서 생성합니다.
- 브랜치명은 `feat-{이슈번호}-{기능명}` 형식을 사용합니다.
- 커밋은 기능 단위로 나누고 작업 내용은 한국어로 작성합니다.
- Pull Request의 base 브랜치는 `dev`로 지정합니다.

커밋 메시지 예시:

```txt
feat: 설비 상태 실시간 연동 추가
fix: AI 대화 세션 컨텍스트 오류 수정
style: 대시보드 위젯 간격 조정
docs: 프로젝트 구조와 실행 방법 갱신
```
