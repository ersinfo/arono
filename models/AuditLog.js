const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const AuditLogSchema = new Schema({
action: String,
by: { type: Schema.Types.ObjectId, ref: 'User' },
targetApplication: { type: Schema.Types.ObjectId, ref: 'Application' },
detail: Object
}, { timestamps:true });


module.exports = mongoose.model('AuditLog', AuditLogSchema);