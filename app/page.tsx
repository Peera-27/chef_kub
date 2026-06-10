"use client";

import "@tensorflow/tfjs-backend-webgl";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { CameraView } from "./components/views/CameraView";
import { EditImageView } from "./components/views/EditImageView";
import { FavoritesView } from "./components/views/FavoritesView";
import { HomeView } from "./components/views/HomeView";
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
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    goHome,
    refreshFavorites,
  } = useChefKub();

  return (
    <main className="min-h-screen bg-neutral-100 p-4 text-gray-800">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-orange-500">Chef Kub</h1>
            <p className="text-xs text-gray-500">สแกนวัตถุดิบ → คิดสูตรอาหาร</p>
          </div>
          <div className="flex gap-2">
            {favorites.length > 0 && viewMode === "home" && (
              <button
                onClick={() => setViewMode("favorites")}
                className="cursor-pointer text-xs bg-pink-100 text-pink-600 px-2 py-1 rounded-lg"
              >
                ❤️ {favorites.length}
              </button>
            )}
            {viewMode !== "home" && (
              <button
                onClick={goHome}
                className="cursor-pointer text-sm bg-orange-500 text-white px-3 py-1 rounded-lg"
              >
                กลับ
              </button>
            )}
          </div>
        </div>

        {viewMode === "home" && (
          <HomeView
            gallery={gallery}
            history={history}
            allItemsCount={allItems.length}
            onStartCamera={startCamera}
            onUploadImage={processImage}
            onRemoveImage={removeImage}
            onRemoveItem={removeItem}
            onEditImage={(img) => {
              setEditingImage(img);
              setViewMode("edit");
            }}
            onInventRecipe={handleInventRecipe}
          />
        )}

        {viewMode === "camera" && (
          <CameraView videoRef={videoRef} onCapture={capturePhoto} />
        )}

        {viewMode === "edit" && editingImage && (
          <EditImageView
            editingImage={editingImage}
            canvasRef={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onDone={() => setViewMode("home")}
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
          />
        )}

        {viewMode === "favorites" && (
          <FavoritesView
            favorites={favorites}
            favVersion={favVersion}
            onFavoriteChange={refreshFavorites}
          />
        )}
      </div>

      {loading.state && <LoadingOverlay message={loading.message} />}
    </main>
  );
}
