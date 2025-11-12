const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  // Recipient (required). Alias 'user' रखी है ताकि पुराने calls भी चलेँ.
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, alias: 'user' },

  // Optional sender (who triggered the notification)
  sender: { type: Schema.Types.ObjectId, ref: 'User' },

  type: { type: String, required: true },    // e.g. 'internship_applied'
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  data: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Notification', NotificationSchema);
