const mongoose = require('mongoose');

const shortUrlSchema = new mongoose.Schema({
  full: {
    type: String,
    required: true
  },
  short: {
    type: String,
    required: true,
    unique: true
  },
  clicks: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    index: { expires: 0 } // Automatic TTL index
  }
});

module.exports = mongoose.model('ShortUrl', shortUrlSchema);
