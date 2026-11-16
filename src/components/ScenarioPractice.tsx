import { useState } from "react";
import type { ComponentType } from "react";
import type { PracticeProps } from "./practice/types";
import PracticeWorkspace from "./practice/PracticeWorkspace";
import PreparePractice from "./practice/PreparePractice";
import ImmigrationPractice from "./practice/ImmigrationPractice";
import HotelPractice from "./practice/HotelPractice";
import DidiPractice from "./practice/DidiPractice";

const applications: Record<string, ComponentType<PracticeProps>> = {
  prepare: PreparePractice,
  immigration: ImmigrationPractice,
  hotel: HotelPractice,
  didi: DidiPractice,
};
const hints: Record<string, string> = {
  prepare:
    "먼저 여행 일정과 항공편을 골라봐요. 여행 지갑을 점검하고 연습 탑승권까지 확인해 볼 거예요.",
  immigration:
    "샘플 여권을 확인한 뒤 입국 카드를 작성해요. 예시 일정에 맞춰 심사 질문에도 답해봐요.",
  hotel:
    "도시와 날짜, 인원을 확인해 숙소를 찾아봐요. 객실 조건을 선택하고 예약 내역까지 살펴볼게요.",
  didi: "목적지를 검색하고 승차 위치를 확인해요. 차량 호출 뒤에는 배정된 번호를 직접 대조해봐요.",
};
export default function ScenarioPractice({
  id,
  onFinish,
  track,
  onRideRequested,
}: PracticeProps & { id: string }) {
  const [guide, setGuide] = useState(
    hints[id] || "화면의 안내에 따라 연습해봐요.",
  );
  const Application = applications[id];
  if (!Application)
    return (
      <div role="alert">
        아직 준비되지 않은 체험이에요. 필드로 돌아가 다시 선택해 주세요.
      </div>
    );
  return (
    <div data-practice-scenario={id}>
      <PracticeWorkspace id={id} guide={guide}>
        <Application
          onFinish={onFinish}
          track={track}
          onGuide={setGuide}
          onRideRequested={onRideRequested}
        />
      </PracticeWorkspace>
    </div>
  );
}
