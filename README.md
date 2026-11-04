# HANWHA · MR 조립 교육

PC 브라우저와 Meta Quest 3 브라우저에서 쓰는 조립 교육입니다. 확정된 시안(Demo 1, HUD Prototype, Complex Explode 등)을 Next.js로 옮겼습니다.

## 실행
```bash
npm install
npm run dev              # http://localhost:3000 → /training
npm run build && npm start
npm run typecheck        # 타입 검사
npm run lint
npm run test:load        # 부하 테스트 (npm start 실행 중일 때)
```
Node 20.9 이상이 필요합니다. 전달본에는 `package-lock.json`을 포함했습니다. 동일 버전 재설치에는 `npm ci`를 사용할 수 있습니다.

## 화면
| 경로 | 화면 |
|---|---|
| `/training` | 교육 선택 → 공정 선택(분해) → 교육장. 페이지 이동 없이 한 화면에서 이어집니다 |
| `/training/complex` | 여객기·스마트폰 2단계 분해 → 공정 선택 → 교육장 |
| `/training/upload` | 도면 업데이트 (업로드 → 분석 → 검토 → 교육 추가) |
| `/training/cards` | 원본 세부 조립 카드 캐러셀 |
| `/training/stool?card=0` | 원본 스텝 스툴 4카드 실습 |
| `/training/hud?product=&card=` | 교육장 단독 |
| `/design-guide` | 디자인 가이드 |
| `/mobile` | 모바일 접근 안내 (자동 이동) |

## 개발 조건과 반영 위치
| 조건 | 반영 |
|---|---|
| 1. Next.js 최신 | Next.js 16.4.3 · React 19.2 · App Router · `src/proxy.ts`(16의 middleware 대체) |
| 2. styled-components | styled-components 6 · SSR 레지스트리(`src/lib/StyledComponentsRegistry.tsx`) · 토큰 `src/styles/theme.ts` |
| 3. 기능 단위 최소 모듈 | `src/features/<기능>/{scene,state,ui}` · 공통 `src/components/{common,scene,overlay,backdrop}` · 순수 로직 `src/lib/{three,physics}` |
| 4. 변수명 통일 | `docs/CONVENTIONS.md` (is/has 불리언, ~List 배열, on~/handle~ 이벤트, UPPER_SNAKE 상수) |
| 5. 저사양 PC·Quest 3 부하 테스트 3회 이상 | `scripts/load-test.mjs` (8개 화면 × 4개 해상도 × 2개 기기 조건 × 3회 이상) · 실기기 확인용 `?perf=1` · 결과 `docs/LOAD_TEST_REPORT.md` |
| 6. 4K~HD 대응 | 16:9 화면은 1920×1080 기준 스케일. 원본 장면은 원본의 렌더 배율을 유지하며, 기존 `SceneCanvas`만 픽셀 예산(`src/lib/renderBudget.ts`)을 사용합니다 |
| 7. 모바일 차단 | 서버 `src/proxy.ts` + 클라이언트 `MobileGuard` → `MobileGuideScreen` (Quest 브라우저는 허용) |
| 폰트·색 | NEXON Lv2 Gothic + JetBrains Mono, 굵기 700 이하 · 메인 #f37321 · 성공 민트 #3fe0c5 |

## 폴더
```
src/
  app/                       라우트 (page.tsx는 화면 컴포넌트 1개만 렌더)
  components/
    common/                  Stage(16:9 스케일) · MobileGuard · PerfMeter …
    scene/                   SceneCanvas(렌더 예산) · HorizonSync · useOrbitDrag
    backdrop/                우주 배경 (지구 테두리 빛 채움 · 별 · 별똥별 · 평평해지는 수평선)
    overlay/                 지시선 라벨 · 정보 패널 · 조작 안내
  features/
    reference-pages/         원본 6개 화면의 React 변환본·수명주기·저장 연결
    training-flow/           교육 선택 → 공정 선택 → 교육 시작 연출
    complex-explode/         여객기·스마트폰 2단계 분해
    hud/                     교육장 (모든 교육 공통)
    drawing-upload/          도면 업데이트
    design-guide/            디자인 가이드
  data/                      제품·카드·도구 · models/(3D 모델 데이터)
  lib/three/                 모델 생성(데이터 → three.js) · 재질/지오메트리 공유 · 모서리 선
  lib/physics/               펼침 스프링
```

## 3D 모델
- 현재 시안 이식 화면은 원본 도형·조명·렌더링 코드와 로컬 three.js r149를 사용합니다. 아래 데이터 기반 모델/렌더 예산은 기존 `SceneCanvas` 구현에 해당합니다.
- `src/data/models/*.ts`의 데이터로 모델을 만듭니다. 반복 부품(볼트, 블레이드, 좌석)은 InstancedMesh 1개로 그립니다.
- 실제 GLB로 바꿀 때는 같은 구간(sectionIndex) 정보를 유지한 채 `buildModel`을 GLB 로더로 교체합니다.
- GLB는 gltf-transform으로 Draco/Meshopt + KTX2 압축 후 `public/models`에 둡니다. `hammer.glb`(14MB)는 배포 전에 압축이 필요합니다.

## 현재 이식 상태
- 펌프 선택/분해/준비/안전/BOM/실습/12 N·m 체결/리포트를 원본 값으로 반영했습니다.
- 업로드 3단계, 세부 카드, 스텝 스툴 4카드·19단계·6 N·m 체결, 복합 분해, 단독 HUD, 디자인 가이드를 원본에서 React/styled-components로 이식했습니다.
- 원본 장면은 같은 three.js r149를 사용합니다. 생성 모듈과 원본 해시는 `src/features/reference-pages/generated`에 있습니다.
- 실제 도면 분석 API, 서버 기록 전송/DB, 원본에 없는 펌프 중부·하부·최종 결합 실습은 추가하지 않았습니다.
- 검증 범위·미검증 항목·유지보수 방법은 [PORTING_STATUS](docs/PORTING_STATUS.md)를 참고하세요.
