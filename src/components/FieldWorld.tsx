import {
  memo,
  useId,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Player as WorldPlayer } from "../lib/types";
import type { Facing, Point } from "../lib/movement";
import { FIELD_GEOMETRY } from "../lib/fieldGeometry";
import { TravelerSprite } from "./TravelerAvatar";
import {
  JungtokiGuideSprite,
  JUNGTOKI_GUIDE_NAME,
  JUNGTOKI_GUIDE_ROLES,
} from "./JungtokiGuide";
import "./FieldWorld.css";
import TaxiFleet from "./TaxiFleet";
import type { TaxiRideSession } from "../lib/taxiRide";

export interface FieldWorldProps {
  fieldId: string;
  players: WorldPlayer[];
  selfId: string | null;
  position: { x: number; y: number };
  onMove: (position: { x: number; y: number }) => void;
  onInteract: () => void;
  completed: boolean;
  facing?: Facing;
  moving?: boolean;
  canInteract?: boolean;
  target?: Point | null;
  interactionDisabled?: boolean;
  taxiRide?: TaxiRideSession | null;
  nearTaxiId?: string | null;
  onTaxiSelect?: (vehicleId: string) => void;
}

const point = (u: number, v: number, z = 0) => `${u - v},${(u + v) / 2 - z}`;
const poly = (...values: [number, number, number?][]) =>
  values.map(([u, v, z]) => point(u, v, z)).join(" ");

function Box({
  x,
  y,
  w,
  d,
  h,
  top,
  front,
  side,
  children,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  top: string;
  front: string;
  side: string;
  children?: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon
        points={poly([0, d], [w, d], [w, d, h], [0, d, h])}
        fill={front}
      />
      <polygon
        points={poly([w, 0], [w, d], [w, d, h], [w, 0, h])}
        fill={side}
      />
      <polygon
        points={poly([0, 0, h], [w, 0, h], [w, d, h], [0, d, h])}
        fill={top}
      />
      {children}
    </g>
  );
}

function Plant({
  x,
  y,
  scale = 1,
  pink = false,
}: {
  x: number;
  y: number;
  scale?: number;
  pink?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="5" rx="20" ry="9" fill="#3f655918" />
      <path d="M-13-17h26L9 7Q0 12-9 7Z" fill={pink ? "#c6a58b" : "#c6bd99"} />
      <ellipse cy="-17" rx="13" ry="6" fill="#e3d4b3" />
      <path
        d="M0-17v-43m0 29L-16-47m16 5l17-16"
        stroke="#7c9b70"
        strokeWidth="3"
        fill="none"
      />
      <ellipse
        cx="-13"
        cy="-48"
        rx="7"
        ry="15"
        transform="rotate(-40 -13 -48)"
        fill="#8aaa7d"
      />
      <ellipse
        cx="13"
        cy="-57"
        rx="7"
        ry="16"
        transform="rotate(35 13 -57)"
        fill="#7d9f78"
      />
      <ellipse cy="-65" rx="8" ry="16" fill="#a7bc8c" />
      <ellipse
        cx="9"
        cy="-35"
        rx="6"
        ry="13"
        transform="rotate(45 9 -35)"
        fill="#a7bc8c"
      />
    </g>
  );
}

function Suitcase({
  x,
  y,
  color = "#d9ad72",
  scale = 1,
}: {
  x: number;
  y: number;
  color?: string;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="5" rx="16" ry="6" fill="#3f655918" />
      <path d="M-8-33v-12h12v12" stroke="#798c7d" strokeWidth="3" fill="none" />
      <path d="M-12-33l22 2 4 30-24 2z" fill={color} />
      <path d="M10-31l6-4 3 30-5 4z" fill="#8b9b7d" opacity=".65" />
      <path
        d="M-6-28l2 23m6-22l2 22"
        stroke="#fff7da"
        strokeWidth="2"
        opacity=".6"
      />
      <circle cx="-6" cy="3" r="3" fill="#647b70" />
      <circle cx="12" cy="1" r="3" fill="#647b70" />
    </g>
  );
}

function Bench({
  x,
  y,
  color = "#b9c6ad",
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Box
        x={0}
        y={0}
        w={74}
        d={27}
        h={17}
        top={color}
        front="#9ba98c"
        side="#879c87"
      />
      <Box
        x={0}
        y={-14}
        w={74}
        d={8}
        h={29}
        top="#d4dec6"
        front={color}
        side="#879c87"
      />
      <path d="M-16 1v13m66 33v12" stroke="#788c7c" strokeWidth="4" />
    </g>
  );
}

