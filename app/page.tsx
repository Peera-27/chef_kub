import type { Metadata } from "next";
import Link from "next/link";
import { KNOWN_TOTAL } from "./landing/data";
import {
  CookPanel,
  FirstStep,
  HeroScan,
  KnownList,
  ModeShowcase,
  RiseObserver,
} from "./landing/Live";
import "./landing/landing.css";

// server component ตั้งใจ — ไม่ import TF.js/โมเดล
// คนเปิดเว็บครั้งแรกจะได้ไม่ต้องโหลดโมเดลทั้งที่ยังไม่ได้เริ่มใช้
export const metadata: Metadata = {
  title: "Chef Kub — ถ่ายของในตู้เย็น ได้เมนูไทยที่ทำได้เลย",
  description:
    "ถ่ายรูปวัตถุดิบที่มีอยู่ โมเดลบนเครื่องตีกรอบให้ทีละชิ้น แล้ว AI คิดสูตรอาหารไทยที่ทำได้จริงจากของตรงหน้า พร้อมโหมดทำอาหารที่จับเวลาให้ในตัว",
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "ต้องสมัครสมาชิกไหม",
    a: "ไม่ต้อง เปิดเว็บแล้วใช้ได้เลย เมนูโปรดกับประวัติการสแกนเก็บไว้ในเบราว์เซอร์ของคุณเอง",
  },
  {
    q: "รูปที่ถ่ายถูกส่งไปไหน",
    a: "การตีกรอบวัตถุดิบทำในเบราว์เซอร์ รูปไม่ออกจากเครื่อง ยกเว้นตอนที่คุณกดช่วยยืนยันชื่อวัตถุดิบเพื่อใช้ฝึกโมเดลต่อ ส่วนที่ส่งไปคิดสูตรคือรายชื่อวัตถุดิบ ไม่ใช่รูป",
  },
  {
    q: "ถ้าโมเดลทายผิดล่ะ",
    a: "แตะกรอบแล้วเปลี่ยนชื่อ ลากกรอบใหม่ให้ของที่มันมองข้าม หรือลบกรอบที่ไม่เกี่ยว ทั้งหมดทำได้ก่อนกดหาเมนู",
  },
  {
    q: "ทำไมยังไม่รู้จักข่าหรือตะไคร้",
    a: `โมเดลตอนนี้ฝึกจากชุดภาพวัตถุดิบเอเชียใต้ จึงรู้จัก ${KNOWN_TOTAL} อย่าง แต่ยังขาดสมุนไพรไทยหลายตัว รอบถัดไปกำลังเพิ่มของไทยจากรูปที่ผู้ใช้ช่วยยืนยัน`,
  },
  {
    q: "ใช้เน็ตเยอะไหม",
    a: "ครั้งแรกโหลดโมเดลประมาณ 5.4 MB แล้วเบราว์เซอร์เก็บไว้ ครั้งต่อไปสแกนได้ทันที การคิดสูตรใช้ข้อมูลน้อยมากเพราะส่งแค่รายชื่อวัตถุดิบ",
  },
  {
    q: "ใช้บนมือถือได้ไหม",
    a: "ออกแบบมาเพื่อมือถือเป็นหลัก เปิดผ่าน Chrome หรือ Safari ได้เลย ไม่ต้องติดตั้งแอป",
  },
  {
    q: "สูตรอาหารมาจากไหน",
    a: "AI เขียนสูตรจากรายชื่อวัตถุดิบที่คุณยืนยันแล้ว และอุปกรณ์ที่ตั้งไว้ในหน้าตั้งค่าครัว เช่น ถ้าไม่มีเตาอบ ก็จะไม่ได้เมนูอบ",
  },
];

// ตรงกับ public/photos/credits.json — เปลี่ยนรูปแล้วต้องแก้ที่นี่ด้วย (CC BY / BY-SA ต้องให้เครดิต)
const CREDITS = [
  ["ไข่ไก่", "safaritravelplus", "CC0"],
  ["ช่อข่าและใบมะกรูด", "PattayaPatrol", "CC BY-SA 4.0"],
  ["ไข่เจียวต้นหอม (วิดีโอ)", "Totsaporn", "CC BY-SA 4.0"],
  ["แผงผักตลาดธานินทร์", "Takeaway", "CC BY-SA 3.0"],
  ["หอมแดงบนเขียง", "Webvilla", "CC0"],
  ["ปลาที่ตลาด", "paul morris", "CC0"],
  ["ผลไม้ในกระด้ง", "Jakub Kapusnak", "CC0"],
  ["ถั่วปากอ้า", "Fumikas Sagisavas", "CC0"],
  ["เครื่องผัดไทย", "Joy", "CC BY 2.0"],
  ["ไข่เจียว", "Vee Satayamas", "CC BY 4.0"],
  ["ทามาโกะยากิ", "Asacyan", "CC BY-SA 3.0"],];

