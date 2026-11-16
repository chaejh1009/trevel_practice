import "./JungtokiGuide.css";

export const JUNGTOKI_GUIDE_ASSET = "/brand/jungtoki.png";
export const JUNGTOKI_GUIDE_NAME = "중톡이";
export const JUNGTOKI_GUIDE_ROLES: Record<string, string> = {
  prepare: "여행준비가이드",
  immigration: "입국연습가이드",
  hotel: "호텔가이드",
  didi: "디디가이드",
};

/** The original Second Brain mascot, placed with its feet at the SVG origin. */
export function JungtokiGuideSprite({
  className = "",
}: {
  className?: string;
}) {
  return (
    <g className={`jungtoki-guide-sprite ${className}`} aria-hidden="true">
      <ellipse cy="2" rx="21" ry="6.5" fill="#6c776d25" />
      <image
        href={JUNGTOKI_GUIDE_ASSET}
        x="-45"
        y="-90"
        width="90"
        height="90"
        preserveAspectRatio="xMidYMax meet"
      />
    </g>
  );
}

/** Unmodified transparent brand image for portraits and welcome panels. */
export default function JungtokiGuide({
  className = "",
}: {
  className?: string;
}) {
  return (
    <img
      className={`jungtoki-guide ${className}`}
      src={JUNGTOKI_GUIDE_ASSET}
      width="1254"
      height="1254"
      alt="지도를 들고 배낭을 멘 여행 안내 캐릭터 중톡이"
      decoding="async"
      draggable={false}
    />
  );
}
