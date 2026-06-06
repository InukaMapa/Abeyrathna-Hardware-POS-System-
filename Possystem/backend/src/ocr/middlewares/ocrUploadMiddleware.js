import multer from 'multer';

// Use memory storage so we can proxy directly to FastAPI without saving to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, JPEG, and PNG are allowed.'), false);
    }
};

const ocrUpload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB limit
    },
    fileFilter
});

export default ocrUpload;
