import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookUser,
  CarFront,
  Check,
  ChevronDown,
  Hotel,
  LoaderCircle,
  Plane,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import type { AttemptResult, Scenario, Session } from "../lib/types";
import ScenarioPractice from "./ScenarioPractice";
import JungtokiGuide, {
  JUNGTOKI_GUIDE_NAME,
  JUNGTOKI_GUIDE_ROLES,
} from "./JungtokiGuide";
import "./MissionDialogue.css";
import type { TaxiBoardingResult, TaxiRideRequest } from "../lib/taxiRide";

export interface MissionDialogueProps {
  scenario: Scenario;
  session: Session;
  onClose: () => void;
  onCompleted: (result: AttemptResult) => void;
  track: (type: string, properties: Record<string, unknown>) => void;
  onRideRequested?: (request: TaxiRideRequest) => Promise<TaxiBoardingResult>;
}

type Stage = "greeting" | "practice" | "questions" | "feedback" | "reward";
const characters = {
  prepare: {
    name: JUNGTOKI_GUIDE_NAME,
    role: JUNGTOKI_GUIDE_ROLES.prepare,
    icon: Plane,
    introduction:
      "여행 준비실에 잘 오셨어요! 출발 준비를 함께할 여행 가이드 중톡이예요.",
    invitation:
      "여행 일정과 준비물을 함께 확인해 볼까요? 준비 테이블에서 직접 가방을 챙긴 뒤, 몇 가지 여행 상황을 이야기해 봐요.",
  },
  immigration: {
    name: JUNGTOKI_GUIDE_NAME,
    role: JUNGTOKI_GUIDE_ROLES.immigration,
    icon: BookUser,
    introduction:
      "您好! 입국심사 연습을 도와줄 중톡이예요. 함께 심사대에서 나눌 대화를 연습해 봐요.",
    invitation:
      "이곳에서는 가상의 여행 일정으로 입국심사를 연습합니다. 실제 여권 정보는 필요하지 않아요. 방문 목적부터 천천히 답해 보시겠어요?",
  },
  hotel: {
    name: JUNGTOKI_GUIDE_NAME,
    role: JUNGTOKI_GUIDE_ROLES.hotel,
    icon: Hotel,
    introduction:
      "欢迎光临! 호텔 예약과 체크인을 안내할 중톡이예요. 가상의 프런트에서 함께 연습해 볼까요?",
    invitation:
      "머물 날짜와 객실 조건을 먼저 골라 볼까요? 가상 예약을 만든 다음, 체크인할 때 필요한 내용을 함께 확인해 드릴게요.",
  },
  didi: {
    name: JUNGTOKI_GUIDE_NAME,
    role: JUNGTOKI_GUIDE_ROLES.didi,
    icon: CarFront,
    introduction:
      "니하오! 디디 호출 연습을 도와줄 중톡이예요. 공항에서 다음 목적지까지 가는 방법을 함께 알아봐요.",
    invitation:
      "승차 위치와 도착지를 확인하고 가상 차량을 불러 봐요. 차가 도착했을 때 무엇을 확인하면 좋을지도 함께 이야기해요.",
  },
};