export default function Landing() {
  return (
    <div className="lp">
      {/* คลาส "js" ที่ซ่อนสถานะก่อนเล่นอนิเมชันเติมจาก app/layout.tsx — ไม่มี JS เนื้อหาก็แสดงครบ */}
      <RiseObserver />

      <a href="#main" className="skip">
        ข้ามไปเนื้อหา
      </a>
      <header className="nav">
        <Link href="/" className="wordmark">
          <img src="/mascot.png" alt="" width={32} height={32} />
          Chef Kub
        </Link>
        <nav aria-label="ในหน้านี้">
          <a href="#know">รู้จักอะไรบ้าง</a>
          <a href="#cook">โหมดทำอาหาร</a>
          <a href="#faq">คำถาม</a>
        </nav>
      </header>

      <main id="main">
        {/* ===== Hero: หัวข้อซ้ายบน ผลสแกนจริงบนเวทีสีเหลือง ===== */}
        <section className="hero" aria-labelledby="hero-h">
          <div className="hero-copy">
            <h1 id="hero-h" className="display lines">
              <span className="line">
                <span data-line style={{ "--i": 0 } as React.CSSProperties}>
                  ถ่ายของในตู้เย็น
                </span>
              </span>
              <span className="line">
                <span data-line style={{ "--i": 1 } as React.CSSProperties}>
                  ได้เมนูที่ทำได้เลย
                </span>
              </span>
            </h1>
            <div className="hero-after">
              <p className="lead">
                Chef Kub ตีกรอบวัตถุดิบในรูปให้ทีละชิ้นบนเครื่องของคุณ แล้วคิดสูตรอาหารไทยจากของที่มีอยู่จริง
                ใช้ฟรี ไม่ต้องสมัคร
              </p>
              <Link href="/app" className="btn btn-ink">
                เปิดกล้องสแกน
              </Link>
            </div>
          </div>
          <div className="stage">
            <HeroScan />
          </div>
        </section>

        <ModeShowcase />

        {/* ===== ของที่โมเดลรู้จัก ===== */}
        <section id="know" className="known" aria-labelledby="know-h">
          <h2 id="know-h" className="head" data-rise>
            รู้จักของ {KNOWN_TOTAL} อย่าง
          </h2>
          <p className="known-intro" data-rise>
            นับจากชื่อไทยที่ไม่ซ้ำกันในโมเดลตัวที่แอปใช้อยู่ ของที่ยังไม่รู้จัก ตีกรอบแล้วตั้งชื่อเองได้
          </p>
          <KnownList />
        </section>

        {/* ===== โหมดทำอาหาร ===== */}
        <section id="cook" className="cookmode" aria-labelledby="cook-h">
          <div className="cook-headline" data-rise>
            <h2 id="cook-h" className="head">
              โหมดทำอาหาร
            </h2>
            <p>สูตรที่ได้มา จัดใหม่ให้ทำตามได้ระหว่างยืนหน้าเตา มือไม่ว่างก็ไม่หลง</p>
          </div>
          <CookPanel />
        </section>

        {/* ===== คำถาม ===== */}
        <section id="faq" className="faq" aria-labelledby="faq-h">
          {/* FAQPage schema ให้ Google อ่านคำถามเดียวกับที่แสดงบนหน้า */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: FAQ.map(({ q, a }) => ({
                  "@type": "Question",
                  name: q,
                  acceptedAnswer: { "@type": "Answer", text: a },
                })),
              }).replace(/</g, "\\u003c"),
            }}
          />
          <h2 id="faq-h" className="head faq-h">
            ถามกันบ่อย
          </h2>
          <div className="faq-list">
            {FAQ.map((item, i) => (
              <details key={item.q} name="faq" open={i === 0} data-rise>
                <summary>
                  {item.q}
                  <span className="plus" aria-hidden />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ===== ปิดท้าย: หน้าแรกของแอปเปิดรอไว้ ===== */}
        <section className="close" aria-labelledby="close-h">
          <div className="close-copy" data-rise>
            <h2 id="close-h" className="display-sm">
              เปิดตู้เย็น
              <br />
              แล้วถ่ายเลย
            </h2>
            <p>
              กล้องในเว็บเปิดขึ้นมาทันที ครั้งแรกรอโหลดโมเดลราว 5.4 MB หลังจากนั้นสแกนได้เร็วแม้เน็ตช้า
            </p>
          </div>
          <div className="close-ui" data-rise>
            <FirstStep />
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="foot-what">Chef Kub · สแกนวัตถุดิบ คิดเมนูไทย</p>
        <nav aria-label="ลิงก์ท้ายหน้า" className="foot-links">
          <Link href="/app">เปิดแอป</Link>
          <a href="#faq">คำถาม</a>
        </nav>
        <p className="foot-who">© 2026 ธนวัฒน์ น้อยหัวหาด · พีรภัทร์ ชมภูศรี</p>
        <p className="foot-credits">
          ภาพและวิดีโอจาก Wikimedia Commons, Flickr และ rawpixel:{" "}
          {CREDITS.map(([what, who, lic]) => `${what}: ${who}, ${lic}`).join(" · ")}
        </p>
      </footer>
    </div>
  );
}
