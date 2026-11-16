import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Hotel,
  Info,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { PracticeProps } from "./types";
import {
  calendarDay as dayNumber,
  hotelPracticeQuote,
  localDateAfter as dateAfter,
} from "../../lib/practiceFlow";
import "./HotelPractice.css";

type Screen = "search" | "results" | "detail" | "review" | "confirmation";
type Policy = "flexible" | "nonrefundable";
type RoomId = "double" | "family";
type Property = {
  id: string;
  name: string;
  chinese: string;
  district: string;
  address: string;
  price: number;
  familyExtra: number;
  rating: string;
  crop: string;
  description: string;
};
const properties: Property[] = [
  {
    id: "bund",
    name: "와이탄 가든 호텔",
    chinese: "外滩花园酒店",
    district: "황푸구 · 와이탄 근처",
    address: "上海市黄浦区 · 가상 숙소 주소",
    price: 520,
    familyExtra: 160,
    rating: "4.7",
    crop: "center 48%",
    description: "따뜻한 햇살과 편안한 침구가 있는 도심 속 휴식 공간",
  },
  {
    id: "pudong",
    name: "푸둥 리버 스테이",
    chinese: "浦东河畔酒店",
    district: "푸둥신구 · 강변 산책로 근처",
    address: "上海市浦东新区 · 가상 숙소 주소",
    price: 380,
    familyExtra: 120,
    rating: "4.5",
    crop: "right 67%",
    description: "여행의 시작과 끝을 차분하게 보내는 밝고 아늑한 숙소",
  },
];
const roomNames: Record<RoomId, string> = {
  double: "스탠더드 더블룸",
  family: "패밀리 트윈룸",
};
const money = (value: number) => `¥ ${value.toLocaleString("ko-KR")}`;
function shortDate(value: string) {
  return value ? value.replace(/-/g, ".") : "날짜 선택";
}
function previousDate(value: string) {
  const number = dayNumber(value);
  if (number === null) return "체크인 전날";
  return new Date((number - 1) * 86400000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ".");
}
function Photo({
  hotel,
  className = "",
}: {
  hotel: Property;
  className?: string;
}) {
  return (
    <div className={`hp-photo ${className}`}>
      <img
        src="/practice/hotel-room-v1.png"
        alt={`${hotel.name}의 밝은 객실을 보여 주는 연습용 이미지`}
        style={{ objectPosition: hotel.crop }}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <span>연습용 숙소 이미지</span>
    </div>
  );
}

type Receipt = {
  property: Property;
  arrival: string;
  departure: string;
  guests: number;
  room: RoomId;
  policy: Policy;
  nights: number;
  nightly: number;
  total: number;
};

