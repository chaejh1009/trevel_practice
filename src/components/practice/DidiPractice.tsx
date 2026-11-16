import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { PracticeProps } from "./types";
import {
  getTaxiVehicle,
  TAXI_VEHICLES,
  type TaxiRideRequest,
} from "../../lib/taxiRide";
import "./DidiPractice.css";

type Stage =
  | "destination"
  | "pickup"
  | "vehicle"
  | "review"
  | "assigned"
  | "verified";
type Destination = {
  id: string;
  chinese: string;
  english: string;
  korean: string;
  district: string;
  quote: number;
  keywords: string;
};
const destinations: Destination[] = [
  {
    id: "bund",
    chinese: "外滩花园酒店",
    english: "The Bund Garden Hotel",
    korean: "와이탄 가든 호텔",
    district: "黄浦区 · 황푸구",
    quote: 160,
    keywords: "와이탄 외탄 번드 bund hotel garden 外滩 花园 酒店 황푸",
  },
  {
    id: "pudong",
    chinese: "浦东河畔酒店",
    english: "Pudong Riverside Hotel",
    korean: "푸둥 리버 스테이",
    district: "浦东新区 · 푸둥신구",
    quote: 110,
    keywords: "푸둥 포동 pudong riverside hotel 浦东 河畔 酒店",
  },
  {
    id: "nanjing",
    chinese: "南京东路步行街",
    english: "Nanjing Road Pedestrian Street",
    korean: "난징둥루 보행거리",
    district: "黄浦区 · 황푸구",
    quote: 175,
    keywords: "난징둥루 남경동로 nanjing road pedestrian 南京 东路 步行街",
  },
];
const stages: Stage[] = [
  "destination",
  "pickup",
  "vehicle",
  "review",
  "assigned",
  "verified",
];
const guidance: Record<Stage, string> = {
  destination:
    "숙소 이름을 한국어, 영문, 중문으로 검색해 봐요. 검색 결과의 이름과 지역이 예약한 곳과 같은지 확인하는 게 중요해요.",
  pickup:
    "목적지를 정했으니 승차 위치를 맞춰볼까요? 이번 연습에서는 공항 안내 표지가 A 구역을 가리키고 있어요. 지도에서 A 승차장을 선택해 주세요.",
  vehicle:
    "Express와 Taxi를 비교해 보세요. 화면의 금액은 연습용 견적이에요. 실제 앱에서는 선택한 차량 유형과 표시된 요금 조건을 확인해요.",
  review:
    "출발지, 도착지, 차량 유형을 마지막으로 확인해요. 준비되면 호출 버튼을 눌러보세요. 이곳에서는 실제 호출이나 결제가 일어나지 않아요.",
  assigned:
    "배정 번호를 기억하고 필드로 나가 봐요. 여러 대가 도착하니 캐릭터로 차에 다가가 번호를 대조한 뒤 탑승해요.",
  verified:
    "잘했어요! 목적지 검색부터 승차 위치 확인, 필드에서 내 차 탑승까지 직접 해봤어요. 이제 상황 문제로 한 번 더 확인해 볼까요?",
};
const titles: Record<Stage, string> = {
  destination: "목적지 찾기",
  pickup: "승차 위치 확인",
  vehicle: "차량 선택",
  review: "호출 정보 확인",
  assigned: "기사 · 차량 확인",
  verified: "연습 완료",
};

