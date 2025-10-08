'use client';

import { Clock, Coins, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { useCoinBalance } from '@/stores/coinBalanceStore';
import { AVAILABLE_MODELS, type ModelId } from '@/stores/modelPreferencesStore';

interface CostEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  operationName: string;
  photoCount: number;
  estimatedCoinsPerPhoto: number;
  estimatedSecondsPerPhoto: number;
  modelId: ModelId;
}

export default function CostEstimateModal({
  isOpen,
  onClose,
  onConfirm,
  operationName,
  photoCount,
  estimatedCoinsPerPhoto,
  estimatedSecondsPerPhoto,
  modelId,
}: CostEstimateModalProps) {
  const { balance } = useCoinBalance();
  const modelInfo = AVAILABLE_MODELS[modelId];

  if (!isOpen) return null;

  const totalCoins = Math.round(estimatedCoinsPerPhoto * photoCount);
  const totalSeconds = Math.round(estimatedSecondsPerPhoto * photoCount);
  const remainingBalance = balance - totalCoins;
  const hasEnoughCoins = remainingBalance >= 0;

  // Format time estimate
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `~${minutes}m`;
    return `~${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-200 px-6 sm:px-8 py-4 sm:py-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Confirm Operation</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{operationName}</p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Operation Details */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900">Operation Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Photos to process:</span>
                <span className="font-bold text-gray-900">{photoCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">AI Model:</span>
                <span className="font-bold text-purple-700">{modelInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Est. per photo:</span>
                <span className="font-bold text-gray-900">~{estimatedCoinsPerPhoto} coins</span>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className={`rounded-xl p-4 sm:p-6 border-2 ${
            hasEnoughCoins
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Coins className={`w-5 h-5 ${hasEnoughCoins ? 'text-green-600' : 'text-red-600'}`} />
              <h3 className="font-bold text-gray-900">Cost Estimate</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-base sm:text-lg">
                <span className="text-gray-700">Total Cost:</span>
                <span className="font-bold text-gray-900 text-xl sm:text-2xl">
                  {totalCoins.toLocaleString()} coins
                </span>
              </div>
              <div className="h-px bg-gray-300"></div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Balance:</span>
                <span className="font-semibold text-gray-900">{balance.toLocaleString()} coins</span>
              </div>
              <div className={`flex justify-between text-sm ${
                hasEnoughCoins ? 'text-green-700' : 'text-red-700'
              }`}>
                <span className="font-medium">Balance After:</span>
                <span className="font-bold">{remainingBalance.toLocaleString()} coins</span>
              </div>
            </div>
          </div>

          {/* Time Estimate */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Time Estimate</h3>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Estimated Duration:</span>
              <span className="font-bold text-blue-700 text-xl">{formatTime(totalSeconds)}</span>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Based on average processing speed. Actual time may vary.
            </p>
          </div>

          {/* Warning if insufficient coins */}
          {!hasEnoughCoins && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Insufficient Coins</p>
                <p className="text-xs text-red-700 mt-1">
                  You need {Math.abs(remainingBalance).toLocaleString()} more coins to complete this operation.
                  Please purchase more coins from the header menu.
                </p>
              </div>
            </div>
          )}

          {/* Info about estimates */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-yellow-900">
                <strong>Note:</strong> Cost estimates are based on average token usage. Actual costs may vary
                by ±20% depending on image complexity and the metadata generated.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg transition-colors font-semibold min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={!hasEnoughCoins}
            className={`flex-1 px-6 py-3 rounded-lg transition-colors font-semibold min-h-[48px] ${
              hasEnoughCoins
                ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {hasEnoughCoins ? 'Confirm & Process' : 'Need More Coins'}
          </button>
        </div>
      </div>
    </div>
  );
}