function Room({
  theme,
  children,
}: {
  theme: "home" | "airport" | "hotel";
  children: ReactNode;
}) {
  const colors =
    theme === "home"
      ? {
          floor: "#e8ddc5",
          left: "#e5e2cf",
          right: "#f2edda",
          edge: "#c7bba0",
          line: "#d5c7ad",
        }
      : theme === "hotel"
        ? {
            floor: "#eadfd0",
            left: "#ddd4ca",
            right: "#eee3d1",
            edge: "#c4b4a0",
            line: "#d8cabb",
          }
        : {
            floor: "#e4ece6",
            left: "#d8e6e1",
            right: "#edf1e7",
            edge: "#b4cbc2",
            line: "#cbdad0",
          };
  return (
    <>
      <ellipse cx="506" cy="537" rx="350" ry="29" fill="#627f6a0d" />
      <path
        d="M125 298L495 106 884 303v24L513 563 125 324Z"
        fill={colors.edge}
      />
      <path d="M125 298L495 106 884 303 513 539Z" fill={colors.floor} />
      <g stroke={colors.line} strokeWidth="1" opacity=".65">
        {Array.from({ length: 11 }, (_, i) => (
          <path
            key={`a${i}`}
            d={`M${125 + i * 34} ${298 - i * 17.65}L${513 + i * 34} ${539 - i * 21.63}`}
          />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <path
            key={`b${i}`}
            d={`M${125 + i * 35.3} ${298 + i * 21.9}L${495 + i * 35.3} ${106 + i * 17.9}`}
          />
        ))}
      </g>
      <path d="M125 298V154L495-38V106Z" fill={colors.left} />
      <path d="M495-38L884 159V303L495 106Z" fill={colors.right} />
      <path
        d="M125 298L495 106 884 303"
        fill="none"
        stroke="#fffaf0"
        strokeWidth="8"
      />
      <path
        d="M125 154L495-38 884 159"
        fill="none"
        stroke="#fffaf0"
        strokeWidth="7"
      />
      {children}
    </>
  );
}

function HomeScene() {
  return (
    <Room theme="home">
      <g transform="translate(229 155) skewY(-27)">
        <rect
          width="124"
          height="83"
          rx="2"
          fill="#fbf7e7"
          stroke="#c7ccb5"
          strokeWidth="5"
        />
        <rect x="8" y="8" width="108" height="67" fill="#c6dfd5" />
        <path d="M8 60l23-23 23 9 35-25 27 26v28H8Z" fill="#a9c4ac" />
        <path d="M62 8v67M8 41h108" stroke="#f8f4e3" strokeWidth="5" />
        <circle cx="95" cy="22" r="9" fill="#f2e5b5" />
      </g>
      <g transform="translate(605 100) skewY(27)">
        <rect
          width="92"
          height="63"
          rx="3"
          fill="#f5f0dd"
          stroke="#d5c5a8"
          strokeWidth="4"
        />
        <path
          d="M17 22l18 7 7-15 12 4-6 12 22 9-3 7-24-7-11 12-6-3 7-14-20-7Z"
          fill="#89a998"
        />
        <text
          x="46"
          y="58"
          textAnchor="middle"
          fontSize="7"
          letterSpacing="2"
          fill="#9aa68b"
        >
          LET’S GO
        </text>
      </g>
      <Box
        x={458}
        y={148}
        w={45}
        d={42}
        h={76}
        top="#c6b290"
        front="#dac7a8"
        side="#bca783"
      >
        <polygon
          points={poly([5, 43, 16], [39, 43, 16], [39, 43, 67], [5, 43, 67])}
          fill="#e9dbc0"
        />
        <path d="M-20-21v15" stroke="#b5a17e" strokeWidth="2" />
      </Box>
      <g transform="translate(667 217)">
        <Box
          x={0}
          y={0}
          w={114}
          d={48}
          h={45}
          top="#d1b78d"
          front="#bda782"
          side="#ac987b"
        >
          <polygon
            points={poly(
              [-4, -4, 48],
              [118, -4, 48],
              [118, 52, 48],
              [-4, 52, 48],
            )}
            fill="#e6d1aa"
          />
        </Box>
        <g transform="translate(17 -27)">
          <path d="M-20 0l35 18 4-29-34-17Z" fill="#6c8e82" />
          <path d="M-15-3l25 13 3-19-25-13Z" fill="#bdd8cd" />
          <path d="M-20 0L15 18l20-10L0-10Z" fill="#b5c6ad" />
          <path d="M-9 2L10 12l12-5L3-3Z" fill="#8fa58d" />
        </g>
        <g transform="translate(63 2) rotate(27)">
          <rect x="-12" y="-8" width="24" height="17" rx="2" fill="#357d68" />
          <circle r="4" fill="none" stroke="#d7dfba" strokeWidth="1" />
          <text textAnchor="middle" y="-3" fontSize="3" fill="#e3e2ba">
            PASSPORT
          </text>
        </g>
        <g transform="translate(-19 18)">
          <path d="M-9-10l21 10-7 6-21-10Z" fill="#fff7df" />
          <path d="M-12-8l18 9" stroke="#b8c3a0" strokeWidth="2" />
        </g>
        <text
          x="28"
          y="59"
          fontSize="9"
          fill="#8c947b"
          transform="rotate(27 28 59)"
        >
          TRAVEL DESK
        </text>
      </g>
      <g transform="translate(309 307)">
        <Box
          x={0}
          y={0}
          w={117}
          d={52}
          h={24}
          top="#afbda1"
          front="#95a88d"
          side="#829b85"
        />
        <Box
          x={0}
          y={-20}
          w={117}
          d={14}
          h={49}
          top="#c8d0b4"
          front="#acbda0"
          side="#94ab91"
        />
        <Box
          x={-7}
          y={0}
          w={15}
          d={58}
          h={38}
          top="#bdc9ac"
          front="#a7b99a"
          side="#91a68a"
        />
        <Box
          x={106}
          y={0}
          w={15}
          d={58}
          h={38}
          top="#bdc9ac"
          front="#a7b99a"
          side="#91a68a"
        />
        <polygon
          points={poly([26, 8, 28], [54, 8, 28], [54, 33, 28], [26, 33, 28])}
          fill="#e2c6a1"
        />
        <polygon
          points={poly([69, 8, 28], [94, 8, 28], [94, 34, 28], [69, 34, 28])}
          fill="#e8dfbf"
        />
      </g>
      <path
        d="M435 340l155 80-95 59-152-83Z"
        fill="#f2e9d4"
        stroke="#ded1b1"
        strokeWidth="2"
      />
      <path
        d="M442 351l132 68-80 48-130-71Z"
        fill="none"
        stroke="#d4c6a6"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <Box
        x={451}
        y={378}
        w={66}
        d={40}
        h={24}
        top="#e1ccaa"
        front="#c9b593"
        side="#bfa98c"
      />
      <g transform="translate(463 383) rotate(27)">
        <rect x="-7" y="-14" width="25" height="17" rx="1" fill="#f4edce" />
        <path d="M-3-10h16m-16 4h13" stroke="#b5c09f" strokeWidth="2" />
      </g>
      <Suitcase x={657} y={335} scale={1.3} />
      <Suitcase x={690} y={353} color="#87afa3" scale={0.9} />
      <Plant x={759} y={292} scale={1.15} />
      <Plant x={199} y={312} scale={1.1} />
      <g transform="translate(576 125)">
        <path d="M0 0v-50" stroke="#a9aa8a" strokeWidth="2" />
        <path d="M-25-46l10-21h30l10 21Z" fill="#f3e4b9" />
        <ellipse cy="-46" rx="25" ry="8" fill="#fff4cf" />
      </g>
      <g transform="translate(518 506) rotate(28)">
        <text textAnchor="middle" fontSize="9" fill="#b3a486" letterSpacing="3">
          MY LITTLE DEPARTURE LOUNGE
        </text>
      </g>
    </Room>
  );
}

