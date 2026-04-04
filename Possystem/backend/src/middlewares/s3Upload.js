import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { config } from "../config/env.js";

const s3 = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
    },
});

const s3Storage = multerS3({
    s3: s3,
    bucket: config.aws.bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
        cb(null, { fieldname: file.fieldname });
    },
    key: (req, file, cb) => {
        const fileName = `menu/${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

function sanitizeFile(file, cb) {
    // Define allowed file types
    const filetypes = /jpeg|jpg|png/;

    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        console.warn(`File rejected: mimetype=${file.mimetype}, extname=${path.extname(file.originalname)}`);
        cb(new Error("Error: Images Only (jpg, jpeg, png)!"));
    }
}

const upload = multer({
    storage: s3Storage,
    fileFilter: (req, file, cb) => {
        sanitizeFile(file, cb);
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

export default upload;
