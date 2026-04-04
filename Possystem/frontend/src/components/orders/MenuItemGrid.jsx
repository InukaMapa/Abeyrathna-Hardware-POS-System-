import React from 'react';
import MenuItemCard from './MenuItemCard';

const MenuItemGrid = ({ items, orderItems, onAddItem }) => {
    // Get quantity for an item from order
    const getItemQuantity = (itemId) => {
        const orderItem = orderItems.find(i => i.id === itemId);
        return orderItem ? orderItem.quantity : 0;
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-20">
                <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">No Items Found</h3>
                <p className="text-gray-500">Try selecting a different category</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
                <MenuItemCard
                    key={item.id}
                    item={item}
                    quantity={getItemQuantity(item.id)}
                    onAddItem={onAddItem}
                />
            ))}
        </div>
    );
};

export default MenuItemGrid;