function QueuePost({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx="7" ry="3.5" fill="#8caaa0" />
      <path d="M0 0v-27" stroke="#9eb6ad" strokeWidth="3" />
      <circle cy="-27" r="3" fill="#75988b" />
    </g>
  );
}

function AirportScene() {
  return (
    <Room theme="airport">
      <g transform="translate(196 195) skewY(-27)">
        <rect
          width="168"
          height="97"
          rx="2"
          fill="#a4c9c2"
          stroke="#eff4e8"
          strokeWidth="6"
        />
        <path d="M0 64l168-33M0 88l168-33" stroke="#c1d9cb" strokeWidth="10" />
        <path d="M56 0v97m56-97v97" stroke="#e6eee0" strokeWidth="5" />
        <path
          d="M26 62l20-6 11-16 5-1-4 16 19 2 7-5 3 1-4 8-7 3-18-1-1 18-4 1-6-19-19 4Z"
          fill="#eff5e5"
        />
      </g>
      <g transform="translate(561 73) skewY(27)">
        <rect width="216" height="48" rx="3" fill="#3f7e75" />
        <text
          x="18"
          y="22"
          fontSize="13"
          fill="#f5f5df"
          fontWeight="700"
          letterSpacing="2"
        >
          IMMIGRATION
        </text>
        <text x="18" y="37" fontSize="8" fill="#bbd8c1" letterSpacing="3">
          入境检查 · 입국심사
        </text>
        <path
          d="M190 14v18m-6-6l6 6 6-6"
          fill="none"
          stroke="#eef3dd"
          strokeWidth="2"
        />
      </g>
      {[
        { x: 553, y: 222, n: "01" },
        { x: 657, y: 274, n: "02" },
        { x: 761, y: 326, n: "03" },
      ].map(({ x, y, n }) => (
        <g key={n} transform={`translate(${x} ${y})`}>
          <Box
            x={0}
            y={0}
            w={64}
            d={51}
            h={51}
            top="#d7e4d6"
            front="#a9c5b8"
            side="#8aafa6"
          />
          <polygon
            points={poly([0, 4, 53], [64, 4, 53], [64, 4, 97], [0, 4, 97])}
            fill="#c6e1d7"
            opacity=".8"
            stroke="#f2f5e8"
            strokeWidth="3"
          />
          <Box
            x={24}
            y={-3}
            w={20}
            d={13}
            h={57}
            top="#718f84"
            front="#638b7c"
            side="#527b70"
          />
          <g transform="translate(17 -66)">
            <circle r="12" fill="#4e8a79" />
            <text
              y="4"
              fontSize="9"
              textAnchor="middle"
              fill="#f2f6dd"
              fontWeight="700"
            >
              {n}
            </text>
          </g>
          <polygon
            points={poly(
              [17, 52, 11],
              [46, 52, 11],
              [46, 52, 31],
              [17, 52, 31],
            )}
            fill="#e3eedf"
          />
          <g transform="translate(-19 14) rotate(27)">
            <text textAnchor="middle" fontSize="7" fill="#5c8a77">
              PASSPORT
            </text>
          </g>
        </g>
      ))}
      <g stroke="#6d9d8c" strokeWidth="3" fill="none">
        <path d="M327 307l123 64M377 276l124 64M359 381l124 64M410 351l122 62" />
        <path d="M450 371l51-31M359 381l51-30M483 445l49-32" />
      </g>
      {[
        { x: 327, y: 334 },
        { x: 450, y: 398 },
        { x: 377, y: 303 },
        { x: 501, y: 367 },
        { x: 359, y: 408 },
        { x: 483, y: 472 },
        { x: 410, y: 378 },
        { x: 532, y: 440 },
      ].map((p, i) => (
        <QueuePost key={i} {...p} />
      ))}
      <g transform="translate(289 326)">
        <path d="M0 0v-39" stroke="#91aa99" strokeWidth="3" />
        <path d="M-15-44l30 15v20l-30-15Z" fill="#477f6e" />
        <path
          d="M-9-33l16 8m-4-6l4 6-6 1"
          fill="none"
          stroke="#ebf2d8"
          strokeWidth="2"
        />
      </g>
      <Bench x={244} y={379} color="#a8c4b5" />
      <Suitcase x={220} y={425} color="#d6b57e" />
      <Plant x={806} y={361} scale={0.9} />
      <Plant x={457} y={181} scale={0.75} />
      <g transform="translate(615 447) rotate(-31)">
        <path d="M-35-14h70v28h-70Z" fill="#d2dfcd" />
        <text
          textAnchor="middle"
          y="4"
          fontSize="9"
          fill="#8baa91"
          letterSpacing="1"
        >
          WAIT HERE
        </text>
        <path
          d="M-12-24l12-7 12 7M0-30v-14"
          fill="none"
          stroke="#8baa91"
          strokeWidth="2"
        />
      </g>
      <g transform="translate(538 510) rotate(28)">
        <text textAnchor="middle" fontSize="9" letterSpacing="3" fill="#9fbaaa">
          PUDONG INTERNATIONAL AIRPORT
        </text>
      </g>
    </Room>
  );
}

