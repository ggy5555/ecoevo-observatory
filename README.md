# EcoEvo Observatory

환경 조건을 조절하고 가상 생물 집단의 생존·번식·사망을 관찰하는 웹 기반 진화생태학 Virtual Lab입니다.

현재 버전은 개발 명세의 **MVP 0.2** 범위를 구현합니다. 결과를 직접 증가·감소시키는 코드는 없으며, `유전형질 → 표현형 → 행동 → 에너지 손익 → 번식 성공`의 과정에서 집단 변화가 나타납니다.

실험 기록 기능으로 Population, 평균 speedGene, 누적 Births·Deaths를 10 tick 간격으로 수집하고, 서로 다른 두 조건을 A/B 슬롯에 저장해 그래프와 자동 요약으로 비교할 수 있습니다. 저장한 측정값은 CSV로 내려받을 수 있습니다.

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
│     ├─ experiment.js
│     ├─ simulation.js
│     ├─ agent.js
│     ├─ food.js
│     ├─ genetics.js
│     ├─ statistics.js
│     └─ utils.js
├─ tests/
│  ├─ simulation.test.mjs
│  └─ experiment.test.mjs
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

반복실험과 same-seed 비교를 보강한 뒤 포식자, 환경 사건, 유전적 부동 실험을 별도 단계에서 추가합니다.


## LAB 2.0 (P0 — Resource Trade-off)

기존 Observatory MVP 0.2는 유지하며, 상단 **LAB 2.0** 버튼으로 별도의 연구 실험실에 이동할 수 있습니다.

- URL: https://ggy5555.github.io/ecoevo-observatory/lab2/
- Resource 실험 빌더: `dist/lab2/experiment.html`
- 시드가 고정된 반복 실행(기본 3조건 × 10반복 × 3000 ticks), Web Worker, 진행률·취소
- population/speedGene 시계열, 멸종률·최종 개체 수 분포, CSV/JSON 내보내기
- Methods에 모델 수식·가정·기존 MVP와 차이 공개
- **P1/P2 예정:** Observation/Predation Selection, Wright–Fisher Genetic Drift

엔진은 `dist/lab2/js/core/`, 실험 계산은 `dist/lab2/js/experiments/`에 독립 구현되었습니다.
기존 `dist/js/`를 수정하지 않았습니다. 동일한 시드/설정/버전으로 반복 실행을 재현할 수 있습니다.
실제 생태계 예측이 아닌 개념 탐구를 위한 가상 모델입니다.

```bash
npm test
python -m http.server 8000 --directory dist
```

그 다음 `http://localhost:8000/lab2/`에서 실험을 실행할 수 있습니다. `file://`에서는 모듈 Worker가 동작하지 않을 수 있습니다.

## LAB 2.0 P1 — Observation & Predation Selection

기존 Observatory 0.2와 LAB 2.0 P0를 유지하며 P1을 확장했습니다.

- [Observation](https://ggy5555.github.io/ecoevo-observatory/lab2/observe.html): 시드 재현, Food p/포식자 수 설정, 일시정지·단일 tick·속도 변경, prey/food/predator Canvas, 클릭 Inspector, 개체 수·형질 그래프
- [Predation Selection](https://ggy5555.github.io/ecoevo-observatory/lab2/experiment.html?mode=predation): 포식자 수 0~50 중 2~4조건 비교, 반복 시드 고정, Worker 실험·CSV/JSON·통계·같은 시드 짝비교
- Prey 회피 감지 반경 70, predator 추적 감지 반경 140, 속도 1.8, 배회 0.35, 포획 반경 6, tick당 최대 1포획. 이 값은 실제 측정이 아닌 **가상 실험 파라미터**입니다.
- Model version: `lab2-ecology-2.1.0`. 초기 prey·food는 조건별 같은 seed로 재현하고 자연선택 결과를 하드코딩하지 않습니다.
- IndexedDB에 최근 결과 최대 20건을 수동 저장/다시 열기/삭제할 수 있습니다. 저장소 사용 불가 시에도 CSV/JSON 다운로드가 가능합니다.
- 고밀도 포식자 조건의 조기 멸종도 그대로 기록합니다. 유전형질 평균은 생존 개체군에 한해 계산합니다.
- Wright–Fisher 유전적 부동은 P2 후속 기능입니다.

### 검증 및 로컬 실행
```bash
npm test
python -m http.server 8000 --directory dist
```
`http://localhost:8000/lab2/observe.html` 및 `/lab2/experiment.html?mode=predation`에서 실행 가능합니다.
