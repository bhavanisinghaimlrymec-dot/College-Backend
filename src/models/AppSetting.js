const mongoose = require('mongoose');

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

appSettingSchema.statics.isMaintenanceOn = async function () {
  const doc = await this.findOne({ key: 'maintenanceMode' });
  return doc ? doc.value === true : false;
};

appSettingSchema.statics.setMaintenance = async function (on) {
  const enabled = on === true;
  await this.findOneAndUpdate(
    { key: 'maintenanceMode' },
    { value: enabled },
    { upsert: true }
  );
  return enabled;
};

module.exports = mongoose.model('AppSetting', appSettingSchema);
