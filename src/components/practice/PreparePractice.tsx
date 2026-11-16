import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  FileCheck2,
  Globe2,
  Luggage,
  Plane,
  ShieldCheck,
  Signal,
  Smartphone,
  Ticket,
  Wallet,
  Wifi,
} from "lucide-react";
import type { PracticeProps } from "./types";
import {
  canFinishPreparation,
  canIssueBoardingPass,
  localDateAfter,
  TRAINING_FLIGHTS,
  tripDateErrors,
} from "../../lib/practiceFlow";
import "./PreparePractice.css";

const GUIDE = [
  "먼저 가상 항공편과 출발·귀국 날짜를 골라봐요. 여기에 입력한 일정은 이 연습에서만 사용해요.",
  "여행 지갑의 서류·통신·결제 카드를 하나씩 열어 점검해요. 실제 앱 가입이나 카드 등록은 하지 않아요.",
  "연습 탑승권에서 출발·도착 공항과 날짜를 찾아봐요. TRAINING 표시는 실제 탑승에 사용할 수 없다는 뜻이에요.",
];
type Tab = "documents" | "connection" | "payment";
const tabs: { id: Tab; label: string; icon: typeof FileCheck2 }[] = [
  { id: "documents", label: "여행 서류", icon: FileCheck2 },
  { id: "connection", label: "통신·지도", icon: Wifi },
  { id: "payment", label: "결제 수단", icon: CreditCard },
];
export default function PreparePractice({
  onFinish,
  track,
  onGuide,
}: PracticeProps) {
  const [stage, setStage] = useState(0);
  const [departure, setDeparture] = useState(() => localDateAfter(7));
  const [returnDate, setReturnDate] = useState(() => localDateAfter(10));
  const [flightId, setFlightId] = useState("");
  const [tab, setTab] = useState<Tab>("documents");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [network, setNetwork] = useState("esim");
  const [boardingConfirmed, setBoardingConfirmed] = useState(false);
  const appRef = useRef<HTMLElement | null>(null);
  const guide = useRef(onGuide);
  guide.current = onGuide;
  const finished = useRef(false);
  useEffect(() => {
    guide.current?.(GUIDE[stage]);
    const viewport = appRef.current?.closest<HTMLElement>(".pw-device-screen");
    if (viewport) viewport.scrollTop = 0;
  }, [stage]);
  const itinerary = { departure, returnDate, flightId };
  const wallet = {
    documents: Boolean(
      checks.passport && checks.reservations && checks.requirements,
    ),
    connection: Boolean(checks.connectionTest && checks.offlineMap),
    payment: Boolean(checks.paymentTest && checks.backup),
  };
  const dateErrors = tripDateErrors(departure, returnDate);
  const flight = TRAINING_FLIGHTS.find((item) => item.id === flightId);
  const walletCount = Object.values(wallet).filter(Boolean).length;
  const itineraryReady = dateErrors.length === 0 && Boolean(flight);
  function mark(key: string) {
    const checked = !checks[key];
    setChecks((current) => ({ ...current, [key]: checked }));
    track("practice_item_checked", {
      scenarioId: "prepare",
      item: key,
      checked,
    });
  }
  function next() {
    if (stage === 0 && itineraryReady) {
      track("practice_stage_completed", {
        scenarioId: "prepare",
        stage: "itinerary",
      });
      setStage(1);
    } else if (stage === 1 && canIssueBoardingPass(itinerary, wallet)) {
      track("practice_stage_completed", {
        scenarioId: "prepare",
        stage: "travel_wallet",
      });
      setStage(2);
    }
  }
  function finish() {
    if (
      stage !== 2 ||
      finished.current ||
      !canFinishPreparation(itinerary, wallet, boardingConfirmed)
    )
      return;
    finished.current = true;
    track("practice_action_completed", {
      scenarioId: "prepare",
      action: "mock_boarding_pass",
      stage: "boarding_review",
    });
    onFinish();
  }
  const checkbox = (key: string, title: string, detail: string) => (
    <label className={`pp-check ${checks[key] ? "is-done" : ""}`} key={key}>
      <input
        type="checkbox"
        checked={Boolean(checks[key])}
        onChange={() => mark(key)}
      />
      <span>
        <b>{title}</b>
        <small>{detail}</small>
      </span>
      {checks[key] && <Check size={17} />}
    </label>
  );
  return (
    <section ref={appRef} className="pp-app" aria-label="여행 준비 지갑 연습">
      <header className="pp-header">
        <div className="pp-brand">
          <span>
            <Plane size={21} />
          </span>
          <div>
            <b>TRIP WALLET</b>
            <small>출발 준비를 한곳에</small>
          </div>
        </div>
        <span className="pp-training">TRAINING</span>
      </header>
      <ol className="pp-steps" aria-label="출발 준비 단계">
        {["여행 일정", "여행 지갑", "탑승권 확인"].map((label, index) => (
          <li
            key={label}
            className={
              stage === index
                ? "is-current"
                : stage > index
                  ? "is-complete"
                  : ""
            }
            aria-current={stage === index ? "step" : undefined}
          >
            <span>{stage > index ? <Check size={13} /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="pp-body">
        {stage === 0 && (
          <>
            <div className="pp-eyebrow">MY NEXT TRIP</div>
            <h3 className="pp-title">상하이 여행을 등록해요</h3>
            <p className="pp-description">
              가상의 일정을 골라 체크인 준비를 시작하세요.
            </p>
            <div className="pp-route">
              <div>
                <span>출발</span>
                <strong>ICN</strong>
                <b>서울·인천</b>
              </div>
              <div className="pp-route-line">
                <i />
                <Plane size={23} />
                <i />
              </div>
              <div>
                <span>도착</span>
                <strong>PVG</strong>
                <b>상하이·푸둥</b>
              </div>
            </div>
            <div className="pp-date-grid">
              <label>
                출발일
                <input
                  aria-label="여행 출발일"
                  type="date"
                  min={localDateAfter(0)}
                  value={departure}
                  onChange={(event) => {
                    setDeparture(event.target.value);
                    setBoardingConfirmed(false);
                  }}
                />
              </label>
              <label>
                귀국일
                <input
                  aria-label="여행 귀국일"
                  type="date"
                  min={departure || localDateAfter(0)}
                  value={returnDate}
                  onChange={(event) => {
                    setReturnDate(event.target.value);
                    setBoardingConfirmed(false);
                  }}
                />
              </label>
            </div>
            {dateErrors.length > 0 && (
              <p className="pp-error" role="status">
                {dateErrors[0]}
              </p>
            )}
            <div className="pp-section-label">
              <b>항공편 선택</b>
              <span>시간·편명은 연습용 예시</span>
            </div>
            <div className="pp-flights">
              {TRAINING_FLIGHTS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={flightId === item.id ? "is-selected" : ""}
                  aria-pressed={flightId === item.id}
                  onClick={() => {
                    setFlightId(item.id);
                    setBoardingConfirmed(false);
                  }}
                >
                  <span className="pp-radio">
                    {flightId === item.id && <i />}
                  </span>
                  <span>
                    <b>
                      {item.departure} <ArrowRight size={13} /> {item.arrival}
                    </b>
                    <small>{item.id} · ICN → PVG · 예시 현지 시각</small>
                  </span>
                  <span className="pp-flight-tag">직항 연습</span>
                </button>
              ))}
            </div>
            <div className="pp-notice">
              <ShieldCheck size={17} />
              <p>
                실제 예약·발권 없이 연습해요. 여권번호나 결제 정보를 입력하지
                않아요.
              </p>
            </div>
          </>
        )}
        {stage === 1 && (
          <>
            <div className="pp-wallet-heading">
              <div>
                <div className="pp-eyebrow">READY TO GO</div>
                <h3 className="pp-title">나의 여행 지갑</h3>
              </div>
              <span>
                <Luggage size={17} />
                {walletCount} / 3 준비
              </span>
            </div>
            <div className="pp-trip-summary">
              <Plane size={17} />
              <div>
                <b>ICN → PVG · {flightId}</b>
                <small>
                  {departure} 출발 · {returnDate} 귀국
                </small>
              </div>
              <button type="button" onClick={() => setStage(0)}>
                일정 수정
              </button>
            </div>
            <div
              className="pp-wallet-tabs"
              role="tablist"
              aria-label="여행 준비 항목"
            >
              {tabs.map((item) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  aria-controls={`pp-panel-${item.id}`}
                  id={`pp-tab-${item.id}`}
                  key={item.id}
                  className={tab === item.id ? "is-active" : ""}
                  onClick={() => setTab(item.id)}
                >
                  <item.icon size={19} />
                  <b>{item.label}</b>
                  <small>
                    {wallet[item.id] ? <CheckCircle2 size={15} /> : "점검하기"}
                  </small>
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`pp-panel-${tab}`}
              aria-labelledby={`pp-tab-${tab}`}
              className="pp-wallet-panel"
            >
              {tab === "documents" && (
                <>
                  <div className="pp-document">
                    <div className="pp-passport-cover">
                      <Globe2 size={31} />
                      <span>
                        DEMO
                        <br />
                        PASSPORT
                      </span>
                    </div>
                    <div>
                      <small>연습용 문서 보관함</small>
                      <b>KIM GILDONG</b>
                      <span>여권·예약 내역·여행 일정</span>
                      <em>실제 파일은 저장하지 않아요</em>
                    </div>
                    <FileCheck2 size={24} />
                  </div>
                  {checkbox(
                    "passport",
                    "여권·이름·유효기간 점검 연습",
                    "실제 출발 전에는 본인 여권과 공식 입국 안내를 확인해요.",
                  )}
                  {checkbox(
                    "reservations",
                    "예약 확인서를 오프라인 지갑에 넣기",
                    "이 화면에서는 예시 항공편과 가상 숙소 내역을 보관해요.",
                  )}
                  {checkbox(
                    "requirements",
                    "입국 요건 공식 확인 항목 추가",
                    "정책을 단정하지 않고 출발 시점의 공식 안내를 확인해요.",
                  )}
                </>
              )}
              {tab === "connection" && (
                <>
                  <div className="pp-connection-card">
                    <div className="pp-phone-icon">
                      <Smartphone size={40} />
                      <Signal size={15} />
                    </div>
                    <div>
                      <small>TRAVEL NETWORK</small>
                      <b>현지에서 바로 연결되도록</b>
                      <span>
                        {checks.connectionTest
                          ? "가상 연결 테스트 완료"
                          : "데이터 사용 방식을 선택하세요"}
                      </span>
                    </div>
                    <i className={checks.connectionTest ? "connected" : ""} />
                  </div>
                  <div className="pp-network-options">
                    {[
                      ["esim", "여행 eSIM"],
                      ["roaming", "로밍"],
                    ].map(([id, label]) => (
                      <button
                        type="button"
                        key={id}
                        className={network === id ? "is-selected" : ""}
                        aria-pressed={network === id}
                        onClick={() => {
                          setNetwork(id);
                          setChecks((current) => ({
                            ...current,
                            connectionTest: false,
                          }));
                        }}
                      >
                        {label}
                        {network === id && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pp-test-button ${checks.connectionTest ? "is-done" : ""}`}
                    onClick={() => {
                      setChecks((current) => ({
                        ...current,
                        connectionTest: true,
                      }));
                      track("practice_item_checked", {
                        scenarioId: "prepare",
                        item: "connectionTest",
                        checked: true,
                      });
                    }}
                  >
                    {checks.connectionTest ? (
                      <CheckCircle2 size={17} />
                    ) : (
                      <Wifi size={17} />
                    )}
                    {checks.connectionTest
                      ? "가상 연결 정상 · 테스트 완료"
                      : "가상 데이터 연결 테스트"}
                  </button>
                  {checkbox(
                    "offlineMap",
                    "지도·호텔 중문 주소를 오프라인 보관",
                    "예시 저장 묶음: 지도 1개 · 호텔 주소 1개 · 비상 연락 카드",
                  )}
                  <p className="pp-small-note">
                    <Download size={13} />
                    데이터 통신·앱 설치·실제 다운로드는 발생하지 않아요.
                  </p>
                </>
              )}
              {tab === "payment" && (
                <>
                  <div className="pp-payment-card">
                    <div>
                      <span>DEMO PAY</span>
                      <Wallet size={24} />
                    </div>
                    <strong>TRAINING CARD</strong>
                    <span>•••• •••• •••• DEMO</span>
                    <small>KIM GILDONG · 가상 결제 수단</small>
                  </div>
                  <button
                    type="button"
                    className={`pp-test-button ${checks.paymentTest ? "is-done" : ""}`}
                    onClick={() => {
                      setChecks((current) => ({
                        ...current,
                        paymentTest: true,
                      }));
                      track("practice_item_checked", {
                        scenarioId: "prepare",
                        item: "paymentTest",
                        checked: true,
                      });
                    }}
                  >
                    <CreditCard size={17} />
                    {checks.paymentTest
                      ? "예시 결제 수단 점검 완료"
                      : "예시 결제 수단 점검하기"}
                  </button>
                  {checkbox(
                    "backup",
                    "대체 결제 수단과 비상 연락 방법 준비",
                    "개인 인증번호를 공유하지 않고 예비 수단도 챙겨요.",
                  )}
                  <p className="pp-small-note">
                    <ShieldCheck size={13} />
                    실제 카드 등록·본인 인증·결제를 진행하지 않아요.
                  </p>
                </>
              )}
            </div>
            <div className="pp-wallet-progress">
              <span>출발 준비</span>
              <div>
                <i style={{ width: `${(walletCount / 3) * 100}%` }} />
              </div>
              <b>{walletCount} / 3</b>
            </div>
          </>
        )}
        {stage === 2 && (
          <>
            <div className="pp-success-heading">
              <CheckCircle2 size={30} />
              <h3 className="pp-title">체크인 준비가 끝났어요</h3>
              <p>아래 탑승권에서 공항·날짜·탑승구를 확인하세요.</p>
            </div>
            <div className="pp-boarding-pass">
              <div className="pp-boarding-top">
                <span>
                  <Plane size={17} />
                  TRIP WALLET
                </span>
                <b>BOARDING PASS</b>
              </div>
              <div className="pp-boarding-route">
                <div>
                  <small>INCHEON</small>
                  <strong>ICN</strong>
                </div>
                <Plane size={27} />
                <div>
                  <small>SHANGHAI PUDONG</small>
                  <strong>PVG</strong>
                </div>
              </div>
              <div className="pp-boarding-details">
                <div>
                  <small>PASSENGER</small>
                  <b>KIM GILDONG</b>
                </div>
                <div>
                  <small>FLIGHT</small>
                  <b>{flightId}</b>
                </div>
                <div>
                  <small>DEPARTURE</small>
                  <b>{departure}</b>
                </div>
                <div>
                  <small>GATE / SEAT</small>
                  <b>
                    {flight?.gate} / {flight?.seat}
                  </b>
                </div>
              </div>
              <div className="pp-boarding-tear">
                <span />
                <span />
              </div>
              <div className="pp-training-stamp">TRAINING / NOT VALID</div>
              <p>학습용 예시 탑승권 · 실제 탑승 불가</p>
            </div>
            <div className="pp-ready-list">
              {tabs.map((item) => (
                <span key={item.id}>
                  <CheckCircle2 size={15} />
                  {item.label} 준비
                </span>
              ))}
            </div>
            <label className="pp-final-check">
              <input
                type="checkbox"
                checked={boardingConfirmed}
                onChange={(event) => setBoardingConfirmed(event.target.checked)}
              />
              <span>출발·도착 공항, 날짜와 탑승구를 확인했어요.</span>
            </label>
          </>
        )}
        <div className="pp-actions">
          {stage > 0 && (
            <button
              className="pp-back"
              type="button"
              onClick={() => {
                setBoardingConfirmed(false);
                setStage(stage - 1);
              }}
            >
              <ArrowLeft size={15} />
              이전
            </button>
          )}
          {stage < 2 ? (
            <button
              className="pp-next"
              type="button"
              disabled={
                stage === 0
                  ? !itineraryReady
                  : !canIssueBoardingPass(itinerary, wallet)
              }
              onClick={next}
            >
              {stage === 0 ? "여행 지갑 열기" : "연습 탑승권 만들기"}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="pp-next"
              type="button"
              disabled={
                !canFinishPreparation(itinerary, wallet, boardingConfirmed)
              }
              onClick={finish}
            >
              준비 완료 · 상황 연습으로
              <ArrowRight size={16} />
            </button>
          )}
        </div>
        <footer className="pp-footer">
          <Ticket size={12} />
          <span>연습용 여행 지갑 · 입력한 일정은 이 화면에서만 사용해요.</span>
        </footer>
      </div>
    </section>
  );
}
