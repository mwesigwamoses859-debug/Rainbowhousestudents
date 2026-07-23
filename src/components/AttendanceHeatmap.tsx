import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  CalendarCheck, 
  Filter, 
  Info, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2, 
  Calendar,
  CloudRain,
  UserX,
  Sparkles,
  ChevronRight,
  Maximize2,
  RefreshCw,
  BarChart2
} from 'lucide-react';
import { ClassName } from '../types';

interface AttendanceDayData {
  date: Date;
  dateStr: string;
  dayName: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  weekIndex: number; // 1 to 12
  overallRate: number; // 0 - 100%
  presentCount: number;
  totalCount: number;
  absentCount: number;
  reasons: {
    sickness: number;
    weather: number;
    feesTransport: number;
    unexcused: number;
  };
  byClass: Record<ClassName, number>; // Attendance rate per class
  isRainyDay?: boolean;
}

interface AttendanceHeatmapProps {
  totalStudentsCount?: number;
  selectedClass?: string;
  onSelectDayDetails?: (day: AttendanceDayData) => void;
}

export default function AttendanceHeatmap({
  totalStudentsCount = 245,
  selectedClass: propSelectedClass,
  onSelectDayDetails
}: AttendanceHeatmapProps) {
  const [selectedTerm, setSelectedTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 2');
  const [selectedClass, setSelectedClass] = useState<string>(propSelectedClass || 'All Classes');
  const [metricMode, setMetricMode] = useState<'rate' | 'absent' | 'unexcused'>('rate');
  const [selectedDay, setSelectedDay] = useState<AttendanceDayData | null>(null);
  const [hoveredDay, setHoveredDay] = useState<AttendanceDayData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Generate realistic 12-week daily attendance data for selected term
  const heatmapData = useMemo(() => {
    const classes: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
    const days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    
    // Base start dates for Ugandan school terms
    const termStartDates = {
      'Term 1': new Date(2026, 1, 2), // Feb 2, 2026
      'Term 2': new Date(2026, 4, 25), // May 25, 2026
      'Term 3': new Date(2026, 8, 14), // Sep 14, 2026
    };

    const startDate = termStartDates[selectedTerm];
    const data: AttendanceDayData[] = [];

    let dayCounter = 0;
    for (let week = 1; week <= 12; week++) {
      for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (week - 1) * 7 + dayIdx);

        // Pseudo-random seed calculation based on date for consistency
        const seed = (currentDate.getFullYear() * 1000) + (currentDate.getMonth() * 100) + currentDate.getDate();
        const pseudoRand = (offset: number) => {
          const x = Math.sin(seed + offset) * 10000;
          return x - Math.floor(x);
        };

        const dayName = days[dayIdx];
        const isFriday = dayName === 'Fri';
        const isMonday = dayName === 'Mon';

        // Rainy day simulation (around week 3 and week 7)
        const isRainyDay = (week === 3 && dayName === 'Wed') || (week === 7 && dayName === 'Thu') || (week === 10 && dayName === 'Tue');

        // Base attendance rate
        let baseRate = 97.2;
        if (isFriday) baseRate -= 3.1; // Friday drop pattern
        if (isMonday) baseRate -= 1.2;
        if (isRainyDay) baseRate -= 8.5; // Heavy rain in Nansana/Kalerwe

        // Random jitter (-1.5% to +1.8%)
        const jitter = (pseudoRand(1) * 3.3) - 1.5;
        let finalRate = Math.min(99.6, Math.max(82.0, baseRate + jitter));
        finalRate = Math.round(finalRate * 10) / 10;

        const totalEnrolled = totalStudentsCount;
        const present = Math.round((finalRate / 100) * totalEnrolled);
        const absent = totalEnrolled - present;

        // Reason breakdown
        const sickness = Math.round(absent * (0.45 + pseudoRand(2) * 0.15));
        const weather = isRainyDay ? Math.round(absent * 0.55) : Math.round(absent * 0.1);
        const feesTransport = Math.round(absent * 0.2);
        const unexcused = Math.max(0, absent - (sickness + weather + feesTransport));

        // Class breakdown
        const byClass: Record<ClassName, number> = {
          'P.1': Math.min(100, Math.round(finalRate + (pseudoRand(3) * 3 - 1.5))),
          'P.2': Math.min(100, Math.round(finalRate + (pseudoRand(4) * 3 - 1.5))),
          'P.3': Math.min(100, Math.round(finalRate + (pseudoRand(5) * 3 - 1.5))),
          'P.4': Math.min(100, Math.round(finalRate - (pseudoRand(6) * 4))), // P.4 slightly lower
          'P.5': Math.min(100, Math.round(finalRate + (pseudoRand(7) * 2 - 1.0))),
          'P.6': Math.min(100, Math.round(finalRate + (pseudoRand(8) * 2))),
          'P.7': Math.min(100, Math.round(finalRate + (pseudoRand(9) * 2.5 + 0.5))), // Candidate class highest
        };

        const dateStr = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        data.push({
          date: currentDate,
          dateStr,
          dayName,
          weekIndex: week,
          overallRate: finalRate,
          presentCount: present,
          totalCount: totalEnrolled,
          absentCount: absent,
          reasons: {
            sickness,
            weather,
            feesTransport,
            unexcused
          },
          byClass,
          isRainyDay
        });

        dayCounter++;
      }
    }

    return data;
  }, [selectedTerm, totalStudentsCount]);

  // Set default selected day
  useEffect(() => {
    if (heatmapData.length > 0 && !selectedDay) {
      setSelectedDay(heatmapData[heatmapData.length - 1]);
    }
  }, [heatmapData, selectedDay]);

  // D3 Rendering Logic
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || heatmapData.length === 0) return;

    const svgElement = svgRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || 700;
    const height = 240;

    const margin = { top: 35, right: 25, bottom: 35, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous SVG contents
    d3.select(svgElement).selectAll('*').remove();

    const svg = d3.select(svgElement)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // D3 Scales
    const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
    const dayNames: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const xScale = d3.scaleBand<number>()
      .domain(weeks)
      .range([0, innerWidth])
      .padding(0.12);

    const yScale = d3.scaleBand<string>()
      .domain(dayNames)
      .range([0, innerHeight])
      .padding(0.15);

    // Color Scale based on selected metric and class filter
    const getValue = (d: AttendanceDayData) => {
      if (selectedClass !== 'All Classes' && selectedClass in d.byClass) {
        return d.byClass[selectedClass as ClassName];
      }
      if (metricMode === 'absent') return d.absentCount;
      if (metricMode === 'unexcused') return d.reasons.unexcused;
      return d.overallRate;
    };

    // Color interpolation
    let colorScale: d3.ScaleThreshold<number, string> | d3.ScaleSequential<string>;
    if (metricMode === 'rate') {
      colorScale = d3.scaleThreshold<number, string>()
        .domain([88, 92, 95, 98])
        .range(['#ef4444', '#f97316', '#f59e0b', '#10b981', '#059669']);
    } else {
      colorScale = d3.scaleThreshold<number, string>()
        .domain([3, 7, 12, 18])
        .range(['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c']);
    }

    // Render X Axis (Weeks)
    g.append('g')
      .attr('transform', `translate(0, -8)`)
      .call(d3.axisTop(xScale).tickFormat(w => `Wk ${w}`))
      .selectAll('text')
      .style('font-size', '10px')
      .style('font-weight', '700')
      .style('fill', '#64748b');

    // Remove top domain line
    g.selectAll('.domain').remove();
    g.selectAll('.tick line').remove();

    // Render Y Axis (Days)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '11px')
      .style('font-weight', '800')
      .style('fill', '#334155');

    g.selectAll('.domain').remove();
    g.selectAll('.tick line').remove();

    // Render Heatmap Cells
    const cells = g.selectAll('.heat-cell')
      .data(heatmapData)
      .enter()
      .append('g')
      .attr('class', 'heat-cell')
      .attr('transform', d => `translate(${xScale(d.weekIndex) || 0}, ${yScale(d.dayName) || 0})`);

    // Cell Rectangles
    cells.append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', d => colorScale(getValue(d)))
      .attr('stroke', d => (selectedDay?.dateStr === d.dateStr ? '#0f172a' : 'transparent'))
      .attr('stroke-width', d => (selectedDay?.dateStr === d.dateStr ? 2.5 : 0))
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseover', (event, d) => {
        setHoveredDay(d);
        const [x, y] = d3.pointer(event, container);
        setTooltipPos({ x, y });
        d3.select(event.currentTarget)
          .attr('stroke', '#0284c7')
          .attr('stroke-width', 2)
          .attr('transform', 'scale(1.08)');
      })
      .on('mouseout', (event, d) => {
        setHoveredDay(null);
        setTooltipPos(null);
        d3.select(event.currentTarget)
          .attr('stroke', selectedDay?.dateStr === d.dateStr ? '#0f172a' : 'transparent')
          .attr('stroke-width', selectedDay?.dateStr === d.dateStr ? 2.5 : 0)
          .attr('transform', 'scale(1)');
      })
      .on('click', (_, d) => {
        setSelectedDay(d);
        if (onSelectDayDetails) onSelectDayDetails(d);
      });

    // Add Rainy Day icon indicator or low attendance indicator on cell
    cells.filter(d => !!d.isRainyDay)
      .append('circle')
      .attr('cx', xScale.bandwidth() - 6)
      .attr('cy', 6)
      .attr('r', 3)
      .attr('fill', '#0284c7')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);

    // D3 Legend Bar below
    const legendWidth = 200;
    const legendHeight = 8;
    const legendG = svg.append('g')
      .attr('transform', `translate(${width - margin.right - legendWidth}, ${height - 18})`);

    const legendThresholds = metricMode === 'rate' 
      ? ['<88%', '88-92%', '92-95%', '95-98%', '98-100%']
      : ['0-3', '4-7', '8-12', '13-18', '19+'];

    const colors = metricMode === 'rate'
      ? ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#059669']
      : ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c'];

    const boxWidth = legendWidth / colors.length;

    colors.forEach((color, i) => {
      legendG.append('rect')
        .attr('x', i * boxWidth)
        .attr('y', 0)
        .attr('width', boxWidth - 2)
        .attr('height', legendHeight)
        .attr('rx', 2)
        .attr('fill', color);

      legendG.append('text')
        .attr('x', i * boxWidth + boxWidth / 2)
        .attr('y', legendHeight + 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '8px')
        .style('font-weight', '700')
        .style('fill', '#64748b')
        .text(legendThresholds[i]);
    });

  }, [heatmapData, selectedClass, metricMode, selectedDay, onSelectDayDetails]);

  // Derived Key Insights calculated using D3 array operations
  const insights = useMemo(() => {
    if (heatmapData.length === 0) return null;

    const avgRate = d3.mean(heatmapData, d => d.overallRate) || 0;
    const lowestDay = d3.minIndex(heatmapData, d => d.overallRate);
    const lowestDayData = heatmapData[lowestDay];

    // Day of week averages
    const dayGroups = d3.group(heatmapData, d => d.dayName);
    const fridayAvg = d3.mean(dayGroups.get('Fri') || [], d => d.overallRate) || 0;
    const wednesdayAvg = d3.mean(dayGroups.get('Wed') || [], d => d.overallRate) || 0;

    const rainyDays = heatmapData.filter(d => d.isRainyDay);
    const rainyAvg = d3.mean(rainyDays, d => d.overallRate) || 0;

    return {
      avgRate: Math.round(avgRate * 10) / 10,
      lowestDayData,
      fridayDrop: Math.round((wednesdayAvg - fridayAvg) * 10) / 10,
      rainyDaysCount: rainyDays.length,
      rainyImpact: Math.round((avgRate - rainyAvg) * 10) / 10,
    };
  }, [heatmapData]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-6">
      {/* Header with Title & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                D3.js Term Attendance Heatmap
                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Interactive D3 Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Daily pupil attendance pattern grid (12 Weeks • Mon to Fri)</p>
            </div>
          </div>
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Term Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            {(['Term 1', 'Term 2', 'Term 3'] as const).map(term => (
              <button
                key={term}
                onClick={() => setSelectedTerm(term)}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer ${
                  selectedTerm === term
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {term}
              </button>
            ))}
          </div>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="All Classes">All Primary Classes (P.1 - P.7)</option>
            <option value="P.1">P.1 Class</option>
            <option value="P.2">P.2 Class</option>
            <option value="P.3">P.3 Class</option>
            <option value="P.4">P.4 Class</option>
            <option value="P.5">P.5 Class</option>
            <option value="P.6">P.6 Class</option>
            <option value="P.7">P.7 Candidate Class</option>
          </select>

          {/* Metric Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => setMetricMode('rate')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer ${
                metricMode === 'rate'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rate (%)
            </button>
            <button
              onClick={() => setMetricMode('absent')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer ${
                metricMode === 'absent'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Absentees
            </button>
          </div>
        </div>
      </div>

      {/* Main D3 Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-x-auto bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
        <svg ref={svgRef} className="w-full h-auto min-w-[650px]"></svg>

        {/* Floating D3 Tooltip */}
        {hoveredDay && tooltipPos && (
          <div 
            className="absolute z-50 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl border border-slate-700 pointer-events-none w-60 transform -translate-x-1/2 -translate-y-full mb-2 animate-in fade-in duration-150"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span className="font-extrabold text-amber-300">
                {hoveredDay.dayName}, {hoveredDay.dateStr} (Wk {hoveredDay.weekIndex})
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                hoveredDay.overallRate >= 95 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {hoveredDay.overallRate}% Attendance
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Present Pupils:</span>
                <span className="font-bold text-white">{hoveredDay.presentCount} / {hoveredDay.totalCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Absentees:</span>
                <span className="font-bold text-rose-300">{hoveredDay.absentCount} pupils</span>
              </div>
              {hoveredDay.isRainyDay && (
                <div className="text-[10px] text-sky-300 flex items-center gap-1 font-bold pt-1">
                  <CloudRain className="h-3 w-3" />
                  Heavy Rain / Nansana Flooding Impact
                </div>
              )}
            </div>
            <div className="mt-2 text-[9px] text-slate-400 italic text-center border-t border-slate-800 pt-1">
              Click day cell for deep-dive breakdown
            </div>
          </div>
        )}
      </div>

      {/* D3 Insights Banner */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-indigo-500/20">
          <div className="space-y-1 border-r border-white/10 pr-3">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Term Average Rate</span>
            <span className="text-2xl font-black text-emerald-400 block">{insights.avgRate}%</span>
            <span className="text-[10px] text-slate-300 font-medium block">Target: 95.0% UNEB Standard</span>
          </div>

          <div className="space-y-1 border-r border-white/10 pr-3">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Friday Absenteeism Pattern</span>
            <span className="text-2xl font-black text-amber-300 block">-{insights.fridayDrop}% Drop</span>
            <span className="text-[10px] text-slate-300 font-medium block">Fridays vs Midweek average</span>
          </div>

          <div className="space-y-1 border-r border-white/10 pr-3">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Weather Disruptions</span>
            <span className="text-2xl font-black text-sky-300 block">{insights.rainyDaysCount} Rainy Days</span>
            <span className="text-[10px] text-slate-300 font-medium block">Caused -{insights.rainyImpact}% avg attendance dip</span>
          </div>

          <div className="space-y-1 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Lowest Attendance Spike</span>
            <span className="text-xs font-bold text-rose-300 block">
              {insights.lowestDayData?.dateStr}: <strong className="text-white">{insights.lowestDayData?.overallRate}%</strong>
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              {insights.lowestDayData?.absentCount} pupils absent
            </span>
          </div>
        </div>
      )}

      {/* Selected Day Deep-Dive Inspector Panel */}
      {selectedDay && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                  Daily Inspector: {selectedDay.dayName}, {selectedDay.dateStr} (Week {selectedDay.weekIndex})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Detailed reasons and class breakdown for this specific day</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                selectedDay.overallRate >= 95 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {selectedDay.overallRate}% Attendance
              </span>
              <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                {selectedDay.absentCount} Absentees
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Reason 1: Sickness */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sickness / Malaria</span>
              <span className="text-lg font-black text-slate-900 block">{selectedDay.reasons.sickness} Pupils</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full" 
                  style={{ width: `${Math.min(100, (selectedDay.reasons.sickness / selectedDay.absentCount) * 100)}%` }} 
                />
              </div>
            </div>

            {/* Reason 2: Weather */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rain / Flooding</span>
              <span className="text-lg font-black text-slate-900 block">{selectedDay.reasons.weather} Pupils</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-sky-500 h-full rounded-full" 
                  style={{ width: `${Math.min(100, (selectedDay.reasons.weather / selectedDay.absentCount) * 100)}%` }} 
                />
              </div>
            </div>

            {/* Reason 3: Fees / Transport */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Transport / Home Duties</span>
              <span className="text-lg font-black text-slate-900 block">{selectedDay.reasons.feesTransport} Pupils</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full" 
                  style={{ width: `${Math.min(100, (selectedDay.reasons.feesTransport / selectedDay.absentCount) * 100)}%` }} 
                />
              </div>
            </div>

            {/* Reason 4: Unexcused */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Unexcused Absences</span>
              <span className="text-lg font-black text-slate-900 block">{selectedDay.reasons.unexcused} Pupils</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full" 
                  style={{ width: `${Math.min(100, (selectedDay.reasons.unexcused / selectedDay.absentCount) * 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Class-wise breakdown bar row */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Class Level Attendance Comparison for {selectedDay.dateStr}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {(['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'] as ClassName[]).map(cls => {
                const rate = selectedDay.byClass[cls] || 95;
                return (
                  <div key={cls} className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block">Class {cls}</span>
                    <span className={`text-xs font-black block ${rate >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {rate}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
