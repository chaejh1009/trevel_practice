import { Plane, BookUser, Hotel, CarFront } from "lucide-react";
import type { FieldId } from "./navigation";
export interface FieldDefinition {
  name: string;
  label: string;
  eyebrow: string;
  description: string;
  icon: typeof Plane;
  color: string;
  duration: string;
  place: string;
  npc: string;
  instruction: string;
  steps: string[];
}
export const fields: Record<FieldId, FieldDefinition> = {
  prepare: {
    name: "설레는 출발 준비",
    label: "여행 준비 필드",
    eyebrow: "BEFORE YOU GO",
    description: "여권부터 결제 앱까지, 빠짐없이 챙겨요.",
    icon: Plane,
    color: "peach",
    duration: "약 3분",
    place: "한국 · 나의 여행 준비실",
    npc: "여행 준비 테이블",
    instruction: "준비실을 둘러보고 여행 준비 테이블에서 출발 준비를 시작해요.",
    steps: [
      "출발·귀국 일정 정하기",
      "준비물 체크리스트 채우기",
      "출발 전 상황 연습하기",
    ],
  },
  immigration: {
    name: "니하오! 중국 입국",
    label: "입국심사 필드",
    eyebrow: "HELLO, CHINA",
    description: "낯선 입국심사도 미리 해보면 쉬워요.",
    icon: BookUser,
    color: "mint",
    duration: "약 4분",
    place: "중국 · 푸둥 공항 입국심사장",
    npc: "입국심사관",
    instruction:
      "공항 입국심사장을 둘러보고 심사관에게 말을 걸어 입국 절차를 연습해요.",
    steps: ["입국심사관 만나기", "방문 목적 답변하기", "심사 상황 연습하기"],
  },
  hotel: {
    name: "내 방을 부탁해",
    label: "호텔 필드",
    eyebrow: "MAKE YOURSELF AT HOME",
    description: "호텔 예약부터 체크인까지 연습해요.",
    icon: Hotel,
    color: "lavender",
    duration: "약 3분",
    place: "상하이 · 와이탄 호텔 로비",
    npc: "호텔 프런트",
    instruction:
      "호텔 로비를 둘러보고 프런트에서 가상 예약과 체크인을 연습해요.",
    steps: [
      "숙소·날짜·인원 선택하기",
      "취소 조건 확인하고 가상 예약하기",
      "체크인 상황 연습하기",
    ],
  },
  didi: {
    name: "디디 타고 도시 한 바퀴",
    label: "디디 필드",
    eyebrow: "LET’S GET MOVING",
    description: "목적지를 설정하고, 내 차를 찾아요.",
    icon: CarFront,
    color: "yellow",
    duration: "약 3분",
    place: "상하이 · 공항 차량 승차장",
    npc: "디디 호출 안내대",
    instruction: "승차장을 둘러보고 호출 안내대에서 목적지와 차종을 선택해요.",
    steps: [
      "승차 위치와 목적지 확인하기",
      "차종 선택하고 가상 호출하기",
      "탑승 전 확인 사항 연습하기",
    ],
  },
};
