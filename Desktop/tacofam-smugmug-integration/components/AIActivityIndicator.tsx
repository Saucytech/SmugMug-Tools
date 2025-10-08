'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader, CheckCircle, XCircle, Clock, Zap, Coins } from 'lucide-react';
import { useAIActivityStore } from '@/stores/aiActivityStore';

export default function AIActivityIndicator() {
  const router = useRouter();
  const { jobs, activeCount, getActiveJobs, clearCompleted } = useAIActivityStore();
  const [showPanel, setShowPanel] = useState(false);
  const activeJobs = getActiveJobs();
  const recentJobs = jobs.slice().sort((a, b) => b.startTime.getTime() - a.startTime.getTime()).slice(0, 5);

  // Auto-close panel when no active jobs
  useEffect(() => {
    if (activeCount === 0 && showPanel) {
      const timer = setTimeout(() => setShowPanel(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeCount, showPanel]);

  if (activeCount === 0 && jobs.length === 0) return null;

  return (
    <div className="relative">
      {/* Indicator Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          activeCount > 0
            ? 'bg-purple-100 hover:bg-purple-200 border-2 border-purple-300'
            : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300'
        }`}
        aria-label={`${activeCount} AI operations active`}
      >
        {activeCount > 0 ? (
          <Sparkles className="w-5 h-5 text-purple-600 animate-spin" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}

        <span className={`font-bold ${activeCount > 0 ? 'text-purple-900' : 'text-gray-700'}`}>
          {activeCount}
        </span>

        <span className="text-sm font-medium hidden sm:inline text-gray-700">
          {activeCount > 0 ? 'AI Active' : 'Complete'}
        </span>

        {/* Pulse animation for active jobs */}
        {activeCount > 0 && (
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border-2 border-purple-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI Operations
                </h3>
                {jobs.length > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-white transition-colors"
                  >
                    Clear Completed
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {activeCount > 0 ? `${activeCount} running` : 'All complete'}
              </p>
            </div>

            {/* Job List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {recentJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No AI operations yet</p>
                </div>
              ) : (
                recentJobs.map((job) => <AIJobCard key={job.id} job={job} router={router} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AIJobCard({ job, router }: { job: any; router: any }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (job.status === 'processing') {
      const interval = setInterval(() => {
        const ms = Date.now() - new Date(job.startTime).getTime();
        setElapsed(Math.floor(ms / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else if (job.endTime) {
      const ms = new Date(job.endTime).getTime() - new Date(job.startTime).getTime();
      setElapsed(Math.floor(ms / 1000));
    }
  }, [job.status, job.startTime, job.endTime]);

  const statusConfig = {
    processing: {
      icon: <Loader className="w-4 h-4 animate-spin text-purple-600" />,
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
    completed: {
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    error: {
      icon: <XCircle className="w-4 h-4 text-red-600" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
  };

  const config = statusConfig[job.status];

  return (
    <div
      className={`${config.bg} rounded-lg p-3 border ${config.border} transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">{job.tool}</span>
            {config.icon}
          </div>
          {job.modelName && (
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-purple-700 font-medium">{job.modelName}</span>
            </div>
          )}
          {job.message && (
            <p className="text-xs text-gray-600 leading-snug">{job.message}</p>
          )}
        </div>
      </div>

      {/* Progress bar for processing jobs */}
      {job.status === 'processing' && job.progress !== undefined && (
        <div className="mb-2">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs mt-2">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {elapsed}s
          </span>
          {job.coinsSpent !== undefined && (
            <span className="text-yellow-600 font-bold flex items-center gap-1">
              <Coins className="w-3 h-3" />
              {job.coinsSpent.toLocaleString()} coins
            </span>
          )}
          {job.inputTokens && job.outputTokens && (
            <span className="text-gray-500 text-[10px]">
              AI: {job.inputTokens}→{job.outputTokens}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            router.push(job.toolPath);
          }}
          className="text-purple-600 hover:text-purple-700 font-medium hover:underline"
        >
          Jump →
        </button>
      </div>

      {job.error && (
        <div className="mt-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
          {job.error}
        </div>
      )}
    </div>
  );
}
