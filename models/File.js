// backend/models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId, // Project model se reference
    ref: 'Project',
    required: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId, // Self-reference (folder ke liye)
    ref: 'File',
    default: null, // Root files/folders ka parentId null hoga
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['file', 'folder'], // Type ya toh file hoga ya folder
    required: true,
  },
  s3Key: {
    type: String, // AWS S3 ka key (sirf files ke liye)
  },
  content: {
    type: String, // Hum S3 ke bajaaye content seedha DB mein store karenge (simplification)
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const File = mongoose.model('File', fileSchema);

module.exports = File;