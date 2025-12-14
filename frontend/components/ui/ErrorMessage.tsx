'use client';

import { motion } from 'framer-motion';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export default function ErrorMessage({
  title = 'Une erreur est survenue',
  message,
  onRetry,
  showRetry = true,
}: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
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
        </div>

        {/* Error Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{title}</h3>

        {/* Error Message */}
        <p className="text-gray-700 text-center mb-4">{message}</p>

        {/* Retry Button */}
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Réessayer
          </button>
        )}
      </div>
    </motion.div>
  );
}
