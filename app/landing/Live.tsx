"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconCamera, IconCheck, IconHeart, IconShare } from "../components/Icons";
import { formatDuration, parseStepDuration } from "../utils/parseStepDuration";
import { scaleIngredient } from "../utils/scaleIngredient";
import {
  EGG_BOXES,
  KNOWN_GROUPS,
  NOT_YET,
  PANTRY_EXTRAS,
  menusFor,
  type Extra,
} from "./data";

const pct = (b: { x: number; y: number; w: number; h: number }) => ({
  left: `${b.x}%`,
  top: `${b.y}%`,
  width: `${b.w}%`,
  height: `${b.h}%`,
});

/* ===== ส่วนต่าง ๆ โผล่ขึ้นมาทีละชิ้นเมื่อเลื่อนถึง =====
   ซ่อนเฉพาะตอนมี html.js เท่านั้น — สคริปต์พังเนื้อหาก็ยังอยู่ครบ */
export function RiseObserver() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-rise]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

/* ===== Hero: ผลสแกนจริง + เลือกของที่มีเพิ่ม แล้วรายการเมนูเปลี่ยนตาม ===== */
export function HeroScan() {
  const [picked, setPicked] = useState<Extra[]>(["ต้นหอม"]);
  const menus = menusFor(picked);
  const toggle = (x: Extra) =>
    setPicked((p) => (p.includes(x) ? p.filter((i) => i !== x) : [...p, x]));

  return (
    <div className="ui scan" data-ui>
      <div className="ui-bar">
        <span className="ui-title">ผลสแกน</span>
        <span className="ui-meta">พบ ไข่ไก่ 5 ฟอง</span>
      </div>
      <div className="scan-body">
        <figure className="ui-photo">
          <img
            src="/photos/eggs-chicken.webp"
            width={1400}
            height={934}
            alt="ไข่ไก่ในแผงกระดาษ มีกรอบสีเขียวล้อมไข่ห้าฟองแถวหน้า"
            fetchPriority="high"
          />
          {EGG_BOXES.map((b, i) => (
            <span key={i} className="det" style={{ ...pct(b), "--i": i } as React.CSSProperties}>
              <span className="det-tag"><span className="det-name">ไข่ไก่ </span>{Math.round(b.score * 100)}%</span>
            </span>
          ))}
        </figure>
        <div className="scan-side">
          <p className="ui-label" id="extras-label">
            ในครัวมีอะไรอีก
          </p>
          <div className="chips" role="group" aria-labelledby="extras-label">
            {PANTRY_EXTRAS.map((x) => (
              <button
                key={x}
                type="button"
                className="chip"
                aria-pressed={picked.includes(x)}
                onClick={() => toggle(x)}
              >
                {picked.includes(x) && <IconCheck size={14} />}
                {x}
              </button>
            ))}
          </div>
          <p className="ui-label">
            ทำได้ <span className="num">{menus.length}</span> เมนู
          </p>
          <ol className="menus" aria-live="polite">
            {menus.slice(0, 4).map((m) => (
              <li key={m.name}>
                <span className="menu-name">{m.name}</span>
                <span className="menu-time num">{m.minutes} นาที</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ===== โหมดเมนู: สวิตช์ตัวจริงขยายเท่าโปสเตอร์ ===== */
const MODES = [
  {
    id: "classic",
    label: "ปกติ",
    word: "แบบบ้าน ๆ",
    dish: "ไข่เจียวต้นหอม เมนูคุ้นเคย ทำได้ชัวร์ทุกครัว",
    photo: "/photos/khai-jiao",
    alt: "ไข่เจียวฟูกรอบบนจานรองใบตอง กับถ้วยซอสพริก",
  },
  {
    id: "fusion",
    label: "ฟิวชั่น",
    word: "แบบข้ามชาติ",
    dish: "ทามาโกะยากิต้นหอม จิ้มน้ำจิ้มแจ่ว แบบไทย × ญี่ปุ่น",
    photo: "/photos/tamagoyaki-01",
    alt: "ทามาโกะยากิใส่ต้นหอมสองชิ้นบนจานเซรามิก",
  },
  {
    id: "anime",
    label: "จากอนิเมะ",
    word: "แบบในอนิเมะ",
    dish: "ราเมงใส่ไข่ต้มกับต้นหอม แบบร้านอิจิรากุใน Naruto",
    // ภาพวาดที่ Workers AI (@cf/leonardo/lucid-origin) สร้างเอง ไม่ใช่ภาพจากอนิเมะจริง — ภาพจากเรื่องจริงติดลิขสิทธิ์
    photo: "/photos/anime-ramen",
    alt: "ภาพวาดสไตล์อนิเมะ ราเมงชามดำ ใส่ไข่ต้ม ต้นหอม และหมูชาชู บนเคาน์เตอร์ไม้",
  },
] as const;

export function ModeShowcase() {
  const [mode, setMode] = useState(0);
  const m = MODES[mode];
  return (
    <section className={`band mode mode-${m.id}`} aria-labelledby="mode-h">
      <div className="mode-copy">
        <h2 id="mode-h" className="head">
          วันนี้อยากกิน
          <br />
          <span className="mode-word">{m.word}</span>
        </h2>
        <p className="lead-sm" aria-live="polite">
          ไข่กับต้นหอมชุดเดียวกัน ได้ {m.dish}
        </p>
      </div>
      <div className="mode-control" data-ui role="radiogroup" aria-label="สไตล์เมนู">
        {MODES.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={mode === i}
            className="mode-seg"
            onClick={() => setMode(i)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <figure className="mode-photo">
        {/* โหลดครบสามรูปไว้ก่อน สลับด้วย opacity — กดเปลี่ยนแล้วรูปขึ้นทันที ไม่กระพริบ */}
        {MODES.map((x, i) => (
          <img
            key={x.id}
            src={`${x.photo}-1200.webp`}
            // กรอบรูปกว้างเกือบเต็มจอ — จอ DPR 2 ต้องใช้รูป ~2800px ไม่งั้นแตก
            srcSet={`${x.photo}-1200.webp 1200w, ${x.photo}-2800.webp 2800w`}
            sizes="100vw"
            alt={i === mode ? x.alt : ""}
            aria-hidden={i !== mode}
            loading="lazy"
            className={i === mode ? "is-on" : ""}
          />
        ))}
      </figure>
    </section>
  );
}

/* ===== รายการของที่รู้จัก: รูปค้างซ้าย รายการขวา ===== */
const ROWS = [
  ...KNOWN_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    count: `${g.count} อย่าง`,
    desc: g.names.slice(0, 9).join(" · ") + (g.names.length > 9 ? " และอื่น ๆ" : ""),
    photo: g.photo,
    alt: g.alt,
  })),
  {
    id: "not-yet",
    name: "ยังไม่รู้จัก",
    count: "กำลังสอน",
    desc: `${NOT_YET.join(" · ")}. ตีกรอบแล้วตั้งชื่อเองได้ในแอป รูปที่กดยืนยันจะถูกใช้ฝึกโมเดลรอบหน้า`,
    photo: "/photos/dfc-6121-fresh-bundles-of-galangal-and.webp",
    alt: "ช่อข่ากับใบมะกรูด ของที่โมเดลยังไม่รู้จัก",
  },
];

export function KnownList() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  // บนจอสัมผัสไม่มี hover — แถวที่อยู่กลางจอเป็นแถวที่เลือก
  useEffect(() => {
    if (!window.matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.row));
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="known-grid">
      <div className="known-photo">
        {ROWS.map((r, i) => (
          <img
            key={r.id}
            src={r.photo}
            alt={i === active ? r.alt : ""}
            aria-hidden={i !== active}
            loading="lazy"
            className={i === active ? "is-on" : ""}
          />
        ))}
      </div>
      <ul className="known-list">
        {ROWS.map((r, i) => (
          <li
            key={r.id}
            data-row={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={active === i ? "is-active" : ""}
          >
            <button
              type="button"
              aria-expanded={active === i}
              aria-controls={`known-${r.id}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
            >
              <span className="known-name">{r.name}</span>
              <span className="known-count num">{r.count}</span>
            </button>
            <p id={`known-${r.id}`} hidden={active !== i}>
              {r.desc}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===== โหมดทำอาหาร: แผงจริง + โน้ตสองข้าง ===== */
const BASE_SERVES = 2;
const INGREDIENTS = ["ไข่ไก่ 3 ฟอง", "ต้นหอม 2 ต้น", "น้ำปลา 2 ช้อนชา", "น้ำมันพืช 1/2 ถ้วย"];
const STEP_TEXT = "ตั้งน้ำมันให้ร้อนจัด เทไข่ลงกลางกระทะ ทอดด้านละ 2 นาที";
const STEP_SECONDS = parseStepDuration(STEP_TEXT) ?? 120;

const NOTES = [
  { id: "fav", side: "l", name: "เก็บไว้ทำอีก", body: "กดหัวใจแล้วเมนูอยู่ในรายการโปรด เปิดได้แม้ไม่ได้สแกนใหม่" },
  { id: "list", side: "l", name: "ติ๊กของที่เตรียมแล้ว", body: "ไล่ติ๊กทีละอย่าง ไม่ต้องกลับไปอ่านสูตรตั้งแต่ต้น" },
  { id: "wake", side: "l", name: "จอไม่ดับระหว่างทำ", body: "มือเปื้อนแป้งก็ไม่ต้องคอยแตะจอให้สว่าง" },
  { id: "share", side: "r", name: "แชร์เป็นการ์ด", body: "ส่งสูตรเป็นรูปการ์ดให้คนที่บ้านได้ในแตะเดียว" },
  { id: "serves", side: "r", name: "ปรับจำนวนที่", body: "สูตรมาสำหรับสองที่ ปรับแล้วปริมาณทุกบรรทัดคิดใหม่ให้" },
  { id: "timer", side: "r", name: "จับเวลาจากในขั้นตอน", body: "ขั้นไหนมีเวลา ปุ่มจับเวลาขึ้นมาให้เอง ไม่ต้องเปิดแอปนาฬิกา" },
] as const;
type Part = (typeof NOTES)[number]["id"];

export function CookPanel() {
  const [serves, setServes] = useState(BASE_SERVES);
  const [done, setDone] = useState<number[]>([0]);
  const [fav, setFav] = useState(false);
  const [left, setLeft] = useState(STEP_SECONDS);
  const [running, setRunning] = useState(false);
  const [shared, setShared] = useState(false);
  const [focus, setFocus] = useState<Part | null>(null);
  const [tops, setTops] = useState<Partial<Record<Part, number>>>({});
  const panel = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  // คนที่ขอให้ลดการเคลื่อนไหว เห็นภาพนิ่ง (poster) แทนวิดีโอวน
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) video.current?.pause();
  }, []);

  // นับทีละวินาที หยุดเองเมื่อถึงศูนย์ — "กำลังเดิน" คำนวณจากสองค่านี้ ไม่ต้องเก็บแยก
  const ticking = running && left > 0;
  useEffect(() => {
    if (!ticking) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [ticking, left]);

  // วางโน้ตให้บรรทัดแรกตรงกับส่วนของแผงที่มันอธิบาย — ส่วนที่อยู่ชิดกัน (หัวใจกับจำนวนที่)
  // จะดันโน้ตถัดไปลงให้พ้นโน้ตก่อนหน้า ไม่ให้ซ้อนกัน
  useLayoutEffect(() => {
    const measure = () => {
      const root = panel.current;
      if (!root) return;
      const base = root.getBoundingClientRect().top;
      const partTop: Partial<Record<Part, number>> = {};
      root.querySelectorAll<HTMLElement>("[data-part]").forEach((el) => {
        partTop[el.dataset.part as Part] = el.getBoundingClientRect().top - base;
      });
      const next: Partial<Record<Part, number>> = {};
      for (const side of ["l", "r"] as const) {
        let floor = 0;
        NOTES.filter((n) => n.side === side)
          .sort((a, b) => (partTop[a.id] ?? 0) - (partTop[b.id] ?? 0))
          .forEach((n) => {
            const h = document.querySelector<HTMLElement>(`[data-note="${n.id}"]`)?.offsetHeight ?? 0;
            next[n.id] = Math.max(partTop[n.id] ?? 0, floor);
            floor = next[n.id]! + h + 20;
          });
      }
      setTops(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const dim = (p: Part) => (focus && focus !== p ? "dim" : "");
  const note = (n: (typeof NOTES)[number]) => (
    <div
      key={n.id}
      data-note={n.id}
      className="note"
      style={{ top: tops[n.id] ?? 0 }}
      tabIndex={0}
      onMouseEnter={() => setFocus(n.id)}
      onMouseLeave={() => setFocus(null)}
      onFocus={() => setFocus(n.id)}
      onBlur={() => setFocus(null)}
    >
      <h3 className="note-name">{n.name}</h3>
      <p>{n.body}</p>
    </div>
  );

  return (
    <div className="cook-grid">
      <div className="notes notes-l">{NOTES.filter((n) => n.side === "l").map(note)}</div>

      <div className="ui cook" data-ui ref={panel}>
        <video
          ref={video}
          className="cook-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/photos/khai-jiao-with-scallions-poster.webp"
          width={680}
          height={480}
          aria-hidden="true"
        >
          <source src="/photos/khai-jiao-with-scallions.webm" type="video/webm" />
        </video>

        <div className="cook-head">
          <div>
            <p className="cook-title">ไข่เจียวต้นหอม</p>
            <p className="ui-meta">8 นาที · ทำง่าย</p>
          </div>
          <div className="cook-actions">
            <button
              type="button"
              data-part="fav"
              className={`ui-icon ${dim("fav")} ${fav ? "is-fav" : ""}`}
              aria-pressed={fav}
              aria-label="เก็บเป็นเมนูโปรด"
              onClick={() => setFav((f) => !f)}
            >
              <IconHeart size={20} filled={fav} />
            </button>
            <button
              type="button"
              data-part="share"
              className={`ui-icon ${dim("share")}`}
              aria-label="แชร์เป็นการ์ด"
              onClick={() => setShared(true)}
            >
              <IconShare size={20} />
            </button>
          </div>
        </div>
        {shared && (
          <p className="ui-toast" role="status">
            ในแอปจะได้การ์ดสูตรเป็นรูป พร้อมส่งต่อ
          </p>
        )}

        <div className={`cook-row ${dim("serves")}`} data-part="serves">
          <span className="ui-label">จำนวน</span>
          <div className="stepper">
            <button type="button" aria-label="ลดจำนวนที่" onClick={() => setServes((s) => Math.max(1, s - 1))}>
              −
            </button>
            <span className="num" aria-live="polite">
              {serves} ที่
            </span>
            <button type="button" aria-label="เพิ่มจำนวนที่" onClick={() => setServes((s) => Math.min(8, s + 1))}>
              +
            </button>
          </div>
        </div>

        <ul className={`checklist ${dim("list")}`} data-part="list">
          {INGREDIENTS.map((line, i) => (
            <li key={line}>
              <label>
                <input
                  type="checkbox"
                  checked={done.includes(i)}
                  onChange={() =>
                    setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))
                  }
                />
                <span>{scaleIngredient(line, serves / BASE_SERVES)}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className={`cook-step ${dim("timer")}`} data-part="timer">
          <p className="ui-meta">ขั้นที่ 2 จาก 4</p>
          <p className="cook-step-text">{STEP_TEXT}</p>
          <button
            type="button"
            className={`ui-btn timer ${ticking ? "is-running" : ""}`}
            onClick={() => (left === 0 ? (setLeft(STEP_SECONDS), setRunning(true)) : setRunning((r) => !r))}
          >
            <span className="num">{formatDuration(left)}</span>
            <span>{left === 0 ? "ครบเวลา · เริ่มใหม่" : ticking ? "หยุดชั่วคราว" : "เริ่มจับเวลา"}</span>
          </button>
        </div>

        <div className={`cook-foot ${dim("wake")}`} data-part="wake">
          <span className="wake-dot" aria-hidden />
          <span className="ui-meta">จอเปิดค้างไว้ระหว่างทำ</span>
        </div>
      </div>

      <div className="notes notes-r">{NOTES.filter((n) => n.side === "r").map(note)}</div>
    </div>
  );
}

/* ===== ปิดท้าย: หน้าแรกของแอปเปิดรออยู่ เลือกโหมดแล้วพาเข้าแอปพร้อมโหมดนั้น ===== */
export function FirstStep() {
  const [mode, setMode] = useState(0);
  return (
    <div className="ui first" data-ui role="dialog" aria-labelledby="first-title">
      <p id="first-title" className="first-title">
        เริ่มสแกน
      </p>
      <p className="ui-meta">ถ่ายของในตู้เย็นหรือบนเขียง ยิ่งเห็นชัดยิ่งทายแม่น</p>
      <p className="ui-label" id="first-mode">
        สไตล์เมนู
      </p>
      <div className="seg" role="radiogroup" aria-labelledby="first-mode">
        {MODES.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={mode === i}
            onClick={() => setMode(i)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <Link href={`/app?mode=${MODES[mode].id}`} className="first-go">
        <IconCamera size={20} />
        เปิดกล้องสแกน
      </Link>
    </div>
  );
}
