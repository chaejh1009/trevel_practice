import {
  ArrowRight,
  CarFront,
  Check,
  ChevronRight,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  getTaxiVehicle,
  TAXI_VEHICLES,
  type TaxiRideSession,
} from "../lib/taxiRide";
import JungtokiGuide from "./JungtokiGuide";
import "./TaxiRidePanel.css";

export interface TaxiRidePanelProps {
  ride: TaxiRideSession;
  nearVehicleId: string | null;
  onApproach: (vehicleId: string) => void;
  onBoard: () => void;
  onCancel: () => void;
}

export default function TaxiRidePanel({
  ride,
  nearVehicleId,
  onApproach,
  onBoard,
  onCancel,
}: TaxiRidePanelProps) {
  const assigned = getTaxiVehicle(ride.request.assignedVehicleId);
  const selected = ride.selectedVehicleId
    ? getTaxiVehicle(ride.selectedVehicleId)
    : null;
  const waiting = ride.phase === "waiting";
  const canBoard =
    waiting && Boolean(selected && selected.id === nearVehicleId);
  const underway = ride.phase === "boarding" || ride.phase === "departing";
  const phaseText =
    ride.phase === "arriving"
      ? "차량이 승차장에 들어오고 있어요"
      : ride.phase === "boarding"
        ? "문이 열렸어요. 탑승하는 중이에요"
        : ride.phase === "departing"
          ? "목적지를 향해 출발해요"
          : "배정된 차량을 직접 찾아보세요";
  function board() {
    if (canBoard) onBoard();
  }
  return (
    <section
      className={`taxi-ride-panel taxi-ride-panel-${ride.phase}`}
      aria-label="배정 차량과 필드 탑승 확인"
      onKeyDown={(event) => {
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key.startsWith("Arrow")
        )
          event.stopPropagation();
      }}
    >
      <header className="trp-heading">
        <span className="trp-car-icon">
          <CarFront size={19} />
        </span>
        <div>
          <span>YOUR RIDE IS HERE</span>
          <h3>내 차를 찾아요</h3>
        </div>
        {!underway && (
          <button
            className="trp-cancel"
            onClick={onCancel}
            aria-label="차량 호출 연습 취소"
          >
            <X size={16} />
          </button>
        )}
      </header>
      <div className="trp-assignment">
        <div>
          <span>앱에 배정된 차량 번호</span>
          <strong>{assigned?.plate || "확인 중"}</strong>
        </div>
        <span className="trp-training">연습 차량</span>
        <p>
          <MapPin size={12} />
          {ride.request.destinationName}
        </p>
        <small>
          {ride.request.vehicle === "taxi"
            ? "Taxi · 택시"
            : "Express · 일반 차량"}
          <i />
          연습 견적 ¥{ride.request.fare.toLocaleString("ko-KR")}
        </small>
      </div>
      <div className="trp-phase" role="status" aria-live="polite">
        <span className={`trp-phase-dot ${underway ? "complete" : ""}`}>
          {underway ? <Check size={10} /> : null}
        </span>
        <p>{phaseText}</p>
      </div>
      {!underway && (
        <>
          <p className="trp-instruction">
            모두 같은 색의 차예요. <b>번호판을 보고</b> 다가가세요.
          </p>
          <div className="trp-vehicle-list" aria-label="승차장의 차량 목록">
            {TAXI_VEHICLES.map((vehicle) => (
              <button
                key={vehicle.id}
                className={selected?.id === vehicle.id ? "selected" : ""}
                disabled={!waiting}
                aria-pressed={selected?.id === vehicle.id}
                onClick={() => {
                  if (waiting) onApproach(vehicle.id);
                }}
                aria-label={`${vehicle.plate} 차량으로 다가가기`}
              >
                <CarFront size={16} />
                <b>{vehicle.plate}</b>
                <span>
                  {nearVehicleId === vehicle.id
                    ? "가까이에 있어요"
                    : "다가가기"}
                  <ChevronRight size={12} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {ride.error && !underway && (
        <div className="trp-dialogue-error" role="alert">
          <JungtokiGuide />
          <div>
            <span>중톡이</span>
            <p>{ride.error}</p>
            <small>앱의 배정 번호와 다시 대조해 보세요.</small>
          </div>
        </div>
      )}
      {waiting && (
        <div className="trp-boarding">
          <div className="trp-selected">
            <span>지금 확인하는 차량</span>
            <b>{selected?.plate || "차량을 선택해 주세요"}</b>
            {selected && !canBoard && (
              <small>차 문 근처까지 걸어가면 탑승할 수 있어요.</small>
            )}
            {canBoard && (
              <small>
                <ShieldCheck size={11} /> 번호를 확인한 뒤 탑승 버튼을 눌러요.
              </small>
            )}
          </div>
          <button className="trp-board" disabled={!canBoard} onClick={board}>
            이 차량에 탑승하기
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      {underway && (
        <div className="trp-departure">
          <JungtokiGuide />
          <p>
            {ride.phase === "boarding"
              ? "차량 번호를 꼼꼼히 확인했네요!"
              : "다음 여행도 중톡이와 함께해요."}
            <small>
              {ride.phase === "boarding"
                ? "안전하게 탑승한 뒤 출발할게요."
                : "곧 다음 장소로 이동해요."}
            </small>
          </p>
        </div>
      )}
      <footer className="trp-footer">
        <ShieldCheck size={11} />
        <span>필드 안의 연습 차량이며 실제 호출·결제가 아니에요.</span>
      </footer>
    </section>
  );
}
