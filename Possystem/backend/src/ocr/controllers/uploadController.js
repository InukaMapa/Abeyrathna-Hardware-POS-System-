const multer = require("multer");

// Save uploaded images into /uploads/bills/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/bills"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

exports.uploadImage = upload.single("billImage");