/** A local, fictional booking flow. It never sends personal information or payments. */
export default function HotelPractice({
  onFinish,
  track,
  onGuide,
}: PracticeProps) {
  const [screen, setScreen] = useState<Screen>("search");
  const [arrival, setArrival] = useState(() => dateAfter(1));
  const [departure, setDeparture] = useState(() => dateAfter(4));
  const [guests, setGuests] = useState(1);
  const [propertyId, setPropertyId] = useState("bund");
  const [room, setRoom] = useState<RoomId>("double");
  const [policy, setPolicy] = useState<Policy>("flexible");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const completionSent = useRef(false);
  const finishSent = useRef(false);
  const guideRef = useRef(onGuide);
  const contentRef = useRef<HTMLDivElement>(null);
  guideRef.current = onGuide;

  const hotel =
    properties.find((item) => item.id === propertyId) || properties[0];
  const quote = hotelPracticeQuote({
    arrival,
    departure,
    guests,
    room,
    policy,
    baseRate: hotel.price,
    familyExtra: hotel.familyExtra,
  });
  const { nights, capacity, nightly, total } = quote;
  const datesValid = quote.dateErrors.length === 0;
  const cancellation =
    policy === "flexible"
      ? `${previousDate(arrival)} 18:00까지 무료 취소`
      : "예약 확정 후 취소·환불 불가";

  useEffect(() => {
    const tips: Record<Screen, string> = {
      search:
        "숙소 예약은 도시·날짜·인원 확인부터 시작해요. 오늘 이후의 체크인 날짜와 그다음 날 이후의 체크아웃 날짜를 골라 보세요.",
      results:
        "같은 상하이 호텔이어도 위치와 가격이 달라요. 사진만 보지 말고 지역과 투숙 조건을 살펴본 뒤 객실을 선택해 볼까요?",
      detail:
        "객실 인원과 취소 조건을 꼭 확인해요. 조금 저렴한 환불 불가 요금은 일정이 바뀌면 돌려받지 못하는 연습 조건이에요.",
      review:
        "결정하기 전에 날짜·객실·인원·총액을 다시 확인해요. 여기의 KIM GILDONG은 연습용 이름이니 실제 여권정보를 입력할 필요 없어요.",
      confirmation:
        "잘했어요! 예약번호, 중문 숙소명과 주소, 예약 조건을 찾을 수 있네요. 이제 이 화면을 떠올리며 체크인 상황을 함께 연습해요.",
    };
    guideRef.current?.(tips[screen]);
    contentRef.current?.scrollTo({ top: 0 });
    contentRef.current
      ?.closest<HTMLElement>(".pw-device-screen")
      ?.scrollTo({ top: 0 });
  }, [screen]);

  function record(step: string, extra: Record<string, unknown> = {}) {
    track("practice_step_completed", { scenarioId: "hotel", step, ...extra });
  }
  function validateDates() {
    if (quote.dateErrors.length) {
      setError(quote.dateErrors[0]);
      return false;
    }
    return true;
  }
  function search() {
    if (!validateDates()) return;
    setError("");
    record("search", { city: "shanghai", nights, guests });
    setScreen("results");
  }
  function selectProperty(item: Property) {
    setPropertyId(item.id);
    if (guests > 2) setRoom("family");
    setError("");
    record("property_selected", { hotel: item.id });
    setScreen("detail");
  }
  function review() {
    if (!validateDates()) return;
    if (guests > capacity) {
      setError(
        "선택한 객실의 최대 인원을 초과했어요. 패밀리 트윈룸을 선택해 주세요.",
      );
      return;
    }
    setError("");
    setAgreed(false);
    record("room_selected", { hotel: hotel.id, room, policy, guests, nights });
    setScreen("review");
  }
  function confirm() {
    if (!validateDates()) return;
    if (guests > capacity) {
      setError("객실 최대 인원과 투숙 인원을 다시 확인해 주세요.");
      return;
    }
    if (!agreed) {
      setError("예약 조건을 확인한 뒤 확인란을 선택해 주세요.");
      return;
    }
    setError("");
    const snapshot = {
      property: hotel,
      arrival,
      departure,
      guests,
      room,
      policy,
      nights,
      nightly,
      total,
    };
    setReceipt(snapshot);
    if (!completionSent.current) {
      completionSent.current = true;
      record("booking_reviewed", {
        hotel: hotel.id,
        room,
        policy,
        nights,
        guests,
        total,
      });
      track("practice_action_completed", {
        scenarioId: "hotel",
        action: "mock_reservation",
        hotel: hotel.id,
        room,
        policy,
        guests,
        nights,
        total,
        currency: "CNY",
      });
    }
    setScreen("confirmation");
  }
  function back() {
    const previous: Record<Screen, Screen> = {
      search: "search",
      results: "search",
      detail: "results",
      review: "detail",
      confirmation: "review",
    };
    setError("");
    setScreen(previous[screen]);
  }
  function finish() {
    if (screen !== "confirmation" || !receipt || finishSent.current) return;
    finishSent.current = true;
    record("receipt_checked");
    onFinish();
  }

  return (
    <section
      className="hotel-practice"
      aria-label="숙소 예약 앱 연습"
      data-practice-step={screen}
    >
      <header className="hp-header">
        {screen === "search" ? (
          <span className="hp-logo">
            <Hotel size={19} />
          </span>
        ) : (
          <button
            className="hp-back"
            onClick={back}
            aria-label="이전 예약 단계로 돌아가기"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <b>Trip Practice</b>
          <span>나의 첫 상하이 숙소</span>
        </div>
        <span className="hp-rehearsal">예약 연습</span>
      </header>
      <div className="hp-content" ref={contentRef}>
        {screen === "search" && (
          <>
            <div className="hp-search-hero">
              <span>STAY A LITTLE, DISCOVER MORE</span>
              <h3>
                상하이에서 만나는
                <br />
                나만의 편안한 하루.
              </h3>
              <p>호텔을 찾고 예약하는 과정을 연습해요.</p>
              <span className="hp-hero-window" aria-hidden="true">
                <BedDouble size={65} />
              </span>
            </div>
            <form
              className="hp-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                search();
              }}
              noValidate
            >
              <label className="hp-destination">
                <span>
                  <MapPin size={15} />
                  도시 / 여행지
                </span>
                <input aria-label="여행 도시" value="상하이 · 上海" readOnly />
                <small>이번 여행의 연습 도시</small>
              </label>
              <div className="hp-date-row">
                <label>
                  <span>
                    <CalendarDays size={13} />
                    체크인
                  </span>
                  <input
                    aria-label="호텔 체크인 날짜"
                    type="date"
                    min={dateAfter(0)}
                    value={arrival}
                    onChange={(event) => {
                      setArrival(event.target.value);
                      setError("");
                    }}
                  />
                </label>
                <span className="hp-nights">
                  {datesValid ? `${nights}박` : "일정"}
                </span>
                <label>
                  <span>체크아웃</span>
                  <input
                    aria-label="호텔 체크아웃 날짜"
                    type="date"
                    min={arrival || dateAfter(0)}
                    value={departure}
                    onChange={(event) => {
                      setDeparture(event.target.value);
                      setError("");
                    }}
                  />
                </label>
              </div>
              <label className="hp-guests">
                <span>
                  <Users size={15} />
                  객실 및 투숙객
                </span>
                <select
                  aria-label="호텔 투숙 인원"
                  value={guests}
                  onChange={(event) => {
                    setGuests(Number(event.target.value));
                    setAgreed(false);
                  }}
                >
                  {[1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>
                      객실 1개 · 성인 {value}명
                    </option>
                  ))}
                </select>
              </label>
              {error && (
                <p className="hp-error" role="alert">
                  <Info size={14} />
                  {error}
                </p>
              )}
              <button className="hp-primary" type="submit">
                <Search size={17} />
                호텔 검색
              </button>
            </form>
            <div className="hp-learning-note">
              <ShieldCheck size={20} />
              <p>
                <b>내 정보 없이 먼저 연습해요.</b>
                <span>
                  실제 숙소 조회나 결제 없이 예약 순서를 익힐 수 있어요.
                </span>
              </p>
            </div>
          </>
        )}

        {screen === "results" && (
          <>
            <button
              className="hp-search-summary"
              onClick={() => setScreen("search")}
            >
              <span>
                <b>상하이 · 上海</b>
                <small>
                  {shortDate(arrival)} — {shortDate(departure)} · {nights}박 ·
                  성인 {guests}명
                </small>
              </span>
              <Search size={17} />
            </button>
            <div className="hp-result-heading">
              <h3>
                상하이 숙소 <span>2곳</span>
              </h3>
              <span>연습용 추천순</span>
            </div>
            <p className="hp-example-note">
              숙소·평점·요금은 모두 연습용 설정이에요.
            </p>
            {properties.map((item) => (
              <article className="hp-property" key={item.id}>
                <Photo hotel={item} />
                <div className="hp-property-content">
                  <span className="hp-star-row" aria-label="연습용 4성급">
                    ★★★★
                  </span>
                  <h4>{item.name}</h4>
                  <p className="hp-property-location">
                    <MapPin size={11} />
                    {item.district}
                  </p>
                  <div className="hp-rating">
                    <b>{item.rating}</b>
                    <span>
                      매우 좋음 <small>연습 평점</small>
                    </span>
                  </div>
                  <span className="hp-eligibility">
                    <Check size={11} />
                    외국인 투숙 가능 · 연습 설정
                  </span>
                  <div className="hp-property-bottom">
                    <span>
                      <small>환불 불가 요금 / 1박부터</small>
                      <strong>{money(item.price - 40)}</strong>
                    </span>
                    <button
                      className="hp-small-primary"
                      onClick={() => selectProperty(item)}
                    >
                      객실 보기
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </>
        )}

        {screen === "detail" && (
          <>
            <Photo hotel={hotel} className="hp-detail-photo" />
            <div className="hp-section">
              <span className="hp-star-row">★★★★ · 가상 호텔</span>
              <h3>{hotel.name}</h3>
              <p className="hp-chinese">{hotel.chinese}</p>
              <p className="hp-property-location">
                <MapPin size={12} />
                {hotel.district}
              </p>
              <p className="hp-description">{hotel.description}</p>
              <div className="hp-detail-badges">
                <span>
                  <Check size={11} />
                  외국인 투숙 가능 (연습)
                </span>
                <span>Wi-Fi 포함 (연습)</span>
              </div>
            </div>
            <div className="hp-stay-summary">
              <CalendarDays size={15} />
              <span>
                {shortDate(arrival)} — {shortDate(departure)}
                <small>
                  {nights}박 · 객실 1개 · 성인 {guests}명
                </small>
              </span>
              <button
                onClick={() => setScreen("search")}
                aria-label="날짜와 인원 수정"
              >
                수정
              </button>
            </div>
            <fieldset className="hp-section hp-room-choices">
              <legend>객실 선택</legend>
              {(["double", "family"] as RoomId[]).map((id) => {
                const max = id === "double" ? 2 : 4,
                  fits = guests <= max;
                return (
                  <label
                    key={id}
                    className={`hp-room-option ${room === id ? "selected" : ""} ${!fits ? "unavailable" : ""}`}
                  >
                    <input
                      type="radio"
                      name="hotel-room"
                      value={id}
                      checked={room === id}
                      disabled={!fits}
                      onChange={() => {
                        setRoom(id);
                        setError("");
                      }}
                    />
                    <span className="hp-room-icon">
                      <BedDouble size={22} />
                    </span>
                    <span>
                      <b>{roomNames[id]}</b>
                      <small>
                        {id === "double"
                          ? "더블 침대 1개 · 24m²"
                          : "더블 침대 2개 · 36m²"}
                      </small>
                      <small>
                        {fits
                          ? `최대 ${max}명 투숙`
                          : `최대 ${max}명 · 현재 인원 초과`}
                      </small>
                    </span>
                    <strong>
                      {money(
                        hotel.price + (id === "family" ? hotel.familyExtra : 0),
                      )}
                      <small>/ 1박</small>
                    </strong>
                  </label>
                );
              })}
            </fieldset>
            <fieldset className="hp-section hp-policy-choices">
              <legend>예약 조건 선택</legend>
              <label
                className={`hp-policy-option ${policy === "flexible" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="hotel-policy"
                  checked={policy === "flexible"}
                  onChange={() => setPolicy("flexible")}
                />
                <span>
                  <b>무료 취소 요금</b>
                  <small>{previousDate(arrival)} 18:00까지 무료 취소</small>
                </span>
                <CheckCircle2 size={17} />
              </label>
              <label
                className={`hp-policy-option ${policy === "nonrefundable" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="hotel-policy"
                  checked={policy === "nonrefundable"}
                  onChange={() => setPolicy("nonrefundable")}
                />
                <span>
                  <b>
                    환불 불가 요금 <em>1박당 ¥ 40 절약</em>
                  </b>
                  <small>확정 후 변경·취소 시 환불 불가</small>
                </span>
              </label>
              <p className="hp-policy-note">
                <Info size={12} />
                취소 시점과 환불 가능 여부를 읽고 선택해요. 모두 연습
                조건입니다.
              </p>
            </fieldset>
            {error && (
              <p className="hp-error" role="alert">
                <Info size={14} />
                {error}
              </p>
            )}
            <div className="hp-action-bar">
              <div>
                <span>{nights}박 총액 · 세금 포함</span>
                <strong>{money(total)}</strong>
              </div>
              <button className="hp-small-primary" onClick={review}>
                예약 정보 확인
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {screen === "review" && (
          <>
            <div className="hp-page-title">
              <span className="hp-step-label">마지막 확인</span>
              <h3>예약 내용을 확인해 주세요.</h3>
              <p>날짜와 취소 조건을 한 번 더 살펴봐요.</p>
            </div>
            <div className="hp-review-property">
              <Photo hotel={hotel} />
              <div>
                <b>{hotel.name}</b>
                <span>{hotel.chinese}</span>
                <small>{roomNames[room]}</small>
              </div>
            </div>
            <dl className="hp-booking-details">
              <div>
                <dt>체크인</dt>
                <dd>
                  {shortDate(arrival)} <small>15:00 이후 · 연습</small>
                </dd>
              </div>
              <div>
                <dt>체크아웃</dt>
                <dd>
                  {shortDate(departure)} <small>12:00 이전 · 연습</small>
                </dd>
              </div>
              <div>
                <dt>숙박 / 인원</dt>
                <dd>
                  {nights}박 · 객실 1개 · 성인 {guests}명
                </dd>
              </div>
              <div>
                <dt>객실</dt>
                <dd>{roomNames[room]}</dd>
              </div>
            </dl>
            <section className="hp-section hp-traveler">
              <h4>투숙객 정보</h4>
              <label>
                <span>영문 이름 · 고정된 가상 여행자</span>
                <input
                  value="KIM GILDONG"
                  readOnly
                  aria-label="연습용 고정 투숙객 이름"
                />
              </label>
              <p>
                <ShieldCheck size={12} />
                실제 이름·여권번호·연락처를 입력하지 않아요.
              </p>
            </section>
            <section className="hp-section hp-review-policy">
              <h4>취소 조건</h4>
              <b
                className={policy === "flexible" ? "flexible" : "nonrefundable"}
              >
                {policy === "flexible" ? "무료 취소 가능" : "환불 불가"}
              </b>
              <p>{cancellation}</p>
              <small>선택한 연습 요금에 적용되는 가상 조건</small>
            </section>
            <section className="hp-section hp-price-breakdown">
              <h4>요금 상세</h4>
              <div>
                <span>
                  객실 {money(nightly)} × {nights}박
                </span>
                <b>{money(total)}</b>
              </div>
              <div>
                <span>세금 및 수수료</span>
                <span>포함 · 추가 ¥ 0</span>
              </div>
              <div className="hp-total">
                <b>총 결제 금액 (연습)</b>
                <strong>{money(total)}</strong>
              </div>
              <small>통화 CNY · 실제 결제가 발생하지 않습니다.</small>
            </section>
            <label className="hp-agreement">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  setError("");
                }}
              />
              <span>
                날짜·객실·인원과{" "}
                <b>
                  {policy === "flexible" ? "무료 취소 기한" : "환불 불가 조건"}
                </b>
                을 확인했어요.
              </span>
            </label>
            {error && (
              <p className="hp-error" role="alert">
                <Info size={14} />
                {error}
              </p>
            )}
            <div className="hp-submit-section">
              <button className="hp-primary" onClick={confirm}>
                <CheckCircle2 size={17} />
                가상 예약 확정
              </button>
              <p>예약 버튼을 눌러도 숙소에 요청하거나 결제하지 않아요.</p>
            </div>
          </>
        )}

        {screen === "confirmation" && receipt && (
          <>
            <div className="hp-confirmation-hero">
              <span>
                <CheckCircle2 size={36} />
              </span>
              <p>BOOKING PRACTICE COMPLETE</p>
              <h3>예약 연습을 마쳤어요!</h3>
              <small>여행 전에 찾을 예약 정보를 확인해 보세요.</small>
            </div>
            <article className="hp-receipt">
              <div className="hp-receipt-number">
                <span>연습 예약번호</span>
                <b>CP-HOTEL-DEMO-001</b>
                <small>실제 예약번호가 아닙니다.</small>
              </div>
              <h4>{receipt.property.name}</h4>
              <p className="hp-chinese">{receipt.property.chinese}</p>
              <p className="hp-receipt-address">
                <MapPin size={12} />
                {receipt.property.address}
              </p>
              <dl className="hp-booking-details">
                <div>
                  <dt>투숙객</dt>
                  <dd>
                    KIM GILDONG <small>가상 여행자</small>
                  </dd>
                </div>
                <div>
                  <dt>체크인</dt>
                  <dd>{shortDate(receipt.arrival)}</dd>
                </div>
                <div>
                  <dt>체크아웃</dt>
                  <dd>{shortDate(receipt.departure)}</dd>
                </div>
                <div>
                  <dt>객실 / 인원</dt>
                  <dd>
                    {roomNames[receipt.room]}
                    <small>
                      {receipt.nights}박 · 객실 1개 · 성인 {receipt.guests}명
                    </small>
                  </dd>
                </div>
                <div>
                  <dt>취소 조건</dt>
                  <dd>
                    {receipt.policy === "flexible"
                      ? `${previousDate(receipt.arrival)} 18:00까지 무료 취소`
                      : "환불 불가"}
                  </dd>
                </div>
                <div className="hp-receipt-total">
                  <dt>연습 총액</dt>
                  <dd>
                    {money(receipt.total)}
                    <small>실제 청구 ¥ 0</small>
                  </dd>
                </div>
              </dl>
              <span className="hp-receipt-stamp">SIMULATION ONLY</span>
            </article>
            <div className="hp-confirmation-tip">
              <Info size={16} />
              <p>
                실제 여행에서는 예약번호, 중문 숙소명·주소, 취소 조건을 저장해
                두면 편리해요.
              </p>
            </div>
            <div className="hp-submit-section">
              <button className="hp-primary" onClick={finish}>
                중톡이와 상황 연습 이어가기
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
      <footer className="hp-footer">
        <ShieldCheck size={11} />
        실제 예약 / 결제 없음<span>숙소 예약 절차 연습</span>
      </footer>
    </section>
  );
}
