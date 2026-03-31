const mongoose = require('mongoose');

const dataSourceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "OSV", "NPM", "Snyk"
  active: { type: Boolean, default: false },
  apiKey: { type: String, default: "" }
});

module.exports = mongoose.model('DataSource', dataSourceSchema);
