import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  IconCamera,
  IconChefHat,
  IconClock,
  IconHeart,
  IconList,
  IconSparkles,
  IconTag,
} from "./components/Icons";
import { Reveal } from "./components/motion/Reveal";
import { ScrollProgress } from "./components/motion/ScrollProgress";

// server component ตั้งใจ — ไม่ import TF.js/โมเดล
// คนเปิดเว็บครั้งแรกจะได้ไม่ต้องโหลดโมเดล ~10MB ทั้งที่ยังไม่ได้เริ่มใช้
export const metadata: Metadata = {
  title: "Chef Kub — เปิดตู้เย็นถ่ายรูป แล้วให้ AI คิดเมนูให้",
  description:
    "ถ่ายรูปวัตถุดิบที่มีอยู่ ให้ AI ตรวจจับแล้วแนะนำสูตรอาหารไทยที่ทำได้จริงจากของตรงหน้า พร้อมโหมดทำอาหารที่จับเวลาให้ในตัว",
};

const STEPS = [
  {
    icon: <IconCamera size={22} />,
    title: "ถ่ายรูปของที่มี",
    detail: "เปิดตู้เย็นถ่ายรูปเดียว หรือเลือกรูปเก่าจากเครื่องก็ได้",
  },
  {
    icon: <IconSparkles size={22} />,
    title: "AI อ่านให้ว่ามีอะไร",
    detail: "โมเดลตรวจจับวัตถุดิบในภาพให้อัตโนมัติ ผิดตรงไหนแก้เองได้",
  },
  {
    icon: <IconChefHat size={22} />,
    title: "ลงมือทำได้เลย",
    detail: "ได้เมนูที่ทำได้จากของที่มี พร้อมขั้นตอนทีละสเต็ป",
  },
];

const FEATURES = [
  {
    icon: <IconCamera size={20} />,
    title: "รูปไม่ออกจากเครื่อง",
    detail:
      "โมเดลตรวจจับทำงานในเบราว์เซอร์คุณเอง ไม่ต้องอัปโหลดรูปขึ้นเซิร์ฟเวอร์",
  },
  {
    icon: <IconTag size={20} />,
    title: "ทายผิดก็แก้เองได้",
    detail: "ลากกรอบใหม่ เปลี่ยนชื่อ หรือเพิ่มวัตถุดิบที่โมเดลมองข้าม ก่อนหาเมนู",
  },
  {
    icon: <IconSparkles size={20} />,
    title: "เบื่อเมนูเดิมก็เปลี่ยนโหมด",
    detail: "ปกติ ทำได้ชัวร์ · ฟิวชั่น จับสองชาติมาชนกัน · เมนูจากอนิเมะ",
  },
  {
    icon: <IconList size={20} />,
    title: "โหมดทำอาหารที่ใช้ได้จริง",
    detail: "จับเวลาให้ในตัว ปรับจำนวนที่แล้วสเกลวัตถุดิบให้ และจอไม่ดับ",
  },
  {
    icon: <IconHeart size={20} />,
    title: "เมนูที่ชอบเก็บไว้ได้",
    detail: "กดหัวใจเก็บเมนูโปรด ย้อนดูของที่เคยสแกนไปแล้วได้",
  },
  {
    icon: <IconClock size={20} />,
    title: "ไม่ต้องสแกนซ้ำ",
    detail: "ถ่ายรูปเดิมหรือรูปคล้ายกันอีกครั้ง ระบบจำผลเดิมให้ทันที",
  },
];

const FAQ = [
  {
    q: "ต้องสมัครสมาชิกไหม?",
    a: "ไม่ต้องเลย เปิดเว็บแล้วกดใช้ได้ทันที เมนูโปรดกับประวัติเก็บไว้ในเครื่องคุณเอง",
  },
  {
    q: "รูปที่ถ่ายถูกส่งไปไหนหรือเปล่า?",
    a: "การตรวจจับวัตถุดิบทำงานในเบราว์เซอร์ของคุณ รูปไม่ถูกอัปโหลดออกไป ยกเว้นตอนคุณกดช่วยยืนยัน label เพื่อเอาไปพัฒนาโมเดลต่อ",
  },
  {
    q: "ถ้า AI ทายวัตถุดิบผิดล่ะ?",
    a: "แก้ได้เองทุกจุด ลากกรอบใหม่ เปลี่ยนชื่อ หรือเพิ่มวัตถุดิบที่ระบบยังไม่รู้จักก็ได้",
  },
  {
    q: "ใช้บนมือถือได้ไหม?",
    a: "ออกแบบมาเพื่อมือถือเป็นหลัก เปิดผ่านเบราว์เซอร์ได้เลย ไม่ต้องติดตั้งแอป",
  },
];

const TECH = [
  "Next.js 16",
  "React 19",
  "YOLO11n + TensorFlow.js",
  "Google Gemini",
  "Cloudflare D1 + R2",
  "Workers AI",
];

