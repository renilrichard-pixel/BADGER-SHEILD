'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ruler } from 'lucide-react';
import defaultSizeCharts from '@/data/size-charts.json';

interface SizeRow {
  size: string;
  chest: { in: string; cm: string };
  length: { in: string; cm: string };
  shoulder: { in: string; cm: string };
}

interface CategoryChart {
  title: string;
  fit: string;
  rows: SizeRow[];
}

interface SizeChartsData {
  [key: string]: CategoryChart;
}

function ShirtSvg({ highlight }: { highlight: 'chest' | 'length' | 'shoulder' | 'none' }) {
  return (
    <svg 
      viewBox="0 0 240 260" 
      className="w-full max-w-[180px] h-auto mx-auto text-foreground transition-all duration-300" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* T-Shirt base outline */}
      <path 
        d="M 100,50 C 110,60 130,60 140,50 L 195,65 L 220,110 L 195,120 L 185,105 L 185,230 L 55,230 L 55,105 L 45,120 L 20,110 L 45,65 Z" 
        className="stroke-muted-foreground/30 fill-muted/10 dark:fill-muted/5 transition-colors"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Highlighted measurement lines */}
      {highlight === 'chest' && (
        <>
          <line x1="55" y1="115" x2="185" y2="115" className="stroke-foreground" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />
          <polygon points="55,115 62,111 62,119" className="fill-foreground" />
          <polygon points="185,115 178,111 178,119" className="fill-foreground" />
        </>
      )}
      {highlight === 'length' && (
        <>
          <line x1="100" y1="50" x2="100" y2="230" className="stroke-foreground" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />
          <polygon points="100,50 96,57 104,57" className="fill-foreground" />
          <polygon points="100,230 96,223 104,223" className="fill-foreground" />
        </>
      )}
      {highlight === 'shoulder' && (
        <>
          <line x1="45" y1="65" x2="195" y2="65" className="stroke-foreground" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />
          <polygon points="45,65 52,61 52,69" className="fill-foreground" />
          <polygon points="195,65 188,61 188,69" className="fill-foreground" />
        </>
      )}
    </svg>
  );
}

