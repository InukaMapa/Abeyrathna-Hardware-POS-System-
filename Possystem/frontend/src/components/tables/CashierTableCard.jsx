import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * CashierTableCard Component
 * POS-style table card with color-coded order status
 * 
 * Color Logic (POS Standard):
 * - No active order: Gray
 * - PLACED: Blue
 * - PREPARING: Orange
 * - SERVED: Green
 * - BILL_OPEN: Red
 */
const CashierTableCard = ({ table, onClick }) => {
    const { userRole } = useAuth();
    const { tableId, seats, hasActiveOrder, orderStatus, totalAmount } = table;
    const isAdmin = userRole === 'ADMIN';

    // Determine card styling based on order status
    const getCardStyle = () => {
        if (!hasActiveOrder) {
            return {
                bg: isAdmin ? 'bg-[#252525]' : 'bg-[#252525] hover:bg-[#2d2d2d]',
                border: 'border-[#3d3d3d] hover:border-[#4d4d4d]',
                text: 'text-white',
                subtext: 'text-gray-400',
                statusBg: 'bg-gray-600',
                statusText: 'Available'
            };
        }

        switch (orderStatus) {
            case 'PLACED':
                return {
                    bg: 'bg-blue-600/10 hover:bg-blue-600/20',
                    border: 'border-blue-600/50',
                    text: 'text-blue-200',
                    subtext: 'text-blue-400/80',
                    statusBg: 'bg-blue-600',
                    statusText: 'Placed'
                };
            case 'PREPARING':
                return {
                    bg: 'bg-orange-600/10 hover:bg-orange-600/20',
                    border: 'border-orange-600/50',
                    text: 'text-orange-200',
                    subtext: 'text-orange-400/80',
                    statusBg: 'bg-orange-600',
                    statusText: 'Preparing'
                };
            case 'SERVED':
                return {
                    bg: 'bg-green-600/10 hover:bg-green-600/20',
                    border: 'border-green-600/50',
                    text: 'text-green-200',
                    subtext: 'text-green-400/80',
                    statusBg: 'bg-green-600',
                    statusText: 'Served'
                };
            case 'BILL_OPEN':
                return {
                    bg: 'bg-red-600/10 hover:bg-red-600/20',
                    border: 'border-red-600/50',
                    text: 'text-red-200',
                    subtext: 'text-red-400/80',
                    statusBg: 'bg-red-600',
                    statusText: 'Bill Open'
                };
            case 'BOOKED':
                return {
                    bg: 'bg-purple-600/10 hover:bg-purple-600/20',
                    border: 'border-purple-600/50',
                    text: 'text-purple-200',
                    subtext: 'text-purple-400/80',
                    statusBg: 'bg-purple-600',
                    statusText: 'Booked'
                };
            default:
                return {
                    bg: 'bg-gray-600/10 hover:bg-gray-600/20',
                    border: 'border-gray-600/50',
                    text: 'text-gray-200',
                    subtext: 'text-gray-400/80',
                    statusBg: 'bg-gray-600',
                    statusText: 'Unknown'
                };
        }
    };

    const style = getCardStyle();

    return (
        <div
            onClick={() => onClick(table)}
            className={`
                ${style.bg} ${style.border} ${style.text}
                border-3 rounded-xl p-5 ${isAdmin ? 'cursor-default' : 'cursor-pointer transform hover:scale-105 hover:shadow-xl active:scale-95'}
                transition-all duration-200
                min-h-[150px] flex flex-col justify-between
            `}
            style={{ borderWidth: '3px' }}
        >
            {/* Table Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className={`text-3xl font-bold mb-1 ${style.text}`}>
                        T{tableId}
                    </h3>
                    <p className={`text-sm ${style.subtext} font-medium flex items-center gap-1.5`}>
                        <svg className="w-4 h-4 opacity-70" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        {seats} {seats === 1 ? 'seat' : 'seats'}
                    </p>
                </div>

                {/* Status Badge */}
                <span className={`
                    ${style.statusBg} text-white text-xs font-bold
                    px-3 py-1.5 rounded-full whitespace-nowrap
                    shadow-sm
                `}>
                    {style.statusText}
                </span>

                {/* Specific Booked Indicator (Optional icon) */}
                {orderStatus === 'BOOKED' && (
                    <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                        <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                        </span>
                    </div>
                )}
            </div>

            {/* Order Details or Empty State */}
            {hasActiveOrder ? (
                <div className="mt-auto pt-3 border-t-2 border-current opacity-40">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold uppercase">Total:</span>
                        <span className="text-xl font-bold">
                            Rs. {parseFloat(totalAmount || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="mt-auto flex items-center justify-center opacity-30 pt-2">
                    {!isAdmin && (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    )}
                </div>
            )}
        </div>
    );
};

export default CashierTableCard;