/** กรอบมือถือครอบภาพหน้าจอจริง */
function PhoneFrame({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="flex flex-col items-center">
      <div className="relative rounded-[2rem] bg-white p-2 shadow-[var(--shadow-xl)] ring-1 ring-black/5">
        <div className="absolute left-1/2 top-3.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/10" />
        <div className="overflow-hidden rounded-[1.6rem]">
          <Image
            src={src}
            alt={alt}
            width={390}
            height={700}
            className="block h-auto w-[240px] md:w-[268px]"
          />
        </div>
      </div>
      <figcaption className="mt-4 text-sm font-medium text-[var(--color-muted)]">
        {caption}
      </figcaption>
    </figure>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand)]">
      {children}
    </p>
  );
}

export default function Landing() {
  return (
    <main className="min-h-dvh overflow-x-hidden">
      <ScrollProgress />

      {/* ===== Top bar ===== */}
      <header className="sticky top-0 z-30 border-b border-black/[0.04] bg-[var(--color-page)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/mascot.png"
              alt=""
              width={384}
              height={384}
              className="h-9 w-9 select-none"
              priority
            />
            <span className="text-xl font-bold tracking-tight text-gradient-brand">
              Chef Kub
            </span>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative">
        {/* แสงนวลหลังฉาก — ทำให้พื้นหลังไม่แบนจนเกินไป */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[var(--color-brand)]/10 blur-3xl" />
          <div className="absolute -left-20 top-40 h-72 w-72 rounded-full bg-[var(--color-brand)]/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="fade-in">
              <span className="pill gap-1.5 bg-[var(--color-brand-soft)] font-medium text-[var(--color-brand)]">
                <IconSparkles size={13} />
                Computer Vision + Generative AI
              </span>

              <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.12] tracking-tight text-[var(--color-ink)] md:text-5xl lg:text-[3.5rem]">
                เปิดตู้เย็นถ่ายรูป
                <br />
                แล้วให้ AI{" "}
                <span className="text-gradient-brand">คิดเมนูให้</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--color-muted)] md:text-lg">
                หมดปัญหา &ldquo;วันนี้กินอะไรดี&rdquo; แค่ถ่ายรูปของที่มีอยู่
                แล้วรับสูตรอาหารไทยที่ทำได้จริงจากวัตถุดิบตรงหน้า
                ไม่ต้องออกไปซื้อเพิ่ม
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/app"
                  className="btn-primary flex items-center gap-2 px-7 py-3.5 text-base font-semibold tap"
                >
                  <IconCamera size={18} />
                  เริ่มสแกนเลย
                </Link>
                <a
                  href="#how"
                  className="btn-secondary px-6 py-3.5 text-base tap"
                >
                  ดูวิธีใช้งาน
                </a>
              </div>

              <p className="mt-5 text-xs text-[var(--color-muted)]">
                ใช้ฟรี · ไม่ต้องสมัครสมาชิก · ไม่ต้องติดตั้งแอป
              </p>
            </div>

            {/* ภาพประกอบเชิงสัญลักษณ์ — วาดด้วย CSS ไม่ใช่ภาพหน้าจอ */}
            <div className="slide-up">
              <div className="card card-lift p-5 md:p-6">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-brand-soft)] via-[var(--color-brand-pale)] to-[var(--color-brand-soft)]">
                  {/* กรอบตรวจจับโผล่ไล่กัน เลียนแบบจังหวะที่โมเดลทยอยเจอของจริงในแอป */}
                  <div
                    style={{ "--i": 1 } as React.CSSProperties}
                    className="chip-in absolute left-[10%] top-[16%] grid h-[42%] w-[38%] place-items-center rounded-lg border-2 border-[var(--color-brand)] bg-[var(--color-brand)]/10"
                  >
                    <span className="select-none text-[3rem] float-y md:text-[3.5rem]">
                      🥬
                    </span>
                    <span className="pill absolute -top-3.5 left-1 whitespace-nowrap bg-[var(--color-brand)] px-2 py-0.5 text-[10px] text-white">
                      ผักกาด
                    </span>
                  </div>

                  {/* กรอบที่สองใช้คนละเฉดกับแบรนด์ ให้เห็นว่าตรวจจับได้หลายอย่าง
                      ไม่ใช้ success เพราะเป็น teal ซึ่งใกล้เขียวแบรนด์เกินจะแยกออก */}
                  <div
                    style={{ "--i": 4 } as React.CSSProperties}
                    className="chip-in absolute bottom-[16%] right-[12%] grid h-[40%] w-[36%] place-items-center rounded-lg border-2 border-[var(--color-warn)] bg-[var(--color-warn)]/10"
                  >
                    {/* เหลื่อมเฟสจากผักกาด ไม่งั้นสองอันลอยขึ้นลงพร้อมกันเป๊ะจนดูเป็นเครื่องจักร */}
                    <span
                      className="select-none text-[2.6rem] float-y md:text-[3rem]"
                      style={{ animationDelay: "-1.5s" }}
                    >
                      🥚
                    </span>
                    <span className="pill absolute -top-3.5 left-1 whitespace-nowrap bg-[var(--color-warn)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink)]">
                      ไข่ไก่
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                    <IconChefHat size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      ผัดผักกาดใส่ไข่
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      15 นาที · ทำง่าย
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ภาพหน้าจอจริง ===== */}
      <section className="border-y border-[var(--color-line)] bg-white/50">
        <div className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-24">
          <Reveal>
            <Eyebrow>หน้าตาแอปจริง</Eyebrow>
            <h2 className="section-title mt-3 text-center text-2xl md:text-3xl">
              ไม่ได้สวยแค่ในโฆษณา
            </h2>
            <p className="section-subtitle text-center">
              นี่คือหน้าจอจริงที่คุณจะเจอเมื่อกดเข้าไปใช้
            </p>
          </Reveal>

          <div className="mt-12 flex flex-wrap items-start justify-center gap-10 md:gap-16">
            {/* เข้ามาคนละทางซ้าย-ขวา ให้รู้สึกว่าเป็นสองจอวางคู่กัน ไม่ใช่ลิสต์ */}
            <Reveal direction="right">
              <PhoneFrame
                src="/shots/menu.png"
                alt="หน้าจอรายการเมนูที่ทำได้จากวัตถุดิบที่สแกน"
                caption="เมนูที่ทำได้จากของที่มี"
              />
            </Reveal>
            <Reveal direction="left" delay={0.12}>
              <PhoneFrame
                src="/shots/cook.png"
                alt="หน้าจอโหมดทำอาหาร แสดงวัตถุดิบและขั้นตอน"
                caption="โหมดทำอาหารทีละขั้นตอน"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="scroll-mt-20">
        <div className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-24">
          <Reveal>
            <Eyebrow>วิธีใช้งาน</Eyebrow>
            <h2 className="section-title mt-3 text-center text-2xl md:text-3xl">
              สามขั้นตอน ไม่ถึงหนึ่งนาที
            </h2>
            <p className="section-subtitle text-center">
              ไม่ต้องกรอกอะไร ไม่ต้องเรียนรู้อะไรใหม่
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.12}>
                <div className="card card-lift h-full p-6 text-center">
                  <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                    {step.icon}
                    <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-brand)] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-[var(--color-ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                    {step.detail}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ทำไมถึงน่าใช้ ===== */}
      <section className="border-y border-[var(--color-line)] bg-white/50">
        <div className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-24">
          <Reveal>
            <Eyebrow>ทำไมต้อง Chef Kub</Eyebrow>
            <h2 className="section-title mt-3 text-center text-2xl md:text-3xl">
              ไม่ใช่แค่บอกสูตร แต่ทำได้จริงในครัวคุณ
            </h2>
            <p className="section-subtitle text-center">
              ออกแบบมาจากปัญหาจริงตอนยืนหน้าตู้เย็นแล้วคิดไม่ออก
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 0.08} amount={0.15}>
                <div className="card card-lift group h-full p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] transition-transform duration-300 group-hover:scale-110">
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 font-semibold text-[var(--color-ink)]">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                    {feature.detail}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section>
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
          <Reveal>
            <Eyebrow>คำถามที่พบบ่อย</Eyebrow>
            <h2 className="section-title mt-3 text-center text-2xl md:text-3xl">
              สงสัยอะไรอยู่?
            </h2>
          </Reveal>

          <div className="mt-10 space-y-3">
            {FAQ.map((item, index) => (
              <Reveal key={item.q} delay={index * 0.07} amount={0.4}>
                <details className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-[var(--color-ink)]">
                    {item.q}
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  {/* คำตอบไหลลงมาแทนที่จะกระตุกโผล่ — details ปกติไม่มี transition ให้ */}
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)] motion-safe:group-open:animate-[fadeIn_0.3s_var(--ease-spring)]">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

    

      {/* ===== Final CTA ===== */}
      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8 md:pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)] px-7 py-14 text-center shadow-[var(--shadow-glow)] md:py-16">
            {/* แสงกวาดผ่านช้าๆ ให้การ์ดปิดท้ายไม่นิ่งสนิท */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -inset-x-1/4 shimmer-linear opacity-40"
            />
            <h2 className="relative text-2xl font-bold tracking-tight text-white md:text-3xl">
              ตอนนี้ในตู้เย็นมีอะไรอยู่บ้าง?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md leading-relaxed text-white/85">
              ถ่ายรูปเดียว แล้วให้ Chef Kub บอกว่าทำอะไรกินได้บ้าง
            </p>
            <Link
              href="/app"
              className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-[var(--color-brand)] shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 tap"
            >
              <IconCamera size={18} />
              เริ่มใช้งานฟรี
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row md:px-8">
          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            <Image
              src="/mascot.png"
              alt=""
              width={384}
              height={384}
              className="h-5 w-5 select-none"
            />
            <span className="text-sm font-medium">Chef Kub</span>
          </div>
          <p className="text-center text-xs text-[var(--color-muted)] sm:text-right">
            Made by · ธนวัฒน์ น้อยหัวหาด · พีรภัทร์ ชมภูศรี
          </p>
        </div>
      </footer>
    </main>
  );
}
