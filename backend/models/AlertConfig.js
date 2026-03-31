const mongoose = require('mongoose');

const AlertConfigSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AlertConfig', AlertConfigSchema);
