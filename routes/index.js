const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const Recipe = require('../models/Recipe');
const Order = require('../models/Order');

// ==========================
// INGREDIENTS
// ==========================
router.post('/ingredients', async (req, res) => {
  try {
    const ingredient = new Ingredient(req.body);
    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/ingredients', async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ createdAt: -1 });
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/ingredients/:id', async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================
// RECIPES
// ==========================
router.post('/recipes', async (req, res) => {
  try {
    const recipe = new Recipe(req.body);
    await recipe.save();
    res.status(201).json(recipe);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find().populate('ingredients.ingredientId').sort({ createdAt: -1 });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('ingredients.ingredientId');
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// ==========================
// ORDERS
// ==========================
router.post('/orders', async (req, res) => {
  try {
    const { recipeId, quantity, extraCosts = 0, profitMargin = 0 } = req.body;
    
    // 1. Fetch recipe
    const recipe = await Recipe.findById(recipeId).populate('ingredients.ingredientId');
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // 2. Validate inventory
    let totalIngredientCost = 0;
    
    for (let item of recipe.ingredients) {
      const ingredient = item.ingredientId;
      const totalQuantityRequired = item.quantityRequired * quantity;

      if (ingredient.quantityAvailable < totalQuantityRequired) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${ingredient.name}. Needs ${totalQuantityRequired}, has ${ingredient.quantityAvailable}.` 
        });
      }
      
      // Calculate cost
      totalIngredientCost += totalQuantityRequired * ingredient.costPerUnit;
    }

    // 3. Deduct inventory
    for (let item of recipe.ingredients) {
      const ingredient = item.ingredientId;
      const totalQuantityRequired = item.quantityRequired * quantity;
      
      ingredient.quantityAvailable -= totalQuantityRequired;
      await ingredient.save();
    }

    // 4. Calculate total costs and suggested price
    const totalCost = totalIngredientCost + Number(extraCosts);
    const suggestedPrice = totalCost + (totalCost * (Number(profitMargin) / 100));

    // 5. Create Order
    const order = new Order({
      recipeId,
      quantity,
      totalIngredientCost,
      extraCosts: Number(extraCosts),
      totalCost,
      profitMargin: Number(profitMargin),
      suggestedPrice
    });

    await order.save();
    res.status(201).json(order);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('recipeId').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// INSIGHTS
// ==========================
router.get('/insights', async (req, res) => {
  try {
    const orders = await Order.find().populate('recipeId');
    
    let totalSpending = 0;
    let expectedRevenue = 0;
    let totalProfit = 0;
    const ingredientUsage = {};

    for (let order of orders) {
      totalSpending += order.totalCost;
      expectedRevenue += order.suggestedPrice;
      totalProfit += (order.suggestedPrice - order.totalCost);

      const recipe = await Recipe.findById(order.recipeId).populate('ingredients.ingredientId');
      if (recipe) {
        for (let item of recipe.ingredients) {
          const ingId = item.ingredientId._id.toString();
          if (!ingredientUsage[ingId]) {
            ingredientUsage[ingId] = {
              name: item.ingredientId.name,
              used: 0
            };
          }
          ingredientUsage[ingId].used += (item.quantityRequired * order.quantity);
        }
      }
    }

    let mostUsedIngredient = null;
    let maxUsed = 0;
    for (let key in ingredientUsage) {
      if (ingredientUsage[key].used > maxUsed) {
        maxUsed = ingredientUsage[key].used;
        mostUsedIngredient = ingredientUsage[key].name;
      }
    }

    res.json({
      totalSpending,
      totalRevenue: expectedRevenue,
      totalProfit,
      mostUsedIngredient: mostUsedIngredient ? { name: mostUsedIngredient, quantity: maxUsed } : null,
      ordersCount: orders.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
