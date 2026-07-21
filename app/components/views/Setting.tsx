"use client";

import React, { useEffect, useState } from "react";
import {
  equipmentCategories,
  loadKitchenSettings,
  saveKitchenSettings,
} from "@/app/utils/storage/kitchenEquipment";

interface SettingProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  /*
   * โหลดอุปกรณ์ที่ผู้ใช้เคยบันทึกไว้
   * เมื่อเปิดหน้า Setting
   */
  useEffect(() => {
    const settings = loadKitchenSettings();

    if (settings?.equipment) {
      setSelected(settings.equipment);
    }
  }, []);

  /*
   * เปิด / ปิดหมวดหมู่
   */
  const toggleCategory = (categoryId: string) => {
    setOpenCategory((prev) =>
      prev === categoryId ? null : categoryId,
    );
  };

  /*
   * เลือก / ยกเลิกอุปกรณ์
   */
  const toggleEquipment = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    );
  };

  /*
   * นับจำนวนอุปกรณ์ที่เลือกในหมวดหมู่
   */
  const getSelectedCount = (
    category: (typeof equipmentCategories)[number],
  ) => {
    return category.items.filter((item) =>
      selected.includes(item.id),
    ).length;
  };

  /*
   * ตรวจสอบว่าเลือกอุปกรณ์ทุกตัวในหมวดหรือยัง
   */
  const isAllSelected = (
    category: (typeof equipmentCategories)[number],
  ) => {
    return (
      category.items.length > 0 &&
      category.items.every((item) =>
        selected.includes(item.id),
      )
    );
  };

  /*
   * เลือกทั้งหมด / ยกเลิกทั้งหมดในหมวด
   */
  const toggleAllInCategory = (
    category: (typeof equipmentCategories)[number],
  ) => {
    const categoryIds = category.items.map(
      (item) => item.id,
    );

    const allSelected = categoryIds.every((id) =>
      selected.includes(id),
    );

    if (allSelected) {
      setSelected((prev) =>
        prev.filter(
          (id) => !categoryIds.includes(id),
        ),
      );
    } else {
      setSelected((prev) =>
        Array.from(
          new Set([
            ...prev,
            ...categoryIds,
          ]),
        ),
      );
    }
  };

  /*
   * ล้างอุปกรณ์ทั้งหมด
   */
  const clearAll = () => {
    setSelected([]);
  };

  /*
   * บันทึกการตั้งค่า
   */
  const handleSave = () => {
    saveKitchenSettings({
      equipment: selected,
    });

    onBack();
  };

  /*
   * แปลง id ของอุปกรณ์
   * ให้เป็นข้อมูลอุปกรณ์จริง
   */
  const selectedEquipment = equipmentCategories
    .flatMap((category) => category.items)
    .filter((item) =>
      selected.includes(item.id),
    );

  /*
   * แสดงอุปกรณ์แค่ 3 รายการแรก
   */
  const visibleSelectedEquipment =
    selectedEquipment.slice(0, 3);

  /*
   * จำนวนอุปกรณ์ที่เหลือ
   */
  const remainingEquipmentCount = Math.max(
    selectedEquipment.length - 3,
    0,
  );

  return (
    <div className="space-y-5 pb-8">

      {/* ========================================
          Title
      ======================================== */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">
          ตั้งค่าครัวของฉัน
        </h2>

        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          เลือกอุปกรณ์ที่คุณมี เพื่อให้ Chef Kub
          สามารถแนะนำวิธีทำอาหารที่เหมาะกับครัวของคุณ
        </p>
      </div>


      {/* ========================================
          Selected Summary
      ======================================== */}
      <div className="
        bg-[#F3FAF6]
        border
        border-[#CDE5D8]
        rounded-2xl
        px-4
        py-4
      ">

        {/* Summary Header */}
        <div className="
          flex
          items-center
          justify-between
        ">

          <div>
            <p className="
              text-sm
              font-bold
              text-gray-700
            ">
              อุปกรณ์ของฉัน
            </p>

            <p className="
              text-xs
              text-[#176B47]
              mt-1
            ">
              เลือกแล้ว {selected.length} รายการ
            </p>
          </div>

          {/* Clear All */}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="
                text-xs
                text-gray-500
                hover:text-red-500
                transition-colors
              "
            >
              ล้างทั้งหมด
            </button>
          )}

        </div>


        {/* ========================================
            Selected Equipment
        ======================================== */}
        {selectedEquipment.length > 0 && (
          <div className="
            flex
            flex-wrap
            gap-2
            mt-4
          ">

            {/* แสดงแค่ 3 รายการแรก */}
            {visibleSelectedEquipment.map(
              (equipment) => (
                <button
                  key={equipment.id}
                  type="button"
                  onClick={() =>
                    toggleEquipment(
                      equipment.id,
                    )
                  }
                  className="
                    flex
                    items-center
                    gap-1.5
                    px-3
                    py-1.5
                    bg-white
                    rounded-full
                    text-xs
                    text-[#176B47]
                    border
                    border-[#CDE5D8]
                    hover:bg-[#E8F5EE]
                    transition-colors
                  "
                >
                  <span>
                    {equipment.name}
                  </span>

                  <span className="
                    text-gray-400
                  ">
                    ×
                  </span>
                </button>
              ),
            )}


            {/* ==================================
                อุปกรณ์ที่เหลือ
            ================================== */}
            {remainingEquipmentCount > 0 && (
  <button
    type="button"
    className="
      flex
      items-center
      gap-1.5
      px-3
      py-1.5
      bg-white
      rounded-full
      text-xs
      text-[#176B47]
      border
      border-[#CDE5D8]
      hover:bg-[#F3FAF6]
      hover:border-[#A9D5BD]
      active:scale-[0.95]
      transition-all
      duration-200
      ease-out
    "
  >
    <span>
      + อุปกรณ์อื่นๆ{" "}
      {remainingEquipmentCount} รายการ
    </span>
  </button>
)}

          </div>
        )}


        {/* ========================================
            ไม่มีอุปกรณ์
        ======================================== */}
        {selected.length === 0 && (
          <p className="
            text-xs
            text-gray-400
            mt-3
          ">
            ยังไม่ได้เลือกอุปกรณ์
          </p>
        )}

      </div>


      {/* ========================================
          Categories
      ======================================== */}
      <div className="space-y-3">

        {equipmentCategories.map(
          (category) => {

            const isOpen =
              openCategory === category.id;

            const selectedCount =
              getSelectedCount(category);

            const allSelected =
              isAllSelected(category);

            return (
              <div
                key={category.id}
                className={`
                  bg-white
                  rounded-2xl
                  border
                  overflow-hidden
                  transition-all
                  ${
                    isOpen
                      ? "border-[#176B47] shadow-sm"
                      : "border-gray-200"
                  }
                `}
              >

                {/* ==================================
                    Category Header
                ================================== */}
                <button
                  type="button"
                  onClick={() =>
                    toggleCategory(
                      category.id,
                    )
                  }
                  className="
                    w-full
                    p-4
                    flex
                    items-center
                    gap-3
                    text-left
                  "
                >

                  {/* Category Icon */}
                  <div
                    className={`
                      w-11
                      h-11
                      rounded-xl
                      flex
                      items-center
                      justify-center
                      text-xl
                      shrink-0
                      transition-colors
                      ${
                        isOpen
                          ? "bg-[#E8F5EE]"
                          : "bg-gray-100"
                      }
                    `}
                  >
                    {category.icon}
                  </div>


                  {/* Category Info */}
                  <div className="
                    flex-1
                    min-w-0
                  ">

                    <div className="
                      flex
                      items-center
                      gap-2
                    ">

                      <h4 className="
                        font-medium
                        text-gray-800
                      ">
                        {category.name}
                      </h4>

                      {/* Selected Count */}
                      {selectedCount > 0 && (
                        <span className="
                          text-[10px]
                          bg-[#E8F5EE]
                          text-[#176B47]
                          px-2
                          py-0.5
                          rounded-full
                        ">
                          {selectedCount}
                        </span>
                      )}

                    </div>


                    {/* Category Description */}
                    <p className="
                      text-xs
                      text-gray-400
                      mt-1
                      truncate
                    ">
                      {selectedCount > 0
                        ? `เลือกแล้ว ${selectedCount} / ${category.items.length} รายการ`
                        : category.description}
                    </p>

                  </div>


                  {/* Arrow */}
                  <span
                    className={`
                      text-gray-400
                      text-lg
                      transition-transform
                      duration-200
                      ${
                        isOpen
                          ? "rotate-180"
                          : ""
                      }
                    `}
                  >
                    ⌄
                  </span>

                </button>


                {/* ==================================
                    Expanded Category
                ================================== */}
                {isOpen && (
                  <div className="
                    border-t
                    border-gray-100
                    px-4
                    pb-4
                  ">

                    {/* Select All */}
                    <div className="
                      flex
                      justify-end
                      py-3
                    ">

                      <button
                        type="button"
                        onClick={() =>
                          toggleAllInCategory(
                            category,
                          )
                        }
                        className="
                          text-xs
                          text-[#176B47]
                          hover:text-[#125538]
                          transition-colors
                        "
                      >
                        {allSelected
                          ? "ยกเลิกทั้งหมด"
                          : "เลือกทั้งหมด"}
                      </button>

                    </div>


                    {/* Equipment List */}
                    <div className="
                      grid
                      grid-cols-2
                      gap-2
                    ">

                      {category.items.map(
                        (equipment) => {

                          const isSelected =
                            selected.includes(
                              equipment.id,
                            );

                          return (
                            <button
                              key={
                                equipment.id
                              }
                              type="button"
                              onClick={() =>
                                toggleEquipment(
                                  equipment.id,
                                )
                              }
                              className={`
                                min-h-[52px]
                                px-3
                                py-3
                                rounded-xl
                                border
                                text-left
                                flex
                                items-center
                                gap-2
                                transition-all
                                active:scale-[0.98]
                                ${
                                  isSelected
                                    ? "bg-[#E8F5EE] border-[#176B47] text-[#176B47]"
                                    : "bg-gray-50 border-gray-100 text-gray-600"
                                }
                              `}
                            >

                              {/* Checkbox */}
                              <span
                                className={`
                                  w-5
                                  h-5
                                  rounded-full
                                  border
                                  flex
                                  items-center
                                  justify-center
                                  shrink-0
                                  text-xs
                                  transition-colors
                                  ${
                                    isSelected
                                      ? "bg-[#176B47] border-[#176B47] text-white"
                                      : "bg-white border-gray-300"
                                  }
                                `}
                              >
                                {isSelected &&
                                  "✓"}
                              </span>


                              {/* Equipment Name */}
                              <span className="
                                text-xs
                                font-medium
                              ">
                                {equipment.name}
                              </span>

                            </button>
                          );
                        },
                      )}

                    </div>

                  </div>
                )}

              </div>
            );
          },
        )}

      </div>


      {/* ========================================
          Information
      ======================================== */}
      <div className="px-1">

        <p className="
          text-xs
          text-gray-400
          leading-relaxed
        ">
          💡 คุณสามารถกลับมาเปลี่ยนอุปกรณ์ในครัวได้ทุกเมื่อ
          การตั้งค่านี้จะถูกใช้เพื่อช่วย AI
          ปรับวิธีทำอาหารให้เหมาะกับอุปกรณ์ของคุณ
        </p>

      </div>


      {/* ========================================
          Save Button
      ======================================== */}
      <button
        type="button"
        onClick={handleSave}
        className="
          w-full
          py-4
          bg-[#176B47]
          hover:bg-[#125538]
          text-white
          rounded-2xl
          font-bold
          shadow-sm
          active:scale-[0.98]
          transition-all
        "
      >
        บันทึกการตั้งค่า
      </button>

    </div>
  );
}