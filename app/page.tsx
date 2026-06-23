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

  return (
    <main className="min-h-screen bg-neutral-100 px-4 pt-5 pb-8 text-gray-800">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-orange-500 tracking-tight">
              Chef Kub
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">สแกนแล้วเริ่มทำได้เลย</p>
          </div>
          <div className="flex items-center gap-2">
            {favorites.length > 0 && viewMode === "home" && (
              <button
                onClick={() => setViewMode("favorites")}
                className="pill bg-pink-100 text-pink-600 flex items-center gap-1"
              >
                <span className="text-[10px]">♥</span>
                {favorites.length}
              </button>
            )}
            {viewMode !== "home" && (
              <button onClick={goHome} className="btn-primary text-sm px-4 py-2">
                กลับ
              </button>
            )}
          </div>
        </header>

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

      {loading.state && <LoadingOverlay message={loading.message} />}
    </main>
  );
}
