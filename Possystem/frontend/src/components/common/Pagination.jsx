import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 10,
    label = 'records',
    showPageNumbers = true,
    className = ''
}) => {
    if (totalPages <= 1 && totalItems <= itemsPerPage) {
        return null;
    }

    const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = totalItems > 0 ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className={`flex items-center justify-between gap-4 flex-wrap px-6 py-4 bg-gray-50/80 border-t border-gray-200/80 rounded-b-2xl ${className}`}>
            <div className="text-xs text-gray-500 font-medium tracking-tight">
                {totalItems > 0 ? (
                    <>
                        Showing <span className="font-bold text-gray-800">{startItem}</span> to <span className="font-bold text-gray-800">{endItem}</span> of <span className="font-bold text-gray-800">{totalItems}</span> {label}
                    </>
                ) : (
                    <>
                        Page <span className="font-bold text-gray-800">{currentPage}</span> of <span className="font-bold text-gray-800">{totalPages}</span>
                    </>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                {/* First Page */}
                {totalPages > 4 && (
                    <button
                        type="button"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:cursor-not-allowed"
                        title="First Page"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                )}

                {/* Previous Page */}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-green-700 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:cursor-not-allowed"
                    title="Previous Page"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                </button>

                {/* Page Number Buttons */}
                {showPageNumbers && (
                    <div className="flex items-center gap-1 mx-1">
                        {getPageNumbers().map((page, idx) => {
                            if (page === '...') {
                                return (
                                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-gray-400 font-bold select-none">
                                        ...
                                    </span>
                                );
                            }

                            const isActive = page === currentPage;
                            return (
                                <button
                                    key={`page-${page}`}
                                    type="button"
                                    onClick={() => onPageChange(page)}
                                    className={`min-w-[28px] h-7 px-2 flex items-center justify-center text-xs font-bold rounded-lg transition-all ${
                                        isActive
                                            ? 'bg-green-700 text-white shadow-sm shadow-green-700/20'
                                            : 'text-gray-600 hover:text-green-700 hover:bg-green-50 border border-transparent hover:border-green-200'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Next Page */}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-green-700 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:cursor-not-allowed"
                    title="Next Page"
                >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                {totalPages > 4 && (
                    <button
                        type="button"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:cursor-not-allowed"
                        title="Last Page"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Pagination;