function CarArt({
  taxi = false,
  compact = false,
}: {
  taxi?: boolean;
  compact?: boolean;
}) {
  return (
    <svg
      className={compact ? "didi-car-art compact" : "didi-car-art"}
      viewBox="0 0 108 56"
      aria-hidden="true"
    >
      <ellipse cx="54" cy="46" rx="46" ry="5" fill="#cdd4d6" opacity=".4" />
      <path
        d="M10 28l15-5 11-16h35l18 17 10 4 2 15H7z"
        fill={taxi ? "#f1c760" : "#f5f6f5"}
        stroke={taxi ? "#d9ae49" : "#bdc6cb"}
        strokeWidth="1.3"
      />
      <path d="M39 11h12v14H29zm16 0h14l14 14H55z" fill="#9fb6c0" />
      <path d="M40 12h10v3H38m20-3h9l3 3H58" fill="#d3e3e6" />
      <path
        d="M10 32h10v5H8m81-6h10v5H89"
        fill={taxi ? "#fff3c9" : "#e8c17a"}
      />
      <path
        d="M24 29h61m-31-3v15m33-13v13"
        stroke={taxi ? "#d6ad50" : "#cbd1d3"}
        strokeWidth="1"
      />
      <circle cx="28" cy="43" r="9" fill="#44525b" />
      <circle cx="81" cy="43" r="9" fill="#44525b" />
      <circle cx="28" cy="43" r="4.5" fill="#c6cdd0" />
      <circle cx="81" cy="43" r="4.5" fill="#c6cdd0" />
      {taxi && (
        <>
          <rect
            x="47"
            y="2"
            width="19"
            height="6"
            rx="2"
            fill="#f1c760"
            stroke="#d5a94c"
          />
          <path
            d="M37 31h36"
            stroke="#656966"
            strokeWidth="3"
            strokeDasharray="4 4"
          />
        </>
      )}
    </svg>
  );
}

function RouteMap({
  pickup,
  stage,
  onPickup,
}: {
  pickup: "A" | "B" | null;
  stage: Stage;
  onPickup: (point: "A" | "B") => void;
}) {
  const editable = stage === "pickup";
  return (
    <div className={`didi-map didi-map-${stage}`}>
      <svg
        viewBox="0 0 360 235"
        aria-label={
          editable
            ? "가상 공항 지도. A와 B 승차장을 선택할 수 있어요."
            : "선택한 출발지와 목적지의 연습 경로"
        }
      >
        <rect width="360" height="235" fill="#f0f1eb" />
        <path
          d="M-20 48h392M-20 111h392M-20 183h392M58-15v270M153-15v270M257-15v270M326-15v270"
          stroke="#fff"
          strokeWidth="11"
        />
        <path
          d="M-20 48h392M-20 111h392M-20 183h392M58-15v270M153-15v270M257-15v270M326-15v270"
          stroke="#e3e5de"
          strokeWidth="1"
        />
        <path
          d="M283-20l-15 58 22 42-17 54 20 43-10 72h49l12-77-17-42 17-47-21-45 14-58z"
          fill="#d6e7e6"
        />
        <rect x="73" y="61" width="65" height="35" rx="4" fill="#e0e6d9" />
        <rect x="168" y="126" width="73" height="41" rx="4" fill="#e2e9d9" />
        <rect x="74" y="14" width="167" height="22" rx="4" fill="#dfe3e0" />
        <text x="157" y="29" textAnchor="middle" fontSize="9" fill="#8b9790">
          浦东国际机场 · T2
        </text>
        <text x="14" y="100" fontSize="7" fill="#b0b5ab">
          迎宾大道
        </text>
        <text x="170" y="199" fontSize="7" fill="#b0b5ab">
          AIRPORT PICKUP ROAD
        </text>
        <text
          x="304"
          y="150"
          fontSize="7"
          fill="#9eb8b7"
          transform="rotate(-90 304 150)"
        >
          가상의 주변 지도
        </text>
        <path
          d={pickup === "B" ? "M90 151V110H255V72" : "M198 92V110H255V72"}
          fill="none"
          stroke="#fff"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={pickup === "B" ? "M90 151V110H255V72" : "M198 92V110H255V72"}
          fill="none"
          stroke="#ff9858"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g transform="translate(255 70)">
          <circle r="8" fill="#fff" stroke="#f4894e" strokeWidth="3" />
          <circle r="3" fill="#f4894e" />
          <rect
            x="-37"
            y="-35"
            width="74"
            height="19"
            rx="5"
            fill="#fff"
            stroke="#e4e7de"
          />
          <text textAnchor="middle" y="-22" fontSize="8" fill="#626e69">
            선택한 목적지
          </text>
        </g>
        {(
          [
            { point: "A", x: 198, y: 92 },
            { point: "B", x: 90, y: 151 },
          ] as const
        ).map(({ point, x, y }) => (
          <g
            key={point}
            transform={`translate(${x} ${y})`}
            className={
              editable ? "didi-map-pickup selectable" : "didi-map-pickup"
            }
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-pressed={editable ? pickup === point : undefined}
            aria-label={editable ? `${point} 승차장 선택` : undefined}
            onClick={editable ? () => onPickup(point) : undefined}
            onKeyDown={
              editable
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!event.repeat) onPickup(point);
                    }
                  }
                : undefined
            }
          >
            <circle
              r="22"
              fill={pickup === point ? "#ff9b5220" : "#ffffff66"}
            />
            <circle
              r="14"
              fill={pickup === point ? "#fa8b45" : "#fff"}
              stroke={pickup === point ? "#fa8b45" : "#bec9c3"}
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              y="4"
              fontSize="12"
              fontWeight="700"
              fill={pickup === point ? "#fff" : "#8c9990"}
            >
              {point}
            </text>
            <rect
              x="-34"
              y="24"
              width="68"
              height="18"
              rx="5"
              fill="#fff"
              stroke="#e2e6de"
            />
            <text y="36" textAnchor="middle" fontSize="8" fill="#7d8c81">
              승차장 {point}
            </text>
          </g>
        ))}
        <g transform="translate(19 215)">
          <circle r="4" fill="#5596d4" />
          <circle r="9" fill="none" stroke="#b2d0e6" strokeWidth="3" />
        </g>
      </svg>
      <span className="didi-map-tag">SIMULATION MAP</span>
    </div>
  );
}

