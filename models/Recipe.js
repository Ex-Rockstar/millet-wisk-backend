const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  ingredients: [
    {
      ingredientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ingredient',
        required: true,
      },
      quantityRequired: {
        type: Number,
        required: true,
        min: 0,
      }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);
