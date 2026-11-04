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
Node 20.9 이상이 필요합니다.

## 화면
| 경로 | 화면 |
|---|---|
| `/training` | 교육 선택 → 공정 선택(분해) → 교육장. 페이지 이동 없이 한 화면에서 이어집니다 |
| `/training/complex` | 여객기·스마트폰 2단계 분해 → 공정 선택 → 교육장 |
| `/training/upload` | 도면 업데이트 (업로드 → 분석 → 검토 → 교육 추가) |
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
| 5. 저사양 PC·Quest 3 부하 테스트 3회 이상 | `scripts/load-test.mjs` (6개 화면 × 4개 해상도 × 2개 기기 조건 × 3회 이상) · 실기기 확인용 `?perf=1` · 결과 `docs/LOAD_TEST_REPORT.md` |
| 6. 4K~HD 대응 | `Stage`: UI는 1920×1080 기준 스케일, 3D는 실제 픽셀 + 픽셀 예산(`src/lib/renderBudget.ts`) |
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
- `src/data/models/*.ts`의 데이터로 모델을 만듭니다. 반복 부품(볼트, 블레이드, 좌석)은 InstancedMesh 1개로 그립니다.
- 실제 GLB로 바꿀 때는 같은 구간(sectionIndex) 정보를 유지한 채 `buildModel`을 GLB 로더로 교체합니다.
- GLB는 gltf-transform으로 Draco/Meshopt + KTX2 압축 후 `public/models`에 둡니다. `hammer.glb`(14MB)는 배포 전에 압축이 필요합니다.

## 아직 시안에서 옮기지 않은 것
- 교육장 세부 실습: 부품 드래그 배치, 볼트 체결(저항·토크 게이지·진동), 확대창 안 렌더링, BOM 홀로그램↔실물 전환, 재료 구역 배치 애니메이션. 기준은 `HUD Prototype.dc.html`이고, 현재는 상태 흐름과 UI만 들어 있습니다.
- 도면 분석 API (`analyzeDrawing`은 예시 결과를 돌려줍니다).
- 교육 저장소: 지금은 sessionStorage이며 서버 DB로 바꿔야 합니다.
