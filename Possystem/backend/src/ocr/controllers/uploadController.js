import multer from "multer";

// Save uploaded images into /uploads/bills/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/bills"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

export const uploadImage = upload.single("billImage");
