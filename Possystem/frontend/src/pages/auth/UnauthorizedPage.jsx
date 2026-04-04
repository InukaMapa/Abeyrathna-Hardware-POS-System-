import React from 'react';
import { useAuth } from '../../context/AuthContext';

const UnauthorizedPage = ({ onNavigate }) => {
    const { user, logout } = useAuth();

    const handleGoBack = () => {
        // Redirect based on user role
        if (user?.role === 'ADMIN') {
            onNavigate('dashboard');
        } else if (user?.role === 'CASHIER') {
            onNavigate('order-operations');
        } else {
            logout();
            onNavigate('login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6">
                    <svg 
                        className="mx-auto h-24 w-24 text-red-500"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                        />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
                <p className="text-gray-600 mb-8">
                    You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={handleGoBack}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                        Go to Home
                    </button>
                    <button
                        onClick={() => {
                            logout();
                            onNavigate('login');
                        }}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
