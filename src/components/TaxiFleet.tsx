import type { KeyboardEvent, MouseEvent } from "react";
import { TAXI_VEHICLES, type TaxiRideSession } from "../lib/taxiRide";
import "./TaxiFleet.css";

export interface TaxiFleetProps {
  ride: TaxiRideSession;
  onSelect: (vehicleId: string) => void;
  nearVehicleId: string | null;
  disabled?: boolean;
}

/** SVG children for the shared 1000 × 620 field. Every taxi has the same body color. */
export default function TaxiFleet({
  ride,
  onSelect,
  nearVehicleId,
  disabled = false,
}: TaxiFleetProps) {
  const selectable = ride.phase === "waiting" && !disabled;
  const taxi = ride.request.vehicle === "taxi";
  const vehicleLabel = taxi ? "노란색 택시" : "흰색 세단";
  const paint = taxi
    ? {
        body: "#e3ba65",
        top: "#f9dc89",
        side: "#cfa65d",
        front: "#eac66e",
        highlight: "#fbe6a7",
        cabin: "#f1d283",
        roof: "#ffebac",
        door: "#f0d188",
      }
    : {
        body: "#e6e7dc",
        top: "#fffdf1",
        side: "#ccd9cd",
        front: "#e1e5d8",
        highlight: "#f8faee",
        cabin: "#e7ece1",
        roof: "#fffdf0",
        door: "#e9ecdf",
      };
  function select(
    event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>,
    vehicleId: string,
  ) {
    event.stopPropagation();
    if (!selectable || ("repeat" in event && event.repeat)) return;
    onSelect(vehicleId);
  }
  return (
    <g
      className="taxi-fleet"
      data-phase={ride.phase}
      data-vehicle-type={ride.request.vehicle}
      aria-label={`승차장에 도착한 ${vehicleLabel} 연습 차량 세 대`}
    >
      {[...TAXI_VEHICLES]
        .sort((a, b) => a.position.y - b.position.y)
        .map((vehicle) => {
          const near = nearVehicleId === vehicle.id;
          const selected = ride.selectedVehicleId === vehicle.id;
          const boarded =
            (ride.phase === "boarding" || ride.phase === "departing") &&
            ride.request.assignedVehicleId === vehicle.id;
          const entering = ride.phase === "arriving";
          const leaving = ride.phase === "departing" && boarded;
          return (
            <g
              key={vehicle.id}
              transform={`translate(${vehicle.position.x * 10} ${vehicle.position.y * 6.2})`}
            >
              <g
                className={`taxi-fleet-motion ${entering ? "taxi-fleet-entering" : ""} ${leaving ? "taxi-fleet-leaving" : ""}`}
                style={
                  entering
                    ? { animationDelay: `${vehicle.arrivalDelay}ms` }
                    : undefined
                }
              >
                <g
                  className={`taxi-fleet-vehicle ${near ? "taxi-fleet-near" : ""} ${selected ? "taxi-fleet-selected" : ""} ${boarded ? "taxi-fleet-boarded" : ""}`}
                  data-body-color={paint.body}
                  role="button"
                  tabIndex={selectable ? 0 : -1}
                  aria-disabled={!selectable}
                  aria-pressed={selected}
                  aria-label={`${vehicleLabel} 연습 차량 ${vehicle.plate}${near ? ", 가까이에 있어요" : ""}. 다가가서 번호 확인하기`}
                  onClick={(event) => select(event, vehicle.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      select(event, vehicle.id);
                    }
                  }}
                >
                  <title>{`${vehicle.plate} · ${vehicleLabel} 연습 차량`}</title>
                  <ellipse
                    className="taxi-fleet-ground"
                    cx="0"
                    cy="15"
                    rx="69"
                    ry="23"
                    fill="#6c827326"
                  />
                  <ellipse
                    className="taxi-fleet-focus"
                    cx="0"
                    cy="13"
                    rx="74"
                    ry="30"
                    fill="none"
                    stroke="#cc9b64"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  />
                  <path
                    className="taxi-fleet-body"
                    d="M-59-19l27-15L61 12v19L34 47-59 0Z"
                    fill={paint.body}
                    stroke="#a0afa1"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path d="M-59-19L34 28l27-16-93-46Z" fill={paint.top} />
                  <path d="M34 28v19L61 31V12Z" fill={paint.side} />
                  <path d="M-59-19L34 28v19L-59 0Z" fill={paint.front} />
                  <path
                    d="M-59-13L34 34"
                    stroke={paint.highlight}
                    strokeWidth="2"
                  />
                  <path
                    d="M-32-32l19-25 51 26 8 25L22 8Z"
                    fill={paint.cabin}
                    stroke="#a0afa1"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path d="M-13-57l51 26-7 9-51-26Z" fill={paint.roof} />
                  <path d="M-28-31l15-20 8 5-8 20Z" fill="#86aaa4" />
                  <path d="M-9-48l39 20 8 16-52-27Z" fill="#b3d1c9" />
                  <path
                    d="M-3-43l29 15 3 5-34-18Z"
                    fill="#e7f1df"
                    opacity=".85"
                  />
                  <path d="M-13-24l35 18 14-8-41-21Z" fill="#7d9f99" />
                  <path
                    d="M-29-28l2 20m15-13 4 20m23-8 4 20"
                    stroke="#a6b9aa"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M-22-5l7 4m32 17 6 3"
                    stroke="#9eafa0"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <g transform="translate(41 -17)">
                    <g
                      className={`taxi-fleet-door ${ride.phase === "boarding" && boarded ? "taxi-fleet-door-open" : ""}`}
                    >
                      <path
                        d="M0 0l-27-14v28L0 28Z"
                        fill={paint.door}
                        stroke="#9cad9e"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                      <path d="M-3 1l-21-11V1l21 11Z" fill="#9cbbb3" />
                      <path d="M-21-7l14 7v3l-14-7Z" fill="#dbeadb" />
                      <path
                        d="M-10 17l5 2"
                        stroke="#92a694"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </g>
                  </g>
                  <path
                    d="M-51-12l10 5v7l-10-5Z"
                    fill="#fbefbf"
                    stroke="#d7d7be"
                    strokeWidth=".7"
                  />
                  <path d="M50 18l8-5v7l-8 5Z" fill="#f9efbc" />
                  <path d="M36 38l10-6v6l-10 6Z" fill="#a3b9b5" />
                  <ellipse
                    cx="-36"
                    cy="9"
                    rx="9"
                    ry="12"
                    fill="#4d655a"
                    transform="rotate(-23 -36 9)"
                  />
                  <ellipse
                    cx="-36"
                    cy="9"
                    rx="4.5"
                    ry="7"
                    fill="#cad5c4"
                    transform="rotate(-23 -36 9)"
                  />
                  <ellipse
                    cx="35"
                    cy="37"
                    rx="9"
                    ry="12"
                    fill="#4d655a"
                    transform="rotate(-23 35 37)"
                  />
                  <ellipse
                    cx="35"
                    cy="37"
                    rx="4.5"
                    ry="7"
                    fill="#cad5c4"
                    transform="rotate(-23 35 37)"
                  />
                  {taxi && (
                    <g className="taxi-fleet-roof-sign">
                      <path
                        d="M-3-57l11-6 14 7-11 6Z"
                        fill="#f7c386"
                        stroke="#c6a476"
                        strokeWidth=".7"
                      />
                      <path d="M-3-57l14 7v6l-14-7Z" fill="#dfa86b" />
                    </g>
                  )}
                  <path d="M-5 13l9 4" stroke="#f9fbef" strokeWidth="2" />
                  <g
                    className="taxi-fleet-door-hint"
                    transform="translate(28 -17)"
                    aria-hidden="true"
                  >
                    <ellipse
                      rx="17"
                      ry="9"
                      fill="#eecf9e66"
                      stroke="#dbb57d"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <path
                      d="M-3 0H4m-3-3 3 3-3 3"
                      fill="none"
                      stroke="#ad8754"
                      strokeWidth="1.2"
                    />
                  </g>
                  <g className="taxi-fleet-label" transform="translate(0 -91)">
                    <path d="M-5 30l5 7 5-7" fill="#fffdf4" />
                    <rect
                      x="-65"
                      width="130"
                      height="31"
                      rx="8"
                      fill="#fffdf4"
                      stroke="#c5d3bd"
                      strokeWidth="1.3"
                    />
                    <rect
                      x="-57"
                      y="7"
                      width="16"
                      height="17"
                      rx="3"
                      fill="#e5ede0"
                    />
                    <text
                      x="-49"
                      y="19"
                      textAnchor="middle"
                      fontSize="9"
                      fill="#729366"
                      fontWeight="700"
                    >
                      车
                    </text>
                    <text
                      x="8"
                      y="21"
                      textAnchor="middle"
                      fontSize="16"
                      letterSpacing=".7"
                      fill="#58764d"
                      fontWeight="650"
                    >
                      {vehicle.plate}
                    </text>
                  </g>
                </g>
              </g>
            </g>
          );
        })}
    </g>
  );
}
