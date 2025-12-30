// Meal Planner Utility Functions
import { getMealById } from "./mealdb";

// Local storage keys
const MEAL_PLAN_KEY = "thearoma_meal_plan";
const SHOPPING_LIST_KEY = "thearoma_shopping_list";

/**
 * Get meal plan from storage
 * @param {string} userId - The user ID
 * @returns {Object|null} - The meal plan or null if none exists
 */
export const getMealPlan = async (userId) => {
  try {
    // Try to load from local storage first
    const storedPlans = JSON.parse(localStorage.getItem(MEAL_PLAN_KEY) || "{}");
    return storedPlans[userId] || null;
  } catch (error) {
    console.error("Error loading meal plan:", error);
    return null;
  }
};

/**
 * Save meal plan to storage
 * @param {string} userId - The user ID
 * @param {Object} mealPlan - The meal plan object
 * @returns {boolean} - Success status
 */
export const saveMealPlan = async (userId, mealPlan) => {
  try {
    // Load existing plans
    const storedPlans = JSON.parse(localStorage.getItem(MEAL_PLAN_KEY) || "{}");

    // Update the current user's plan
    storedPlans[userId] = mealPlan;

    // Save back to storage
    localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(storedPlans));
    return true;
  } catch (error) {
    console.error("Error saving meal plan:", error);
    return false;
  }
};

/**
 * Clear meal plan for a user
 * @param {string} userId - The user ID
 * @returns {boolean} - Success status
 */
export const clearMealPlan = async (userId) => {
  try {
    // Load existing plans
    const storedPlans = JSON.parse(localStorage.getItem(MEAL_PLAN_KEY) || "{}");

    // Remove the user's plan
    delete storedPlans[userId];

    // Save back to storage
    localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(storedPlans));
    return true;
  } catch (error) {
    console.error("Error clearing meal plan:", error);
    return false;
  }
};

/**
 * Generate a shopping list based on the recipes in the meal plan
 * @param {string} userId - The user ID
 * @param {Object} mealPlan - The meal plan object
 * @returns {Array} - Shopping list items
 */
export const generateShoppingList = async (userId, mealPlan) => {
  try {
    const ingredients = {};
    const recipeCache = {};

    // Process each day in the meal plan
    for (const [date, meals] of Object.entries(mealPlan)) {
      // Process each meal type (breakfast, lunch, dinner, snacks)
      for (const [mealType, recipes] of Object.entries(meals)) {
        // Process each recipe in this meal
        for (const recipe of recipes) {
          const recipeId = recipe.id;

          // Skip if we've already processed this recipe
          if (recipeCache[recipeId]) continue;

          // Fetch full recipe details to get ingredients
          let recipeDetails;
          try {
            recipeDetails = await getMealById(recipeId);
            recipeCache[recipeId] = recipeDetails;
          } catch (error) {
            console.error(`Error fetching recipe ${recipeId}:`, error);
            continue;
          }

          if (!recipeDetails) continue;

          // Extract ingredients
          for (let i = 1; i <= 20; i++) {
            const ingredient = recipeDetails[`strIngredient${i}`];
            const measure = recipeDetails[`strMeasure${i}`];

            if (ingredient && ingredient.trim()) {
              const ingredientName = ingredient.trim().toLowerCase();

              // Add or update in our ingredients map
              if (!ingredients[ingredientName]) {
                ingredients[ingredientName] = {
                  name: ingredient.trim(),
                  measures: [],
                  category: categorizeIngredient(ingredientName),
                };
              }

              if (measure && measure.trim()) {
                ingredients[ingredientName].measures.push(measure.trim());
              }
            }
          }
        }
      }
    }

    // Format ingredients for the shopping list
    const shoppingList = Object.values(ingredients).map((item) => {
      return {
        name: item.name,
        amount: consolidateMeasures(item.measures),
        category: item.category,
      };
    });

    // Sort by category then name
    shoppingList.sort((a, b) => {
      if (a.category === b.category) {
        return a.name.localeCompare(b.name);
      }
      return a.category.localeCompare(b.category);
    });

    // Save to local storage for later use
    saveShoppingList(userId, shoppingList);

    return shoppingList;
  } catch (error) {
    console.error("Error generating shopping list:", error);
    return [];
  }
};

