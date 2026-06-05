import React from 'react';
import MenuCard from './MenuCard';
import '../../styles/menu.css';

const MenuList = ({ items, onEdit, onDelete }) => {
    if (!items || items.length === 0) {
        return <div className="no-items">No product items found.</div>;
    }

    return (
        <div className="menu-grid">
            {items.map(item => (
                <MenuCard
                    key={item.id}
                    item={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

export default MenuList;
