import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, readSession, saveSession } from "./api";
import type {
  EventItem,
  Message,
  Player,
  Progress,
  Scenario,
  Session,
} from "./types";

const FIELD_SPAWN = { x: 50, y: 78 };

export function useWorld(room: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [progress, setProgress] = useState<Progress>({ completed: [], xp: 0 });
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [position, setPosition] = useState(FIELD_SPAWN);
  const [realtimeRoom, setRealtimeRoom] = useState<string | null>(null);
  const [connection, setConnection] = useState<
    "connecting" | "online" | "offline"
  >("offline");
  const [error, setError] = useState("");
  const [roomError, setRoomError] = useState("");
  const [retry, setRetry] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const roomRef = useRef(room);
  // Event handlers from a departing field must stop before its effect is cleaned up.
  roomRef.current = room;
  const positionRef = useRef(FIELD_SPAWN);
  const events = useRef<EventItem[]>([]);
  const moveTime = useRef(0);
  const moveEventTime = useRef(0);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const track = useCallback(
    (type: string, properties: Record<string, unknown> = {}) => {
      if (events.current.length < 200)
        events.current.push({
          id: crypto.randomUUID(),
          type,
          properties,
          timestamp: new Date().toISOString(),
        });
    },
    [],
  );

  const flush = useCallback(async () => {
    const traveler = sessionRef.current;
    if (!traveler || !events.current.length) return;
    const batch = events.current.splice(0, 50);
    try {
      await api("/events", traveler.token, { events: batch });
    } catch {
      events.current.unshift(...batch);
      events.current = events.current.slice(0, 200);
    }
  }, []);

  // Account and learning state belong to the whole journey, independent of field routes.
  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const catalogue = await api<{ scenarios: Scenario[] }>("/scenarios");
        if (!alive) return;
        setScenarios(catalogue.scenarios);
        let traveler = readSession();
        if (traveler) {
          try {
            traveler = {
              ...traveler,
              progress: await api<Progress>("/progress", traveler.token),
            };
          } catch (failure) {
            if (failure instanceof ApiError && failure.status === 401)
              traveler = null;
            else throw failure;
          }
        }
        if (!traveler)
          traveler = await api<Session>("/sessions", undefined, {
            nickname: `여행자${Math.floor(1000 + Math.random() * 9000)}`,
            avatar: "mint",
          });
        if (!alive) return;
        saveSession(traveler);
        sessionRef.current = traveler;
        setSession(traveler);
        setProgress(traveler.progress);
        setError("");
        track("session_started", { location: roomRef.current || "hub" });
      } catch {
        if (alive) {
          setConnection("offline");
          setError(
            "여행 월드에 연결하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.",
          );
        }
      }
    }
    void init();
    return () => {
      alive = false;
    };
  }, [retry, track]);

  // A field owns its socket, movement timers and visible multiplayer state.
  // The hub passes null and keeps only the shared session/progress above.
  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let ownedSocket: WebSocket | null = null;
    let attempts = 0;
    clearTimeout(moveTimer.current);
    moveTimer.current = undefined;
    moveTime.current = 0;
    moveEventTime.current = 0;
    positionRef.current = { ...FIELD_SPAWN };
    setPosition({ ...FIELD_SPAWN });
    setPlayers([]);
    setMessages([]);
    setRoomError("");
    setRealtimeRoom(room);
    setConnection(room && session ? "connecting" : "offline");

    if (room && session) {
      const fieldRoom = room;
      const token = session.token;
      function connect() {
        if (disposed || roomRef.current !== fieldRoom) return;
        setConnection("connecting");
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(
          `${protocol}//${location.host}/ws/world?token=${encodeURIComponent(token)}&room=${encodeURIComponent(fieldRoom)}`,
        );
        ownedSocket = ws;
        socket.current = ws;
        const isCurrent = () =>
          !disposed &&
          socket.current === ws &&
          roomRef.current === fieldRoom &&
          sessionRef.current?.token === token;
        ws.onopen = () => {
          if (!isCurrent()) {
            ws.close();
            return;
          }
          attempts = 0;
          setRoomError("");
          setConnection("online");
          ws.send(JSON.stringify({ type: "move", ...positionRef.current }));
        };
        ws.onmessage = (event) => {
          if (!isCurrent()) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "snapshot") {
              setPlayers(data.players);
              setMessages(data.messages || []);
            }
            if (data.type === "presence") setPlayers(data.players);
            if (data.type === "move")
              setPlayers((current) => [
                ...current.filter((player) => player.id !== data.player.id),
                data.player,
              ]);
            if (data.type === "chat")
              setMessages((current) =>
                current.some((message) => message.id === data.message.id)
                  ? current
                  : [...current, data.message].slice(-100),
              );
            if (data.type === "error") setRoomError(data.message);
          } catch {
            /* Ignore malformed frames. */
          }
        };
        ws.onclose = () => {
          if (!isCurrent()) return;
          socket.current = null;
          setConnection("offline");
          setPlayers([]);
          reconnectTimer = setTimeout(
            connect,
            Math.min(15000, 1000 * 2 ** attempts++),
          );
        };
        ws.onerror = () => {
          if (isCurrent()) ws.close();
        };
      }
      connect();
    }

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      clearTimeout(moveTimer.current);
      moveTimer.current = undefined;
      if (socket.current === ownedSocket) socket.current = null;
      if (ownedSocket) {
        ownedSocket.onopen = null;
        ownedSocket.onmessage = null;
        ownedSocket.onclose = null;
        ownedSocket.onerror = null;
        ownedSocket.close();
      }
    };
  }, [room, session]);

  useEffect(() => {
    const interval = setInterval(() => void flush(), 5000);
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      const traveler = sessionRef.current;
      if (!traveler || !events.current.length) return;
      const batch = events.current.splice(0, 50);
      void fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${traveler.token}`,
        },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      })
        .then((response) => {
          if (!response.ok) events.current.unshift(...batch);
        })
        .catch(() => events.current.unshift(...batch));
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  const move = useCallback(
    (next: { x: number; y: number }) => {
      if (!room || roomRef.current !== room) return;
      next = {
        x: Math.max(5, Math.min(95, next.x)),
        y: Math.max(15, Math.min(92, next.y)),
      };
      setPosition(next);
      positionRef.current = next;
      clearTimeout(moveTimer.current);
      const fieldSocket = socket.current;
      const publish = () => {
        if (
          roomRef.current === room &&
          fieldSocket &&
          socket.current === fieldSocket &&
          fieldSocket.readyState === WebSocket.OPEN
        ) {
          fieldSocket.send(
            JSON.stringify({ type: "move", ...positionRef.current }),
          );
          moveTime.current = Date.now();
        }
      };
      const elapsed = Date.now() - moveTime.current;
      if (elapsed >= 100) publish();
      else moveTimer.current = setTimeout(publish, 100 - elapsed);
      if (Date.now() - moveEventTime.current > 1500) {
        track("world_moved", {
          room,
          x: Math.round(next.x),
          y: Math.round(next.y),
        });
        moveEventTime.current = Date.now();
      }
    },
    [room, track],
  );

  const send = useCallback(
    (text: string) => {
      if (
        !room ||
        roomRef.current !== room ||
        socket.current?.readyState !== WebSocket.OPEN
      )
        return false;
      socket.current.send(JSON.stringify({ type: "chat", text }));
      track("chat_sent", { room, length: text.length });
      return true;
    },
    [room, track],
  );

  const updateProgress = useCallback((next: Progress) => {
    setProgress(next);
    const traveler = sessionRef.current;
    if (traveler) {
      traveler.progress = next;
      saveSession(traveler);
    }
  }, []);

  // Route rendering happens before effect cleanup: hide the departing field immediately.
  const currentField = room !== null && realtimeRoom === room;
  return {
    session,
    scenarios,
    progress,
    players: currentField ? players : [],
    messages: currentField ? messages : [],
    position: currentField ? position : FIELD_SPAWN,
    connection:
      room === null
        ? ("offline" as const)
        : currentField
          ? connection
          : ("connecting" as const),
    error: error || (currentField ? roomError : ""),
    move,
    send,
    track,
    flush,
    updateProgress,
    reconnect: () => setRetry((value) => value + 1),
  };
}