function HotelScene() {
  return (
    <Room theme="hotel">
      <g transform="translate(209 188) skewY(-27)">
        <rect x="-7" y="-7" width="113" height="114" fill="#d0c4b6" />
        <rect width="99" height="104" fill="#b9b4a7" />
        <path d="M49 0v104" stroke="#eee3d0" strokeWidth="2" />
        <path d="M6 7h87v89H6Z" fill="none" stroke="#d9cbb4" strokeWidth="3" />
        <rect x="32" y="-24" width="35" height="13" rx="2" fill="#ac9c82" />
        <text x="49" y="-15" textAnchor="middle" fontSize="8" fill="#fbf2d5">
          ↑ 01
        </text>
      </g>
      <g transform="translate(598 102) skewY(27)">
        <rect x="-21" y="-21" width="186" height="87" rx="4" fill="#e5d4ba" />
        <path
          d="M-10-10h164v65H-10Z"
          fill="none"
          stroke="#c5a681"
          strokeWidth="1"
        />
        <text
          x="72"
          y="8"
          textAnchor="middle"
          fontSize="10"
          letterSpacing="4"
          fill="#997d5f"
        >
          THE BUND
        </text>
        <text
          x="72"
          y="29"
          textAnchor="middle"
          fontSize="18"
          letterSpacing="6"
          fill="#a38965"
        >
          花园酒店
        </text>
        <text
          x="72"
          y="46"
          textAnchor="middle"
          fontSize="7"
          letterSpacing="3"
          fill="#b19a76"
        >
          GARDEN HOTEL
        </text>
      </g>
      <g transform="translate(611 253)">
        <Box
          x={0}
          y={0}
          w={157}
          d={49}
          h={51}
          top="#d7b899"
          front="#c7ab8b"
          side="#ad937a"
        >
          <polygon
            points={poly(
              [-5, -5, 54],
              [162, -5, 54],
              [162, 54, 54],
              [-5, 54, 54],
            )}
            fill="#f5e9d3"
          />
          {[16, 48, 80, 112, 144].map((u) => (
            <line
              key={u}
              x1={u - 50}
              y1={(u + 50) / 2 - 8}
              x2={u - 50}
              y2={(u + 50) / 2 - 43}
              stroke="#dec6a3"
              strokeWidth="2"
            />
          ))}
        </Box>
        <g transform="translate(19 -32)">
          <path d="M-10-11l25 13v23L-10 12Z" fill="#73918a" />
          <path d="M-6-6l16 9v13l-16-8Z" fill="#c8d8c5" />
        </g>
        <g transform="translate(75 7)">
          <ellipse cy="-13" rx="7" ry="3" fill="#d6b77e" />
          <path d="M-8-13q0-14 8-14t8 14Z" fill="#d6b77e" />
          <path d="M0-26v-3" stroke="#9d855f" strokeWidth="2" />
        </g>
        <g transform="translate(-20 27) rotate(27)">
          <text fontSize="9" letterSpacing="2" fill="#947a5c">
            RECEPTION
          </text>
        </g>
      </g>
      <path d="M390 322l225 116-101 62-221-117Z" fill="#c3a28e" />
      <path
        d="M396 333l200 105-83 51-198-106Z"
        fill="none"
        stroke="#e3c9a7"
        strokeWidth="2"
      />
      <g transform="translate(308 341)">
        <Box
          x={0}
          y={0}
          w={70}
          d={42}
          h={21}
          top="#b8aaad"
          front="#a09197"
          side="#8f848e"
        />
        <Box
          x={0}
          y={-17}
          w={70}
          d={13}
          h={46}
          top="#cec0bd"
          front="#b2a4ac"
          side="#978c98"
        />
        <Box
          x={-7}
          y={0}
          w={13}
          d={48}
          h={31}
          top="#c7b7b8"
          front="#b2a1a7"
          side="#a0919d"
        />
        <Box
          x={64}
          y={0}
          w={13}
          d={48}
          h={31}
          top="#c7b7b8"
          front="#b2a1a7"
          side="#a0919d"
        />
      </g>
      <g transform="translate(255 415)">
        <Box
          x={0}
          y={0}
          w={60}
          d={35}
          h={17}
          top="#e5d5b6"
          front="#cbb793"
          side="#b4a181"
        />
        <g transform="translate(6 -2)">
          <path d="M-5-7l13 7 9-5-13-7Z" fill="#f5edd2" />
          <path d="M0-6l8 4" stroke="#c8c6a5" strokeWidth="1" />
        </g>
      </g>
      <Plant x={191} y={318} scale={1.2} pink />
      <Plant x={812} y={337} scale={1.2} pink />
      <Plant x={444} y={174} scale={1.05} pink />
      <Suitcase x={626} y={409} color="#c4b28f" scale={1.05} />
      <g transform="translate(533 159)">
        <path d="M0-52v-30" stroke="#c2ad84" strokeWidth="2" />
        <ellipse
          cy="-42"
          rx="50"
          ry="19"
          fill="none"
          stroke="#bca27a"
          strokeWidth="4"
        />
        <path
          d="M-46-43v18m22-36v19m24-20v21m25-20v19m21-1v18"
          stroke="#cbb18a"
          strokeWidth="2"
        />
        {[-46, -24, 0, 25, 46].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={i === 0 || i === 4 ? -22 : -39}
            r="5"
            fill="#fff0c4"
          />
        ))}
      </g>
      <g transform="translate(454 470) rotate(28)">
        <text
          textAnchor="middle"
          fontSize="10"
          letterSpacing="4"
          fill="#a78970"
        >
          WELCOME HOME
        </text>
      </g>
      <g transform="translate(742 385)">
        <path d="M0 0v-41" stroke="#b39e7d" strokeWidth="3" />
        <path d="M-15-45l30 15v20l-30-15Z" fill="#e5d5b9" />
        <text
          x="0"
          y="-26"
          textAnchor="middle"
          fontSize="7"
          fill="#ac906b"
          transform="rotate(27 0 -26)"
        >
          CHECK IN
        </text>
      </g>
    </Room>
  );
}

