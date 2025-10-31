
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventSchema = new Schema({
  users: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  eventTimezone: { type: String, required: true },
  startAtUTC: { type: Date, required: true },
  endAtUTC: { type: Date, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

EventSchema.index({ users: 1, startAtUTC: 1, endAtUTC: 1 });

module.exports = mongoose.model('Event', EventSchema);
