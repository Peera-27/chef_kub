"use client";

import "@tensorflow/tfjs-backend-webgl";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { CameraView } from "./components/views/CameraView";
import { EditImageView } from "./components/views/EditImageView";
import { FavoritesView } from "./components/views/FavoritesView";
import { HomeView } from "./components/views/HomeView";
import { CookView } from "./components/views/CookView";
import { RecipesView } from "./components/views/RecipesView";
import { useChefKub } from "./hooks/useChefKub";

export default function Home() {
  const {
    loading,
    gallery,
    allItems,
    recipes,
    viewMode,
    setViewMode,
    tagFilter,
    setTagFilter,
    favorites,
    history,
    favVersion,
    activeRecipe,
    editingImage,
    setEditingImage,
    videoRef,
    canvasRef,
    allTags,
    filteredRecipes,
    startCamera,
    capturePhoto,
    processImage,
    removeItem,
    removeImage,
    handleInventRecipe,
    quickStartFromHistory,
    quickCookFavorite,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
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

  const showBottomNav = ["home", "recipes", "favorites"].includes(viewMode);

  const navItems: {
    key: "home" | "recipes" | "favorites";
    icon: string;
    label: string;
    badge?: number;
  }[] = [
    { key: "home", icon: "🏠", label: "หน้าแรก" },
    { key: "recipes", icon: "🍳", label: "เมนู", badge: recipes.length },
    { key: "favorites", icon: "❤️", label: "โปรด", badge: favorites.length },
  ];

  return (
    <div className="min-h-dvh bg-[var(--color-page)] text-[var(--color-ink)]">
      {/* ===== Desktop / Tablet layout (≥768px): sidebar + content ===== */}
      <div className="hidden md:flex md:min-h-dvh">
        {/* Sidebar */}
        <aside className="md:w-64 lg:w-72 md:flex-col md:border-r md:border-[var(--color-line)] md:bg-white md:sticky md:top-0 md:h-dvh shrink-0 flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-[var(--color-brand)] tracking-tight leading-none">
              Chef Kub
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              สแกนแล้วเริ่มทำได้เลย
            </p>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = viewMode === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setViewMode(item.key)}
                  className={`nav-item w-full ${isActive ? "nav-item-active" : "nav-item-inactive"}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span
                      className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-[var(--color-brand)] text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

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
          <div className="flex-1 px-4 md:px-8 lg:px-12 py-5 md:py-8 pb-8">
            <div className="max-w-2xl mx-auto lg:max-w-3xl">
              {viewMode === "home" && (
                <HomeView
                  gallery={gallery}
                  history={history}
                  favorites={favorites}
                  allItemsCount={allItems.length}
                  hasRecipes={recipes.length > 0}
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
                  canvasRef={canvasRef}
                  labelPickerOpen={labelPickerOpen}
                  editingBoxIndex={editingBoxIndex}
                  classOptions={classOptions}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
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
                  filteredRecipes={filteredRecipes}
                  allTags={allTags}
                  tagFilter={tagFilter}
                  onTagFilterChange={setTagFilter}
                  onFavoriteChange={refreshFavorites}
                  onStartCook={startCook}
                />
              )}

              {viewMode === "cook" && activeRecipe && (
                <CookView recipe={activeRecipe} onDone={endCook} />
              )}

              {viewMode === "favorites" && (
                <FavoritesView
                  favorites={favorites}
                  favVersion={favVersion}
                  onFavoriteChange={refreshFavorites}
                  onStartCook={startCook}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Mobile layout (<768px): top bar + bottom nav ===== */}
      <div className="md:hidden min-h-dvh flex flex-col">
        {/* Mobile header */}
        {viewMode !== "camera" && (
          <header className="sticky top-0 z-30 bg-[var(--color-page)]/80 backdrop-blur-md px-5 pt-5 pb-3 safe-top">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-brand)] tracking-tight leading-none">
                  Chef Kub
                </h1>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  สแกนแล้วเริ่มทำได้เลย
                </p>
              </div>
              <div className="flex items-center gap-2">
                {favorites.length > 0 && viewMode === "home" && (
                  <button
                    onClick={() => setViewMode("favorites")}
                    className="pill bg-[var(--color-favorite-soft)] text-[var(--color-favorite)] flex items-center gap-1 tap"
                  >
                    <span className="text-[10px]">♥</span>
                    {favorites.length}
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
        <div className="flex-1 px-5 pb-24">
          {viewMode === "home" && (
            <HomeView
              gallery={gallery}
              history={history}
              favorites={favorites}
              allItemsCount={allItems.length}
              hasRecipes={recipes.length > 0}
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
              canvasRef={canvasRef}
              labelPickerOpen={labelPickerOpen}
              editingBoxIndex={editingBoxIndex}
              classOptions={classOptions}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
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
              filteredRecipes={filteredRecipes}
              allTags={allTags}
              tagFilter={tagFilter}
              onTagFilterChange={setTagFilter}
              onFavoriteChange={refreshFavorites}
              onStartCook={startCook}
            />
          )}

          {viewMode === "cook" && activeRecipe && (
            <CookView recipe={activeRecipe} onDone={endCook} />
          )}

          {viewMode === "favorites" && (
            <FavoritesView
              favorites={favorites}
              favVersion={favVersion}
              onFavoriteChange={refreshFavorites}
              onStartCook={startCook}
            />
          )}
        </div>

        {/* Mobile bottom nav */}
        {showBottomNav && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-[var(--color-line)] safe-bottom">
            <div className="flex">
              {navItems.map((item) => {
                const isActive = viewMode === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setViewMode(item.key)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 tap transition-colors relative ${
                      isActive
                        ? "text-[var(--color-brand)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="text-[10px] font-medium">
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span className="absolute top-1 right-1/2 translate-x-4 w-4 h-4 bg-[var(--color-brand)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {loading.state && <LoadingOverlay message={loading.message} />}
    </div>
  );
}
