import path from "path";
import { fileURLToPath } from "url";
import Tesseract from "tesseract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const extractText = async (imagePath) => {
  try {
    const result = await Tesseract.recognize(
      imagePath,
      "eng+sin",
      {
        langPath: path.join(__dirname, "../../../tessdata"), // points to tessdata folder
        cacheMethod: "none", // disables automatic .gz fetch
        logger: (m) => console.log(m),
      }
    );

    return result.data.text.replace(/\r/g, "").trim();
  } catch (err) {
    console.error("OCR Error:", err);
    return null;
  }
};
