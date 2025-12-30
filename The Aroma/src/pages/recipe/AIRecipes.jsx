import React, { useState, useEffect } from "react";
import Navbar from "../../components/common/Navbar";
import {
  ArrowLeft,
  ChevronRight,
  Zap,
  Clock,
  Bookmark,
  AlertCircle,
  Sparkles,
  Loader,
} from "lucide-react";
import { Link } from "react-router-dom";
import Toast from "../../components/common/Toast";
import DefaultRecipeImage from "../../components/common/DefaultRecipeImage";
import { useAuth } from "../../context/AuthContext";
import {
  searchMealsByName,
  searchMealsByIngredient,
  searchByMultipleIngredients,
} from "../../lib/mealdb";
import { saveRecipe, isRecipeSaved, unsaveRecipe } from "../../lib/supabase";

const AIRecipes = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    dietaryPreference: "",
    mealType: "",
    cuisine: "",
    cookingTime: "",
    skillLevel: "",
    additionalInfo: "",
  });
  const [loading, setLoading] = useState(false);
  const [aiRecipes, setAiRecipes] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info");
  const [savedRecipes, setSavedRecipes] = useState({});

  // Check saved status for recipes when they load
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!user || aiRecipes.length === 0) return;

      const savedStatusMap = {};
      for (const recipe of aiRecipes) {
        try {
          const isSaved = await isRecipeSaved(user.id, recipe.idMeal);
          savedStatusMap[recipe.idMeal] = isSaved;
        } catch (error) {
          console.error("Error checking saved status:", error);
        }
      }
      setSavedRecipes(savedStatusMap);
    };

    checkSavedStatus();
  }, [aiRecipes, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPreferences({
      ...preferences,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAiRecipes([]);

    try {
      // Build search queries based on user preferences
      let searchResults = [];

      // Primary search term based on preferences
      let searchTerm = "";

      if (preferences.cuisine) {
        searchTerm = preferences.cuisine;
      } else if (preferences.mealType) {
        searchTerm = preferences.mealType;
      } else if (preferences.dietaryPreference) {
        searchTerm = preferences.dietaryPreference;
      }

      // If additional info contains ingredients, use them
      const additionalTerms = preferences.additionalInfo
        .split(",")
        .map((term) => term.trim())
        .filter((term) => term);

      if (searchTerm) {
        // First try searching by the main term
        const results = await searchMealsByName(searchTerm);

        if (results && results.length > 0) {
          searchResults = results;
        }
      }

      // If we don't have results yet, or have additionalTerms, try by ingredients
      if (
        (searchResults.length === 0 || additionalTerms.length > 0) &&
        additionalTerms.length > 0
      ) {
        const ingredientResults = await searchByMultipleIngredients(
          additionalTerms
        );

        // If we already have results, merge them, otherwise just use ingredient results
        if (searchResults.length > 0 && ingredientResults.length > 0) {
          // Get unique recipes by ID
          const existingIds = new Set(searchResults.map((r) => r.idMeal));
          const newRecipes = ingredientResults.filter(
            (r) => !existingIds.has(r.idMeal)
          );
          searchResults = [...searchResults, ...newRecipes];
        } else if (ingredientResults.length > 0) {
          searchResults = ingredientResults;
        }
      }

      // If still no results, do a generic search based on dietary preference
      if (searchResults.length === 0 && preferences.dietaryPreference) {
        // Try popular ingredients related to dietary preference
        const dietaryIngredientMap = {
          Vegetarian: ["vegetable", "tofu", "beans"],
          Vegan: ["tofu", "beans", "lentil"],
          "Gluten-Free": ["rice", "potato", "corn"],
          "Dairy-Free": ["coconut", "almond", "oat"],
          Keto: ["avocado", "bacon", "cheese"],
          "Low-Carb": ["chicken", "beef", "vegetable"],
        };

        const relatedIngredients = dietaryIngredientMap[
          preferences.dietaryPreference
        ] || ["chicken", "beef", "vegetable"];
        const randomIngredient =
          relatedIngredients[
            Math.floor(Math.random() * relatedIngredients.length)
          ];

        const results = await searchMealsByIngredient(randomIngredient);
        if (results && results.length > 0) {
          searchResults = results;
        }
      }

      // If we still have no results, do a default search with popular terms
      if (searchResults.length === 0) {
        const defaultTerms = [
          "chicken",
          "beef",
          "pasta",
          "rice",
          "salad",
          "soup",
        ];
        const randomTerm =
          defaultTerms[Math.floor(Math.random() * defaultTerms.length)];

        const results = await searchMealsByName(randomTerm);
        if (results && results.length > 0) {
          searchResults = results;
        }
      }

      // Limit results and sort randomly to add variety
      if (searchResults.length > 0) {
        // Get full recipe details for each search result
        const fullRecipes = [];
        const limit = Math.min(6, searchResults.length);

        // Randomly select recipes if we have more than we need
        if (searchResults.length > limit) {
          searchResults = searchResults
            .sort(() => 0.5 - Math.random())
            .slice(0, limit);
        }

        setAiRecipes(searchResults);

        setToastMessage("Your personalized recipes are ready!");
        setToastType("success");
        setShowToast(true);
      } else {
        setToastMessage(
          "No recipes found matching your criteria. Try different preferences."
        );
        setToastType("error");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
      setToastMessage("Error fetching recipes. Please try again.");
      setToastType("error");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle recipe save/unsave
  const handleSaveRecipe = async (recipe) => {
    if (!user) return;

    const recipeId = recipe.idMeal;
    const isSaved = savedRecipes[recipeId];

    try {
      if (isSaved) {
        // Unsave the recipe
        const result = await unsaveRecipe(user.id, recipeId);
        if (result.success) {
          setSavedRecipes({
            ...savedRecipes,
            [recipeId]: false,
          });
          setToastMessage("Recipe removed from your collection");
          setToastType("info");
          setShowToast(true);
        }
      } else {
        // Save the recipe
        const recipeData = {
          id: recipeId,
          title: recipe.strMeal,
          image: recipe.strMealThumb,
          description: `${recipe.strArea || ""} ${
            recipe.strCategory || ""
          } recipe`,
          category: recipe.strCategory || "",
          time: "30 min", // Placeholder since MealDB doesn't provide time
          difficulty: "Medium", // Placeholder
        };

        const result = await saveRecipe(user.id, recipeData);
        if (result.success) {
          setSavedRecipes({
            ...savedRecipes,
            [recipeId]: true,
          });
          setToastMessage("Recipe saved to your collection!");
          setToastType("success");
          setShowToast(true);
        }
      }
    } catch (error) {
      console.error("Error toggling save state:", error);
      setToastMessage("Error saving recipe");
      setToastType("error");
      setShowToast(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Link
              to="/dashboard"
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">AI Recipe Recommendations</h1>
          </div>

          {/* AI Recipe Generator Form */}
          <section className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex items-center mb-4 text-primary-600">
              <Sparkles className="mr-2" size={24} />
              <h2 className="text-xl font-semibold">
                Personalized Recipe Generator
              </h2>
            </div>

            <p className="text-gray-600 mb-6">
              Tell us your preferences, and our AI will suggest personalized
              recipes from our database just for you!
            </p>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dietary Preference
                  </label>
                  <select
                    name="dietaryPreference"
                    value={preferences.dietaryPreference}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Any</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Gluten-Free">Gluten-Free</option>
                    <option value="Dairy-Free">Dairy-Free</option>
                    <option value="Keto">Keto</option>
                    <option value="Low-Carb">Low-Carb</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Type
                  </label>
                  <select
                    name="mealType"
                    value={preferences.mealType}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Any</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuisine
                  </label>
                  <select
                    name="cuisine"
                    value={preferences.cuisine}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Any</option>
                    <option value="Italian">Italian</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Mexican">Mexican</option>
                    <option value="Mediterranean">Mediterranean</option>
                    <option value="Indian">Indian</option>
                    <option value="American">American</option>
                    <option value="Middle Eastern">Middle Eastern</option>
                    <option value="Japanese">Japanese</option>
                    <option value="French">French</option>
                    <option value="Thai">Thai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cooking Time (Preference)
                  </label>
                  <select
                    name="cookingTime"
                    value={preferences.cookingTime}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Any</option>
                    <option value="Under 15 minutes">Under 15 minutes</option>
                    <option value="15-30 minutes">15-30 minutes</option>
                    <option value="30-60 minutes">30-60 minutes</option>
                    <option value="Over 60 minutes">Over 60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skill Level
                  </label>
                  <select
                    name="skillLevel"
                    value={preferences.skillLevel}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Any</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Ingredients (comma separated)
                  </label>
                  <input
                    type="text"
                    name="additionalInfo"
                    value={preferences.additionalInfo}
                    onChange={handleInputChange}
                    placeholder="e.g., chicken, rice, tomatoes"
                    className="input-field"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <span className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-white rounded-full"></span>
                    Generating Recipes...
                  </>
                ) : (
                  <>
                    <Zap size={18} className="mr-2" />
                    Generate Personalized Recipes
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Results Section */}
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">AI Chef at Work</h3>
              <p className="text-gray-600">
                Searching for recipes based on your preferences...
              </p>
            </div>
          ) : aiRecipes.length > 0 ? (
            <section>
              <div className="flex items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  Your Personalized Recipes
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {aiRecipes.map((recipe) => (
                  <div
                    key={recipe.idMeal}
                    className="card hover:shadow-lg transition-shadow"
                  >
                    <div className="relative overflow-hidden">
                      {recipe.strMealThumb ? (
                        <img
                          src={recipe.strMealThumb}
                          alt={recipe.strMeal}
                          className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <DefaultRecipeImage title={recipe.strMeal} />
                      )}
                      <button
                        className={`absolute top-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white ${
                          savedRecipes[recipe.idMeal]
                            ? "text-primary-500"
                            : "text-gray-500 hover:text-primary-500"
                        } transition-colors`}
                        onClick={() => handleSaveRecipe(recipe)}
                      >
                        <Bookmark
                          size={18}
                          fill={
                            savedRecipes[recipe.idMeal]
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                        {recipe.strMeal}
                      </h3>

                      <div className="flex justify-between text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          30 min
                        </span>
                        <span>{recipe.strCategory}</span>
                      </div>

                      {recipe.strArea && (
                        <p className="text-sm text-gray-600 mb-3">
                          {recipe.strArea} cuisine
                        </p>
                      )}

                      <Link
                        to={`/recipe/${recipe.idMeal}`}
                        className="block w-full text-center btn-primary mt-2"
                      >
                        View Full Recipe
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Helper Tips */}
          <section className="mt-8 bg-primary-50 border border-primary-100 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <AlertCircle size={20} className="text-primary-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-primary-700 mb-2">
                  AI Recipe Tips
                </h3>
                <ul className="text-sm text-primary-800 space-y-2">
                  <li className="flex items-start">
                    <ChevronRight
                      size={16}
                      className="mr-1 flex-shrink-0 mt-0.5"
                    />
                    <span>
                      Specify a cuisine type (like Italian or Mexican) for more
                      targeted results.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight
                      size={16}
                      className="mr-1 flex-shrink-0 mt-0.5"
                    />
                    <span>
                      Enter ingredients you have in the "Additional Ingredients"
                      field (separated by commas) to find recipes using those
                      ingredients.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight
                      size={16}
                      className="mr-1 flex-shrink-0 mt-0.5"
                    />
                    <span>
                      Save your favorite recipes to access them later in your
                      Saved Recipes collection.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AIRecipes;
