
import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "src/ocr/uploads/bills"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

export default upload.single("billImage");
