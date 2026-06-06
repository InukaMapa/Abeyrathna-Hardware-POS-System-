import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { createTable } from "../../../../services/tableService";
import { getAllPlaces } from "../../../../services/placeService";
import { QR_ORDER_BASE_URL } from "../../../../config/api";

/* ---------------- HELPERS ---------------- */
const normalizePlaceName = (name) =>
    name ? name.trim().replace(/\s+/g, "").toLowerCase() : "";

const formatPlaceName = (name) =>
    name
        ? name
            .trim()
            .replace(/\s+/g, " ")
            .split(" ")
            .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")
        : "";

/* ---------------- COMPONENT ---------------- */
const TableCreateForm = ({ onTableCreated }) => {
    const [places, setPlaces] = useState([]);
    const [formData, setFormData] = useState({
        place_id: "",
        seats: 4,
    });

    const [qrUrl, setQrUrl] = useState("");
    const [qrImage, setQrImage] = useState("");
    const [tableId, setTableId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    /* -------- FETCH PLACES -------- */
    useEffect(() => {
        getAllPlaces()
            .then(setPlaces)
            .catch(() => setError("Failed to load places"));
    }, []);

    /* -------- UNIQUE PLACES -------- */
    const uniquePlaces = useMemo(() => {
        const seen = new Set();
        return places.filter((p) => {
            const key = normalizePlaceName(p.place_name);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [places]);

    /* -------- STEP 1: GENERATE QR -------- */
    const generateQr = async () => {
        if (!formData.place_id) {
            setError("Select place first");
            return;
        }

        const place = uniquePlaces.find(
            (p) => p.place_id === Number(formData.place_id)
        );

        if (!place) {
            setError("Invalid place selected");
            return;
        }

        const uniqueKey = `${place.place_name}-${Date.now()}`;

        /* ✅ YOUR LINK ADDED HERE */
        const url = `${QR_ORDER_BASE_URL}?table=${encodeURIComponent(
            uniqueKey
        )}`;

        const qr = await QRCode.toDataURL(url);

        setQrUrl(url);
        setQrImage(qr);
        setError("");
        setSuccess("");
    };

    /* -------- STEP 2: CREATE TABLE -------- */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!qrUrl || !qrImage) {
            setError("Generate QR first");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const table = await createTable({
                place_id: Number(formData.place_id),
                seats: formData.seats,
                qr_url: qrUrl,
            });

            setTableId(table.table_id);
            setSuccess("Counter created successfully");

            if (onTableCreated) {
                onTableCreated(table);
            }

            setFormData({ place_id: "", seats: 4 });
        } catch {
            setError("Failed to create table");
        } finally {
            setLoading(false);
        }
    };

    /* -------- DOWNLOAD QR -------- */
    const handleDownloadQr = () => {
        if (!qrImage) return;

        const link = document.createElement("a");
        link.href = qrImage;
        link.download = `counter-${tableId || "new"}-qr.png`;
        link.click();
    };

    return (
        <div className="bg-[#1E1E1E] p-6 rounded-lg text-[#E0E0E0]">
            <h2 className="text-xl font-bold mb-4">Create Counter / Area</h2>

            {/* Error Message */}
            {error && (
                <div className="bg-[#2D1F1F] border border-[#D32F2F] text-[#FF6B6B] px-4 py-3 rounded-lg flex items-start gap-2">
                    <svg
                        className="h-5 w-5 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span className="text-m">{error}</span>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 bg-green-900/40 border border-green-600 text-green-400 px-4 py-3 rounded-lg mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    <span className="font-medium">Counter created successfully!</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* PLACE */}
                <select
                    value={formData.place_id}
                    onChange={(e) =>
                        setFormData({ ...formData, place_id: e.target.value })
                    }
                    className="w-full p-2 bg-[#121212] rounded"
                >
                    <option value="">Select place</option>
                    {uniquePlaces.map((p) => (
                        <option key={p.place_id} value={p.place_id}>
                            {formatPlaceName(p.place_name)}
                        </option>
                    ))}
                </select>

                {/* CAPACITY */}
                <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.seats}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            seats: Number(e.target.value),
                        })
                    }
                    className="w-full p-2 bg-[#121212] rounded"
                />

                {/* GENERATE QR */}
                <button
                    type="button"
                    onClick={generateQr}
                    className="w-full bg-[#333333] text-white py-2 rounded hover:bg-[#D32F2F] transition-colors"
                >
                    Generate QR
                </button>

                {/* QR PREVIEW */}
                {qrImage && (
                    <div className="text-center mt-4">
                        <img
                            src={qrImage}
                            alt="QR"
                            className="mx-auto bg-white p-2 rounded w-40"
                        />
                        <p className="text-xs break-all mt-2">{qrUrl}</p>

                        <button
                            type="button"
                            onClick={handleDownloadQr}
                            className="mt-3 bg-[#333333] text-white px-4 py-2 rounded hover:bg-[#D32F2F] transition-colors"
                        >
                            Download QR
                        </button>
                    </div>
                )}

                {/* CREATE TABLE */}
                <button
                    type="submit"
                    disabled={loading || !qrUrl}
                    className="w-full bg-[#D32F2F] text-white py-2 rounded hover:bg-[#B71C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating..." : "Create Counter"}
                </button>
            </form>
        </div>
    );
};

export default TableCreateForm;