function PickupScene() {
  return (
    <>
      <ellipse cx="505" cy="541" rx="350" ry="26" fill="#627f6a0d" />
      <path d="M100 289L477 90l423 211v28L523 566 100 343Z" fill="#b7c8b7" />
      <path d="M100 289L477 90l423 211-377 237L100 315Z" fill="#dbe5cf" />
      <path d="M177 257L477 102l346 173-301 188Z" fill="#e9e9d9" />
      <path d="M100 315l164-87 421 211-162 99Z" fill="#bdcabc" />
      <path d="M100 306l164-87 421 211-162 99Z" fill="#d3d9cb" />
      <path
        d="M135 306l421 211M219 257l421 212"
        stroke="#faf7e7"
        strokeWidth="2"
        strokeDasharray="14 13"
      />
      <path d="M267 221L687 431" stroke="#faf4cf" strokeWidth="5" />
      <g stroke="#eff2e4" strokeWidth="9">
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={`M${424 + i * 12} ${329 + i * 6}l-66 36`} />
        ))}
      </g>
      <g transform="translate(477 126)">
        <Box
          x={0}
          y={0}
          w={259}
          d={92}
          h={93}
          top="#cadcd0"
          front="#b1cec3"
          side="#8eb4aa"
        >
          <polygon
            points={poly([7, 93, 8], [251, 93, 8], [251, 93, 81], [7, 93, 81])}
            fill="#a4c7bd"
          />
          {[43, 84, 125, 166, 207, 248].map((u) => (
            <line
              key={u}
              x1={u - 93}
              y1={(u + 93) / 2 - 8}
              x2={u - 93}
              y2={(u + 93) / 2 - 81}
              stroke="#e3ead9"
              strokeWidth="4"
            />
          ))}
          <polygon
            points={poly(
              [259, 6, 9],
              [259, 85, 9],
              [259, 85, 80],
              [259, 6, 80],
            )}
            fill="#a3c6bb"
          />
          <polygon
            points={poly(
              [-8, -8, 96],
              [267, -8, 96],
              [267, 100, 96],
              [-8, 100, 96],
            )}
            fill="#dce7d7"
          />
          <polygon
            points={poly(
              [-8, 100, 86],
              [267, 100, 86],
              [267, 100, 96],
              [-8, 100, 96],
            )}
            fill="#b8cdbb"
          />
          <g transform="translate(67 10) rotate(27)">
            <text
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              letterSpacing="3"
              fill="#5c8a76"
            >
              PUDONG AIRPORT
            </text>
            <text
              y="17"
              textAnchor="middle"
              fontSize="8"
              letterSpacing="4"
              fill="#7e9b81"
            >
              ARRIVALS · 到达
            </text>
          </g>
        </Box>
      </g>
      <g transform="translate(296 254)">
        <path d="M0 0v-90" stroke="#819d8b" strokeWidth="4" />
        <path d="M-24-102l48 24v39l-48-24Z" fill="#4b9279" />
        <text
          x="0"
          y="-66"
          textAnchor="middle"
          fontSize="23"
          fontWeight="700"
          fill="#edf4d9"
          transform="rotate(27 0 -66)"
        >
          A
        </text>
        <path d="M-9-53l18 9" stroke="#dceacd" strokeWidth="3" />
      </g>
      <g transform="translate(744 327)">
        <Box
          x={0}
          y={0}
          w={51}
          d={20}
          h={72}
          top="#b7cebb"
          front="#a4bba6"
          side="#8ca68f"
        />
        <polygon
          points={poly([5, 21, 16], [45, 21, 16], [45, 21, 62], [5, 21, 62])}
          fill="#f3efda"
        />
        <g transform="translate(7 -20) rotate(27)">
          <text
            textAnchor="middle"
            fontSize="10"
            fill="#7e9b73"
            fontWeight="700"
          >
            DiDi
          </text>
        </g>
      </g>
      <Bench x={623} y={330} color="#bdcfb3" />
      <Suitcase x={664} y={374} color="#d3b077" />
      <Suitcase x={687} y={384} color="#8eafa0" scale={0.8} />
      <Plant x={832} y={310} scale={1.2} />
      <Plant x={204} y={269} scale={1.1} />
      <g transform="translate(775 392)">
        <ellipse cy="4" rx="15" ry="6" fill="#59827113" />
        <path
          d="M0 0v-67q0-8 8-8h18"
          fill="none"
          stroke="#8da28d"
          strokeWidth="3"
        />
        <path d="M18-78l17 8-5 5-17-8Z" fill="#e9ecd5" />
      </g>
      <g transform="translate(804 460) rotate(-32)">
        <path d="M-39-16h78v32h-78Z" fill="#c8d9bc" />
        <text
          textAnchor="middle"
          y="4"
          fontSize="9"
          fill="#8da580"
          letterSpacing="2"
        >
          PICKUP ZONE
        </text>
      </g>
      <g transform="translate(481 546) rotate(28)">
        <text textAnchor="middle" fontSize="9" letterSpacing="3" fill="#9aa88a">
          NEXT STOP: YOUR FIRST ADVENTURE
        </text>
      </g>
    </>
  );
}

