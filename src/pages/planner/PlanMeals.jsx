import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ShoppingBag,
  Plus,
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Printer,
  Download,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Toast from "../../components/common/Toast";
import { useAuth } from "../../context/AuthContext";
import { getSavedRecipes } from "../../lib/supabase";
import { searchMealsByName, getMealById } from "../../lib/mealdb";
import DefaultRecipeImage from "../../components/common/DefaultRecipeImage";

// New functions for meal planning
import {
  getMealPlan,
  saveMealPlan,
  generateShoppingList,
} from "../../lib/mealplanner";

const PlanMeals = () => {
  const { user } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Meal planning states
  const [mealPlan, setMealPlan] = useState({});
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [expandedDays, setExpandedDays] = useState({});
  const [searchType, setSearchType] = useState("saved"); // "saved" or "all"

  // Current week dates
  const [weekDates, setWeekDates] = useState([]);

  // Initialize week dates
  useEffect(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate the date for the Monday of the current week
    const monday = new Date(today);
    // If today is Sunday (0), we need to go back 6 days to get to Monday
    // Otherwise, we go back (currentDay - 1) days (since Monday is day 1)
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

    // Generate array of 7 days starting from Monday
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push(date);
    }

    setWeekDates(days);
  }, []);

  // Load saved recipes and meal plan
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Load saved recipes
        const recipes = await getSavedRecipes(user.id);
        setSavedRecipes(recipes);

        // Load existing meal plan
        const existingPlan = await getMealPlan(user.id);
        if (existingPlan) {
          setMealPlan(existingPlan);
        } else {
          // Initialize empty meal plan if none exists
          initializeEmptyMealPlan();
        }
      } catch (error) {
        console.error("Error loading meal plan data:", error);
        initializeEmptyMealPlan();
        setToastMessage("Couldn't load your meal plan data. Starting fresh.");
        setToastType("error");
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Search MealDB for recipes
  const searchMealDB = async () => {
    if (!recipeSearchTerm.trim()) return;

    try {
      setSearching(true);
      const results = await searchMealsByName(recipeSearchTerm);

      // Format results to match our recipe structure
      const formattedResults = results.map((recipe) => ({
        recipe_id: recipe.idMeal,
        title: recipe.strMeal,
        image: recipe.strMealThumb,
        category: recipe.strCategory || "",
        area: recipe.strArea || "",
      }));

      setSearchResults(formattedResults);
    } catch (error) {
      console.error("Error searching for recipes:", error);
      setToastMessage("Failed to search for recipes");
      setToastType("error");
      setShowToast(true);
    } finally {
      setSearching(false);
    }
  };

  // Handle search input change with debounce
  useEffect(() => {
    if (searchType === "all" && recipeSearchTerm.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchMealDB();
      }, 500);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeSearchTerm, searchType]);

  // Initialize an empty meal plan with the current week
  const initializeEmptyMealPlan = () => {
    const plan = {};

    weekDates.forEach((date) => {
      const dateString = date.toISOString().split("T")[0];
      plan[dateString] = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      };
    });

    setMealPlan(plan);
  };

  // Format date for display
  const formatDate = (date) => {
    const options = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Open recipe selector for a specific day and meal
  const openRecipeSelector = (date, mealType) => {
    setSelectedDay(date.toISOString().split("T")[0]);
    setSelectedMealType(mealType);
    setShowRecipeSelector(true);
  };

  // Add recipe to meal plan
  const addRecipeToMealPlan = (recipe) => {
    if (!selectedDay || !selectedMealType) return;

    const recipeToAdd = {
      id: recipe.recipe_id || recipe.recipeId || recipe.idMeal,
      title: recipe.title || recipe.strMeal,
      image: recipe.image || recipe.strMealThumb,
    };

    // Update meal plan state
    const updatedPlan = { ...mealPlan };

    // Initialize day if it doesn't exist
    if (!updatedPlan[selectedDay]) {
      updatedPlan[selectedDay] = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      };
    }

    // Add recipe to specific meal type if not already there
    const alreadyExists = updatedPlan[selectedDay][selectedMealType].some(
      (item) => item.id === recipeToAdd.id
    );

    if (!alreadyExists) {
      updatedPlan[selectedDay][selectedMealType].push(recipeToAdd);
      setMealPlan(updatedPlan);

      // Save to storage
      saveMealPlan(user.id, updatedPlan);

      setToastMessage("Recipe added to meal plan");
      setToastType("success");
      setShowToast(true);
    } else {
      setToastMessage("This recipe is already in your meal plan for this day");
      setToastType("info");
      setShowToast(true);
    }

    setShowRecipeSelector(false);
  };

  // Remove recipe from meal plan
  const removeRecipeFromMealPlan = (day, mealType, recipeId) => {
    const updatedPlan = { ...mealPlan };

    if (updatedPlan[day] && updatedPlan[day][mealType]) {
      updatedPlan[day][mealType] = updatedPlan[day][mealType].filter(
        (recipe) => recipe.id !== recipeId
      );

      setMealPlan(updatedPlan);
      saveMealPlan(user.id, updatedPlan);

      setToastMessage("Recipe removed from meal plan");
      setToastType("info");
      setShowToast(true);
    }
  };

  // Generate shopping list from meal plan
  const handleGenerateShoppingList = async () => {
    try {
      setLoading(true);
      const list = await generateShoppingList(user.id, mealPlan);
      setShoppingList(list);
      setShowShoppingList(true);
      setLoading(false);
    } catch (error) {
      console.error("Error generating shopping list:", error);
      setToastMessage("Failed to generate shopping list");
      setToastType("error");
      setShowToast(true);
      setLoading(false);
    }
  };

  // Print shopping list
  const handlePrintShoppingList = () => {
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>Shopping List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #3c9283; }
            .category { margin-top: 20px; }
            .category-title { font-weight: bold; margin-bottom: 10px; }
            .item { margin-bottom: 5px; }
            .checked { text-decoration: line-through; color: #888; }
          </style>
        </head>
        <body>
          <h1>Shopping List</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
    `);

    // Group items by category
    const categories = {};
    shoppingList.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });

    // Print each category
    Object.keys(categories)
      .sort()
      .forEach((category) => {
        printWindow.document.write(`
        <div class="category">
          <div class="category-title">${category}</div>
      `);

        categories[category].forEach((item) => {
          printWindow.document.write(`
          <div class="item">
            □ ${item.amount ? item.amount + " " : ""}${item.name}
          </div>
        `);
        });

        printWindow.document.write("</div>");
      });

    printWindow.document.write(`
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Download shopping list as text file
  const handleDownloadShoppingList = () => {
    // Group items by category
    const categories = {};
    shoppingList.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });

    // Format the text content
    let content = "SHOPPING LIST\n";
    content += `Generated on ${new Date().toLocaleDateString()}\n\n`;

    Object.keys(categories)
      .sort()
      .forEach((category) => {
        content += `${category.toUpperCase()}:\n`;

        categories[category].forEach((item) => {
          content += `- ${item.amount ? item.amount + " " : ""}${item.name}\n`;
        });

        content += "\n";
      });

    // Create download link
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute("download", "shopping_list.txt");
    element.style.display = "none";

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Toggle expanded state for a day
  const toggleDayExpanded = (dateString) => {
    setExpandedDays({
      ...expandedDays,
      [dateString]: !expandedDays[dateString],
    });
  };

  // Filter recipes based on search
  const filteredRecipes =
    searchType === "saved"
      ? savedRecipes.filter((recipe) => {
          return recipe.title
            .toLowerCase()
            .includes(recipeSearchTerm.toLowerCase());
        })
      : searchResults;

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
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold">Meal Planner</h1>
            </div>

            {/* Generate Shopping List Button */}
            <button
              onClick={handleGenerateShoppingList}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              <ShoppingBag size={18} className="mr-2" />
              Generate Shopping List
            </button>
          </div>

          {/* Week View */}
          <section className="mb-8">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 bg-primary-50 border-b border-primary-100">
                <h2 className="text-lg font-semibold text-primary-700 flex items-center">
                  <Calendar className="mr-2" size={20} />
                  Week Meal Plan
                </h2>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading meal plan...</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {weekDates.map((date, index) => {
                    const dateString = date.toISOString().split("T")[0];
                    const dayPlan = mealPlan[dateString] || {
                      breakfast: [],
                      lunch: [],
                      dinner: [],
                      snacks: [],
                    };
                    const isExpanded = expandedDays[dateString];

                    // Count total recipes for this day
                    const totalRecipes =
                      dayPlan.breakfast.length +
                      dayPlan.lunch.length +
                      dayPlan.dinner.length +
                      dayPlan.snacks.length;

                    return (
                      <div key={dateString} className="p-4">
                        <div
                          className={`flex justify-between items-center cursor-pointer ${
                            isToday(date)
                              ? "bg-primary-50 -mx-4 px-4 py-1 rounded-md"
                              : ""
                          }`}
                          onClick={() => toggleDayExpanded(dateString)}
                        >
                          <div className="flex items-center">
                            <div className="font-semibold">
                              {formatDate(date)}
                              {isToday(date) && (
                                <span className="ml-2 bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="ml-4 text-sm text-gray-600">
                              {totalRecipes === 0
                                ? "No meals planned"
                                : `${totalRecipes} meal${
                                    totalRecipes !== 1 ? "s" : ""
                                  } planned`}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp size={20} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-400" />
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Breakfast */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium text-gray-700">
                                  Breakfast
                                </h3>
                                <button
                                  onClick={() =>
                                    openRecipeSelector(date, "breakfast")
                                  }
                                  className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                                >
                                  <Plus size={16} className="mr-1" />
                                  Add
                                </button>
                              </div>

                              {dayPlan.breakfast.length > 0 ? (
                                <div className="space-y-2">
                                  {dayPlan.breakfast.map((recipe) => (
                                    <div
                                      key={recipe.id}
                                      className="flex items-center justify-between bg-white p-2 rounded-md"
                                    >
                                      <div className="flex items-center">
                                        {recipe.image ? (
                                          <img
                                            src={recipe.image}
                                            alt={recipe.title}
                                            className="w-8 h-8 rounded-md object-cover mr-2"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-md bg-gray-200 flex items-center justify-center mr-2">
                                            <span className="text-xs text-gray-500">
                                              No img
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-sm">
                                          {recipe.title}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() =>
                                          removeRecipeFromMealPlan(
                                            dateString,
                                            "breakfast",
                                            recipe.id
                                          )
                                        }
                                        className="text-gray-400 hover:text-red-500"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  No breakfast planned
                                </div>
                              )}
                            </div>

                            {/* Lunch */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium text-gray-700">
                                  Lunch
                                </h3>
                                <button
                                  onClick={() =>
                                    openRecipeSelector(date, "lunch")
                                  }
                                  className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                                >
                                  <Plus size={16} className="mr-1" />
                                  Add
                                </button>
                              </div>

                              {dayPlan.lunch.length > 0 ? (
                                <div className="space-y-2">
                                  {dayPlan.lunch.map((recipe) => (
                                    <div
                                      key={recipe.id}
                                      className="flex items-center justify-between bg-white p-2 rounded-md"
                                    >
                                      <div className="flex items-center">
                                        {recipe.image ? (
                                          <img
                                            src={recipe.image}
                                            alt={recipe.title}
                                            className="w-8 h-8 rounded-md object-cover mr-2"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-md bg-gray-200 flex items-center justify-center mr-2">
                                            <span className="text-xs text-gray-500">
                                              No img
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-sm">
                                          {recipe.title}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() =>
                                          removeRecipeFromMealPlan(
                                            dateString,
                                            "lunch",
                                            recipe.id
                                          )
                                        }
                                        className="text-gray-400 hover:text-red-500"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  No lunch planned
                                </div>
                              )}
                            </div>

                            {/* Dinner */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium text-gray-700">
                                  Dinner
                                </h3>
                                <button
                                  onClick={() =>
                                    openRecipeSelector(date, "dinner")
                                  }
                                  className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                                >
                                  <Plus size={16} className="mr-1" />
                                  Add
                                </button>
                              </div>

                              {dayPlan.dinner.length > 0 ? (
                                <div className="space-y-2">
                                  {dayPlan.dinner.map((recipe) => (
                                    <div
                                      key={recipe.id}
                                      className="flex items-center justify-between bg-white p-2 rounded-md"
                                    >
                                      <div className="flex items-center">
                                        {recipe.image ? (
                                          <img
                                            src={recipe.image}
                                            alt={recipe.title}
                                            className="w-8 h-8 rounded-md object-cover mr-2"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-md bg-gray-200 flex items-center justify-center mr-2">
                                            <span className="text-xs text-gray-500">
                                              No img
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-sm">
                                          {recipe.title}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() =>
                                          removeRecipeFromMealPlan(
                                            dateString,
                                            "dinner",
                                            recipe.id
                                          )
                                        }
                                        className="text-gray-400 hover:text-red-500"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  No dinner planned
                                </div>
                              )}
                            </div>

                            {/* Snacks */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium text-gray-700">
                                  Snacks
                                </h3>
                                <button
                                  onClick={() =>
                                    openRecipeSelector(date, "snacks")
                                  }
                                  className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                                >
                                  <Plus size={16} className="mr-1" />
                                  Add
                                </button>
                              </div>

                              {dayPlan.snacks.length > 0 ? (
                                <div className="space-y-2">
                                  {dayPlan.snacks.map((recipe) => (
                                    <div
                                      key={recipe.id}
                                      className="flex items-center justify-between bg-white p-2 rounded-md"
                                    >
                                      <div className="flex items-center">
                                        {recipe.image ? (
                                          <img
                                            src={recipe.image}
                                            alt={recipe.title}
                                            className="w-8 h-8 rounded-md object-cover mr-2"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-md bg-gray-200 flex items-center justify-center mr-2">
                                            <span className="text-xs text-gray-500">
                                              No img
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-sm">
                                          {recipe.title}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() =>
                                          removeRecipeFromMealPlan(
                                            dateString,
                                            "snacks",
                                            recipe.id
                                          )
                                        }
                                        className="text-gray-400 hover:text-red-500"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  No snacks planned
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Tips Section */}
          <section className="bg-primary-50 border border-primary-100 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <AlertCircle size={20} className="text-primary-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-primary-700 mb-2">
                  Meal Planning Tips
                </h3>
                <ul className="text-sm text-primary-800 space-y-2">
                  <li className="flex items-start">
                    <CheckCircle
                      size={16}
                      className="mr-1 flex-shrink-0 mt-0.5"
                    />
                    <span>
                      Plan your meals for the whole week to save time and reduce
                      food waste
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle
                      size={16}
                      className="mr-1 flex-shrink-0 mt-0.5"
                    />
                    <span>
                      Use the shopping list feature to quickly see what
                      ingredients you need
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle
                      size={16}
                      className="mr-1 flex-shrink-0 mt-0.5"
                    />
                    <span>
                      Try to use similar ingredients across multiple meals to
                      reduce costs
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                Select Recipe for{" "}
                {selectedMealType.charAt(0).toUpperCase() +
                  selectedMealType.slice(1)}
              </h2>
              <button
                onClick={() => setShowRecipeSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              {/* Search type toggle */}
              <div className="flex mb-3 bg-gray-100 p-1 rounded-lg">
                <button
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium ${
                    searchType === "saved"
                      ? "bg-white shadow-sm text-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => {
                    setSearchType("saved");
                    setSearchResults([]);
                  }}
                >
                  Saved Recipes
                </button>
                <button
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium ${
                    searchType === "all"
                      ? "bg-white shadow-sm text-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setSearchType("all")}
                >
                  Search All Recipes
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder={
                    searchType === "saved"
                      ? "Search saved recipes..."
                      : "Search all recipes..."
                  }
                  value={recipeSearchTerm}
                  onChange={(e) => setRecipeSearchTerm(e.target.value)}
                />
              </div>

              {/* Search button for MealDB search */}
              {searchType === "all" && (
                <button
                  className="mt-2 w-full btn-primary flex items-center justify-center"
                  onClick={searchMealDB}
                  disabled={searching || !recipeSearchTerm.trim()}
                >
                  {searching ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search size={16} className="mr-2" />
                      Search Recipes
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {searching ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary-500 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Searching for recipes...</p>
                </div>
              ) : filteredRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredRecipes.map((recipe) => (
                    <div
                      key={recipe.recipe_id || recipe.recipeId || recipe.idMeal}
                      className="flex items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => addRecipeToMealPlan(recipe)}
                    >
                      {recipe.image || recipe.strMealThumb ? (
                        <img
                          src={recipe.image || recipe.strMealThumb}
                          alt={recipe.title || recipe.strMeal}
                          className="w-12 h-12 rounded-md object-cover mr-3"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center mr-3">
                          <span className="text-xs text-gray-500">
                            No image
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-sm line-clamp-2">
                          {recipe.title || recipe.strMeal}
                        </h3>
                        {recipe.category || recipe.strCategory ? (
                          <p className="text-xs text-gray-500">
                            {recipe.category || recipe.strCategory}
                          </p>
                        ) : null}
                      </div>
                      <Plus size={18} className="text-primary-500 ml-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 inline-flex rounded-full p-3 mb-4">
                    <AlertCircle size={24} className="text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No recipes found</h3>
                  <p className="text-gray-500">
                    {searchType === "saved"
                      ? savedRecipes.length === 0
                        ? "You don't have any saved recipes yet."
                        : "No saved recipes match your search. Try a different search term."
                      : "Try searching for recipes like 'chicken', 'pasta', or 'salad'."}
                  </p>
                  {searchType === "saved" && savedRecipes.length === 0 && (
                    <Link
                      to="/recipe-builder"
                      className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-800"
                    >
                      Go to Recipe Builder
                      <ChevronDown
                        size={16}
                        className="ml-1 transform rotate-270"
                      />
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  setShowRecipeSelector(false);
                  setRecipeSearchTerm("");
                  setSearchResults([]);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopping List Modal */}
      {showShoppingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center">
                <ShoppingBag size={18} className="mr-2" />
                Shopping List
              </h2>
              <button
                onClick={() => setShowShoppingList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {shoppingList.length > 0 ? (
                <div>
                  {/* Group ingredients by category */}
                  {Object.entries(
                    shoppingList.reduce((acc, item) => {
                      if (!acc[item.category]) {
                        acc[item.category] = [];
                      }
                      acc[item.category].push(item);
                      return acc;
                    }, {})
                  )
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, items]) => (
                      <div key={category} className="mb-4">
                        <h3 className="font-semibold text-gray-700 mb-2">
                          {category}
                        </h3>
                        <div className="space-y-1">
                          {items.map((item, index) => (
                            <div key={index} className="flex items-center">
                              <div className="w-6 h-6 flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                                />
                              </div>
                              <span className="ml-2">
                                {item.amount && (
                                  <span className="font-medium">
                                    {item.amount}{" "}
                                  </span>
                                )}
                                {item.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 inline-flex rounded-full p-3 mb-4">
                    <AlertCircle size={24} className="text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">
                    No ingredients found
                  </h3>
                  <p className="text-gray-500">
                    Your meal plan doesn't contain any recipes with ingredients
                    or the ingredients couldn't be processed.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setShowShoppingList(false)}
                className="btn-secondary"
              >
                Close
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrintShoppingList}
                  className="btn-secondary flex items-center"
                  disabled={shoppingList.length === 0}
                >
                  <Printer size={18} className="mr-2" />
                  Print
                </button>
                <button
                  onClick={handleDownloadShoppingList}
                  className="btn-primary flex items-center"
                  disabled={shoppingList.length === 0}
                >
                  <Download size={18} className="mr-2" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanMeals;
