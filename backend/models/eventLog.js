const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventLogSchema = new Schema({
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changes: [{
    field: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed
  }],
  timestampUTC: { type: Date, default: Date.now }
});

EventLogSchema.index({ event: 1, timestampUTC: -1 });

module.exports = mongoose.model('EventLog', EventLogSchema);
