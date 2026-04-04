import React from 'react';

const CategoryGrid = ({ categories, selectedCategory, onSelectCategory }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {/* All Category */}
            <div
                onClick={() => onSelectCategory('all')}
                className={`
                    relative rounded-2xl overflow-hidden cursor-pointer
                    transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-red-600/10
                    ${selectedCategory === 'all'
                        ? 'ring-4 ring-red-600 shadow-2xl shadow-red-600/20'
                        : 'ring-1 ring-[#333333] hover:ring-red-600/40'
                    }
                `}
            >
                <div className="aspect-square bg-gradient-to-br from-[#1E1E1E] to-[#121212] flex items-center justify-center">
                    <svg className="w-16 h-16 text-red-600/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <div className="p-3 w-full">
                        <h3 className="text-white font-bold text-lg text-center">All Items</h3>
                    </div>
                </div>
                {selectedCategory === 'all' && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg">
                        <svg className="w-5 h-5 font-black" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Category Cards */}
            {categories.map((category) => (
                <div
                    key={category.name}
                    onClick={() => onSelectCategory(category.name)}
                    className={`
                        relative rounded-2xl overflow-hidden cursor-pointer
                        transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-red-600/10
                        ${selectedCategory === category.name
                            ? 'ring-4 ring-red-600 shadow-2xl shadow-red-600/20'
                            : 'ring-1 ring-[#333333] hover:ring-red-600/40'
                        }
                    `}
                >
                    <div className="aspect-square bg-gray-200">
                        {category.image ? (
                            <img
                                src={category.image}
                                alt={category.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/%3E%3C/svg%3E';
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#252525]">
                                <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                        <div className="p-3 w-full">
                            <h3 className="text-white font-bold text-lg text-center">{category.name}</h3>
                            <p className="text-white/90 text-sm text-center">{category.count} items</p>
                        </div>
                    </div>
                    {selectedCategory === category.name && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg">
                            <svg className="w-5 h-5 font-black" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default CategoryGrid;
