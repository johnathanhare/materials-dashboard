"use client";

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis, Cell } from 'recharts';
import { Beaker, Search, Filter, Info, Sparkles, Send, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { fetchRealMaterials, askMaterialCopilot } from './actions';
import initialMockMaterials from '../public/data.json';

const axisOptions = [
  { key: 'density', label: 'Density', unit: 'g/cm³' },
  { key: 'strength', label: 'Yield Strength', unit: 'MPa' },
  { key: 'modulus', label: 'Young\'s Modulus', unit: 'GPa' },
  { key: 'bulkModulus', label: 'Bulk Modulus', unit: 'GPa' },
  { key: 'price', label: 'Price', unit: '$/kg' }
];

const FAMILY_COLORS: Record<string, string> = {
  'Metal': '#ef4444',            // Red
  'Polymer': '#3b82f6',          // Blue
  'Composite': '#10b981',        // Green
  'Ceramic': '#f59e0b',          // Orange
  'Natural': '#8b5cf6',          // Purple
  'Computed Metal': '#f87171',   // Lighter Red
  'Computed Ceramic': '#fbbf24'  // Lighter Orange
};

export default function MaterialsDashboard() {
  const [materials, setMaterials] = useState<any[]>(initialMockMaterials);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFamilies, setActiveFamilies] = useState<string[]>(Object.keys(FAMILY_COLORS));
  
  const [xAxisProperty, setXAxisProperty] = useState(axisOptions[0]); 
  const [yAxisProperty, setYAxisProperty] = useState(axisOptions[2]); // Modulus default for MP data
  
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isFetchingMP, setIsFetchingMP] = useState(true);

  // Fetch real data from Materials Project API on load
  useEffect(() => {
    async function loadData() {
      try {
        const realData = await fetchRealMaterials();
        // Merge real data with our mock data
        if (realData && realData.length > 0) {
          setMaterials([...initialMockMaterials, ...realData]);
        }
      } catch (err) {
        console.error("Failed to fetch MP data:", err);
      } finally {
        setIsFetchingMP(false);
      }
    }
    loadData();
  }, []);

  const filteredMaterials = materials.filter(mat => {
    const matchesSearch = mat.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasX = mat[xAxisProperty.key] !== undefined && mat[xAxisProperty.key] > 0;
    const hasY = mat[yAxisProperty.key] !== undefined && mat[yAxisProperty.key] > 0;
    const matchesFamily = activeFamilies.includes(mat.family);
    return matchesSearch && hasX && hasY && matchesFamily;
  });

  const toggleFamily = (family: string) => {
    setActiveFamilies(prev => 
      prev.includes(family) ? prev.filter(f => f !== family) : [...prev, family]
    );
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    setIsAiLoading(true);
    try {
      const result = await askMaterialCopilot(aiQuery, filteredMaterials);
      setAiResponse(result.response || "No response generated.");
    } catch (err) {
      setAiResponse("Error connecting to Copilot.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded shadow-lg text-sm z-50">
          <p className="font-bold text-gray-800">{data.name}</p>
          <p className="text-gray-600 text-xs mb-2">{data.family}</p>
          <div className="text-gray-700 grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-500">Density:</span> 
            <span className="font-medium">{data.density || '-'} g/cm³</span>
            <span className="text-gray-500">Modulus:</span> 
            <span className="font-medium">{data.modulus || '-'} GPa</span>
            {data.strength && <><span className="text-gray-500">Yield Str:</span><span className="font-medium">{data.strength} MPa</span></>}
            {data.bulkModulus && <><span className="text-gray-500">Bulk Mod:</span><span className="font-medium">{data.bulkModulus} GPa</span></>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm shadow-blue-200">
            <Beaker className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Materials Informatics</h1>
            <p className="text-xs text-gray-500 font-medium tracking-wider uppercase flex items-center gap-1">
              Ashby Dashboard 
              {isFetchingMP && <span className="text-blue-500 flex items-center gap-1 animate-pulse"><Database className="w-3 h-3" /> Syncing API...</span>}
            </p>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              Plot Controls
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Y-Axis (Vertical)</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={yAxisProperty.key}
                  onChange={(e) => setYAxisProperty(axisOptions.find(o => o.key === e.target.value)!)}
                >
                  {axisOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">X-Axis (Horizontal)</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={xAxisProperty.key}
                  onChange={(e) => setXAxisProperty(axisOptions.find(o => o.key === e.target.value)!)}
                >
                  {axisOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                </select>
              </div>

              <div className="pt-2 border-t mt-4">
                <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Filter Families</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(FAMILY_COLORS).map(([family, color]) => (
                    <button 
                      key={family}
                      onClick={() => toggleFamily(family)}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                        activeFamilies.includes(family) 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                          : 'bg-transparent border-gray-200 text-gray-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {family}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-blue-100 p-5 shadow-sm relative overflow-hidden">
            <h3 className="font-bold text-sm text-blue-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              AI Material Copilot
            </h3>
            <p className="text-xs text-blue-700/80 mb-4">
              Ask Gemini to find substitutions or filter materials based on constraints.
            </p>

            <form onSubmit={handleAiSearch} className="relative mb-3">
              <textarea 
                rows={2}
                placeholder="e.g. 'Cheap substitute for Titanium...'"
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:border-blue-500 outline-none shadow-inner resize-none"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAiSearch(e as any);
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={isAiLoading}
                className="absolute right-2 bottom-2.5 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
            
            {aiResponse && (
              <div className="bg-white/90 rounded border border-blue-100 p-4 text-sm text-blue-950 mt-2 shadow-sm [&>p]:mb-2 last:[&>p]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>strong]:font-semibold [&>strong]:text-blue-900 leading-relaxed">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-3 bg-white rounded-xl border p-6 shadow-sm flex flex-col h-[750px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {yAxisProperty.label} vs. {xAxisProperty.label}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Database: {materials.length} Materials</p>
            </div>
          </div>
          
          <div className="flex-1 w-full bg-gray-50/30 rounded-xl border border-dashed border-gray-200 relative overflow-hidden">
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={10}
              wheel={{ wheelDisabled: false }}
              pinch={{ disabled: false }}
              doubleClick={{ disabled: false }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute top-4 right-4 flex gap-1 z-10 shadow-sm rounded-md bg-white border border-gray-200 overflow-hidden">
                    <button onClick={() => zoomIn()} className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 font-bold border-r text-sm">+</button>
                    <button onClick={() => zoomOut()} className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 font-bold border-r text-sm">-</button>
                    <button onClick={() => resetTransform()} className="px-3 py-1.5 hover:bg-gray-50 text-gray-500 text-xs font-medium">Reset</button>
                  </div>
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full p-4">
                    {/* Fixed dimensions so the SVG can scale smoothly without responsive layout fighting it */}
                    <ScatterChart width={900} height={600} margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        type="number" 
                        dataKey={xAxisProperty.key} 
                        name={xAxisProperty.label} 
                        unit={` ${xAxisProperty.unit}`} 
                        label={{ value: `${xAxisProperty.label} (${xAxisProperty.unit})`, position: 'bottom', offset: 10 }}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        scale="log" 
                        domain={[(dataMin: number) => Math.max(0.001, dataMin * 0.5), (dataMax: number) => dataMax * 1.5]}
                        allowDataOverflow={true}
                      />
                      <YAxis 
                        type="number" 
                        dataKey={yAxisProperty.key} 
                        name={yAxisProperty.label} 
                        unit={` ${yAxisProperty.unit}`} 
                        label={{ value: `${yAxisProperty.label} (${yAxisProperty.unit})`, angle: -90, position: 'insideLeft', offset: -10 }}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        scale="log"
                        domain={[(dataMin: number) => Math.max(0.001, dataMin * 0.5), (dataMax: number) => dataMax * 1.5]}
                        allowDataOverflow={true}
                      />
                <ZAxis type="number" range={[100, 300]} />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} 
                  isAnimationActive={false} 
                />
                
                <Scatter data={filteredMaterials} animationDuration={600}>
                  {filteredMaterials.map((entry, index) => {
                    const color = FAMILY_COLORS[entry.family] || '#64748b';
                    return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={1} />;
                  })}
                    </Scatter>
                  </ScatterChart>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            {Object.entries(FAMILY_COLORS).map(([family, color]) => (
              <div key={family} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium text-gray-600">{family}</span>
              </div>
            ))}
          </div>

        </div>

      </main>
    </div>
  );
}
