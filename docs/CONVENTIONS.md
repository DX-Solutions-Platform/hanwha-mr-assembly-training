# 코드 규칙

## 폴더 (기능 단위 최소 모듈)
```
src/
  app/                       라우트만 (page.tsx는 화면 컴포넌트 1개만 렌더)
  components/common|scene|overlay|backdrop   2개 이상 기능에서 쓰는 것
  features/<기능>/scene|state|ui              해당 기능 전용
  lib/three|physics          React와 무관한 순수 로직
  hooks/ store/ data/ types/ styles/
```
- 컴포넌트 1파일 1개, 150줄 넘으면 분리.
- styled-components는 파일 하단에 정의. transient props는 `# 코드 규칙

 접두사.
- 스타일 값은 theme 토큰 사용. 굵기는 400·500·700만 사용.
- 3D 위 UI: Stage의 UI 레이어는 클릭을 통과시키고 직계 자식만 클릭을 받습니다. 화면 전체를 덮는 오버레이 루트에는 `data-passthrough`를 붙입니다.

## 이름
| 대상 | 규칙 | 예 |
|---|---|---|
| 컴포넌트·타입 | PascalCase | `ToolRest`, `AssemblyCard` |
| 변수·함수 | camelCase | `stepIndex`, `restToolId` |
| 불리언 | is/has/needs 접두사 | `isPaused`, `hasConfirmedToolSafety` |
| 배열 | ~List | `toolList`, `stepList` |
| 이벤트 prop | on~ / 내부 핸들러 handle~ | `onPick`, `handleUseRestTool` |
| 상수 | UPPER_SNAKE | `TOOL_LIST`, `CARD_GAP` |
| 훅 | use~ | `useStageScale` |

## 성능 (저사양 PC · Quest 3)
- three.js 화면은 `next/dynamic({ ssr:false })`로 분리 로딩.
- 캔버스는 반드시 `SceneCanvas` 사용: 픽셀 예산(FHD×1.25) + 프레임 저하 시 자동 하향, 후처리 없음.
- 같은 재질·지오메트리는 공유, 반복 부품은 InstancedMesh.
- 애니메이션은 useFrame / useAnimationFrame에서 Object3D·DOM을 직접 갱신 (매 프레임 setState 금지).
- GLB는 Draco/Meshopt + KTX2 압축, 도구 1개 2MB 이하 목표.
- `npm run test:load`: 6개 화면 × 4개 해상도 × 2개 기기 조건 × 3회 이상, 평균 45fps · 1% 저점 30fps 이상 통과.