/**
 * Save shopping list to storage
 * @param {string} userId - The user ID
 * @param {Array} shoppingList - The shopping list array
 * @returns {boolean} - Success status
 */
export const saveShoppingList = (userId, shoppingList) => {
  try {
    // Load existing lists
    const storedLists = JSON.parse(
      localStorage.getItem(SHOPPING_LIST_KEY) || "{}"
    );

    // Update the current user's list
    storedLists[userId] = {
      list: shoppingList,
      generatedAt: new Date().toISOString(),
    };

    // Save back to storage
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(storedLists));
    return true;
  } catch (error) {
    console.error("Error saving shopping list:", error);
    return false;
  }
};

/**
 * Get the latest shopping list from storage
 * @param {string} userId - The user ID
 * @returns {Object|null} - The shopping list object with list and generatedAt properties
 */
export const getShoppingList = (userId) => {
  try {
    const storedLists = JSON.parse(
      localStorage.getItem(SHOPPING_LIST_KEY) || "{}"
    );
    return storedLists[userId] || null;
  } catch (error) {
    console.error("Error loading shopping list:", error);
    return null;
  }
};

/**
 * Try to categorize an ingredient for better shopping list organization
 * @param {string} ingredient - Ingredient name
 * @returns {string} - Category name
 */
const categorizeIngredient = (ingredient) => {
  ingredient = ingredient.toLowerCase();

  // Define categories and their keywords
  const categories = {
    Produce: [
      "apple",
      "banana",
      "orange",
      "lettuce",
      "tomato",
      "potato",
      "onion",
      "garlic",
      "pepper",
      "carrot",
      "celery",
      "broccoli",
      "spinach",
      "kale",
      "fruit",
      "vegetable",
      "produce",
      "fresh",
      "mushroom",
    ],
    "Meat & Seafood": [
      "beef",
      "chicken",
      "pork",
      "turkey",
      "lamb",
      "fish",
      "salmon",
      "tuna",
      "shrimp",
      "shellfish",
      "meat",
      "sausage",
      "bacon",
      "ham",
      "steak",
    ],
    "Dairy & Eggs": [
      "milk",
      "cheese",
      "yogurt",
      "butter",
      "cream",
      "egg",
      "dairy",
      "margarine",
    ],
    Pantry: [
      "flour",
      "sugar",
      "salt",
      "pepper",
      "spice",
      "herb",
      "oil",
      "vinegar",
      "sauce",
      "soup",
      "pasta",
      "rice",
      "grain",
      "bean",
      "lentil",
      "canned",
      "dried",
      "condiment",
      "syrup",
      "honey",
    ],
    Bakery: [
      "bread",
      "roll",
      "bun",
      "pastry",
      "cake",
      "cookie",
      "muffin",
      "pie",
      "bakery",
    ],
    "Frozen Foods": ["frozen", "ice cream", "ice"],
    Beverages: [
      "juice",
      "soda",
      "water",
      "coffee",
      "tea",
      "beverage",
      "drink",
      "wine",
      "beer",
    ],
    Snacks: [
      "chip",
      "crisp",
      "pretzel",
      "popcorn",
      "nut",
      "seed",
      "snack",
      "candy",
      "chocolate",
    ],
  };

  // Check which category the ingredient matches
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => ingredient.includes(keyword))) {
      return category;
    }
  }

  // Default category if no match is found
  return "Other";
};

/**
 * Try to consolidate multiple measurements of the same ingredient
 * @param {Array} measures - Array of measurement strings
 * @returns {string} - Consolidated measurement or empty string
 */
const consolidateMeasures = (measures) => {
  if (!measures || measures.length === 0) return "";

  // If there's only one measure, return it
  if (measures.length === 1) return measures[0];

  // For multiple measures, just list them
  return measures.join(", ");
};
