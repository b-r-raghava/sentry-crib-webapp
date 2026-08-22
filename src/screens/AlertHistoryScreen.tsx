import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export const AlertHistoryScreen: React.FC = () => {
  const { alerts, setPlaybackAlert, setExportModalOpen } = useApp();

  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4;

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (severityFilter && alert.severity !== severityFilter) return false;
      if (typeFilter && alert.type !== typeFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, typeFilter]);

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const clearFilters = () => {
    setSeverityFilter('');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-background mb-1">
            Alert History
          </h2>
          <p className="font-body-md text-sm text-on-surface-variant">
            Review past system events and safety triggers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="bg-primary text-on-primary font-label-sm text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span>Download Report</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant/60 p-4 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="flex items-center gap-2 border border-outline-variant rounded-xl px-3 py-1.5 bg-surface-bright focus-within:border-primary transition-colors">
          <span className="material-symbols-outlined text-outline text-lg">calendar_today</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-transparent border-none p-0 text-xs font-medium focus:ring-0 text-on-surface outline-none"
          />
        </div>

        <span className="text-outline text-xs font-semibold">to</span>

        <div className="flex items-center gap-2 border border-outline-variant rounded-xl px-3 py-1.5 bg-surface-bright focus-within:border-primary transition-colors">
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-transparent border-none p-0 text-xs font-medium focus:ring-0 text-on-surface outline-none"
          />
        </div>

        <div className="w-px h-6 bg-outline-variant/60 mx-1 hidden sm:block" />

        <select
          value={severityFilter}
          onChange={e => {
            setSeverityFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-outline-variant rounded-xl px-3 py-1.5 bg-surface-bright text-xs font-medium focus:ring-0 focus:border-primary text-on-surface cursor-pointer outline-none"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={typeFilter}
          onChange={e => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-outline-variant rounded-xl px-3 py-1.5 bg-surface-bright text-xs font-medium focus:ring-0 focus:border-primary text-on-surface cursor-pointer outline-none"
        >
          <option value="">All Alert Types</option>
          <option value="edge_risk">Edge Risk</option>
          <option value="sound">Sound Anomalies</option>
          <option value="movement">Movement</option>
          <option value="breath">Breath Rate</option>
          <option value="sharp_object">Sharp Object</option>
          <option value="face_obstruction">Face Obstruction</option>
        </select>

        {(severityFilter || typeFilter || startDate || endDate) && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto text-primary font-label-sm text-xs font-bold hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Data Table Card */}
      <div className="bg-surface rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead className="bg-surface-container-low border-b border-outline-variant/50 font-label-sm text-xs text-on-surface-variant">
              <tr>
                <th className="p-4 font-semibold">Timestamp</th>
                <th className="p-4 font-semibold">Alert Type</th>
                <th className="p-4 font-semibold">Severity</th>
                <th className="p-4 font-semibold">Duration</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-sm text-on-surface divide-y divide-outline-variant/30">
              {paginatedAlerts.length > 0 ? (
                paginatedAlerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="p-4 whitespace-nowrap font-medium text-xs sm:text-sm">
                      {alert.timestamp}
                    </td>
                    <td className="p-4 font-semibold text-on-surface">
                      {alert.typeLabel}
                    </td>
                    <td className="p-4">
                      {alert.severity === 'critical' ? (
                        <span className="inline-flex items-center gap-1 bg-error text-on-error px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold shadow-2xs">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          <span>Critical</span>
                        </span>
                      ) : alert.severity === 'medium' ? (
                        <span className="inline-flex items-center gap-1 bg-[#f59e0b] text-white px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold shadow-2xs">
                          <span className="material-symbols-outlined text-[14px]">notifications_active</span>
                          <span>Medium</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-surface-variant text-on-surface-variant px-2.5 py-0.5 rounded-full font-label-sm text-xs font-medium border border-outline-variant/60">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <span>Low</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-on-surface-variant text-xs sm:text-sm">
                      {alert.duration}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-md font-caption text-xs">
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          {alert.status === 'dismissed' ? 'cancel' : 'check_circle'}
                        </span>
                        <span className="capitalize">{alert.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setPlaybackAlert(alert)}
                        className="text-primary hover:bg-primary-container hover:text-on-primary-container p-2 rounded-full transition-colors active:scale-95"
                        title="Play Incident Clip"
                      >
                        <span className="material-symbols-outlined text-xl">play_circle</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant text-sm">
                    No alerts match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-outline-variant/50 p-4 flex justify-between items-center bg-surface-bright">
          <span className="font-caption text-xs text-on-surface-variant">
            Showing {filteredAlerts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} alerts
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-40 text-on-surface cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-1.5 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-40 text-on-surface cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
