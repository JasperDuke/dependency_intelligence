const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  title: { type: String, default: '' },
  /** Raw manifest text last saved (upload or edit). */
  sourceContent: { type: String, default: '' },
  /** e.g. package.json, requirements.txt, uv.lock, plain-npm, plain-python */
  fileType: { type: String, default: '' },
  projectType: { type: String, enum: ['npm', 'python'], required: true },
  packages: [{
    name: String,
    version: String,
    vulnerable: { type: Boolean, default: false },
    vulnerabilities: [{
       id: String,
       summary: String,
       details: String,
       published: Date,
       fixedVersion: String,
       affectedRange: { type: String, default: '' },
       severity: { type: String, default: '' },
       sources: [{ type: String }]
    }],
    hasHistoricBreach: { type: Boolean, default: false },
    historicBreachCount: { type: Number, default: 0 }
  }],
  lastScanned: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