const MemoHomeScene = memo(HomeScene);
const MemoAirportScene = memo(AirportScene);
const MemoHotelScene = memo(HotelScene);
const MemoPickupScene = memo(PickupScene);

const npcInfo: Record<string, { name: string; role: string }> =
  Object.fromEntries(
    Object.entries(JUNGTOKI_GUIDE_ROLES).map(([field, role]) => [
      field,
      { name: JUNGTOKI_GUIDE_NAME, role },
    ]),
  );

const fieldInfo: Record<
  string,
  {
    label: string;
    hint: string;
    icon: string;
    x: number;
    y: number;
    title: string;
    english: string;
  }
> = {
  prepare: {
    label: "여행 준비 데스크",
    hint: "가방을 챙기고 일정을 확인해요",
    icon: "🧳",
    x: 748,
    y: 165,
    title: "출발 전, 나의 방",
    english: "BEFORE YOUR JOURNEY",
  },
  immigration: {
    label: "입국심사 시작하기",
    hint: "여행 목적을 말해보세요",
    icon: "🛂",
    x: 758,
    y: 174,
    title: "푸둥 공항 입국심사장",
    english: "PASSPORT CONTROL",
  },
  hotel: {
    label: "프런트 데스크",
    hint: "예약하고 체크인을 연습해요",
    icon: "🛎️",
    x: 741,
    y: 184,
    title: "와이탄 가든 호텔 로비",
    english: "A LITTLE PLACE TO STAY",
  },
  didi: {
    label: "디디 차량 호출하기",
    hint: "목적지와 내 차를 확인해요",
    icon: "🚕",
    x: 751,
    y: 172,
    title: "공항 지정 승차장 A",
    english: "YOUR NEXT DESTINATION",
  },
};

function FieldAvatar({
  player,
  self,
  facing = "down",
  moving = false,
}: {
  player: WorldPlayer;
  self: boolean;
  facing?: Facing;
  moving?: boolean;
}) {
  const lastPosition = useRef({ x: player.x, y: player.y });
  const [remotePose, setRemotePose] = useState<{
    facing: Facing;
    moving: boolean;
  }>({ facing: "down", moving: false });
  useEffect(() => {
    const last = lastPosition.current;
    const dx = (player.x - last.x) * 10;
    const dy = (player.y - last.y) * 6.2;
    lastPosition.current = { x: player.x, y: player.y };
    if (self || Math.abs(dx) + Math.abs(dy) < 0.01) return;
    const nextFacing: Facing =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up";
    setRemotePose({ facing: nextFacing, moving: true });
    const timer = setTimeout(
      () => setRemotePose((pose) => ({ ...pose, moving: false })),
      240,
    );
    return () => clearTimeout(timer);
  }, [player.x, player.y, self]);
  const name = `${player.nickname.slice(0, 12)}${self ? " · 나" : ""}`;
  const width = Math.max(42, name.length * 6.5 + 14);
  return (
    <g
      className={`field-player ${self ? "field-player-self" : "field-player-remote"}`}
      transform={`translate(${player.x * 10} ${player.y * 6.2})`}
      aria-label={`${player.nickname}${self ? " (나)" : ""}`}
    >
      {self && (
        <ellipse
          cy="3"
          rx="24"
          ry="12"
          fill="#3e997b17"
          stroke="#57a084"
          strokeDasharray="3 4"
          strokeWidth="1.4"
        />
      )}
      <TravelerSprite
        avatar={player.avatar}
        direction={self ? facing : remotePose.facing}
        moving={self ? moving : remotePose.moving}
      />
      <g transform="translate(0 -92)">
        <rect
          x={-width / 2}
          y="-13"
          width={width}
          height="24"
          rx="10"
          fill={self ? "#347e67" : "#fffaf0"}
          stroke={self ? "#347e67" : "#d5dfcb"}
        />
        <text
          textAnchor="middle"
          y="3"
          fontSize="10"
          fontWeight="600"
          fill={self ? "#fffdf0" : "#6b8064"}
        >
          {name}
        </text>
      </g>
    </g>
  );
}

