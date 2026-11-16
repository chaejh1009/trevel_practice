/** Client-side rules for fictional training exercises. No personal identity data is accepted. */
export function localDateAfter(days: number, from = new Date()): string {
  const date = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate() + days,
  );
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function calendarDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31)
    return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date.getTime() / 86_400_000
    : null;
}
export function tripDateErrors(
  departure: string,
  returnDate: string,
  today = localDateAfter(0),
): string[] {
  const start = calendarDay(departure),
    end = calendarDay(returnDate),
    minimum = calendarDay(today);
  if (start === null || end === null || minimum === null)
    return ["출발일과 귀국일을 올바른 날짜로 선택해 주세요."];
  if (start < minimum) return ["출발일은 오늘 이후로 선택해 주세요."];
  if (end <= start) return ["귀국일은 출발일 다음 날 이후로 선택해 주세요."];
  return [];
}
export const TRAINING_FLIGHTS = [
  {
    id: "MU5052",
    departure: "14:00",
    arrival: "15:20",
    gate: "DEMO 12",
    seat: "18A",
  },
  {
    id: "MU5034",
    departure: "19:00",
    arrival: "20:20",
    gate: "DEMO 08",
    seat: "22F",
  },
] as const;
export interface TrainingItinerary {
  departure: string;
  returnDate: string;
  flightId: string;
}
export interface WalletReadiness {
  documents: boolean;
  connection: boolean;
  payment: boolean;
}
export function canIssueBoardingPass(
  itinerary: TrainingItinerary,
  wallet: WalletReadiness,
  today?: string,
) {
  return (
    tripDateErrors(itinerary.departure, itinerary.returnDate, today).length ===
      0 &&
    TRAINING_FLIGHTS.some((flight) => flight.id === itinerary.flightId) &&
    wallet.documents &&
    wallet.connection &&
    wallet.payment
  );
}
export function canFinishPreparation(
  itinerary: TrainingItinerary,
  wallet: WalletReadiness,
  boardingConfirmed: boolean,
  today?: string,
) {
  return boardingConfirmed && canIssueBoardingPass(itinerary, wallet, today);
}
export const ARRIVAL_HOTELS = [
  {
    id: "bund",
    name: "와이탄 가든 호텔",
    english: "THE BUND GARDEN HOTEL",
    address: "DEMO ADDRESS A, HUANGPU, SHANGHAI",
  },
  {
    id: "pudong",
    name: "푸둥 리버 스테이",
    english: "PUDONG RIVER STAY",
    address: "DEMO ADDRESS B, PUDONG, SHANGHAI",
  },
] as const;
export const ARRIVAL_REFERENCE = {
  nationality: "KOREA",
  flightId: "MU5052",
  purpose: "tourism",
  hotelId: "bund",
} as const;
export interface ArrivalDraft {
  nationality: string;
  flightId: string;
  purpose: string;
  hotelId: string;
}
export interface ArrivalAnswers {
  purpose: string;
  hotelId: string;
}
export function arrivalDraftErrors(draft: ArrivalDraft): string[] {
  const errors: string[] = [];
  if (draft.nationality !== ARRIVAL_REFERENCE.nationality)
    errors.push("예시 여권의 국적 KOREA와 일치해야 해요.");
  if (draft.flightId !== ARRIVAL_REFERENCE.flightId)
    errors.push("예시 항공편 MU5052를 선택해 주세요.");
  if (draft.purpose !== ARRIVAL_REFERENCE.purpose)
    errors.push("이 연습 일정의 방문 목적은 관광 TOURISM이에요.");
  if (draft.hotelId !== ARRIVAL_REFERENCE.hotelId)
    errors.push("예시 예약 내역에 있는 와이탄 가든 호텔을 선택해 주세요.");
  return errors;
}
export function interviewMatchesArrival(
  draft: ArrivalDraft,
  answers: ArrivalAnswers,
): boolean {
  return (
    arrivalDraftErrors(draft).length === 0 &&
    answers.purpose === draft.purpose &&
    answers.hotelId === draft.hotelId
  );
}
export function canFinishArrival(state: {
  scanned: boolean;
  reviewed: boolean;
  stamped: boolean;
  draft: ArrivalDraft;
  answers: ArrivalAnswers;
}): boolean {
  return (
    state.scanned &&
    state.reviewed &&
    state.stamped &&
    interviewMatchesArrival(state.draft, state.answers)
  );
}

export interface HotelQuoteInput {
  arrival: string;
  departure: string;
  guests: number;
  room: "double" | "family";
  policy: "flexible" | "nonrefundable";
  baseRate: number;
  familyExtra: number;
}
/** Quote the exact selection shown in the booking review, not the search card's lowest rate. */
export function hotelPracticeQuote(
  input: HotelQuoteInput,
  today = localDateAfter(0),
) {
  const dateErrors = tripDateErrors(input.arrival, input.departure, today);
  const start = calendarDay(input.arrival),
    end = calendarDay(input.departure);
  const nights = start !== null && end !== null ? end - start : 0;
  const capacity = input.room === "family" ? 4 : 2;
  const guestError =
    !Number.isInteger(input.guests) ||
    input.guests < 1 ||
    input.guests > capacity;
  const nightly =
    input.baseRate +
    (input.room === "family" ? input.familyExtra : 0) -
    (input.policy === "nonrefundable" ? 40 : 0);
  const validRate = Number.isFinite(nightly) && nightly > 0;
  return {
    nights,
    capacity,
    nightly,
    dateErrors,
    guestError,
    valid: dateErrors.length === 0 && !guestError && validRate,
    total: dateErrors.length === 0 && validRate ? nightly * nights : 0,
  };
}
