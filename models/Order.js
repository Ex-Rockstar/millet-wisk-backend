const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true,
  },
  quantity: { // Quantity of product (e.g. 5 cakes)
    type: Number,
    required: true,
    min: 1,
  },
  totalIngredientCost: {
    type: Number,
    required: true,
  },
  extraCosts: {
    type: Number,
    default: 0,
  },
  totalCost: {
    type: Number,
    required: true,
  },
  profitMargin: { // e.g. 20 for 20%
    type: Number,
    default: 0,
  },
  suggestedPrice: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
