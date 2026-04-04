const path = require("path");
const Tesseract = require("tesseract.js");

exports.extractText = async (imagePath) => {
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
