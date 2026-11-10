import { expect, test } from "bun:test";
import { KNOWN_GROUPS, KNOWN_TOTAL, menusFor } from "./data";

test("every model class is grouped and counted", () => {
  expect(KNOWN_TOTAL).toBeGreaterThan(80);
  expect(KNOWN_GROUPS.length).toBe(6);
});

test("menus only use what was picked", () => {
  expect(menusFor([]).every((m) => m.needs.length === 0)).toBe(true);
  const withRicePork = menusFor(["ข้าวสวย", "หมูสับ"]);
  expect(withRicePork[0].name).toBe("ข้าวผัดหมูใส่ไข่");
  expect(withRicePork.some((m) => m.needs.includes("ต้นหอม"))).toBe(false);
});
