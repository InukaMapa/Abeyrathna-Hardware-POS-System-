import React from 'react';

const MenuItemCard = ({ item, quantity, onAddItem }) => {
    const hasVariants = item.variants && item.variants.length > 0;

    const handleClick = () => {
        onAddItem(item);
    };

    return (
        <div
            onClick={handleClick}
            className="
                relative rounded-2xl overflow-hidden cursor-pointer
                transition-all duration-300 transform hover:scale-105
                bg-[#252525] shadow-lg hover:shadow-red-600/10
                ring-1 ring-[#333333] hover:ring-2 hover:ring-red-600/50
            "
        >
            {/* Item Image */}
            <div className="aspect-square bg-[#1E1E1E] relative border-b border-[#333333]">
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/%3E%3C/svg%3E';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
                        <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Item Info */}
            <div className="p-5">
                <h3 className="font-bold text-white text-lg mb-4 line-clamp-2 min-h-[3.5rem] tracking-tight">
                    {item.name}
                </h3>
                <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-red-500">
                        Rs. {parseFloat(item.price).toFixed(2)}
                    </span>

                    {/* Variants Indicator */}
                    {hasVariants && (
                        <div className="p-1.5 bg-red-600/10 rounded-lg">
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MenuItemCard;
