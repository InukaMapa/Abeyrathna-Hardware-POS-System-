import express from "express";
import upload from "../middlewares/s3Upload.js";

const router = express.Router();

/**
 * @route   POST /api/upload/image
 * @desc    Upload an image to S3
 * @access  Public (or Protected if you add authMiddleware)
 */
router.post("/image", (req, res) => {
    upload.single("image")(req, res, (err) => {
        if (err) {
            console.error("Upload error detail:", err);
            return res.status(400).json({
                success: false,
                message: err.message || "Upload failed",
                error: err
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a file",
            });
        }

        // Return the S3 URL
        res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            imageUrl: req.file.location, // multer-s3 adds 'location' to the file object
        });
    });
});

export default router;
