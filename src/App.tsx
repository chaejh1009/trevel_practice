import { useEffect, useRef, useState } from "react";
import type {
  FormEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Flag,
  Globe2,
  HelpCircle,
  Map,
  MapPin,
  Maximize2,
  MessageCircle,
  Navigation,
  BookUser as Passport,
  Send,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Volume2,
  VolumeX,
  X,
  RotateCcw,
} from "lucide-react";
import FieldWorld from "./components/FieldWorld";
import FieldHub from "./components/FieldHub";
import TravelerAvatar from "./components/TravelerAvatar";
import { fields } from "./lib/fields";
import type { FieldDefinition } from "./lib/fields";
import { FIELD_IDS, isFieldId, useRoute } from "./lib/navigation";
import type { AppRoute } from "./lib/navigation";
import MissionDialogue from "./components/MissionDialogue";
import TaxiRidePanel from "./components/TaxiRidePanel";
import { useTaxiRide } from "./lib/useTaxiRide";
import {
  getTaxiVehicle,
  TAXI_INTERACTION_RADIUS,
  type TaxiRideRequest,
} from "./lib/taxiRide";
import "./components/WorldControls.css";
import { useCharacterController } from "./lib/useCharacterController";
import { useWorld } from "./lib/useWorld";
import { api } from "./lib/api";
import type { Scenario } from "./lib/types";
const meta: Record<string, FieldDefinition> = fields;
const ids = FIELD_IDS;
function Modal({
  children,
  onClose,
  label,
  className = "",
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const all = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a,[tabindex="0"]',
        );
        if (!all?.length) return;
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    ref.current?.querySelector<HTMLElement>("button,input")?.focus();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`modal ${className}`}
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
export default function App({
  initialRoute,
}: { initialRoute?: AppRoute } = {}) {
  const { route, navigate } = useRoute(initialRoute);
  const fieldId = route.page === "field" ? route.fieldId : null;
  const currentField = fieldId ? fields[fieldId] : null;
  const tab =
    route.page === "hub" || route.page === "field" ? "world" : route.page;
  const setTab = (next: string) =>
    navigate({
      page: next === "guide" ? "guide" : next === "journey" ? "journey" : "hub",
    });
  const w = useWorld(fieldId);
  const [active, setActive] = useState<Scenario | null>(null),
    [chatOpen, setChatOpen] = useState(false),
    [chat, setChat] = useState(""),
    [help, setHelp] = useState(false),
    [passport, setPassport] = useState(false),
    [sound, setSound] = useState(false),
    [toast, setToast] = useState(""),
    [fullMap, setFullMap] = useState(false),
    [summary, setSummary] = useState<{
      total?: number;
      counts?: Record<string, number>;
    } | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null),
    mapRef = useRef<HTMLElement>(null);
  const taxi = useTaxiRide({ fieldId, position: w.position, track: w.track });
  const movementBlocked = Boolean(
    (active && !taxi.ride) || help || passport || taxi.movementBlocked,
  );
  const showToast = (text: string) => setToast(text);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [w.messages, chatOpen]);
  useEffect(() => {
    if (tab === "journey" && w.session) {
      void w
        .flush()
        .then(() =>
          api<{ total?: number; counts?: Record<string, number> }>(
            "/events/summary",
            w.session!.token,
          ),
        )
        .then(setSummary)
        .catch(() => setSummary(null));
    }
  }, [tab, w.session, w.flush]);
  useEffect(() => {
    setActive(null);
    setChatOpen(false);
    setChat("");
    setFullMap(false);
  }, [route]);
  useEffect(() => {
    if (!fieldId || !w.session) return;
    w.track("field_entered", { fieldId });
    return () => w.track("field_left", { fieldId });
  }, [fieldId, w.session, w.track]);
  function enterField(id: string) {
    if (isFieldId(id)) navigate({ page: "field", fieldId: id });
  }
  function openScenario(id: string) {
    if (fieldId !== id) {
      enterField(id);
      return;
    }
    const s = w.scenarios.find((s) => s.id === id);
    if (!s || !w.session) {
      showToast("서버에 연결되면 체험을 시작할 수 있어요.");
      return;
    }
    w.track("scenario_opened", { scenarioId: id });
    setChatOpen(false);
    setActive(s);
  }
  const controller = useCharacterController({
    fieldId,
    position: w.position,
    onMove: w.move,
    blocked: movementBlocked,
    geometry: taxi.geometry,
    interaction: taxi.ride ? taxi.interaction : undefined,
    onInteract: (id) => {
      if (taxi.ride) {
        if (id) taxi.selectVehicle(id);
      } else if (fieldId) openScenario(fieldId);
    },
  });
  function requestFieldRide(request: TaxiRideRequest) {
    controller.stop();
    setChatOpen(false);
    setFullMap(false);
    const result = taxi.start(request);
    requestAnimationFrame(() =>
      mapRef.current
        ?.querySelector<SVGSVGElement>(".field-world-svg")
        ?.focus({ preventScroll: true }),
    );
    return result;
  }
  function approachTaxi(id: string) {
    const vehicle = getTaxiVehicle(id);
    if (!vehicle || taxi.ride?.phase !== "waiting" || movementBlocked) return;
    mapRef.current
      ?.querySelector<SVGSVGElement>(".field-world-svg")
      ?.focus({ preventScroll: true });
    controller.approachInteraction({
      id: vehicle.id,
      point: vehicle.position,
      approachPoint: vehicle.approachPoint,
      radius: TAXI_INTERACTION_RADIUS,
    });
  }
  function boardTaxi() {
    const ride = taxi.ride;
    taxi.board();
    if (
      ride?.selectedVehicleId === ride?.request.assignedVehicleId &&
      taxi.nearVehicleId === ride?.selectedVehicleId
    ) {
      mapRef.current?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches
          ? "auto"
          : "smooth",
      });
      mapRef.current
        ?.querySelector<SVGSVGElement>(".field-world-svg")
        ?.focus({ preventScroll: true });
    }
  }
  function closeConversation() {
    setActive(null);
    controller.stop();
    requestAnimationFrame(() =>
      mapRef.current
        ?.querySelector<SVGSVGElement>(".field-world-svg")
        ?.focus({ preventScroll: true }),
    );
  }
  function requestInteraction() {
    if (taxi.ride) {
      if (!movementBlocked) controller.approachInteraction();
      return;
    }
    if (!fieldId || active || help || passport) return;
    w.track("npc_approached", { fieldId });
    controller.approachInteraction();
  }
  function holdDirection(
    event: ReactPointerEvent<HTMLButtonElement>,
    x: number,
    y: number,
  ) {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    controller.setTouchDirection(x, y);
  }
  function releaseDirection() {
    controller.setTouchDirection(0, 0);
  }
  function sendChat(e: FormEvent) {
    e.preventDefault();
    const text = chat.trim();
    if (text && w.send(text)) setChat("");
  }
  function toggleSound() {
    const next = !sound;
    setSound(next);
    if (next) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(
          783.99,
          ctx.currentTime + 0.15,
        );
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        osc.onended = () => void ctx.close();
      } catch {
        showToast("이 브라우저에서는 효과음을 재생할 수 없어요.");
      }
    }
    w.track("sound_toggled", { enabled: next });
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("world");
          }}
        >
          <span className="brand-icon">
            <Passport size={25} />
          </span>
          <span>
            china
            <br />
            <b>
              passport<span className="brand-dot">.</span>
            </b>
          </span>
        </a>
        <div className="workspace-label">나의 작은 여행 세계</div>
        <nav aria-label="주 메뉴">
          <button
            className={tab === "world" ? "active" : ""}
            onClick={() => setTab("world")}
          >
            <Map size={20} />
            여행 허브<span className="nav-badge">4 FIELDS</span>
          </button>
          <button
            className={tab === "guide" ? "active" : ""}
            onClick={() => {
              setTab("guide");
              w.track("guide_opened");
            }}
          >
            <BookOpen size={20} />
            여행 가이드
          </button>
          <button
            className={tab === "journey" ? "active" : ""}
            onClick={() => {
              setTab("journey");
              w.track("journey_opened");
            }}
          >
            <Compass size={20} />
            나의 여정
          </button>
        </nav>
        <div className="side-divider" />
        <div className="workspace-label">지금 떠날 수 있는 곳</div>
        <button
          className="city-choice"
          onClick={() => {
            setTab("world");
          }}
        >
          <span className="city-flag">🇨🇳</span>
          <span>
            <b>상하이</b>
            <small>Shanghai, China</small>
          </span>
          <span className="small-dot" />
        </button>
        <div className="sidebar-bottom">
          <div className="travel-tip">
            <span className="tip-illustration">✈</span>
            <p>
              처음이라 더 설레는
              <br />
              <strong>중국 여행, 함께 준비해요.</strong>
            </p>
            <button onClick={() => setHelp(true)}>
              월드 이용 가이드
              <ArrowRight size={14} />
            </button>
          </div>
          <button className="help-button" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            도움이 필요해요
            <ChevronRight size={14} />
          </button>
          <div className="sidebar-footer">작은 연습이, 큰 여행의 시작.</div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            나의 여행 공간
            <ChevronRight size={14} />
            <span>
              {tab === "world"
                ? currentField?.label || "여행 허브"
                : tab === "guide"
                  ? "여행 가이드"
                  : "나의 여정"}
            </span>
          </div>
          <div className="top-actions">
            <span className="beta-tag">OPEN BETA</span>
            <button className="xp-pill" onClick={() => setPassport(true)}>
              <Sparkles size={15} />
              {w.progress.xp} XP
            </button>
            <button
              className="profile-button"
              onClick={() => setPassport(true)}
              aria-label="나의 여행 여권"
            >
              <span className="profile-avatar">
                <TravelerAvatar portrait avatar={w.session?.avatar || "mint"} />
              </span>
              <span>{w.session?.nickname || "여행자"}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                <span />
                YOUR NEXT CHAPTER STARTS HERE
              </div>
              <h1>
                {tab === "world" ? (
                  currentField ? (
                    currentField.label
                  ) : (
                    <>
                      떠나기 전에, <span>한 번 살아보기.</span>
                    </>
                  )
                ) : tab === "guide" ? (
                  <>
                    낯선 여행을 <span>익숙하게.</span>
                  </>
                ) : (
                  <>
                    차곡차곡 쌓이는 <span>나의 여행.</span>
                  </>
                )}
              </h1>
              <p>
                {tab === "world"
                  ? currentField
                    ? currentField.place
                    : "네 개의 여행 필드 중 가고 싶은 공간을 선택해 주세요."
                  : tab === "guide"
                    ? "출발부터 도착까지, 여행의 순간마다 필요한 작은 가이드."
                    : "경험은 스탬프가 되고, 연습은 자신감이 돼요."}
              </p>
            </div>
            <button
              className="outline-button passport-button"
              onClick={() => setPassport(true)}
            >
              <Ticket size={17} />
              나의 여행 여권
              <ArrowUp size={15} className="diagonal-arrow" />
            </button>
          </div>
          {w.error && (
            <div className="connection-alert" role="status">
              {w.error}
              <button onClick={w.reconnect}>
                다시 연결
                <RotateCcw size={13} />
              </button>
            </div>
          )}
          {tab === "world" ? (
            fieldId && currentField ? (
              <>
                <div className="field-navigation">
                  <a
                    className="field-back"
                    href="#/hub"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate({ page: "hub" });
                    }}
                  >
                    <ArrowLeft size={16} />
                    허브로 돌아가기
                  </a>
                  <span className="field-path">
                    TRAVEL FIELD /{" "}
                    {String(ids.indexOf(fieldId) + 1).padStart(2, "0")} ·{" "}
                    {currentField.eyebrow}
                  </span>
                </div>
                <div className="world-layout field-layout">
                  <section
                    className={`world-card ${fullMap ? "expanded-map" : ""}`}
                    ref={mapRef}
                    aria-label={`${currentField.label} 여행 공간`}
                  >
                    <div className="world-toolbar">
                      <div className="location-heading">
                        <span className="location-symbol">
                          <MapPin size={18} />
                        </span>
                        <div>
                          <b>{currentField.label}</b>
                          <span>{currentField.eyebrow}</span>
                        </div>
                        <span className="world-status">
                          <i
                            className={
                              w.connection === "online" ? "" : "disconnected"
                            }
                          />
                          {w.connection === "online"
                            ? "실시간 연결"
                            : w.connection === "connecting"
                              ? "연결 중"
                              : "연결 대기"}
                        </span>
                      </div>
                      <div className="map-actions">
                        <span className="online-count">
                          <Users size={15} />
                          {w.players.length}명 이 필드에 접속 중
                        </span>
                        <button
                          className={`icon-button ${sound ? "enabled" : ""}`}
                          onClick={toggleSound}
                          aria-label={sound ? "효과음 끄기" : "효과음 켜기"}
                        >
                          {sound ? (
                            <Volume2 size={17} />
                          ) : (
                            <VolumeX size={17} />
                          )}
                        </button>
                        <button
                          className="icon-button"
                          disabled={Boolean(taxi.ride)}
                          onClick={() => setFullMap(!fullMap)}
                          aria-label={fullMap ? "지도 축소" : "지도 확대"}
                        >
                          {fullMap ? <X size={17} /> : <Maximize2 size={17} />}
                        </button>
                      </div>
                    </div>
                    <div className="map-container">
                      <FieldWorld
                        key={fieldId}
                        fieldId={fieldId}
                        players={w.players}
                        selfId={w.session?.sessionId || null}
                        position={w.position}
                        onMove={controller.walkTo}
                        onInteract={requestInteraction}
                        facing={controller.direction}
                        moving={controller.moving}
                        canInteract={controller.canInteract}
                        target={controller.target}
                        interactionDisabled={movementBlocked}
                        taxiRide={taxi.ride}
                        nearTaxiId={taxi.nearVehicleId}
                        onTaxiSelect={approachTaxi}
                        completed={w.progress.completed.includes(fieldId)}
                      />
                      {taxi.ride && (
                        <div className="taxi-map-assignment">
                          <span>앱에 배정된 차량</span>
                          <strong>
                            {
                              getTaxiVehicle(
                                taxi.ride.request.assignedVehicleId,
                              )?.plate
                            }
                          </strong>
                          <small>
                            {taxi.ride.phase === "arriving"
                              ? "차량이 도착하고 있어요"
                              : taxi.ride.phase === "waiting"
                                ? "번호를 확인하고 가까이 가세요"
                                : taxi.ride.phase === "boarding"
                                  ? "탑승 중이에요"
                                  : "목적지를 향해 출발해요"}
                          </small>
                          {taxi.ride.phase === "waiting" &&
                            taxi.ride.selectedVehicleId &&
                            taxi.nearVehicleId ===
                              taxi.ride.selectedVehicleId && (
                              <button onClick={boardTaxi}>
                                근처 차량에 탑승
                              </button>
                            )}
                          {taxi.ride.error && (
                            <p role="alert">{taxi.ride.error}</p>
                          )}
                        </div>
                      )}
                      <button
                        className="map-help icon-button"
                        onClick={() => setHelp(true)}
                        aria-label="필드 조작 도움말"
                      >
                        <HelpCircle size={18} />
                      </button>
                    </div>
                    <div className="world-bottom">
                      <div className="movement-tip">
                        <span className="key-group">
                          <kbd>W</kbd>
                          <kbd>A</kbd>
                          <kbd>S</kbd>
                          <kbd>D</kbd>
                        </span>
                        <span>누르고 있으면 걷기</span>
                        <span className="control-divider" />
                        <span className="mouse-symbol">↖</span>
                        <span>
                          {taxi.ride
                            ? "차량 클릭 · 근처에서 F / E 확인"
                            : "클릭해서 걷기 · 근처에서 F / E 대화"}
                        </span>
                      </div>
                      <button
                        className={
                          chatOpen ? "chat-toggle selected" : "chat-toggle"
                        }
                        onClick={() => setChatOpen(!chatOpen)}
                      >
                        <MessageCircle size={16} />
                        필드 채팅<span>{w.messages.length}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    {chatOpen && (
                      <aside className="chat-panel">
                        <div className="chat-heading">
                          <span>
                            <MessageCircle size={17} />
                            {currentField.label} 채팅
                            <small>{w.players.length}명</small>
                          </span>
                          <button
                            className="icon-button"
                            aria-label="채팅 닫기"
                            onClick={() => setChatOpen(false)}
                          >
                            <X size={17} />
                          </button>
                        </div>
                        <div
                          className="chat-messages"
                          role="log"
                          aria-live="polite"
                        >
                          <div className="chat-welcome">
                            <span>👋</span>
                            <b>함께 떠나면 더 즐거우니까.</b>
                            <p>
                              이 필드의 여행자에게 인사해 보세요.
                              <br />
                              여권번호 등 개인정보는 보내지 마세요.
                            </p>
                          </div>
                          {w.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`chat-message ${m.sessionId === w.session?.sessionId ? "mine" : ""}`}
                            >
                              <small>
                                {m.nickname}
                                <time>
                                  {new Date(m.createdAt).toLocaleTimeString(
                                    "ko-KR",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </time>
                              </small>
                              <p>{m.text}</p>
                            </div>
                          ))}
                          <div ref={chatEnd} />
                        </div>
                        <form onSubmit={sendChat} className="chat-form">
                          <input
                            aria-label="채팅 메시지"
                            placeholder={
                              w.connection === "online"
                                ? "여행 이야기를 나눠요…"
                                : "서버에 연결 중이에요…"
                            }
                            value={chat}
                            onChange={(e) => setChat(e.target.value)}
                            maxLength={300}
                            disabled={w.connection !== "online"}
                          />
                          <button
                            aria-label="메시지 보내기"
                            disabled={!chat.trim() || w.connection !== "online"}
                          >
                            <Send size={17} />
                          </button>
                        </form>
                      </aside>
                    )}
                  </section>
                  <aside
                    className={`field-objective ${taxi.ride ? "taxi-objective" : ""}`}
                    aria-label="현재 필드 안내"
                  >
                    {taxi.ride ? (
                      <TaxiRidePanel
                        ride={taxi.ride}
                        nearVehicleId={taxi.nearVehicleId}
                        onApproach={approachTaxi}
                        onBoard={boardTaxi}
                        onCancel={taxi.cancel}
                      />
                    ) : (
                      <>
                        <span className="eyebrow">THIS FIELD’S ADVENTURE</span>
                        <div
                          className={`field-objective-icon ${currentField.color}`}
                        >
                          <MapPin size={25} />
                        </div>
                        <h2>{currentField.name}</h2>
                        <p>{currentField.instruction}</p>
                        <ol>
                          {currentField.steps.map((step, index) => (
                            <li key={step}>
                              <span>{index + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                        {w.progress.completed.includes(fieldId) && (
                          <div className="field-stamp-status">
                            <Check size={14} />이 필드의 스탬프를 모았어요.
                          </div>
                        )}
                        <button
                          className="primary"
                          onClick={requestInteraction}
                        >
                          {w.progress.completed.includes(fieldId)
                            ? "안내원에게 다시 말 걸기"
                            : controller.canInteract
                              ? "F · 대화하기"
                              : "안내원에게 걸어가기"}
                          <ArrowRight size={16} />
                        </button>
                        <button
                          className="field-exit-link"
                          onClick={() => navigate({ page: "hub" })}
                        >
                          <ArrowLeft size={13} />
                          다른 필드는 허브에서 선택해요
                        </button>
                        <p className="field-objective-caption">
                          필드를 옮겨도 여행 여권과 XP는 그대로 이어져요.
                        </p>
                      </>
                    )}
                  </aside>
                </div>
                <div className="field-session-note">
                  <Users size={18} />
                  <span>
                    이곳에서는 <b>{currentField.label}</b>에 입장한 여행자만
                    만나요. 체험을 마치면 허브로 돌아가 다음 공간을 선택해
                    보세요.
                  </span>
                </div>
              </>
            ) : (
              <FieldHub
                completed={w.progress.completed}
                xp={w.progress.xp}
                onEnter={enterField}
              />
            )
          ) : tab === "guide" ? (
            <section className="guide-content">
              <div className="guide-banner">
                <span>🧳</span>
                <div>
                  <p className="eyebrow">YOUR POCKET TRAVEL GUIDE</p>
                  <h2>아는 만큼 편안해지는 여행.</h2>
                  <p>
                    실제 개인정보 없이, 여행의 흐름과 확인하는 습관을 배워요.
                  </p>
                </div>
              </div>
              <div className="guide-grid">
                {ids.map((id) => {
                  const m = meta[id],
                    Icon = m.icon;
                  const tips: Record<string, string[]> = {
                    prepare: [
                      "여권과 일정, 숙소 정보를 따로 확인해요.",
                      "결제 수단과 통신 방법을 출발 전에 준비해요.",
                      "입국 요건은 출발 직전 공식 안내로 확인해요.",
                    ],
                    immigration: [
                      "방문 목적과 숙소를 사실대로 간단히 말해요.",
                      "여행 일정과 예약 확인서를 찾기 쉽게 준비해요.",
                      "이해하지 못했다면 천천히 다시 말해 달라고 해요.",
                    ],
                    hotel: [
                      "날짜, 인원, 취소 조건을 예약 전에 확인해요.",
                      "외국인 투숙 가능 여부를 숙소에 확인해요.",
                      "예약자 이름과 여권상의 이름을 맞춰요.",
                    ],
                    didi: [
                      "픽업 장소와 목적지를 지도에서 확인해요.",
                      "차량 번호와 기사 정보를 확인하고 탑승해요.",
                      "앱에 표시된 경로와 도착지를 확인해요.",
                    ],
                  };
                  return (
                    <article className="guide-card" key={id}>
                      <span className={`guide-icon ${m.color}`}>
                        <Icon size={23} />
                      </span>
                      <h2>{m.name}</h2>
                      <p>{m.description}</p>
                      <ul>
                        {tips[id].map((t) => (
                          <li key={t}>
                            <Check size={15} />
                            {t}
                          </li>
                        ))}
                      </ul>
                      <button
                        className="outline-button"
                        onClick={() => openScenario(id)}
                      >
                        필드로 이동하기
                        <ArrowRight size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
              <p className="guide-note">
                <ShieldCheck size={15} />이 가이드는 여행 절차 연습용이에요.
                최신 입국 요건과 서비스 정책은 공식 채널에서 확인해 주세요.
              </p>
            </section>
          ) : (
            <section className="journey-page">
              <div className="journey-overview">
                <div>
                  <span className="eyebrow">COLLECT MOMENTS, NOT THINGS</span>
                  <h2>{w.session?.nickname || "여행자"}님의 첫 중국 여행</h2>
                  <p>같은 브라우저로 돌아오면 여행 기록이 이어져요.</p>
                </div>
                <div className="journey-stats">
                  <div>
                    <Sparkles size={22} />
                    <strong>{w.progress.xp}</strong>
                    <span>누적 경험치</span>
                  </div>
                  <div>
                    <Flag size={22} />
                    <strong>
                      {w.progress.completed.length}
                      <small> / 4</small>
                    </strong>
                    <span>모은 스탬프</span>
                  </div>
                </div>
              </div>
              <h2 className="stamp-title">나의 여행 스탬프</h2>
              <div className="stamp-grid">
                {ids.map((id) => {
                  const m = meta[id],
                    Icon = m.icon,
                    done = w.progress.completed.includes(id);
                  return (
                    <button
                      key={id}
                      className={`stamp-card ${done ? "collected" : ""}`}
                      onClick={() => openScenario(id)}
                    >
                      <div className="stamp-circle">
                        <Icon size={36} />
                        {done && <Check size={18} />}
                      </div>
                      <h3>{m.name}</h3>
                      <span>
                        {done ? "여행 연습 완료" : "아직 만나지 않은 모험"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="activity-note">
                <ShieldCheck size={24} />
                <div>
                  <h3>나의 연습이 더 나은 여행 경험을 만들어요.</h3>
                  <p>
                    이동, 미션 선택·완료, 채팅 전송 횟수를 익명 여행자 ID로
                    기록해요. 행동 이벤트에 채팅 본문이나 여권정보를 담지
                    않아요.
                    {summary?.total !== undefined
                      ? ` · 수집된 내 행동 ${summary.total}건`
                      : ""}
                  </p>
                </div>
              </div>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <Globe2 size={13} />
              국경을 넘기 전, 경험을 먼저.
            </span>
            <span>
              CHINA PASSPORT <i /> MADE FOR YOUR FIRST ADVENTURE
            </span>
          </footer>
        </main>
      </div>
      {active && w.session && fieldId === active.id && (
        <MissionDialogue
          key={active.id}
          scenario={active}
          session={w.session}
          onClose={closeConversation}
          track={w.track}
          onRideRequested={requestFieldRide}
          onCompleted={(r) => {
            w.updateProgress(r);
          }}
        />
      )}
      {help && (
        <Modal label="월드 이용 가이드" onClose={() => setHelp(false)}>
          <span className="modal-emoji">🧭</span>
          <p className="eyebrow">WELCOME, TRAVELER</p>
          <h2>작은 월드에서 시작하는 큰 여행.</h2>
          <p className="muted">
            정답을 몰라도 괜찮아요. 가볍게 돌아다니며 연습해 보세요.
          </p>
          <div className="help-items">
            <div>
              <Navigation size={22} />
              <span>
                <b>방향키를 누르고 자유롭게 걷기</b>W A S D · 방향키를 누르고
                있으면 계속 걸어요. 바닥을 클릭하면 장애물을 피해 걸어가요.
              </span>
            </div>
            <div>
              <MapPin size={22} />
              <span>
                <b>가까이 가서 대화하기</b>NPC 근처에서 F · E · Space를 누르면
                대화가 시작돼요. NPC를 클릭하면 먼저 걸어가요.
              </span>
            </div>
            <div>
              <MessageCircle size={22} />
              <span>
                <b>같은 필드의 여행자와 대화</b>필드 채팅에서 이야기를 나눠요.
                다른 필드의 대화는 섞이지 않아요.
              </span>
            </div>
            <div>
              <Passport size={22} />
              <span>
                <b>대화 속에서 여행 연습하기</b>Enter · Space로 대사를 넘기고
                방향키와 Enter로 답을 골라요. 체험을 완료하면 스탬프와 XP가
                쌓여요.
              </span>
            </div>
          </div>
          <button className="primary full" onClick={() => setHelp(false)}>
            이제 여행해 볼까요?
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {passport && (
        <Modal
          label="나의 여행 여권"
          onClose={() => setPassport(false)}
          className="passport-modal"
        >
          <div className="passport-cover">
            <Passport size={34} />
            <span>CHINA PASSPORT</span>
            <h2>{w.session?.nickname || "여행자"}님의 여행 여권</h2>
            <p>새로운 여행의 가능성이 담긴 작은 한 권.</p>
          </div>
          <div className="passport-details">
            <div>
              <span>TRAVELER</span>
              <b>{w.session?.nickname || "연결 대기 중"}</b>
            </div>
            <div>
              <span>DESTINATION</span>
              <b>SHANGHAI · 上海</b>
            </div>
            <div>
              <span>EXPERIENCE</span>
              <b>{w.progress.xp} XP</b>
            </div>
            <div>
              <span>STAMPS</span>
              <b>{w.progress.completed.length} / 4</b>
            </div>
          </div>
          <button
            className="primary full"
            onClick={() => {
              setPassport(false);
              setTab("journey");
            }}
          >
            나의 여행 기록 보기
            <ArrowRight size={17} />
          </button>
          <p className="simulation-note">
            이 여권은 여행 연습을 위한 가상의 여권이에요.
          </p>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {fieldId && !movementBlocked && (!active || taxi.ride) && (
        <div className="field-touch-controls" aria-label="터치 이동 조작">
          <div className="touch-direction-pad">
            {[
              { label: "위로 이동", x: 0, y: -1, Icon: ArrowUp, key: "up" },
              { label: "왼쪽 이동", x: -1, y: 0, Icon: ArrowLeft, key: "left" },
              {
                label: "아래로 이동",
                x: 0,
                y: 1,
                Icon: ArrowDown,
                key: "down",
              },
              {
                label: "오른쪽 이동",
                x: 1,
                y: 0,
                Icon: ArrowRight,
                key: "right",
              },
            ].map(({ label, x, y, Icon, key }) => (
              <button
                key={key}
                className={`touch-dir-${key}`}
                aria-label={label}
                onPointerDown={(e) => holdDirection(e, x, y)}
                onPointerUp={releaseDirection}
                onPointerCancel={releaseDirection}
                onLostPointerCapture={releaseDirection}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    controller.setTouchDirection(x, y);
                  }
                }}
                onKeyUp={releaseDirection}
                onBlur={releaseDirection}
              >
                <Icon size={19} />
              </button>
            ))}
          </div>
          <button
            className={`touch-interact ${controller.canInteract ? "ready" : ""}`}
            onClick={requestInteraction}
            aria-label={
              taxi.ride
                ? "가까운 차량에 다가가 확인하기"
                : "안내원에게 다가가 대화하기"
            }
          >
            {taxi.ride
              ? "차량 확인"
              : controller.canInteract
                ? "대화"
                : "말 걸기"}
          </button>
        </div>
      )}
    </div>
  );
}
