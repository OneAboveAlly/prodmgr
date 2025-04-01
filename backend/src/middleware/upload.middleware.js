const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create directories if they don't exist
const createDirectoryIfNotExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created: ${dirPath}`);
  }
};

// Base upload directory
const uploadDir = path.join(__dirname, '../../public/uploads');
createDirectoryIfNotExists(uploadDir);

// Chat attachments directory
const chatAttachmentsDir = path.join(uploadDir, 'chat-attachments');
createDirectoryIfNotExists(chatAttachmentsDir);

// Storage for chat attachments
const chatAttachmentStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, chatAttachmentsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

// File type validator
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nieprawidłowy format pliku. Dozwolone formaty: obrazy, PDF, Word, Excel, i pliki tekstowe.'), false);
  }
};

// Create the upload middleware with file size limit (10MB)
const uploadAttachment = multer({
  storage: chatAttachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB size limit
  fileFilter
});

module.exports = { uploadAttachment };