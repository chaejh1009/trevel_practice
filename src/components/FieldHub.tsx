import { ArrowRight, Check, MapPin, Sparkles } from "lucide-react";
import { fields } from "../lib/fields";
import { FIELD_IDS, routeHash } from "../lib/navigation";
import type { FieldId } from "../lib/navigation";
import "./FieldHub.css";
import JungtokiGuide from "./JungtokiGuide";

function FieldPreview({ id }: { id: FieldId }) {
  return (
    <svg
      viewBox="0 0 480 220"
      className={`field-preview field-preview-${id}`}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`tiles-${id}`}
          width="36"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M36 0H0V22"
            fill="none"
            stroke="currentColor"
            opacity=".07"
          />
        </pattern>
      </defs>
      <rect width="480" height="220" fill="currentColor" opacity=".05" />
      <ellipse
        cx="250"
        cy="181"
        rx="165"
        ry="19"
        fill="currentColor"
        opacity=".07"
      />
      {id === "prepare" ? (
        <>
          <path d="M66 151V48h272v103" fill="#f4eadc" />
          <path d="M338 48l78 40v102l-78-39z" fill="#e9d9c1" />
          <rect
            x="90"
            y="68"
            width="72"
            height="61"
            rx="3"
            fill="#b8d6d1"
            stroke="#fff8ec"
            strokeWidth="7"
          />
          <path d="M126 68v61M90 98h72" stroke="#fff8ec" strokeWidth="4" />
          <rect x="208" y="67" width="72" height="42" rx="2" fill="#e0c598" />
          <path
            d="M220 79h44m-44 9h31m-31 9h37"
            stroke="#fff4d9"
            strokeWidth="3"
          />
          <path d="M161 137l112-20 71 29-113 26z" fill="#cba77b" />
          <path d="M161 137v16l70 32v-13z" fill="#b98f66" />
          <path
            d="M231 172v25m98-48v30m-154-20v25"
            stroke="#ac8c6c"
            strokeWidth="7"
          />
          <path d="M216 137l25-4 12 6-24 5z" fill="#3f826b" />
          <path d="M262 136l22-4 17 7-22 5z" fill="#fff8e9" />
          <path d="M270 136h17" stroke="#c5b48c" />
          <rect x="102" y="144" width="34" height="44" rx="7" fill="#d89472" />
          <path
            d="M111 145v-10h16v10"
            fill="none"
            stroke="#ac7f64"
            strokeWidth="4"
          />
          <path d="M111 154v24m15-24v24" stroke="#efbf9a" strokeWidth="3" />
          <path d="M371 147v-36" stroke="#b7a786" strokeWidth="5" />
          <ellipse cx="371" cy="107" rx="17" ry="25" fill="#9eb891" />
          <path d="M355 150h31l-5 30h-21z" fill="#e8c7a0" />
        </>
      ) : id === "immigration" ? (
        <>
          <path d="M57 154V44h366v110" fill="#dae9e3" />
          <rect x="75" y="60" width="330" height="53" fill="#bfdbd5" />
          <path
            d="M130 60v53m66-53v53m66-53v53m66-53v53"
            stroke="#eaf3ed"
            strokeWidth="6"
          />
          <rect x="174" y="28" width="138" height="30" rx="4" fill="#568675" />
          <text
            x="243"
            y="47"
            textAnchor="middle"
            fill="#f7f9e9"
            fontSize="12"
            letterSpacing="2"
          >
            IMMIGRATION
          </text>
          {[125, 246, 367].map((x, i) => (
            <g key={x}>
              <path d={`M${x - 42} 135l52-13 36 17-52 14z`} fill="#e4e4d1" />
              <path d={`M${x - 42} 135v32l36 18v-32z`} fill="#d1dac5" />
              <path d={`M${x - 6} 153l52-14v32l-52 14z`} fill="#b5cbb9" />
              <rect
                x={x - 5}
                y="113"
                width="24"
                height="19"
                rx="2"
                fill="#65968a"
              />
              <circle cx={x + 7} cy="93" r="8" fill="#e7c9a3" />
              <path d={`M${x - 4} 113v-13h22v13`} fill="#668d84" />
              <text
                x={x}
                y="77"
                textAnchor="middle"
                fontSize="10"
                fill="#719687"
              >
                0{i + 1}
              </text>
            </g>
          ))}
          <path
            d="M92 192l81-19m69 26l80-20"
            stroke="#c5a973"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
          {[95, 174, 244, 324].map((x) => (
            <g key={x}>
              <path d={`M${x} 179v20`} stroke="#89a08c" strokeWidth="4" />
              <circle cx={x} cy="179" r="4" fill="#b6cbbb" />
            </g>
          ))}
        </>
      ) : id === "hotel" ? (
        <>
          <path d="M65 155V47h348v108" fill="#e4deeb" />
          <path d="M65 47h348v10H65z" fill="#d3cada" />
          <rect x="201" y="69" width="90" height="42" rx="2" fill="#f3e8d6" />
          <text
            x="246"
            y="86"
            textAnchor="middle"
            fontSize="9"
            fill="#a893aa"
            letterSpacing="2"
          >
            BUND GARDEN
          </text>
          <text x="246" y="101" textAnchor="middle" fontSize="8" fill="#ad9a87">
            HOTEL
          </text>
          <path d="M173 139l126-14 63 25-127 17z" fill="#b6a7bd" />
          <path d="M173 139v34l62 27v-33z" fill="#9f8daa" />
          <path d="M235 167l127-17v34l-127 16z" fill="#c4b7c8" />
          <path d="M244 177l106-14" stroke="#e3d6d9" strokeWidth="3" />
          <path d="M249 132v-13h27v13" fill="#729e95" />
          <circle cx="311" cy="122" r="7" fill="#d9c38d" />
          <path d="M299 129h24" stroke="#d9c38d" strokeWidth="3" />
          {[111, 377].map((x) => (
            <g key={x}>
              <path d={`M${x} 68v-28`} stroke="#ac9aab" strokeWidth="2" />
              <ellipse cx={x} cy="72" rx="19" ry="10" fill="#f5e5bc" />
            </g>
          ))}
          <rect x="90" y="146" width="51" height="23" rx="5" fill="#cbb4bc" />
          <path d="M90 161v13m51-13v13" stroke="#ac959f" strokeWidth="4" />
          <path d="M389 150v-39" stroke="#a49a91" strokeWidth="4" />
          <ellipse cx="389" cy="112" rx="15" ry="24" fill="#a0b39c" />
          <path d="M375 155h29l-5 29h-19z" fill="#b9b0bf" />
        </>
      ) : (
        <>
          <path d="M45 130V51h380v79" fill="#e7e4d3" />
          <rect x="65" y="68" width="340" height="48" fill="#cfdfd3" />
          <path
            d="M125 68v48m65-48v48m65-48v48m65-48v48"
            stroke="#f1f0e1"
            strokeWidth="5"
          />
          <path d="M0 156h480v64H0z" fill="#d5d9cc" />
          <path
            d="M0 190h480"
            stroke="#f9f8df"
            strokeWidth="3"
            strokeDasharray="21 15"
          />
          <path d="M82 151V48h104v5H88v98" fill="#8ca192" />
          <rect x="99" y="34" width="96" height="32" rx="4" fill="#7c997d" />
          <text x="147" y="54" textAnchor="middle" fontSize="12" fill="#fffbe6">
            PICK-UP A
          </text>
          <path d="M212 154l22-25h70l26 25v27H212z" fill="#ead397" />
          <path d="M236 134h28v20h-43zm33 0h29l19 20h-48z" fill="#a6c7be" />
          <rect x="206" y="156" width="130" height="21" rx="9" fill="#e0c180" />
          <circle cx="234" cy="177" r="12" fill="#698278" />
          <circle cx="309" cy="177" r="12" fill="#698278" />
          <rect x="257" y="162" width="33" height="9" rx="2" fill="#fff6d9" />
          <path d="M370 130V86h35v44" fill="#e6d5ac" />
          <rect x="375" y="93" width="25" height="17" fill="#83ac96" />
          <path d="M386 114v7" stroke="#b59e78" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
export default function FieldHub({
  completed,
  xp,
  onEnter,
}: {
  completed: string[];
  xp: number;
  onEnter: (id: FieldId) => void;
}) {
  return (
    <section className="field-hub" aria-label="여행 필드 선택">
      <div className="hub-banner">
        <span className="hub-compass">
          <JungtokiGuide />
        </span>
        <div>
          <span className="eyebrow">FOUR PLACES, YOUR OWN ADVENTURE</span>
          <h2>네 개의 공간, 하나의 여행.</h2>
          <p>
            입장할 필드를 골라보세요. 각 공간에서 여행자를 만나고, 그곳의 체험을
            시작할 수 있어요.
          </p>
        </div>
        <div className="hub-progress">
          <b>
            {completed.length}
            <small> / 4</small>
          </b>
          <span>필드 체험 완료</span>
        </div>
      </div>
      <div className="field-entrances">
        {FIELD_IDS.map((id, index) => {
          const field = fields[id],
            Icon = field.icon,
            done = completed.includes(id);
          return (
            <article className={`field-entrance ${field.color}`} key={id}>
              <div className="entrance-preview">
                <FieldPreview id={id} />
                <span className="entrance-number">FIELD 0{index + 1}</span>
                {done && (
                  <span className="entrance-completed">
                    <Check size={12} />
                    체험 완료
                  </span>
                )}
              </div>
              <div className="entrance-content">
                <div className="entrance-eyebrow">
                  <span>{field.eyebrow}</span>
                  <span>{field.duration}</span>
                </div>
                <h2>
                  <Icon size={21} />
                  {field.label}
                </h2>
                <p>{field.description}</p>
                <div className="entrance-location">
                  <MapPin size={12} />
                  {field.place}
                </div>
                <a
                  href={routeHash({ page: "field", fieldId: id })}
                  className="entrance-link"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      onEnter(id);
                    }
                  }}
                  aria-label={`${field.label} 입장`}
                >
                  {done ? "다시 필드 입장" : "필드 입장"}
                  <ArrowRight size={17} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hub-footer-note">
        <span>
          <Sparkles size={15} />
          {xp} XP · 여행 여권은 모든 필드에서 이어져요.
        </span>
        <p>한 필드의 체험을 마치면 허브로 돌아와 다음 필드로 이동해요.</p>
      </div>
    </section>
  );
}
