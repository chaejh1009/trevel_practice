import { memo } from "react";
import { getAtlasFrame, TRAVELER_ATLAS } from "../lib/avatarAtlas";
import type { Facing } from "../lib/movement";
import "./TravelerAvatar.css";

export type TravelerDirection = Facing;
export interface TravelerAvatarProps {
  avatar?: string;
  className?: string;
  direction?: TravelerDirection;
  moving?: boolean;
  frame?: number;
  portrait?: boolean;
}

/** Display original generated artwork through an SVG viewport; the PNG is never repainted. */
export const TravelerSprite = memo(function TravelerSprite({
  avatar = "mint",
  className = "",
  direction = "down",
  moving = false,
  frame,
}: TravelerAvatarProps) {
  const animated = moving && frame === undefined;
  const poses = animated ? [0, 1, 2, 3] : [frame ?? 0];
  return (
    <g
      className={`traveler-sprite traveler-facing-${direction} ${animated ? "is-walking" : ""} ${className}`}
      data-avatar={avatar}
      data-direction={direction}
    >
      <ellipse cx="0" cy="1" rx="12" ry="4" fill="#244036" opacity=".19" />
      {poses.map((pose, index) => {
        const cell = getAtlasFrame(direction, pose);
        return (
          <svg
            key={pose}
            x="-38"
            y="-73"
            width="76"
            height="76"
            viewBox={`${cell.x} ${cell.y} ${cell.width} ${cell.height}`}
            preserveAspectRatio="xMidYMid meet"
            overflow="hidden"
            className={
              animated
                ? `traveler-atlas-frame traveler-atlas-frame-${index}`
                : "traveler-atlas-static"
            }
            data-frame={pose}
            aria-hidden="true"
          >
            <image
              href={TRAVELER_ATLAS.src}
              x="0"
              y="0"
              width={TRAVELER_ATLAS.width}
              height={TRAVELER_ATLAS.height}
            />
          </svg>
        );
      })}
    </g>
  );
});

export default function TravelerAvatar({
  avatar = "mint",
  className = "",
  direction = "down",
  moving = false,
  frame,
  portrait = false,
}: TravelerAvatarProps) {
  return (
    <svg
      className={`traveler-avatar ${portrait ? "traveler-avatar-portrait" : ""} ${className}`}
      viewBox={portrait ? "-19 -74 38 40" : "-28 -76 56 80"}
      width="56"
      height="80"
      role="img"
      aria-label="여행자 아바타"
    >
      <TravelerSprite
        avatar={avatar}
        direction={direction}
        moving={moving}
        frame={frame}
      />
    </svg>
  );
}
