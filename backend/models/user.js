const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  isAdmin: { type: Boolean, default: false },
  password: {
    type: String,
    trim: true,
    minlength: 8,
    required: function () {
      return this.isAdmin === true;
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);