/** Field conversation: grading and rewards always come from the existing server API. */
export default function MissionDialogue({
  scenario,
  session,
  onClose,
  onCompleted,
  track,
  onRideRequested,
}: MissionDialogueProps) {
  const npc =
    characters[scenario.id as keyof typeof characters] || characters.prepare;
  const Icon = npc.icon;
  const [stage, setStage] = useState<Stage>("greeting");
  const [fieldPracticeActive, setFieldPracticeActive] = useState(false);
  const [greetingPage, setGreetingPage] = useState(0);
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const submission = useRef<{ answers: string[]; key: string } | null>(null);
  const delivered = useRef(new Set<string>());
  const closeRef = useRef(onClose);
  const completedRef = useRef(onCompleted);
  const keyboardRef = useRef<(event: KeyboardEvent) => void>(() => {});
  closeRef.current = onClose;
  completedRef.current = onCompleted;

  const current = scenario.steps[step];
  const feedback = result?.feedback[feedbackPage];
  const line =
    stage === "greeting"
      ? greetingPage === 0
        ? `${session.nickname}님, ${npc.introduction}`
        : npc.invitation
      : stage === "practice"
        ? "좋아요. 아래에서 직접 해보세요. 준비가 끝나면 ‘상황 연습 이어가기’로 대화를 계속할 수 있어요."
        : stage === "questions"
          ? busy
            ? "답변을 확인하고 있어요. 잠시만 기다려 주세요…"
            : error
              ? "선택한 답변은 그대로 보관하고 있어요. 연결이 돌아오면 같은 답안으로 다시 확인해 볼까요?"
              : current?.prompt ||
                "준비된 질문이 없어요. 필드로 돌아가 다시 말을 걸어 주세요."
          : stage === "feedback"
            ? `${feedback?.correct ? "잘 답했어요." : "이 상황은 함께 다시 살펴볼까요?"} ${feedback?.explanation || ""}`
            : result?.passed
              ? result.xpEarned > 0
                ? `훌륭해요! 이 필드의 여행 스탬프와 ${result.xpEarned} XP를 받았어요. 다음 여행에서도 오늘의 연습을 떠올려 주세요.`
                : "모든 상황을 잘 기억하고 있네요! 이미 받은 스탬프는 여권에 그대로 있어요. 복습을 마친 여행자님, 다시 필드에서 만나요."
              : "괜찮아요. 낯선 여행도 한 번씩 연습하면 익숙해져요. 방금 나눈 이야기를 떠올리며 다시 도전하거나, 잠시 필드를 둘러보고 돌아오세요.";
  const glyphs = Array.from(line);
  const [typing, setTyping] = useState({ text: line, count: 0 });
  const shown = typing.text === line ? typing.count : 0;
  const ready = shown >= glyphs.length;
  const reveal = () => setTyping({ text: line, count: glyphs.length });

  useEffect(() => {
    if (stage === "practice") {
      setTyping({ text: line, count: Array.from(line).length });
      return;
    }
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      setTyping({ text: line, count: Array.from(line).length });
      return;
    }
    let count = 0;
    setTyping({ text: line, count });
    const length = Array.from(line).length;
    const interval = window.setInterval(() => {
      count += 1;
      setTyping((previous) =>
        previous.text === line && previous.count >= length
          ? previous
          : { text: line, count },
      );
      if (count >= length) window.clearInterval(interval);
    }, 20);
    return () => window.clearInterval(interval);
  }, [line, stage]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (fieldPracticeActive) return;
    const previous = document.activeElement as
      | (Element & { focus?: () => void })
      | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => keyboardRef.current(event);
    const focus = (event: FocusEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node))
        panel.current.focus();
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focus);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus?.();
    };
  }, [fieldPracticeActive]);

  useEffect(() => {
    if (fieldPracticeActive) return;
    panel.current?.scrollTo({ top: 0 });
    panel.current?.focus();
  }, [stage, step, feedbackPage, greetingPage, fieldPracticeActive]);

  async function requestFieldRide(request: TaxiRideRequest) {
    if (!onRideRequested) return null;
    setFieldPracticeActive(true);
    try {
      return await onRideRequested(request);
    } finally {
      if (mounted.current) setFieldPracticeActive(false);
    }
  }

  async function submit(chosen: string[]) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    // A failed response may already have committed. Retain both key and payload for retries.
    if (!submission.current)
      submission.current = { answers: [...chosen], key: crypto.randomUUID() };
    const request = submission.current;
    try {
      const response = await api<AttemptResult>(
        `/scenarios/${scenario.id}/attempt`,
        session.token,
        { answers: request.answers, idempotencyKey: request.key },
      );
      if (!delivered.current.has(request.key)) {
        delivered.current.add(request.key);
        completedRef.current(response);
        track("scenario_finished", {
          scenarioId: scenario.id,
          score: response.score,
          passed: response.passed,
        });
      }
      if (mounted.current) {
        setResult(response);
        setFeedbackPage(0);
        setStage(response.feedback.length ? "feedback" : "reward");
      }
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "답변을 확인하지 못했어요. 같은 답안으로 다시 시도해 주세요.",
        );
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function choose(index: number) {
    if (!ready || busyRef.current || error || !current) return;
    const option = current.options[index];
    if (!option) return;
    const nextAnswers = [...answers];
    nextAnswers[step] = option.id;
    setAnswers(nextAnswers);
    setCursor(index);
    track("scenario_answered", {
      scenarioId: scenario.id,
      stepId: current.id,
      optionId: option.id,
    });
    if (step + 1 < scenario.steps.length) {
      setStep(step + 1);
      setCursor(0);
    } else void submit(nextAnswers);
  }

  function advance() {
    if (busyRef.current) return;
    if (!ready) {
      reveal();
      return;
    }
    if (stage === "greeting") {
      if (greetingPage === 0) setGreetingPage(1);
      else {
        setStage("practice");
        track("dialogue_practice_started", { scenarioId: scenario.id });
      }
    } else if (stage === "questions") {
      if (error) void submit(answers);
      else choose(cursor);
    } else if (stage === "feedback") {
      if (result && feedbackPage + 1 < result.feedback.length)
        setFeedbackPage(feedbackPage + 1);
      else setStage("reward");
    } else if (stage === "reward") closeRef.current();
  }

  function retry() {
    submission.current = null;
    setAnswers([]);
    setStep(0);
    setCursor(0);
    setResult(null);
    setError("");
    setStage("questions");
    track("scenario_retried", { scenarioId: scenario.id });
  }

  keyboardRef.current = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeRef.current();
      return;
    }
    if (event.key === "Tab") {
      const elements = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ) || [],
      );
      const first = elements[0],
        last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        panel.current?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (
      stage === "practice" ||
      target?.closest(
        'input,select,textarea,[contenteditable="true"],[data-dialogue-native]',
      )
    )
      return;
    if (event.repeat && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (
      stage === "questions" &&
      ready &&
      !busy &&
      !error &&
      current &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
      const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1;
      const nextCursor =
        (cursor + direction + current.options.length) % current.options.length;
      setCursor(nextCursor);
      panel.current
        ?.querySelectorAll<HTMLButtonElement>(".dialogue-choice")
        [nextCursor]?.focus();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      advance();
    }
  };

  const progressLabel =
    stage === "greeting"
      ? "첫 만남"
      : stage === "practice"
        ? "같이 해봐요"
        : stage === "questions"
          ? `상황 ${step + 1} / ${scenario.steps.length}`
          : stage === "feedback"
            ? `함께 돌아보기 ${feedbackPage + 1} / ${result?.feedback.length || 0}`
            : "대화 완료";

  if (stage === "practice") {
    return (
      <div className="practice-layer" hidden={fieldPracticeActive}>
        <div
          className="practice-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={`${npc.name}와 함께하는 ${scenario.title} 화면 연습`}
          aria-describedby="practice-description"
          tabIndex={-1}
          ref={panel}
        >
          <button
            className="practice-close"
            data-dialogue-native
            onClick={onClose}
            aria-label="실습을 마치고 필드로 돌아가기"
          >
            <X size={18} />
          </button>
          <ScenarioPractice
            id={scenario.id}
            track={track}
            onRideRequested={onRideRequested ? requestFieldRide : undefined}
            onFinish={() => {
              setStep(0);
              setCursor(0);
              setStage("questions");
              track("practice_ui_finished", { scenarioId: scenario.id });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`dialogue-layer dialogue-stage-${stage}`}>
      <div
        className="mission-dialogue"
        role="dialog"
        aria-modal="true"
        aria-label={`${npc.name} · ${scenario.title} 대화`}
        aria-describedby="dialogue-full-line"
        tabIndex={-1}
        ref={panel}
      >
        <span
          className="dialogue-corner dialogue-corner-tl"
          aria-hidden="true"
        />
        <span
          className="dialogue-corner dialogue-corner-tr"
          aria-hidden="true"
        />
        <div className="dialogue-nameplate">
          <span className="dialogue-name-dot" />
          {npc.name}
          <small>{npc.role}</small>
        </div>
        <button
          className="dialogue-close"
          data-dialogue-native
          aria-label="대화를 마치고 필드로 돌아가기"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="dialogue-layout">
          <div
            className={`dialogue-portrait dialogue-portrait-${scenario.id}`}
            aria-hidden="true"
          >
            <span className="dialogue-portrait-stars">✦</span>
            <JungtokiGuide />
            <span className="dialogue-portrait-badge">
              <Icon size={20} />
            </span>
            <span className="dialogue-portrait-caption">{npc.name}</span>
          </div>
          <div className="dialogue-content">
            <div className="dialogue-meta">
              <span>FIELD CONVERSATION</span>
              <b>{progressLabel}</b>
            </div>
            <div
              className="dialogue-copy"
              data-dialogue-text
              onClick={() => {
                if (!ready) reveal();
              }}
            >
              <p className="dialogue-line" aria-hidden="true">
                {glyphs.slice(0, shown).join("")}
                <span className={`dialogue-caret ${ready ? "finished" : ""}`}>
                  {ready ? "" : "▌"}
                </span>
              </p>
              <p
                id="dialogue-full-line"
                className="dialogue-sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {line}
              </p>
            </div>
            {stage === "questions" && ready && !busy && !error && current && (
              <div
                className="dialogue-choices"
                role="group"
                aria-label="답변 선택. 방향키로 이동하고 Enter로 결정하세요."
              >
                {current.options.map((option, index) => (
                  <button
                    key={option.id}
                    className={`dialogue-choice ${cursor === index ? "highlighted" : ""}`}
                    aria-pressed={cursor === index}
                    onFocus={() => setCursor(index)}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => choose(index)}
                  >
                    <span className="dialogue-choice-arrow" aria-hidden="true">
                      {cursor === index ? "▶" : "·"}
                    </span>
                    <span className="dialogue-choice-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option.text}</span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            )}
            {stage === "feedback" && ready && feedback && (
              <div
                className={`dialogue-feedback-tag ${feedback.correct ? "correct" : "review"}`}
              >
                {feedback.correct ? (
                  <Check size={15} />
                ) : (
                  <RotateCcw size={14} />
                )}
                상황 {feedbackPage + 1} ·{" "}
                {feedback.correct ? "잘 이해했어요" : "다시 기억해요"}
              </div>
            )}
            {stage === "reward" && result && (
              <div
                className={`dialogue-reward ${result.passed ? "earned" : "review"}`}
              >
                <span className="dialogue-reward-icon">
                  {result.passed ? (
                    <Sparkles size={28} />
                  ) : (
                    <RotateCcw size={26} />
                  )}
                </span>
                <div>
                  <b>
                    {result.passed
                      ? "여행의 한 장면을 익혔어요"
                      : "다음 도전도 함께할게요"}
                  </b>
                  <span>
                    확인한 상황 {result.score} / {result.total}
                    {result.xpEarned > 0
                      ? ` · +${result.xpEarned} XP`
                      : result.passed
                        ? " · 스탬프 보유 중"
                        : " · 해설을 떠올려 다시 도전해요"}
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="dialogue-error" role="alert">
                <p>{error}</p>
                <span>답변을 다시 고를 필요 없이 재전송할 수 있어요.</span>
              </div>
            )}
            <div className="dialogue-controls">
              <span className="dialogue-key-hint">
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={13} />
                    답변 확인 중
                  </>
                ) : (
                  <>
                    <kbd>
                      {stage === "questions" && ready && !error
                        ? "↑ ↓"
                        : "Enter"}
                    </kbd>
                    {stage === "questions" && ready && !error
                      ? "답변 선택 · Enter 결정"
                      : ready
                        ? "대화 계속"
                        : "누르면 한 번에 읽기"}
                  </>
                )}
              </span>
              {
                <div className="dialogue-actions">
                  {stage === "reward" && result && !result.passed && (
                    <button
                      className="dialogue-secondary"
                      data-dialogue-native
                      onClick={retry}
                    >
                      <RotateCcw size={14} />
                      다시 연습하기
                    </button>
                  )}
                  {(stage !== "questions" || !ready || busy || error) && (
                    <button
                      className="dialogue-next"
                      onClick={advance}
                      disabled={busy}
                    >
                      {busy
                        ? "확인하고 있어요"
                        : !ready
                          ? "한 번에 읽기"
                          : stage === "reward"
                            ? "필드로 돌아가기"
                            : error
                              ? "같은 답안으로 다시 보내기"
                              : stage === "greeting" && greetingPage === 1
                                ? "같이 해봐요"
                                : "다음 대화"}
                      {busy ? (
                        <LoaderCircle className="spin" size={15} />
                      ) : (
                        <ChevronDown size={15} />
                      )}
                    </button>
                  )}
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
