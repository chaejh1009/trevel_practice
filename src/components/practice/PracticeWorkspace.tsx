import type { ReactNode } from "react";
import {
  ArrowRight,
  BatteryFull,
  Check,
  ShieldCheck,
  Signal,
  Wifi,
} from "lucide-react";
import JungtokiGuide from "../JungtokiGuide";
import "./PracticeWorkspace.css";

const titles: Record<
  string,
  { title: string; subtitle: string; app: string; steps: string[] }
> = {
  prepare: {
    title: "출발 전 여행 준비",
    subtitle: "여행 준비 앱과 체크인 화면에서 직접 준비해요.",
    app: "TRAVEL WALLET · CHECK-IN",
    steps: ["여행 일정 확인", "준비물·앱 점검", "탑승권 확인"],
  },
  immigration: {
    title: "입국 절차 연습",
    subtitle: "여권 확인부터 입국 카드와 심사대까지 따라가요.",
    app: "ARRIVAL PROCEDURE",
    steps: ["샘플 여권 확인", "입국 카드 작성", "심사 질문·결과 확인"],
  },
  hotel: {
    title: "호텔 예약 앱 연습",
    subtitle: "검색부터 객실 선택, 예약 내역 확인까지 해봐요.",
    app: "HOTEL BOOKING",
    steps: ["숙소 검색", "객실·이용 조건 선택", "예약 내역 확인"],
  },
  didi: {
    title: "디디 호출 앱 연습",
    subtitle: "목적지를 정하고, 승차 위치와 배정 차량을 확인해요.",
    app: "RIDE HAILING",
    steps: [
      "목적지·승차 위치 선택",
      "차종·요금 확인 후 호출",
      "차량 번호 확인",
    ],
  },
};
export default function PracticeWorkspace({
  id,
  guide,
  children,
}: {
  id: string;
  guide: string;
  children: ReactNode;
}) {
  const info = titles[id] || titles.prepare;
  const phone = id === "hotel" || id === "didi";
  return (
    <section
      className={`practice-workspace practice-workspace-${id}`}
      aria-label={info.title}
    >
      <header className="pw-heading">
        <div>
          <span className="pw-eyebrow">LET’S TRY IT TOGETHER</span>
          <h2>{info.title}</h2>
          <p id="practice-description">{info.subtitle}</p>
        </div>
        <span className="pw-training-badge">
          <ShieldCheck size={13} />
          연습 모드
        </span>
      </header>
      <div className="pw-body">
        <aside className="pw-guide">
          <div className="pw-guide-hero">
            <JungtokiGuide />
            <span className="pw-guide-spark">✦</span>
          </div>
          <div className="pw-guide-name">
            <b>중톡이</b>
            <span>함께 해봐요</span>
          </div>
          <div className="pw-guide-bubble" role="status" aria-live="polite">
            {guide}
          </div>
          <div className="pw-guide-route">
            <span>이번에 해볼 과정</span>
            {info.steps.map((step, index) => (
              <div key={step}>
                <i>{index + 1}</i>
                {step}
                {index === info.steps.length - 1 ? (
                  <Check size={12} />
                ) : (
                  <ArrowRight size={12} />
                )}
              </div>
            ))}
          </div>
          <p className="pw-guide-note">
            화면 안의 버튼을 눌러 진행해요.
            <br />
            완료하면 대화와 상황 연습으로 돌아가요.
          </p>
        </aside>
        <div className="pw-desk">
          <div className="pw-device-caption">
            <span>{info.app}</span>
            <i />
            PRACTICE SIMULATOR
          </div>
          <div
            className={`pw-device ${phone ? "pw-device-phone" : "pw-device-procedure"}`}
          >
            {phone ? (
              <div className="pw-device-status" aria-hidden="true">
                <b>9:41</b>
                <span className="pw-device-camera" />
                <span>
                  <Signal size={12} />
                  <Wifi size={12} />
                  <BatteryFull size={16} />
                </span>
              </div>
            ) : (
              <div className="pw-procedure-chrome">
                <span />
                <span />
                <span />
                <b>
                  {id === "immigration"
                    ? "입국 절차 연습 단말"
                    : "여행 준비 센터"}
                </b>
                <small>TRAINING</small>
              </div>
            )}
            <div className="pw-device-screen">{children}</div>
            {phone && (
              <div className="pw-home-indicator" aria-hidden="true">
                <span />
              </div>
            )}
          </div>
          <p className="pw-rehearsal-note">
            <ShieldCheck size={13} />
            가상 정보로 연습하며 실제 예약·결제·신청은 발생하지 않아요.
          </p>
        </div>
      </div>
    </section>
  );
}
