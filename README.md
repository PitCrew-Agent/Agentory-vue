# Agentory

Agentory는 Vue 3 기반 프론트엔드 프로젝트입니다. 설비 상태 모니터링, 작업 로그, 알림 이력, AI 어시스턴트 화면을 구현하는 것을 목표로 합니다.

## 기술 스택

- Vue 3
- JavaScript
- Vite
- Vue Router
- Pinia
- Three.js
- Vitest
- Playwright
- ESLint, oxlint, Prettier

## 개발 환경

`package.json` 기준 Node.js 버전은 다음 범위를 사용합니다.

```sh
node ^22.18.0 || >=24.12.0
```

의존성 설치:

```sh
npm install
```

개발 서버 실행:

```sh
npm run dev
```

프로덕션 빌드:

```sh
npm run build
```

빌드 결과 미리보기:

```sh
npm run preview
```

## 테스트와 검사

Unit Test:

```sh
npm run test:unit
```

E2E Test:

```sh
npm run test:e2e
```

Chromium 프로젝트만 실행:

```sh
npm run test:e2e -- --project=chromium
```

Lint:

```sh
npm run lint
```

Format:

```sh
npm run format
```

## 프로젝트 구조

```txt
src/
  assets/
    fonts/
    icons/
    images/
    styles/
      reset.css
      tokens.css
      global.css
  components/
    common/
    layout/
    ui/
  composables/
  constants/
  features/
    dashboard/
      components/
      services/
      stores/
      views/
    equipment/
      components/
      services/
      stores/
      views/
    factory/
      components/
      services/
      stores/
      views/
  router/
    index.js
  services/
    api/
      http.js
  stores/
  utils/
  views/
  App.vue
  main.js
```

## 스타일 기준

공통 스타일은 `src/main.js`에서 아래 순서로 import합니다.

```js
import './assets/styles/reset.css'
import './assets/styles/tokens.css'
import './assets/styles/global.css'
```

디자인 값은 컴포넌트에 직접 하드코딩하지 않고 `src/assets/styles/tokens.css`에 정의된 CSS 변수로 관리합니다. 색상, 폰트, spacing, radius, shadow는 공통 토큰을 기준으로 구성되어 있습니다.

주요 기준:

- 기본 폰트는 `Pretendard`로 통일합니다.
- 로그인 영역의 별도 영문 폰트가 필요할 경우 `--agentory-font-family-auth`를 사용합니다.
- 차트와 체크리스트도 `Pretendard` 기반 토큰을 사용합니다.
- 반복되는 색상, 간격, radius, shadow는 `--agentory-*` 토큰을 우선 사용합니다.

## 3D 공장 화면 구현 계획

공장 화면은 Three.js를 사용해 3D 설비 배치와 상태를 시각화합니다. Vue 컴포넌트는 화면 상태와 생명주기를 담당하고, Three.js 초기화와 렌더링 로직은 composable 또는 service로 분리합니다.

권장 위치:

```txt
src/features/factory/
  components/
    FactoryScene.vue
  composables/
    useFactoryScene.js
  services/
    factorySceneBuilder.js
  views/
    FactoryView.vue
```

구현 기준:

- `FactoryScene.vue`는 canvas 컨테이너와 Vue 생명주기 연결만 담당합니다.
- Three.js renderer, scene, camera, controls 생성은 `useFactoryScene.js`에서 관리합니다.
- 설비 mesh 생성, 색상 상태 반영, 배치 계산은 `factorySceneBuilder.js`로 분리합니다.
- 설비 상태 색상은 `tokens.css`의 상태 색상 토큰과 같은 의미 체계를 사용합니다.
- 리사이즈, 메모리 해제, animation frame 정리는 컴포넌트 unmount 시점에 반드시 처리합니다.

## API 연동 기준

API 요청 공통 처리는 `src/services/api/http.js`에서 관리합니다. 화면 컴포넌트는 `fetch`를 직접 호출하지 않고, 기능별 service 모듈을 통해 API를 호출하는 구조를 권장합니다.

예시 위치:

```txt
src/features/equipment/services/equipmentApi.js
```

## Git 기준

기본 브랜치는 `main`입니다. 작업 단위는 기능별 브랜치와 기능별 커밋으로 나누는 것을 권장합니다.

커밋 메시지는 작업 내용을 한국어로 명확히 작성합니다.

예시:

```txt
docs: README 프로젝트 안내 작성
feat: 설비 상태 카드 컴포넌트 추가
fix: 대시보드 라우팅 오류 수정
```
