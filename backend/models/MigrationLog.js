const mongoose = require('mongoose');

const migrationLogSchema = new mongoose.Schema({
  migratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  records: [{
    emailId: { type: mongoose.Schema.Types.ObjectId, ref: 'Email' },
    originalUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  status: {
    type: String,
    enum: ['completed', 'rolled_back'],
    default: 'completed'
  },
  createdAt: { type: Date, default: Date.now },
  rolledBackAt: { type: Date }
});

module.exports = mongoose.model('MigrationLog', migrationLogSchema);
