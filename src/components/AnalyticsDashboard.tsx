/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Activity as ActivityIcon,
  RefreshCw,
  Award
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Project, Activity } from '../types.js';

interface AnalyticsDashboardProps {
  project: Project;
}

export default function AnalyticsDashboard({ project }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [timeline, setTimeline] = useState<Activity[]>([]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resData, timelineData] = await Promise.all([
        api.getProjectAnalytics(project.id),
        api.getProjectTimeline(project.id)
      ]);
      setAnalytics(resData);
      setTimeline(timelineData.activities);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [project.id]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-zinc-400 bg-[#09090b] p-6 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-mono tracking-wide">Synthesizing project aggregation metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#09090b] p-6">
        <div className="max-w-md text-center p-6 bg-[#0c0c0e] border border-zinc-800 rounded-xl space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-zinc-100">Analytics Load Failed</h3>
          <p className="text-sm text-zinc-400">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
          >
            Retry Aggregates
          </button>
        </div>
      </div>
    );
  }

  const { summary, priority, workload, weeklyProgress, burndown } = analytics;

  // Render SVG Bezier Chart helper
  const drawAreaChartPath = (data: { day: string; remaining: number }[]) => {
    if (!data || data.length === 0) return '';
    const width = 500;
    const height = 150;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const maxVal = Math.max(...data.map(d => d.remaining), 5);
    const stepX = chartWidth / (data.length - 1);
    
    const points = data.map((d, idx) => {
      const x = padding + idx * stepX;
      const y = padding + chartHeight - (d.remaining / maxVal) * chartHeight;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cpX1 = p1.x + stepX / 2;
      const cpY1 = p1.y;
      const cpX2 = p2.x - stepX / 2;
      const cpY2 = p2.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p2.x} ${p2.y}`;
    }

    return {
      linePath: path,
      areaPath: `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`,
      points
    };
  };

  const chartPaths = drawAreaChartPath(burndown);

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] p-6 text-zinc-100 space-y-6" id="analytics_dashboard">
      {/* Header & Reload */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{project.name}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Real-time developer aggregates & productivity metrics</p>
        </div>
        <button 
          onClick={fetchAnalyticsData}
          className="p-2 bg-[#0c0c0e] hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition"
          title="Reload metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Done Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-500/50 transition">
          <div className="flex justify-between items-start text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/60 text-emerald-300">
              Completed
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-bold font-mono text-zinc-100">{summary.done}</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Resolved items</p>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-500/50 transition">
          <div className="flex justify-between items-start text-sky-400">
            <Layers className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950/40 border border-sky-900/60 text-sky-300">
              Active
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-bold font-mono text-zinc-100">{summary.inProgress}</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Under execution</p>
          </div>
        </div>

        {/* Todo Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-500/50 transition">
          <div className="flex justify-between items-start text-zinc-400">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-850 border border-zinc-800 text-zinc-300">
              Queue
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-bold font-mono text-zinc-100">{summary.todo}</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Ready to start</p>
          </div>
        </div>

        {/* Backlog Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-500/50 transition">
          <div className="flex justify-between items-start text-zinc-500">
            <Layers className="w-5 h-5" />
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 text-zinc-500">
              Future
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-bold font-mono text-zinc-100">{summary.backlog}</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Parked backlog</p>
          </div>
        </div>

        {/* Core Productivity Metric */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border-indigo-900/30 hover:border-indigo-500/50 transition col-span-2 md:col-span-1">
          <div className="flex justify-between items-start text-indigo-400">
            <Award className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-900/60 text-indigo-300">
              Velocity
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-bold font-mono text-zinc-100">{summary.completionRate}%</h4>
            <div className="w-full bg-zinc-850 h-1.5 rounded-full mt-1 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${summary.completionRate}%` }} />
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">Sprint completion rate</p>
          </div>
        </div>
      </div>

      {/* Main Charts Bento Grid Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Burndown Bezier Curve */}
        <div className="bg-[#0c0c0e]/40 border border-zinc-800 p-5 rounded-xl space-y-4 lg:col-span-2 hover:border-zinc-800 transition">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Project Burndown Velocity
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Remaining Tasks Over Time</span>
          </div>
          
          <div className="w-full h-44 relative bg-[#050506]/50 rounded-lg p-3 border border-zinc-800">
            {chartPaths ? (
              <svg viewBox="0 0 500 150" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid guidelines */}
                <line x1="20" y1="20" x2="480" y2="20" stroke="#1f2937" strokeDasharray="3,3" />
                <line x1="20" y1="65" x2="480" y2="65" stroke="#1f2937" strokeDasharray="3,3" />
                <line x1="20" y1="110" x2="480" y2="110" stroke="#1f2937" strokeDasharray="3,3" />
                
                {/* Area under the path */}
                <path d={chartPaths.areaPath} fill="url(#chartGlow)" />
                {/* Main line */}
                <path d={chartPaths.linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                
                {/* Interactive Points */}
                {chartPaths.points.map((p, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="4" fill="#6366f1" stroke="#09090b" strokeWidth="1.5" className="hover:scale-150 transition" />
                    <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#f4f4f5" fontSize="9" className="font-mono hidden group-hover:block bg-zinc-900 p-1 rounded">
                      {burndown[idx].remaining} left
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                No activity logged yet
              </div>
            )}
          </div>
          
          {/* Legend timeline steps */}
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-4">
            {burndown.map((b: any, idx: number) => (
              <span key={idx}>{b.day}</span>
            ))}
          </div>
        </div>

        {/* Priority Radial Donut Gauge */}
        <div className="bg-[#0c0c0e]/40 border border-zinc-800 p-5 rounded-xl space-y-4 hover:border-zinc-800 transition">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Priority Ratios
          </h3>

          <div className="flex flex-col items-center justify-center space-y-4 py-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Radial donut using SVGs */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#27272a" strokeWidth="3" />
                {(() => {
                  let accum = 0;
                  const total = priority.reduce((sum: number, p: any) => sum + p.value, 0);
                  if (total === 0) return null;
                  
                  return priority.map((p: any, idx: number) => {
                    const percentage = (p.value / total) * 100;
                    const strokeDash = `${percentage} ${100 - percentage}`;
                    const strokeOffset = 100 - accum;
                    accum += percentage;
                    return (
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke={p.color}
                        strokeWidth="3.5"
                        strokeDasharray={strokeDash}
                        strokeDashoffset={strokeOffset}
                        className="transition-all duration-500"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold font-mono text-white">{summary.total}</span>
                <span className="text-[9px] text-zinc-500 font-semibold tracking-wider uppercase">Tasks</span>
              </div>
            </div>

            {/* Custom Legend meters */}
            <div className="w-full space-y-2">
              {priority.map((p: any, idx: number) => {
                const percentage = summary.total > 0 ? Math.round((p.value / summary.total) * 100) : 0;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-zinc-300 font-medium">{p.name} Priority</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-zinc-100">{p.value}</span>
                      <span className="text-zinc-500 text-[10px]">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Team Balance & Live Feed Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team Workload balancing */}
        <div className="bg-[#0c0c0e]/40 border border-zinc-800 p-5 rounded-xl space-y-4 hover:border-zinc-800 transition">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Team Workloads</h3>
          {workload.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-zinc-600 font-mono">
              No assignees linked to board
            </div>
          ) : (
            <div className="space-y-4 h-56 overflow-y-auto pr-1">
              {workload.map((wl: any, idx: number) => {
                const totalAssigned = summary.total;
                const ratio = totalAssigned > 0 ? Math.round((wl.assigned / totalAssigned) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-200">{wl.name}</span>
                      <span className="font-mono text-zinc-400">
                        {wl.done} / {wl.assigned} resolved ({ratio}%)
                      </span>
                    </div>
                    {/* Gauge bar */}
                    <div className="w-full bg-[#050506] h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                        style={{ width: `${ratio}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Timeline Stream */}
        <div className="bg-[#0c0c0e]/40 border border-zinc-800 p-5 rounded-xl space-y-4 hover:border-zinc-800 transition">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-emerald-400" />
            Live Project timeline
          </h3>

          <div className="space-y-4 h-56 overflow-y-auto pr-1">
            {timeline.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-600 font-mono space-y-2">
                <span>Timeline log quiet...</span>
                <span className="text-[10px]">Create or update tasks to stream logs</span>
              </div>
            ) : (
              timeline.slice(0, 10).map((act) => (
                <div key={act.id} className="flex gap-3 text-xs border-b border-zinc-800 pb-2.5 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-zinc-300">
                      <span className="font-bold text-zinc-100">{act.userName}</span>{' '}
                      {act.action}{' '}
                      <span className="text-indigo-400 font-semibold">{act.targetName}</span>
                    </p>
                    <span className="text-[10px] text-zinc-500 block font-mono">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