export default function FieldWorld({
  fieldId,
  players,
  selfId,
  position,
  onMove,
  onInteract,
  completed,
  facing = "down",
  moving = false,
  canInteract = false,
  target = null,
  interactionDisabled = false,
  taxiRide = null,
  nearTaxiId = null,
  onTaxiSelect,
}: FieldWorldProps) {
  const info = fieldInfo[fieldId] || fieldInfo.prepare;
  const npc = npcInfo[fieldId] || npcInfo.prepare;
  const geometry =
    FIELD_GEOMETRY[fieldId as keyof typeof FIELD_GEOMETRY] ||
    FIELD_GEOMETRY.prepare;
  const npcPoint = geometry.npcPoint;
  const npcDisabled = interactionDisabled || Boolean(taxiRide);
  const canTalk = canInteract && !taxiRide;
  const interactionHint = interactionDisabled
    ? "대화가 끝나면 다시 이동할 수 있어요"
    : canTalk
      ? "F / E · 대화"
      : "다가가서 대화하기";
  const id = useId().replace(/:/g, "");
  const move = (event: MouseEvent<SVGSVGElement>) => {
    if (interactionDisabled) return;
    const svg = event.currentTarget;
    svg.focus({ preventScroll: true });
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const cursor = svg.createSVGPoint();
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    const local = cursor.matrixTransform(matrix.inverse());
    onMove({
      x: Math.max(9, Math.min(91, local.x / 10)),
      y: Math.max(31, Math.min(89, local.y / 6.2)),
    });
  };
  const interact = (
    event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>,
  ) => {
    event.stopPropagation();
    if (npcDisabled || ("repeat" in event && event.repeat)) return;
    onInteract();
  };
  const others = players.filter((player) => player.id !== selfId);
  if (selfId && taxiRide?.phase !== "departing") {
    const me = players.find((player) => player.id === selfId);
    others.push({
      id: selfId,
      nickname: me?.nickname || "여행자",
      avatar: me?.avatar || "mint",
      ...position,
    });
  }
  const actors = [
    ...others.map((player) => ({ id: player.id, y: player.y, player })),
    { id: "field-npc", y: npcPoint.y, player: null },
  ].sort((a, b) => a.y - b.y);
  return (
    <div
      className={`field-world field-${fieldId} ${canTalk ? "field-near-npc" : ""} ${interactionDisabled ? "field-world-locked" : ""} ${taxiRide?.phase === "boarding" ? "field-taxi-boarding" : ""}`}
    >
      <svg
        className="field-world-svg"
        tabIndex={interactionDisabled ? -1 : 0}
        data-world-input="true"
        viewBox="0 0 1000 620"
        onClick={move}
        aria-label={
          taxiRide
            ? "택시 승차 연습. 차량을 누르면 가까이 걸어가요. 배정 번호와 일치하는 차에 탑승하세요."
            : `${info.title}. 바닥을 눌러 이동하고 ${info.label} 버튼으로 체험을 시작하세요.`
        }
      >
        <defs>
          <linearGradient id={`field-bg-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              stopColor={
                fieldId === "hotel"
                  ? "#f3eee3"
                  : fieldId === "prepare"
                    ? "#f2f0e4"
                    : "#edf3e9"
              }
            />
            <stop
              offset="1"
              stopColor={fieldId === "hotel" ? "#eeeade" : "#eef2e5"}
            />
          </linearGradient>
        </defs>
        <rect width="1000" height="620" fill={`url(#field-bg-${id})`} />
        <g className="field-scene-art">
          {fieldId === "prepare" ? (
            <MemoHomeScene />
          ) : fieldId === "immigration" ? (
            <MemoAirportScene />
          ) : fieldId === "hotel" ? (
            <MemoHotelScene />
          ) : (
            <MemoPickupScene />
          )}
        </g>
        {!interactionDisabled && target && (
          <g
            className="field-walk-target"
            transform={`translate(${target.x * 10} ${target.y * 6.2})`}
            aria-hidden="true"
          >
            <ellipse
              rx="14"
              ry="7"
              fill="#dbe9c8"
              fillOpacity=".7"
              stroke="#72a16e"
              strokeWidth="1.5"
            />
            <path d="M-5 0H5M0-3v6" stroke="#6c9868" strokeWidth="1.4" />
          </g>
        )}
        {!taxiRide && (
          <g
            className="field-npc-range"
            transform={`translate(${geometry.interactionPoint.x * 10} ${geometry.interactionPoint.y * 6.2})`}
            aria-hidden="true"
          >
            <ellipse
              rx="39"
              ry="20"
              fill={canTalk ? "#bad5a74d" : "#b9cda523"}
              stroke={canTalk ? "#80ac6f" : "#a9bc98"}
              strokeWidth="1.4"
              strokeDasharray={canTalk ? undefined : "4 5"}
            />
          </g>
        )}
        {taxiRide && onTaxiSelect && (
          <TaxiFleet
            ride={taxiRide}
            nearVehicleId={nearTaxiId}
            onSelect={onTaxiSelect}
            disabled={interactionDisabled}
          />
        )}
        {actors.map((actor) =>
          actor.player ? (
            <FieldAvatar
              key={actor.id}
              player={actor.player}
              self={actor.id === selfId}
              facing={facing}
              moving={moving}
            />
          ) : (
            <g
              key={actor.id}
              className="field-npc"
              transform={`translate(${npcPoint.x * 10} ${npcPoint.y * 6.2})`}
              role="button"
              tabIndex={npcDisabled ? -1 : 0}
              aria-disabled={npcDisabled}
              aria-label={`NPC ${npc.name}, ${npc.role}. ${interactionHint}`}
              onClick={interact}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  interact(event);
                }
              }}
            >
              <ellipse
                className="field-npc-focus"
                cy="1"
                rx="29"
                ry="15"
                fill="none"
                stroke="#78a26d"
                strokeWidth="2"
                opacity="0"
              />
              <JungtokiGuideSprite />
              <g className="field-npc-name" transform="translate(0 -104)">
                <rect
                  x="-82"
                  y="-12"
                  width="164"
                  height="22"
                  rx="8"
                  fill="#fff7dd"
                  stroke="#dacb9e"
                />
                <text
                  textAnchor="middle"
                  y="2"
                  fontSize="10"
                  fontWeight="650"
                  fill="#938052"
                >
                  {npc.name} · {npc.role}
                </text>
              </g>
              <g className="field-npc-speaker" transform="translate(48 -58)">
                <path
                  d="M-9-12h18q4 0 4 4v10q0 4-4 4H1l-5 5v-5h-5q-4 0-4-4V-8q0-4 4-4Z"
                  fill={canInteract ? "#5b936e" : "#dfc086"}
                  stroke="#fffbed"
                  strokeWidth="1.5"
                />
                <text
                  textAnchor="middle"
                  y="1"
                  fontSize="11"
                  fontWeight="800"
                  fill="#fffbed"
                >
                  {canTalk ? "F" : "…"}
                </text>
              </g>
            </g>
          ),
        )}
        {!taxiRide && (
          <g
            className={`field-interact ${completed ? "field-interact-done" : ""}`}
            transform={`translate(${info.x} ${info.y})`}
            role="button"
            tabIndex={interactionDisabled ? -1 : 0}
            aria-disabled={interactionDisabled}
            aria-label={`${info.label}. ${interactionHint}${completed ? ", 완료한 체험 다시 연습하기" : ""}`}
            onClick={interact}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                interact(event);
              }
            }}
          >
            <rect
              className="field-interact-outline"
              x="-111"
              y="-5"
              width="222"
              height="76"
              rx="17"
              fill="none"
              stroke="#4a9376"
              strokeWidth="2"
              opacity="0"
            />
            <path d="M-7 65l7 9 7-9Z" fill="#fffdf5" />
            <rect
              className="field-interact-card"
              x="-105"
              width="210"
              height="65"
              rx="12"
              fill="#fffdf5"
              stroke="#d7dfca"
            />
            <rect
              x="-94"
              y="13"
              width="38"
              height="38"
              rx="11"
              fill={completed ? "#e2ecd8" : "#edf1e2"}
            />
            <text x="-75" y="39" textAnchor="middle" fontSize="22">
              {completed ? "✓" : info.icon}
            </text>
            <text
              x="-45"
              y="27"
              fontSize="12.5"
              fontWeight="750"
              fill="#52714e"
            >
              {info.label}
            </text>
            <text x="-45" y="44" fontSize="9" fill="#98a28a">
              {interactionHint}
            </text>
            <circle
              className="field-interact-beacon"
              cx="102"
              cy="4"
              r="5"
              fill={completed ? "#88ad7f" : "#dfad67"}
              stroke="#fffdf5"
              strokeWidth="2"
            />
          </g>
        )}
        <g className="field-scene-caption" transform="translate(70 567)">
          <text fontSize="10" fontWeight="650" fill="#9ba58e" letterSpacing="2">
            {info.english}
          </text>
          <text y="18" fontSize="9" fill="#b1b8a3">
            이곳의 여행자들과 함께, 한 걸음씩 연습해요.
          </text>
        </g>
        <g transform="translate(914 551)" opacity=".65">
          <circle r="19" fill="none" stroke="#a6b89a" strokeWidth="1" />
          <path d="M0-13l4 13-4 13-4-13Z" fill="#a6b89a" />
          <text y="-25" textAnchor="middle" fontSize="8" fill="#8ea081">
            N
          </text>
        </g>
      </svg>
      {!taxiRide && (
        <button
          className="field-mobile-interact"
          onClick={() => {
            if (!interactionDisabled) onInteract();
          }}
          disabled={interactionDisabled}
          aria-label={`${info.label}. ${interactionHint}${completed ? ", 완료한 체험 다시 연습하기" : ""}`}
        >
          <span>{completed ? "✓" : info.icon}</span>
          <span>
            <b>{info.label}</b>
            <small>{interactionHint}</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
