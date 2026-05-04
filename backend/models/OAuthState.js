const mongoose = require('mongoose');

const oauthStateSchema = new mongoose.Schema({
  nonce: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // MongoDB TTL: auto-delete after 5 minutes
  },
});

module.exports = mongoose.model('OAuthState', oauthStateSchema);
