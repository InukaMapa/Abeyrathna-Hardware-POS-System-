import axios from 'axios';
import FormData from 'form-data';
import { supabase } from '../../config/db.js';

export const extractText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    // 1. Fetch current inventory names to help ML service match correctly
    const { data: inventoryItems } = await supabase
      .from('inventory')
      .select('ingredient_name');

    const inventoryNames = inventoryItems?.map(item => item.ingredient_name) || [];

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // Pass the inventory names as a JSON string
    formData.append('inventory_items', JSON.stringify(inventoryNames));

    // Proxy to Python FastAPI ML Service
    const pythonApiUrl = 'http://127.0.0.1:8000/api/extract-bill';

    const response = await axios.post(pythonApiUrl, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    // Assuming response.data is the ExtractedBillResponse JSON
    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (err) {
    console.error('OCR Proxy Error:', err.message);
    if (err.response) {
      console.error('Python API Error Data:', err.response.data);
      return res.status(err.response.status).json({ success: false, error: err.response.data });
    }
    res.status(500).json({ success: false, error: 'Failed to process bill image via ML service.' });
  }
};

export const logBillScan = async (req, res) => {
  try {
    const { image_url, ocr_text, admin_id } = req.body;

    const { data, error } = await supabase
      .from('bill_scans')
      .insert([{
        image_url,
        ocr_text,
        admin_id,
        created_at: new Date()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error logging scan:', err);
    res.status(500).json({ success: false, error: 'Failed to log scan to database.' });
  }
};
export const saveTemplate = async (req, res) => {
  try {
    const { supplier_name, items, raw_text } = req.body;

    // We send this to Python to "learn". 
    // The Python service will determine the best regex based on these corrections.
    const pythonApiUrl = 'http://127.0.0.1:8000/api/save-template';

    // For now, we simplify: we just pass a signal that this seller uses 'name_first' or 'qty_first'
    // A more advanced version would analyze the positions. 
    // Here we just pass the request through.
    const response = await axios.post(pythonApiUrl, {
      supplier_name,
      pattern_type: "auto_learn", // Python will analyze
      regex_pattern: JSON.stringify(items) // Passing corrections as the 'pattern' for now
    });

    return res.status(200).json(response.data);
  } catch (err) {
    console.error('Save Template Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save seller template.' });
  }
};
