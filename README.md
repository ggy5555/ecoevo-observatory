# EcoEvo Observatory

환경 조건을 조절하고 가상 생물 집단의 생존·번식·사망을 관찰하는 웹 기반 진화생태학 Virtual Lab입니다.

현재 버전은 개발 명세의 **MVP 0.1** 범위만 구현합니다. 결과를 직접 증가·감소시키는 코드는 없으며, `유전형질 → 표현형 → 행동 → 에너지 손익 → 번식 성공`의 과정에서 집단 변화가 나타납니다.

## 실행 방법

별도 설치나 빌드가 필요 없습니다.

1. 저장소를 내려받습니다.
2. `dist/index.html`을 브라우저에서 열거나 정적 파일 서버로 `dist/`를 실행합니다.
3. GitHub Pages는 포함된 workflow가 `dist/` 폴더를 자동 배포합니다.

로컬 서버 예시:

```bash
python -m http.server 8000 --directory dist
```

그다음 `http://localhost:8000`에 접속합니다.

## 구현된 모델

- 800 × 600 toroidal world
- 초기 Agent 30마리, Food 50개, 최대 Food 80개
- `speedGene ∈ [0,1]`
- `maxSpeed = 0.5 + speedGene × 2.5`
- 공통 먹이 감지 반경 100 px
- 먹이 미감지 시 0.25 px/tick random walk
- `EnergyCost = 0.1 + 0.05u²` (`u`: 해당 tick의 실제 이동속도)
- Food energy 25
- Energy 100 이상에서 부모와 자손이 에너지를 절반씩 나누며 번식
- 돌연변이 확률 0.05, 효과 크기 `Normal(0, 0.03²)`
- Energy 0 이하 또는 Age 1500 ticks 이상에서 사망
- 매 tick Fisher–Yates shuffle
- fixed simulation timestep과 `requestAnimationFrame` 렌더링 분리

## 파일 구조

```text
ecoevo-observatory/
├─ dist/
│  ├─ index.html
│  ├─ css/style.css
│  └─ js/
│     ├─ main.js
│     ├─ simulation.js
│     ├─ agent.js
│     ├─ food.js
│     ├─ genetics.js
│     ├─ statistics.js
│     └─ utils.js
├─ tests/simulation.test.mjs
├─ .github/workflows/pages.yml
├─ package.json
└─ README.md
```

## 테스트

```bash
npm test
```

## 모델의 한계

이 앱은 실제 생태계 예측 모델이 아니라 자연선택의 핵심 메커니즘을 탐구하기 위한 단순화된 computational model입니다. 대사 비용 및 이동 계수는 실제 생명체의 생리학적 실측값이 아닌 무차원 스케일링 파라미터입니다.

## 다음 개발 단계

MVP calibration을 먼저 진행한 뒤 포식자, 반복실험, same-seed 비교, 유전적 부동 실험을 별도 단계에서 추가합니다.
