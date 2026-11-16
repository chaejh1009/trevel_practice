import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookUser,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Hotel,
  Info,
  Plane,
  ScanLine,
  ShieldCheck,
  Stamp,
  UserRound,
} from "lucide-react";
import type { PracticeProps } from "./types";
import {
  ARRIVAL_HOTELS,
  arrivalDraftErrors,
  canFinishArrival,
  interviewMatchesArrival,
  localDateAfter,
  TRAINING_FLIGHTS,
  type ArrivalAnswers,
  type ArrivalDraft,
} from "../../lib/practiceFlow";
import "./ImmigrationPractice.css";

const GUIDES = [
  "여기는 입국 절차 연습 데스크예요. 실제 여권 대신 화면의 예시 여권을 불러와요. 사진 업로드는 하지 않아요.",
  "화면 위의 예시 여행 내역에서 항공편·방문 목적·숙소를 찾아 입국 카드에 선택해 봐요.",
  "제출 전에 예시 여권과 여행 내역을 한 번 더 대조해요. 이름, 항공편, 숙소가 맞는지 확인하세요.",
  "심사관의 질문에 방금 작성한 카드와 일치하도록 대답해요. 실제 심사에서는 본인의 방문 목적과 숙박 내용을 사실대로 답해요.",
  "입국 절차 연습을 마쳤어요! 이 스탬프는 실제 입국 허가가 아니에요. 이제 상황 문제로 기억을 확인해 볼까요?",
];
const STAGES = ["여권 확인", "카드 작성", "내용 검토", "심사 연습", "완료"];
export default function ImmigrationPractice({
  onFinish,
  track,
  onGuide,
}: PracticeProps) {
  const [stage, setStage] = useState(0),
    [scanned, setScanned] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [stamped, setStamped] = useState(false);
  const [draft, setDraft] = useState<ArrivalDraft>({
    nationality: "KOREA",
    flightId: "",
    purpose: "",
    hotelId: "",
  });
  const [answers, setAnswers] = useState<ArrivalAnswers>({
    purpose: "",
    hotelId: "",
  });
  const appRef = useRef<HTMLElement | null>(null);
  const guide = useRef(onGuide);
  guide.current = onGuide;
  const finished = useRef(false);
  useEffect(() => {
    guide.current?.(GUIDES[stage]);
    const viewport = appRef.current?.closest<HTMLElement>(".pw-device-screen");
    if (viewport) viewport.scrollTop = 0;
  }, [stage]);
  const errors = arrivalDraftErrors(draft);
  const formTouched = Boolean(draft.flightId || draft.purpose || draft.hotelId);
  const hotel = ARRIVAL_HOTELS.find((item) => item.id === draft.hotelId);
  const interviewReady = interviewMatchesArrival(draft, answers);
  function completeStage(name: string, next: number) {
    track("practice_stage_completed", {
      scenarioId: "immigration",
      stage: name,
    });
    setStage(next);
  }
  function update(key: keyof ArrivalDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setReviewed(false);
    setStamped(false);
    setAnswers({ purpose: "", hotelId: "" });
  }
  function next() {
    if (stage === 0 && scanned) completeStage("sample_passport", 1);
    else if (stage === 1 && errors.length === 0)
      completeStage("arrival_card", 2);
    else if (stage === 2 && reviewed) completeStage("review", 3);
    else if (stage === 3 && scanned && reviewed && interviewReady) {
      setStamped(true);
      completeStage("officer_interview", 4);
    }
  }
  function finish() {
    if (
      stage !== 4 ||
      finished.current ||
      !canFinishArrival({ scanned, reviewed, stamped, draft, answers })
    )
      return;
    finished.current = true;
    track("practice_action_completed", {
      scenarioId: "immigration",
      action: "mock_arrival_procedure",
      stage: "dummy_stamp",
    });
    onFinish();
  }
  const nextEnabled =
    stage === 0
      ? scanned
      : stage === 1
        ? errors.length === 0
        : stage === 2
          ? reviewed
          : interviewReady;
  return (
    <section ref={appRef} className="ip-app" aria-label="입국 절차 연습 데스크">
      <header className="ip-header">
        <span className="ip-logo">
          <Plane size={22} />
        </span>
        <div>
          <b>입국 절차 연습</b>
          <small>ARRIVAL TRAINING DESK</small>
        </div>
        <span className="ip-training">교육용 시뮬레이션</span>
      </header>
      <ol className="ip-steps" aria-label="입국 절차 단계">
        {STAGES.map((title, index) => (
          <li
            key={title}
            className={
              stage === index
                ? "is-current"
                : stage > index
                  ? "is-complete"
                  : ""
            }
            aria-current={stage === index ? "step" : undefined}
          >
            <span>{stage > index ? <Check size={11} /> : index + 1}</span>
            <small>{title}</small>
          </li>
        ))}
      </ol>
      <div className="ip-body">
        {stage === 0 && (
          <>
            <div className="ip-section-heading">
              <span>01 / SAMPLE DOCUMENT</span>
              <h3>예시 여권을 확인해 주세요</h3>
              <p>여권 정보가 카드로 옮겨지는 과정을 체험해요.</p>
            </div>
            <div className={`ip-scanner ${scanned ? "is-scanned" : ""}`}>
              <i className="ip-scanner-corner a" />
              <i className="ip-scanner-corner b" />
              <i className="ip-scanner-corner c" />
              <i className="ip-scanner-corner d" />
              <div className="ip-passport">
                <div className="ip-passport-heading">
                  <b>SAMPLE PASSPORT</b>
                  <span>DEMO ONLY</span>
                </div>
                <div className="ip-passport-person">
                  <div className="ip-passport-photo">
                    <UserRound size={43} />
                    <span>예시 인물</span>
                  </div>
                  <div>
                    <small>SURNAME</small>
                    <b>KIM</b>
                    <small>GIVEN NAMES</small>
                    <b>GILDONG</b>
                    <small>NATIONALITY</small>
                    <b>KOREA</b>
                  </div>
                </div>
                <div className="ip-mrz">
                  DEMO&lt;&lt;NOT&lt;A&lt;REAL&lt;PASSPORT
                  <br />
                  TRAINING&lt;DOCUMENT&lt;ONLY&lt;&lt;&lt;
                </div>
              </div>
              {scanned && (
                <span className="ip-scan-success">
                  <CheckCircle2 size={16} />
                  예시 정보 확인 완료
                </span>
              )}
            </div>
            <button
              type="button"
              className="ip-scan-button"
              onClick={() => {
                setScanned(true);
                track("practice_item_checked", {
                  scenarioId: "immigration",
                  item: "sample_passport_loaded",
                });
              }}
            >
              <ScanLine size={18} />
              {scanned ? "예시 여권 다시 확인하기" : "연습용 여권 불러오기"}
            </button>
            <div className="ip-info">
              <ShieldCheck size={17} />
              <p>
                실제 여권 사진·여권번호·생년월일을 입력하거나 업로드하지 않아요.
                KIM GILDONG은 가상 여행자예요.
              </p>
            </div>
          </>
        )}
        {stage === 1 && (
          <>
            <div className="ip-section-heading">
              <span>02 / ARRIVAL CARD PRACTICE</span>
              <h3>예시 입국 카드를 작성해요</h3>
              <p>여행 내역에서 항공편과 숙소를 찾아 선택하세요.</p>
            </div>
            <div className="ip-reference">
              <div>
                <ClipboardCheck size={17} />
                <b>옮겨 적을 예시 여행 내역</b>
                <span>DEMO</span>
              </div>
              <dl>
                <div>
                  <dt>항공편</dt>
                  <dd>MU5052 · ICN → PVG</dd>
                </div>
                <div>
                  <dt>방문 목적</dt>
                  <dd>관광 · TOURISM</dd>
                </div>
                <div>
                  <dt>숙소</dt>
                  <dd>와이탄 가든 호텔 · 황푸구</dd>
                </div>
              </dl>
            </div>
            <div className="ip-form">
              <div className="ip-form-section">
                <span>기본 정보</span>
                <small>BASIC INFORMATION</small>
              </div>
              <div className="ip-form-grid">
                <label>
                  Surname / 성
                  <input value="KIM" readOnly aria-label="예시 성 KIM" />
                </label>
                <label>
                  Given names / 이름
                  <input
                    value="GILDONG"
                    readOnly
                    aria-label="예시 이름 GILDONG"
                  />
                </label>
              </div>
              <label>
                Nationality / 국적
                <input value="KOREA / 대한민국" readOnly />
                <small>예시 여권에서 불러온 정보</small>
              </label>
              <div className="ip-form-section">
                <span>여행 정보</span>
                <small>TRAVEL INFORMATION</small>
              </div>
              <label>
                Arrival flight / 도착 항공편
                <select
                  value={draft.flightId}
                  onChange={(event) => update("flightId", event.target.value)}
                >
                  <option value="">항공편을 선택하세요</option>
                  {TRAINING_FLIGHTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id} · ICN → PVG (예시)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Purpose of visit / 방문 목적
                <select
                  value={draft.purpose}
                  onChange={(event) => update("purpose", event.target.value)}
                >
                  <option value="">방문 목적을 선택하세요</option>
                  <option value="tourism">Tourism / 관광</option>
                  <option value="business">Business / 업무</option>
                  <option value="study">Study / 유학</option>
                </select>
              </label>
              <label>
                Hotel or address / 숙소·주소
                <select
                  value={draft.hotelId}
                  onChange={(event) => update("hotelId", event.target.value)}
                >
                  <option value="">예시 숙소를 선택하세요</option>
                  {ARRIVAL_HOTELS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (가상 숙소)
                    </option>
                  ))}
                </select>
                {hotel && (
                  <small className="ip-selected-address">{hotel.address}</small>
                )}
              </label>
            </div>
            {formTouched && errors.length > 0 && (
              <div className="ip-validation" role="status">
                <Info size={15} />
                <span>{errors[0]}</span>
              </div>
            )}
          </>
        )}
        {stage === 2 && (
          <>
            <div className="ip-section-heading">
              <span>03 / REVIEW</span>
              <h3>내용을 제출 전에 대조해요</h3>
              <p>예시 여권·항공편·숙소와 같은지 확인하세요.</p>
            </div>
            <div className="ip-review-card">
              <header>
                <FileCheck2 size={19} />
                <div>
                  <b>ARRIVAL CARD</b>
                  <small>교육용 예시 · 공식 신고서 아님</small>
                </div>
                <span>REVIEW</span>
              </header>
              <dl>
                <div>
                  <dt>NAME</dt>
                  <dd>KIM GILDONG</dd>
                </div>
                <div>
                  <dt>NATIONALITY</dt>
                  <dd>KOREA</dd>
                </div>
                <div>
                  <dt>FLIGHT</dt>
                  <dd>{draft.flightId} · ICN → PVG</dd>
                </div>
                <div>
                  <dt>PURPOSE</dt>
                  <dd>TOURISM / 관광</dd>
                </div>
                <div>
                  <dt>HOTEL</dt>
                  <dd>
                    {hotel?.english}
                    <small>{hotel?.address}</small>
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => {
                  setReviewed(false);
                  setStage(1);
                }}
              >
                작성 내용 수정
                <ChevronRight size={13} />
              </button>
            </div>
            <label className="ip-agree">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              <span>예시 여권과 여행 내역을 대조했으며, 내용이 일치해요.</span>
            </label>
            <div className="ip-info">
              <Info size={16} />
              <p>
                실제 시스템으로 전송하지 않아요. 다음 단계에서는 작성한 내용으로
                심사관의 질문에 답해 봅니다.
              </p>
            </div>
          </>
        )}
        {stage === 3 && (
          <>
            <div className="ip-section-heading">
              <span>04 / INSPECTION COUNTER</span>
              <h3>심사대에서 답해 볼까요?</h3>
              <p>관광을 하고 와이탄 가든 호텔에 머무는 가상 여행이에요.</p>
            </div>
            <div className="ip-counter">
              <div className="ip-counter-number">
                COUNTER<strong>01</strong>
              </div>
              <div>
                <BadgeCheck size={24} />
                <b>IMMIGRATION PRACTICE</b>
                <span>여행 목적과 숙박 정보를 확인해요</span>
              </div>
            </div>
            <fieldset className="ip-question">
              <legend>
                <span>Q1</span>What is the purpose of your visit?
                <small>방문 목적이 무엇인가요?</small>
              </legend>
              <div>
                {[
                  ["tourism", "관광하러 왔습니다.", "I am here for tourism."],
                  [
                    "business",
                    "업무로 방문했습니다.",
                    "I am here for business.",
                  ],
                ].map(([value, title, translation]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={answers.purpose === value}
                    className={answers.purpose === value ? "is-selected" : ""}
                    onClick={() =>
                      setAnswers((current) => ({ ...current, purpose: value }))
                    }
                  >
                    <span>
                      <b>{title}</b>
                      <small>{translation}</small>
                    </span>
                    {answers.purpose === value && <Check size={16} />}
                  </button>
                ))}
              </div>
              {answers.purpose && answers.purpose !== draft.purpose && (
                <p className="ip-answer-note">
                  이 가상 일정은 관광이에요. 작성한 카드의 방문 목적을 확인해
                  보세요.
                </p>
              )}
            </fieldset>
            <fieldset className="ip-question">
              <legend>
                <span>Q2</span>Where will you stay?
                <small>어디에 머무르나요?</small>
              </legend>
              <div>
                {ARRIVAL_HOTELS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={answers.hotelId === item.id}
                    className={answers.hotelId === item.id ? "is-selected" : ""}
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        hotelId: item.id,
                      }))
                    }
                  >
                    <Hotel size={20} />
                    <span>
                      <b>{item.name}</b>
                      <small>{item.english}</small>
                    </span>
                    {answers.hotelId === item.id && <Check size={16} />}
                  </button>
                ))}
              </div>
              {answers.hotelId && answers.hotelId !== draft.hotelId && (
                <p className="ip-answer-note">
                  카드에 적은 숙소와 달라요. 예시 예약 내역을 다시 확인하세요.
                </p>
              )}
            </fieldset>
            <p className="ip-truth-note">
              <Info size={13} />
              실제 심사에서는 본인의 방문 목적·숙박 내용을 사실대로 답해요.
            </p>
          </>
        )}
        {stage === 4 && (
          <>
            <div className="ip-completion">
              <div className="ip-dummy-stamp">
                <Stamp size={32} />
                <strong>
                  PRACTICE
                  <br />
                  COMPLETE
                </strong>
                <span>TRAINING / NOT VALID</span>
              </div>
              <h3>입국 절차 연습을 마쳤어요</h3>
              <p>예시 정보를 작성하고, 카드와 일치하는 답변을 했어요.</p>
              <div className="ip-receipt">
                <span>TRAINING RECEIPT</span>
                <b>KIM GILDONG</b>
                <dl>
                  <div>
                    <dt>항공편</dt>
                    <dd>{draft.flightId}</dd>
                  </div>
                  <div>
                    <dt>방문 목적</dt>
                    <dd>TOURISM</dd>
                  </div>
                  <div>
                    <dt>숙소</dt>
                    <dd>{hotel?.name}</dd>
                  </div>
                  <div>
                    <dt>연습일</dt>
                    <dd>{localDateAfter(0)}</dd>
                  </div>
                </dl>
                <strong>공식 신고·입국 허가가 아닙니다</strong>
              </div>
            </div>
          </>
        )}
        <div className="ip-actions">
          {stage > 0 && stage < 4 && (
            <button
              type="button"
              className="ip-back"
              onClick={() => setStage(stage - 1)}
            >
              <ArrowLeft size={15} />
              이전
            </button>
          )}
          {stage < 4 ? (
            <button
              type="button"
              className="ip-next"
              disabled={!nextEnabled}
              onClick={next}
            >
              {
                [
                  "입국 카드 작성",
                  "작성 내용 검토",
                  "심사대로 이동",
                  "답변 확인하기",
                ][stage]
              }
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="ip-next"
              disabled={
                !canFinishArrival({
                  scanned,
                  reviewed,
                  stamped,
                  draft,
                  answers,
                })
              }
              onClick={finish}
            >
              절차 완료 · 상황 연습으로
              <ArrowRight size={15} />
            </button>
          )}
        </div>
        <footer className="ip-footer">
          <BookUser size={13} />
          <p>
            예시 서식과 가상 일정으로 구성한 교육용 화면이에요. 공식 신고서·현재
            입국 요건 안내가 아닙니다.
            <a
              href="https://s.nia.gov.cn/ArrivalCardFillingPC/"
              target="_blank"
              rel="noreferrer noopener"
            >
              공식 입국 카드 서비스 참고
              <ArrowRight size={10} />
            </a>
          </p>
        </footer>
      </div>
    </section>
  );
}
