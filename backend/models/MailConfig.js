const mongoose = require('mongoose');

const mailConfigSchema = new mongoose.Schema(
  {
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String, default: '' },
    pass: { type: String, default: '' },
    fromName: { type: String, default: 'Nexus Security Alerts' },
    fromEmail: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MailConfig', mailConfigSchema);
