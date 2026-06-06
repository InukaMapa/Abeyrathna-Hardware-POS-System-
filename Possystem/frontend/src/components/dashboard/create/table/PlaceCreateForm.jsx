import React, { useState } from 'react';
import { createPlace } from '../../../../services/placeService';

/**
 * PlaceCreateForm Component
 * Form for creating store sections or billing areas.
 */
const PlaceCreateForm = ({ onPlaceCreated }) => {
    const [placeName, setPlaceName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!placeName.trim()) {
            setError('Place name is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const newPlace = await createPlace({ place_name: placeName.trim() });
            
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);

            // Reset form
            setPlaceName('');

            // Notify parent component
            if (onPlaceCreated) {
                onPlaceCreated(newPlace);
            }
        } catch (err) {
            setError(err.message || 'Failed to create place');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#1E1E1E] rounded-lg shadow-lg p-6 border border-[#333333]">
            <h2 className="text-xl font-bold text-[#E0E0E0] mb-4 flex items-center gap-2">
                <svg
                    className="h-6 w-6 text-[#D32F2F]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
                Create New Place
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Place Name Input */}
                <div>
                    <label
                        htmlFor="place_name"
                        className="block text-sm font-medium text-[#E0E0E0] mb-1"
                    >
                        Place Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="place_name"
                        name="place_name"
                        value={placeName}
                        onChange={(e) => {
                            setPlaceName(e.target.value);
                            setError(null);
                        }}
                        placeholder="e.g., Counter 1, Main Store, Paint Section"
                        className="w-full px-4 py-2 border border-[#333333] bg-[#121212] text-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#D32F2F] focus:border-[#D32F2F] placeholder-[#666666]"
                        disabled={loading}
                    />
                </div>

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
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="bg-[#1F2D1F] border border-[#4CAF50] text-[#81C784] px-4 py-3 rounded-lg flex items-start gap-2">
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span className="text-sm">Place created successfully!</span>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg
                                className="animate-spin h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Creating...
                        </span>
                    ) : (
                        'Create Place'
                    )}
                </button>
            </form>

            {/* Helper Text */}
            <p className="text-xs text-[#A0A0A0] mt-3">
                Places are store sections, counters, or areas used to organize orders.
            </p>
        </div>
    );
};

export default PlaceCreateForm;
