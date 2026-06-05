import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { QR_ORDER_BASE_URL } from "../../../../config/api";

const TableEditModal = ({ table, places = [], onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    place_id: "",
    seats: "",
    qr_url: "",
  });

  const [qrImage, setQrImage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (table) {
      setFormData({
        place_id: table.place_id || "",
        seats: table.seats || "",
        qr_url: table.qr_url || "",
      });
      setQrImage("");
      setError("");
    }
  }, [table]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "seats" || name === "place_id"
          ? value === ""
            ? ""
            : Number(value)
          : value,
      qr_url: "",
    }));

    setQrImage("");
    setError("");
  };

  const generateQr = async () => {
    if (!formData.place_id) {
      setError("Please select a place before generating QR");
      return;
    }

    if (!formData.seats || formData.seats < 1) {
      setError("Seats must be at least 1");
      return;
    }

    try {
      const selectedPlace = places.find(
        (p) => Number(p.place_id) === Number(formData.place_id)
      );

      const placeName = selectedPlace?.place_name || "counter";
      const uniqueKey = `${placeName}-${table?.table_id}-${Date.now()}`;

      const url = `${QR_ORDER_BASE_URL}?table=${encodeURIComponent(
        uniqueKey
      )}`;

      const qr = await QRCode.toDataURL(url);

      setFormData((prev) => ({
        ...prev,
        qr_url: url,
      }));

      setQrImage(qr);
      setError("");
    } catch {
      setError("Failed to generate QR");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.place_id) {
      setError("Place is required");
      return;
    }

    if (!formData.seats || formData.seats < 1) {
      setError("Seats must be at least 1");
      return;
    }

    if (!formData.qr_url) {
      setError("Please generate a new QR before updating");
      return;
    }

    setLoading(true);

    try {
      await onUpdate(table.table_id, {
        place_id: Number(formData.place_id),
        seats: Number(formData.seats),
        qr_url: formData.qr_url,
      });

      onClose();
    } catch (err) {
      setError(err.message || "Failed to update counter");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrImage) return;

    const link = document.createElement("a");
    link.href = qrImage;
    link.download = `counter-${table?.table_id || "updated"}-qr.png`;
    link.click();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Edit Counter #{table?.table_id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="place_id"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Place
            </label>
            <select
              id="place_id"
              name="place_id"
              value={formData.place_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a place</option>
              {places.map((place) => (
                <option key={place.place_id} value={place.place_id}>
                  {place.place_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="seats"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Capacity
            </label>
            <input
              type="number"
              id="seats"
              name="seats"
              value={formData.seats}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 4"
              required
            />
          </div>

          <button
            type="button"
            onClick={generateQr}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate Unique QR
          </button>

          {qrImage && (
            <div className="text-center border rounded-lg p-4 bg-gray-50">
              <img
                src={qrImage}
                alt="Generated QR"
                className="mx-auto bg-white p-2 rounded w-40"
              />
              <p className="text-xs text-gray-500 break-all mt-2">
                {formData.qr_url}
              </p>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Download QR
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !formData.qr_url}
            >
              {loading ? "Updating..." : "Update Counter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableEditModal;