export default function SizeGuidePage() {
  const [sizeCharts, setSizeCharts] = useState<SizeChartsData>(defaultSizeCharts as SizeChartsData);
  const [activeTab, setActiveTab] = useState<string>('oversized-t-shirts');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSizeCharts() {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          if (data && !data.error) {
            setSizeCharts(data);
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchSizeCharts();
  }, []);

  const activeChart = sizeCharts[activeTab] || sizeCharts['oversized-t-shirts'] || Object.values(sizeCharts)[0];

  return (
    <div className="bg-background text-foreground min-h-screen py-12 md:py-20 border-b border-border">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Navigation back */}
        <Link 
          href="/" 
          className="inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-12 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex p-3 rounded-full bg-muted/50 mb-4 border border-border/50">
            <Ruler className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest mb-4">Size Guide</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            All measurements in the charts below refer to garment dimensions. Explore the sizing guidelines and learn how to measure yourself to ensure the perfect fit for your silhouette.
          </p>
        </div>

        {/* Tab & Unit Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-border pb-6 mb-10">
          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {Object.keys(sizeCharts).map((key) => {
              const chart = sizeCharts[key];
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                    activeTab === key
                      ? 'border-foreground bg-foreground text-background font-bold'
                      : 'border-border hover:border-foreground text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {chart.title}
                </button>
              );
            })}
          </div>

          {/* Unit Toggle */}
          <div className="flex items-center border border-border p-1 bg-muted/20">
            <button
              onClick={() => setUnit('in')}
              className={`px-4 py-1.5 text-xs uppercase tracking-widest transition-colors font-medium cursor-pointer ${
                unit === 'in'
                  ? 'bg-foreground text-background font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inches
            </button>
            <button
              onClick={() => setUnit('cm')}
              className={`px-4 py-1.5 text-xs uppercase tracking-widest transition-colors font-medium cursor-pointer ${
                unit === 'cm'
                  ? 'bg-foreground text-background font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Metric (cm)
            </button>
          </div>
        </div>

        {/* Table Content */}
        {activeChart ? (
          <div className="grid lg:grid-cols-3 gap-12 items-start mb-20">
            {/* Table Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground">Size</th>
                        <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground text-right">Chest ({unit})</th>
                        <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground text-right">Body Length ({unit})</th>
                        <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground text-right">Shoulder ({unit})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {activeChart.rows.map((row) => (
                        <tr key={row.size} className="hover:bg-muted/25 transition-colors">
                          <td className="py-4 px-6 text-sm font-bold text-foreground">{row.size}</td>
                          <td className="py-4 px-6 text-sm text-muted-foreground text-right font-medium">
                            {row.chest[unit]}
                          </td>
                          <td className="py-4 px-6 text-sm text-muted-foreground text-right font-medium">
                            {row.length[unit]}
                          </td>
                          <td className="py-4 px-6 text-sm text-muted-foreground text-right font-medium">
                            {row.shoulder[unit]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fit Description */}
              <div className="p-5 border border-border bg-muted/10 space-y-2">
                <h4 className="text-xs uppercase tracking-widest font-bold text-foreground">Fit details</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeChart.fit}
                </p>
              </div>
            </div>

            {/* General Sizing Assistance Card */}
            <div className="p-6 border border-border bg-card space-y-6">
              <h3 className="text-sm uppercase tracking-widest font-bold border-b border-border pb-3 text-foreground">Sizing Assistance</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If your measurements fall between two sizes, we suggest choosing the larger size for a relaxed drape, or the smaller size for a clean, tailored fit.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Model height</span>
                  <span className="font-semibold text-foreground">6&apos;1&quot; / 185 cm</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Model size worn</span>
                  <span className="font-semibold text-foreground">Medium (M)</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2">
                  <span className="text-muted-foreground">Fabric shrinkage</span>
                  <span className="font-semibold text-foreground">Pre-washed (&lt;2%)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-border text-muted-foreground">
            {loading ? 'Retrieving size guides...' : 'No size charts configuration found.'}
          </div>
        )}

        {/* How to Measure Section */}
        <div className="border-t border-border pt-16">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-center mb-12">How to Measure</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Chest Card */}
            <div className="border border-border p-6 bg-card flex flex-col items-center text-center space-y-4 hover:border-foreground/35 transition-colors">
              <div className="w-full aspect-[4/5] bg-muted/15 flex items-center justify-center p-4 border border-border/50">
                <ShirtSvg highlight="chest" />
              </div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-foreground">1. Chest</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Measure around the fullest part of your chest, keeping the tape measure horizontal under your arms and flat across your back.
              </p>
            </div>

            {/* Length Card */}
            <div className="border border-border p-6 bg-card flex flex-col items-center text-center space-y-4 hover:border-foreground/35 transition-colors">
              <div className="w-full aspect-[4/5] bg-muted/15 flex items-center justify-center p-4 border border-border/50">
                <ShirtSvg highlight="length" />
              </div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-foreground">2. Body Length</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Measure from the highest point of the shoulder seam straight down to the bottom hem of the garment.
              </p>
            </div>

            {/* Shoulder Card */}
            <div className="border border-border p-6 bg-card flex flex-col items-center text-center space-y-4 hover:border-foreground/35 transition-colors">
              <div className="w-full aspect-[4/5] bg-muted/15 flex items-center justify-center p-4 border border-border/50">
                <ShirtSvg highlight="shoulder" />
              </div>
              <h3 className="text-xs uppercase tracking-widest font-bold text-foreground">3. Shoulder Width</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Measure straight across the back of the shirt from the edge of one shoulder seam to the other shoulder seam.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