export default function DidiPractice({
  onFinish,
  track,
  onGuide,
  onRideRequested,
}: PracticeProps) {
  const [stage, setStage] = useState<Stage>("destination");
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [pickup, setPickup] = useState<"A" | "B" | null>(null);
  const [car, setCar] = useState<"express" | "taxi">("express");
  const [rideRequest, setRideRequest] = useState<TaxiRideRequest | null>(null);
  const [dispatchError, setDispatchError] = useState("");
  const [waitingForBoarding, setWaitingForBoarding] = useState(false);
  const requesting = useRef(false);
  const mounted = useRef(true);
  const guideRef = useRef(onGuide),
    completedRef = useRef(false),
    finishSent = useRef(false);
  const appRef = useRef<HTMLDivElement>(null);
  const radioName = useId();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    guideRef.current = onGuide;
  }, [onGuide]);
  useEffect(() => {
    guideRef.current?.(guidance[stage]);
    const viewport = appRef.current?.closest<HTMLElement>(".pw-device-screen");
    if (viewport) viewport.scrollTop = 0;
    appRef.current
      ?.querySelector<HTMLElement>("[data-didi-stage-focus]")
      ?.focus({ preventScroll: true });
  }, [stage]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase().replace(/\s/g, "");
    return destinations.filter((d) =>
      `${d.chinese}${d.english}${d.korean}${d.keywords}`
        .toLocaleLowerCase()
        .replace(/\s/g, "")
        .includes(q),
    );
  }, [query]);
  const fare = (destination?.quote ?? 160) + (car === "taxi" ? 25 : 0);
  const assignedPlate =
    getTaxiVehicle(rideRequest?.assignedVehicleId || "")?.plate || "—";
  const step = (name: string, properties: Record<string, unknown> = {}) =>
    track("practice_step_completed", {
      scenarioId: "didi",
      step: name,
      ...properties,
    });
  function back() {
    const index = stages.indexOf(stage);
    if (index > 0 && stage !== "verified") setStage(stages[index - 1]);
  }
  function chooseDestination(value: Destination) {
    setDestination(value);
    step("destination_selected", { destinationId: value.id });
    setStage("pickup");
  }
  function confirmPickup() {
    if (pickup !== "A") return;
    step("pickup_confirmed", { pickupPoint: pickup });
    setStage("vehicle");
  }
  function confirmCar() {
    if (!destination || pickup !== "A") return;
    step("car_selected", { car });
    setStage("review");
  }
  function request() {
    if (!destination || pickup !== "A" || requesting.current) return;
    const ride: TaxiRideRequest = {
      id: crypto.randomUUID(),
      destinationId: destination.id,
      destinationName: destination.korean,
      vehicle: car,
      fare,
      assignedVehicleId:
        TAXI_VEHICLES[Math.floor(Math.random() * TAXI_VEHICLES.length)].id,
    };
    setRideRequest(ride);
    step("ride_requested", {
      destinationId: destination.id,
      pickupPoint: pickup,
      car,
      simulated: true,
    });
    setStage("assigned");
    void enterPickup(ride);
  }
  async function enterPickup(ride: TaxiRideRequest) {
    if (!onRideRequested || requesting.current || completedRef.current) return;
    requesting.current = true;
    setWaitingForBoarding(true);
    setDispatchError("");
    try {
      const result = await onRideRequested(ride);
      if (!mounted.current || !result) return;
      if (
        result.requestId !== ride.id ||
        result.vehicleId !== ride.assignedVehicleId
      ) {
        setDispatchError(
          "탑승 결과를 확인하지 못했어요. 승차장에서 다시 확인해 주세요.",
        );
        return;
      }
      completedRef.current = true;
      step("vehicle_verified", { matched: true, vehicleId: result.vehicleId });
      track("practice_action_completed", {
        scenarioId: "didi",
        action: "mock_ride_request",
        destinationId: ride.destinationId,
        pickupPoint: "A",
        car: ride.vehicle,
        vehicleVerified: true,
        boardedInWorld: true,
      });
      setStage("verified");
    } catch {
      if (mounted.current)
        setDispatchError("승차장으로 이동하지 못했어요. 다시 시도해 주세요.");
    } finally {
      requesting.current = false;
      if (mounted.current) setWaitingForBoarding(false);
    }
  }
  return (
    <div ref={appRef} className="didi-app" aria-label="디디 차량 호출 연습 앱">
      <header className="didi-app-header">
        <div>
          {stage !== "destination" && stage !== "verified" ? (
            <button className="didi-back" onClick={back} aria-label="이전 단계">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <span className="didi-mark" aria-hidden="true">
              D
            </span>
          )}
          <span className="didi-brand">
            DiDi <small>滴滴出行</small>
          </span>
        </div>
        <span className="didi-practice-tag">연습 모드</span>
      </header>
      <div className="didi-stage-label">
        <span>
          {String(stages.indexOf(stage) + 1).padStart(2, "0")} <i>/ 06</i>
        </span>
        <h3 tabIndex={-1} data-didi-stage-focus>
          {titles[stage]}
        </h3>
        <span className="didi-stage-dots" aria-hidden="true">
          {stages.map((s) => (
            <i
              key={s}
              className={
                stages.indexOf(s) <= stages.indexOf(stage) ? "filled" : ""
              }
            />
          ))}
        </span>
      </div>
      {stage !== "verified" && (
        <div className="didi-addresses">
          <div>
            <span className="didi-dot origin" />
            <span>
              <small>출발</small>
              <b>
                浦东国际机场 T2{" "}
                <em>{pickup ? `· 승차장 ${pickup}` : "· 승차 위치 미확정"}</em>
              </b>
            </span>
          </div>
          <div>
            <span className="didi-dot destination" />
            {stage === "destination" ? (
              <label className="didi-search">
                <span className="sr-only">목적지 검색</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="어디로 갈까요? · Where to?"
                  autoComplete="off"
                />
                <Search size={17} />
              </label>
            ) : (
              <button
                className="didi-destination-edit"
                onClick={() => setStage("destination")}
              >
                <span>
                  <small>도착</small>
                  <b>{destination?.chinese}</b>
                </span>
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
      {stage === "destination" ? (
        <div className="didi-destination-screen">
          <div className="didi-search-heading">
            <b>{query ? "검색 결과" : "목적지 추천"}</b>
            <span>중문 · 영문 · 한국어</span>
          </div>
          <div className="didi-search-results">
            {filtered.map((d) => (
              <button
                key={d.id}
                className="didi-place"
                onClick={() => chooseDestination(d)}
              >
                <span className="didi-place-icon">
                  <MapPin size={19} />
                </span>
                <span>
                  <b>{d.chinese}</b>
                  <span>{d.english}</span>
                  <small>
                    {d.korean} · {d.district}
                  </small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="didi-no-results">
                <Search size={29} />
                <b>일치하는 연습 장소가 없어요.</b>
                <p>“Bund”, “푸둥”, “南京”으로 검색해 보세요.</p>
                <button onClick={() => setQuery("")}>
                  추천 장소 다시 보기
                </button>
              </div>
            )}
          </div>
          <div className="didi-search-tip">
            <ShieldCheck size={17} />
            <p>
              예약한 숙소의 <b>이름과 지역</b>을 함께 확인해요.
              <br />
              숙소 2곳은 가상 장소이며, 검색어는 저장하지 않아요.
            </p>
          </div>
          <div className="didi-search-scenery" aria-hidden="true">
            <span>上海</span>
            <span>
              YOUR NEXT STOP
              <br />
              STARTS WITH A NAME.
            </span>
          </div>
        </div>
      ) : stage === "verified" ? (
        <div className="didi-receipt">
          <div className="didi-receipt-check">
            <Check size={32} />
          </div>
          <span className="didi-receipt-kicker">PRACTICE COMPLETED</span>
          <h3>내 차, 제대로 찾았어요!</h3>
          <p>
            호출부터 탑승 전 확인까지
            <br />
            직접 해보니 조금 더 익숙해졌죠?
          </p>
          <div className="didi-receipt-card">
            <div>
              <span className="didi-dot origin" />
              <span>푸둥 공항 T2 · 승차장 A</span>
            </div>
            <div className="didi-receipt-line" />
            <div>
              <span className="didi-dot destination" />
              <span>{destination?.korean}</span>
            </div>
            <dl>
              <div>
                <dt>선택한 차량</dt>
                <dd>
                  {car === "taxi" ? "Taxi · 택시" : "Express · 일반 차량"}
                </dd>
              </div>
              <div>
                <dt>확인한 번호</dt>
                <dd>
                  {assignedPlate} <Check size={12} />
                </dd>
              </div>
              <div>
                <dt>연습 견적</dt>
                <dd>
                  ¥ {fare}
                  <small>결제 없음</small>
                </dd>
              </div>
            </dl>
          </div>
          <button
            className="didi-primary"
            onClick={() => {
              if (!finishSent.current) {
                finishSent.current = true;
                onFinish();
              }
            }}
          >
            상황 문제로 이어가기
            <ArrowRight size={17} />
          </button>
          <small className="didi-receipt-note">
            연습 호출번호 CP-DIDI-001
            <br />
            실제 차량 호출·예약·결제가 발생하지 않았어요.
          </small>
        </div>
      ) : (
        <>
          <RouteMap pickup={pickup} stage={stage} onPickup={setPickup} />
          <section className="didi-bottom-sheet" aria-label={titles[stage]}>
            <div className="didi-sheet-handle" aria-hidden="true" />
            {stage === "pickup" && (
              <>
                <div className="didi-sheet-title">
                  <div>
                    <h3>어디에서 탈까요?</h3>
                    <p>
                      연습 안내 표지: <b>网约车上车点 A</b>
                    </p>
                  </div>
                  <span className="didi-airport-badge">T2</span>
                </div>
                <div
                  className="didi-pickup-options"
                  role="group"
                  aria-label="승차장 선택"
                >
                  {(["A", "B"] as const).map((point) => (
                    <button
                      key={point}
                      aria-pressed={pickup === point}
                      className={pickup === point ? "selected" : ""}
                      onClick={() => setPickup(point)}
                    >
                      <span className="didi-point-letter">{point}</span>
                      <span>
                        <b>지정 승차장 {point}</b>
                        <small>
                          {point === "A"
                            ? "도착층 동쪽 · 안내 표지와 일치"
                            : "도착층 서쪽 · 반대편 승차장"}
                        </small>
                      </span>
                      {pickup === point && <Check size={17} />}
                    </button>
                  ))}
                </div>
                {pickup === "B" && (
                  <p className="didi-inline-feedback" role="status">
                    B는 반대편이에요. 이번 안내 표지의 A 구역을 찾아보세요.
                  </p>
                )}
                <button
                  className="didi-primary"
                  disabled={pickup !== "A"}
                  onClick={confirmPickup}
                >
                  여기에서 탑승할게요
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {stage === "vehicle" && (
              <>
                <div className="didi-sheet-title">
                  <div>
                    <h3>어떤 차로 갈까요?</h3>
                    <p>연습용 차종과 견적을 비교해요.</p>
                  </div>
                  <span className="didi-fare-tag">가상 견적</span>
                </div>
                <fieldset className="didi-car-options">
                  <legend className="sr-only">차량 유형 선택</legend>
                  {(
                    [
                      {
                        id: "express",
                        name: "Express",
                        cn: "快车 · 일반 차량",
                        extra: 0,
                      },
                      {
                        id: "taxi",
                        name: "Taxi",
                        cn: "出租车 · 택시",
                        extra: 25,
                      },
                    ] as const
                  ).map((value) => (
                    <label key={value.id}>
                      <input
                        type="radio"
                        name={`${radioName}-car`}
                        value={value.id}
                        checked={car === value.id}
                        onChange={() => setCar(value.id)}
                      />
                      <span className="didi-car-card">
                        <CarArt taxi={value.id === "taxi"} />
                        <span className="didi-car-name">
                          <b>{value.name}</b>
                          <small>{value.cn}</small>
                        </span>
                        <span className="didi-car-price">
                          ¥{(destination?.quote ?? 160) + value.extra}
                          <small>연습 견적</small>
                        </span>
                        <span className="didi-radio-indicator">
                          <Check size={12} />
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <button className="didi-primary" onClick={confirmCar}>
                  {car === "taxi" ? "Taxi" : "Express"} 선택하기
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {stage === "review" && (
              <>
                <div className="didi-sheet-title">
                  <div>
                    <h3>출발 준비가 되었나요?</h3>
                    <p>호출 전, 경로와 차량을 한 번 더 확인해요.</p>
                  </div>
                </div>
                <div className="didi-request-summary">
                  <CarArt taxi={car === "taxi"} />
                  <div>
                    <b>
                      {car === "taxi" ? "Taxi · 택시" : "Express · 일반 차량"}
                    </b>
                    <small>승차장 A → {destination?.korean}</small>
                  </div>
                </div>
                <div className="didi-total">
                  <span>
                    연습 견적 <small>실제 요금 아님</small>
                  </span>
                  <strong>
                    <i>¥</i>
                    {fare}
                  </strong>
                </div>
                <div className="didi-safe-note">
                  <ShieldCheck size={15} />
                  <span>실제 위치·전화번호·결제수단을 사용하지 않아요.</span>
                </div>
                <button className="didi-primary" onClick={request}>
                  Confirm Request · 가상 호출
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {stage === "assigned" && (
              <>
                <div className="didi-driver-status">
                  <span />
                  <b>연습 차량 배정 완료</b>
                  <small>실제 호출 아님</small>
                </div>
                <div className="didi-driver-card">
                  <div className="didi-driver-avatar" aria-hidden="true">
                    <svg viewBox="0 0 48 48">
                      <rect width="48" height="48" rx="24" fill="#e8ece4" />
                      <path d="M9 48V37q15-15 30 0v11" fill="#849c90" />
                      <ellipse cx="24" cy="22" rx="10" ry="12" fill="#e7bd9c" />
                      <path
                        d="M14 22V16q1-10 11-9 11 1 10 14l-6-7-13 5z"
                        fill="#52645c"
                      />
                    </svg>
                  </div>
                  <div>
                    <b>
                      왕 기사님 <small>가상 인물</small>
                    </b>
                    <span>
                      <Star size={10} fill="currentColor" />
                      4.9 <i>· 연습 프로필</i>
                    </span>
                  </div>
                  <CarArt taxi={car === "taxi"} compact />
                </div>
                <div className="didi-license">
                  <span>{car === "taxi" ? "노란색 택시" : "흰색 세단"}</span>
                  <strong>{assignedPlate}</strong>
                  <small>앱에 표시된 차량 번호</small>
                </div>
                <h3 className="didi-verification-title">
                  승차장에서 내 차를 찾아요
                </h3>
                <p className="didi-world-invitation">
                  여러 대의 차량이 도착해요. 캐릭터로 차에 다가가 앱의 배정
                  번호와 대조한 뒤 탑승하세요.
                </p>
                {dispatchError && (
                  <p className="didi-inline-feedback" role="alert">
                    {dispatchError}
                  </p>
                )}
                <button
                  className="didi-primary"
                  disabled={
                    !onRideRequested || waitingForBoarding || !rideRequest
                  }
                  onClick={() => {
                    if (rideRequest) void enterPickup(rideRequest);
                  }}
                >
                  {waitingForBoarding
                    ? "승차장에서 탑승을 기다리는 중…"
                    : "필드에서 차량 찾기"}
                  <ArrowRight size={17} />
                </button>
              </>
            )}
          </section>
        </>
      )}
      <footer className="didi-app-footer">
        <ShieldCheck size={11} />
        <span>화면·장소·차량·요금은 절차를 익히는 연습용 예시예요.</span>
      </footer>
    </div>
  );
}
