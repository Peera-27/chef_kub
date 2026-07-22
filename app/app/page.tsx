"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ViewTransition } from "../components/motion/ViewTransition";
import { CameraView } from "../components/views/CameraView";
import { EditImageView } from "../components/views/EditImageView";
import { FavoritesView } from "../components/views/FavoritesView";
import { HomeView } from "../components/views/HomeView";
import  Settings  from "../components/views/Setting";
import { CookView } from "../components/views/CookView";
import { RecipesView } from "../components/views/RecipesView";
import {
  IconCamera,
  IconChefHat,
  IconHeart,
  IconHome,
  IconSettings,
} from "../components/Icons";
import { useChefKub } from "../hooks/useChefKub";


export default function Home() {
  const {
    loading,
    imageGenPending,
    gallery,
    allItems,
    currentRect,
    recipes,
    viewMode,
    setViewMode,
    favorites,
    history,
    activeRecipe,
    cookingMode,
    setCookingMode,
    editingImage,
    setEditingImage,
    videoRef,
    startCamera,
    capturePhoto,
    processImage,
    removeItem,
    removeImage,
    handleInventRecipe,
    quickStartFromHistory,
    quickCookFavorite,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    goHome,
    startCook,
    endCook,
    refreshFavorites,
    finishEditing,
    labelPickerOpen,
    confirmLabelSelection,
    cancelLabelPicker,
    removeBoxAtIndex,
    startEditBoxLabel,
    editingBoxIndex,
    classOptions,
    handleClassesChange,
    handleEditImageMetrics,
  } = useChefKub();

  const showBottomNav = ["home", "recipes", "favorites", "settings"].includes(
    viewMode,
  );

  const navItems: {
    key: "home" | "recipes" | "favorites"| "settings";
    icon: (active: boolean) => React.ReactNode;
    label: string;
    badge?: number;
  }[] = [
    { key: "home", icon: () => <IconHome size={20} />, label: "หน้าแรก" },
    {
      key: "recipes",
      icon: () => <IconChefHat size={20} />,
      label: "เมนู",
      badge: recipes.length,
    },
    {
      key: "favorites",
      icon: (active) => <IconHeart size={20} filled={active} />,
      label: "โปรด",
      badge: favorites.length,
    },
    {
      key: "settings",
      icon: () => <IconSettings size={20} />,
      label: "ตั้งค่าครัว",
    },
  ];

  return (
    <div className="min-h-dvh bg-[var(--color-page)] text-[var(--color-ink)]">
      {/* ===== Desktop / Tablet layout (≥768px): sidebar + content ===== */}
      <div className="hidden md:flex md:min-h-dvh">
        {/* Sidebar */}
        <aside className="md:w-64 lg:w-72 md:flex-col md:border-r md:border-white/60 md:bg-white/70 md:backdrop-blur-xl md:sticky md:top-0 md:h-dvh shrink-0 flex flex-col">
          <div className="p-6 pb-4">
            {/* กดโลโก้เพื่อกลับหน้าแนะนำ */}
            <Link
              href="/"
              className="flex items-center gap-3 rounded-[var(--radius-md)] -m-1 p-1 transition-opacity hover:opacity-80 tap"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)] grid place-items-center text-white shadow-[var(--shadow-glow)]">
                <IconChefHat size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-brand tracking-tight leading-none">
                  Chef Kub
                </h1>
                <p className="text-[11px] text-[var(--color-muted)] mt-1">
                  สแกนแล้วเริ่มทำได้เลย
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 space-y-1.5">
            {navItems.map((item) => {
              const isActive = viewMode === item.key;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => setViewMode(item.key)}
                  whileTap={{ scale: 0.97 }}
                  className={`nav-item w-full relative overflow-hidden ${
                    isActive ? "nav-item-active" : "nav-item-inactive"
                  }`}
                >
                  {/* layoutId เดียวกันทุกปุ่ม = Motion ย้ายก้อนเดิมไปตำแหน่งใหม่
                      แทนที่จะ fade อันเก่าออกแล้วอันใหม่โผล่ */}
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-nav-pill"
                      className="nav-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      aria-hidden
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3 w-full">
                    {item.icon(isActive)}
                    <span>{item.label}</span>
                    {item.badge ? (
                      <motion.span
                        key={item.badge}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/25 text-white"
                            : "bg-[var(--color-brand)] text-white"
                        }`}
                      >
                        {item.badge}
                      </motion.span>
                    ) : null}
                  </span>
                </motion.button>
              );
            })}
          </nav>

          {/* Scan CTA — action หลักของแอป เข้าถึงได้จากทุกหน้า */}
          <div className="px-3 pb-3">
            <button
              onClick={startCamera}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm tap"
            >
              <IconCamera size={18} />
              สแกนวัตถุดิบ
            </button>
          </div>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-[var(--color-line)]">
            <p className="text-[10px] text-[var(--color-muted)] text-center">
              สแกนวัตถุดิบ · คิดสูตร · ทำอาหาร
            </p>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-dvh">
          {/* Page content */}
          <ViewTransition
            viewKey={viewMode}
            className="flex-1 px-4 md:px-8 lg:px-12 py-5 md:py-8 pb-8"
          >
            <div className="max-w-2xl mx-auto lg:max-w-3xl">
              {viewMode === "home" && (
                <HomeView
                  gallery={gallery}
                  history={history}
                  favorites={favorites}
                  allItemsCount={allItems.length}
                  hasRecipes={recipes.length > 0}
                  cookingMode={cookingMode}
                  onCookingModeChange={setCookingMode}
                  onStartCamera={startCamera}
                  onUploadImage={processImage}
                  onRemoveImage={removeImage}
                  onRemoveItem={removeItem}
                  onEditImage={(img) => {
                    setEditingImage(img);
                    setViewMode("edit");
                  }}
                  onInventRecipe={handleInventRecipe}
                  onQuickStartHistory={quickStartFromHistory}
                  onQuickCookFavorite={quickCookFavorite}
                  onViewRecipes={() => setViewMode("recipes")}
                />
              )}

              {viewMode === "camera" && (
                <CameraView videoRef={videoRef} onCapture={capturePhoto} />
              )}

              {viewMode === "edit" && editingImage && (
                <EditImageView
                  editingImage={editingImage}
                  labelPickerOpen={labelPickerOpen}
                  editingBoxIndex={editingBoxIndex}
                  classOptions={classOptions}
                  currentRect={currentRect}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onDone={finishEditing}
                  onSelectLabel={confirmLabelSelection}
                  onCancelLabel={cancelLabelPicker}
                  onClassesChange={handleClassesChange}
                  onEditBox={startEditBoxLabel}
                  onRemoveBox={removeBoxAtIndex}
                  onImageMetrics={handleEditImageMetrics}
                />
              )}

              {viewMode === "recipes" && (
                <RecipesView
                  recipes={recipes}
                  imageGenPending={imageGenPending}
                  onFavoriteChange={refreshFavorites}
                  onStartCook={startCook}
                />
              )}

              {viewMode === "cook" && activeRecipe && (
                <CookView
                  recipe={activeRecipe}
                  imageLoading={imageGenPending}
                  onDone={endCook}
                />
              )}

              {viewMode === "favorites" && (
                <FavoritesView
                  favorites={favorites}
                  onFavoriteChange={refreshFavorites}
                  onStartCook={startCook}
                />
              )}
              {viewMode === "settings" && (
                <Settings
                onBack={goHome}
                />
                )}
            </div>
          </ViewTransition>
        </div>
      </div>

      {/* ===== Mobile layout (<768px): top bar + bottom nav ===== */}
      <div className="md:hidden min-h-dvh flex flex-col">
        {/* Mobile header */}
        {viewMode !== "camera" && (
          <header className="sticky top-0 z-30 bg-[var(--color-page)]/80 backdrop-blur-md px-5 pt-5 pb-3 safe-top border-b border-black/[0.04]">
            <div className="flex justify-between items-center">
              {/* กดโลโก้เพื่อกลับหน้าแนะนำ */}
              <Link
                href="/"
                className="rounded-[var(--radius-sm)] transition-opacity hover:opacity-80 tap"
              >
                <h1 className="text-xl font-bold text-gradient-brand tracking-tight leading-none">
                  Chef Kub
                </h1>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  สแกนแล้วเริ่มทำได้เลย
                </p>
              </Link>
              <div className="flex items-center gap-2">
                {favorites.length > 0 && viewMode === "home" && (
                  <button
                    onClick={() => setViewMode("favorites")}
                    className="pill bg-[var(--color-favorite-soft)] text-[var(--color-favorite)] flex items-center gap-1 tap"
                  >
                    <IconHeart size={12} filled />
                    {favorites.length}
                  </button>
                )}

                {viewMode === "home" &&(
                  <button
                  onClick={()=> setViewMode("settings")}
                  className ="btn-secondary text-xs px-3 py-1.5 tap"
                  >
                    ตั้งค่า
                  </button>
                )}

                {viewMode !== "home" && (
                  <button
                    onClick={goHome}
                    className="btn-secondary text-xs px-3 py-1.5 tap"
                  >
                    กลับ
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Mobile content */}
        <ViewTransition viewKey={viewMode} className="flex-1 px-5 pb-24">
          {viewMode === "home" && (
            <HomeView
              gallery={gallery}
              history={history}
              favorites={favorites}
              allItemsCount={allItems.length}
              hasRecipes={recipes.length > 0}
              cookingMode={cookingMode}
              onCookingModeChange={setCookingMode}
              onStartCamera={startCamera}
              onUploadImage={processImage}
              onRemoveImage={removeImage}
              onRemoveItem={removeItem}
              onEditImage={(img) => {
                setEditingImage(img);
                setViewMode("edit");
              }}
              onInventRecipe={handleInventRecipe}
              onQuickStartHistory={quickStartFromHistory}
              onQuickCookFavorite={quickCookFavorite}
              onViewRecipes={() => setViewMode("recipes")}
            />
          )}

          {viewMode === "camera" && (
            <CameraView videoRef={videoRef} onCapture={capturePhoto} />
          )}

          {viewMode === "edit" && editingImage && (
            <EditImageView
              editingImage={editingImage}
              labelPickerOpen={labelPickerOpen}
              editingBoxIndex={editingBoxIndex}
              classOptions={classOptions}
              currentRect={currentRect}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onDone={finishEditing}
              onSelectLabel={confirmLabelSelection}
              onCancelLabel={cancelLabelPicker}
              onClassesChange={handleClassesChange}
              onEditBox={startEditBoxLabel}
              onRemoveBox={removeBoxAtIndex}
              onImageMetrics={handleEditImageMetrics}
            />
          )}

          {viewMode === "recipes" && (
            <RecipesView
              recipes={recipes}
              imageGenPending={imageGenPending}
              onFavoriteChange={refreshFavorites}
              onStartCook={startCook}
            />
          )}

          {viewMode === "cook" && activeRecipe && (
            <CookView
              recipe={activeRecipe}
              imageLoading={imageGenPending}
              onDone={endCook}
            />
          )}

          {viewMode === "favorites" && (
            <FavoritesView
              favorites={favorites}
              onFavoriteChange={refreshFavorites}
              onStartCook={startCook}
            />
          )}
          {viewMode === "settings" && (
            <Settings
            onBack={goHome}
            />
            )}

        </ViewTransition>

        {/* FAB สแกน — หน้าเมนู/โปรด ไม่ต้องกลับหน้าแรกก่อนถึงจะสแกนได้ */}
        <AnimatePresence>
          {["recipes", "favorites"].includes(viewMode) && (
            <motion.button
              key="scan-fab"
              onClick={startCamera}
              className="fab"
              aria-label="สแกนวัตถุดิบ"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 460, damping: 26 }}
            >
              <IconCamera size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Mobile bottom nav */}
        {showBottomNav && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-t border-white/60 safe-bottom">
            <div className="relative flex">
              {/* Sliding active indicator */}
              <span
                className="absolute top-0 left-0 h-1 rounded-b-full bg-[var(--color-brand)] transition-transform duration-300 ease-out"
                style={{
                  // อิงจำนวนแท็บจริง ไม่ fix เป็น 1/3 ไว้ เพิ่มแท็บทีหลังจะได้ไม่เพี้ยน
                  width: `${100 / navItems.length}%`,
                  transform: `translateX(${
                    Math.max(
                      0,
                      navItems.findIndex((i) => i.key === viewMode),
                    ) * 100
                  }%)`,
                }}
                aria-hidden
              />
              {navItems.map((item) => {
                const isActive = viewMode === item.key;
                return (
                  <motion.button
                    key={item.key}
                    onClick={() => setViewMode(item.key)}
                    whileTap={{ scale: 0.9 }}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 tap transition-colors relative ${
                      isActive
                        ? "text-[var(--color-brand)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    <motion.span
                      className="leading-none"
                      animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 18 }}
                    >
                      {item.icon(isActive)}
                    </motion.span>
                    <span className="text-[10px] font-medium">{item.label}</span>
                    {item.badge ? (
                      // key = ตัวเลข ทำให้ badge เด้งใหม่ทุกครั้งที่จำนวนเปลี่ยน
                      <motion.span
                        key={item.badge}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 520, damping: 20 }}
                        className="absolute top-1 right-1/2 translate-x-4 w-4 h-4 bg-[var(--color-brand)] text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                      >
                        {item.badge}
                      </motion.span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      <AnimatePresence>
        {loading.state && (
          <LoadingOverlay key="loading" message={loading.message} />
        )}
      </AnimatePresence>
    </div>
  );
}
