'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Ruler, Save, Loader2, Undo2 } from 'lucide-react';
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

export default function AdminSettingsPage() {
  const [sizeCharts, setSizeCharts] = useState<SizeChartsData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('oversized-t-shirts');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) {
            setSizeCharts(data);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
      // Fallback
      setSizeCharts(JSON.parse(JSON.stringify(defaultSizeCharts)));
      setLoading(false);
    }
    loadSettings().then(() => setLoading(false));
  }, []);

  const handleFitChange = (val: string) => {
    if (!sizeCharts) return;
    setSizeCharts({
      ...sizeCharts,
      [activeTab]: {
        ...sizeCharts[activeTab],
        fit: val,
      },
    });
  };

  const handleCellChange = (
    rowIndex: number,
    field: 'chest' | 'length' | 'shoulder',
    unit: 'in' | 'cm',
    val: string
  ) => {
    if (!sizeCharts) return;
    const category = sizeCharts[activeTab];
    const updatedRows = [...category.rows];
    
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: {
        ...updatedRows[rowIndex][field],
        [unit]: val,
      },
    };

    setSizeCharts({
      ...sizeCharts,
      [activeTab]: {
        ...category,
        rows: updatedRows,
      },
    });
  };

  const handleSave = async () => {
    if (!sizeCharts) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sizeCharts),
      });
      if (res.ok) {
        toast.success('Size charts saved successfully');
      } else {
        toast.error('Failed to save size charts');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm('Are you sure you want to restore default sizing values? Any unsaved edits will be lost.')) {
      setSizeCharts(JSON.parse(JSON.stringify(defaultSizeCharts)));
      toast.info('Restored to default values. Don\'t forget to save changes.');
    }
  };

  if (loading || !sizeCharts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Loading size guide configuration...</p>
      </div>
    );
  }

  const activeChart = sizeCharts[activeTab] || sizeCharts['oversized-t-shirts'];

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-widest flex items-center gap-3">
            <Ruler className="w-7 h-7 text-foreground" />
            Size Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure and manage sizing guide tables for customers.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 rounded-none uppercase tracking-wider text-xs flex items-center gap-2 w-full md:w-auto"
            onClick={handleRestoreDefaults}
          >
            <Undo2 className="w-3.5 h-3.5" /> Restore Defaults
          </Button>
          <Button 
            size="sm" 
            className="h-10 rounded-none uppercase tracking-wider text-xs flex items-center gap-2 w-full md:w-auto bg-foreground text-background"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </Button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {Object.keys(sizeCharts).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
              activeTab === key
                ? 'border-foreground bg-foreground text-background font-bold'
                : 'border-border hover:border-foreground text-muted-foreground hover:text-foreground'
            }`}
          >
            {sizeCharts[key].title}
          </button>
        ))}
      </div>

      {/* Active Form */}
      {activeChart && (
        <div className="space-y-6">
          <div className="grid gap-6 p-6 border border-border bg-card">
            <h3 className="text-sm uppercase tracking-widest font-bold border-b border-border pb-3 text-foreground">
              {activeChart.title} Configurations
            </h3>
            
            {/* Fit description field */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold">Fit Details</Label>
              <textarea
                value={activeChart.fit}
                onChange={(e) => handleFitChange(e.target.value)}
                className="w-full min-h-[70px] p-3 text-sm bg-background border border-border focus:border-foreground outline-none transition-colors leading-relaxed"
                placeholder="Describe the fit (e.g., standard regular fit. Order your usual size.)"
              />
            </div>

            {/* Sizing Rows */}
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider font-bold">Size Table Values</Label>
              <div className="overflow-x-auto border border-border">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4 w-[10%] text-center">Size</th>
                      <th className="py-3 px-4 w-[30%]">Chest</th>
                      <th className="py-3 px-4 w-[30%]">Body Length</th>
                      <th className="py-3 px-4 w-[30%]">Shoulder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {activeChart.rows.map((row, rowIndex) => (
                      <tr key={row.size} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-sm text-foreground">{row.size}</td>
                        {/* Chest inputs */}
                        <td className="py-3 px-4">
                          <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                              <Input
                                value={row.chest.in}
                                onChange={(e) => handleCellChange(rowIndex, 'chest', 'in', e.target.value)}
                                className="h-9 text-xs rounded-none bg-background pr-6 border-border"
                              />
                              <span className="absolute right-2 top-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">in</span>
                            </div>
                            <div className="relative flex-1">
                              <Input
                                value={row.chest.cm}
                                onChange={(e) => handleCellChange(rowIndex, 'chest', 'cm', e.target.value)}
                                className="h-9 text-xs rounded-none bg-background pr-6 border-border"
                              />
                              <span className="absolute right-2 top-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">cm</span>
                            </div>
                          </div>
                        </td>
                        {/* Length inputs */}
                        <td className="py-3 px-4">
                          <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                              <Input
                                value={row.length.in}
                                onChange={(e) => handleCellChange(rowIndex, 'length', 'in', e.target.value)}
                                className="h-9 text-xs rounded-none bg-background pr-6 border-border"
                              />
                              <span className="absolute right-2 top-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">in</span>
                            </div>
                            <div className="relative flex-1">
                              <Input
                                value={row.length.cm}
                                onChange={(e) => handleCellChange(rowIndex, 'length', 'cm', e.target.value)}
                                className="h-9 text-xs rounded-none bg-background pr-6 border-border"
                              />
                              <span className="absolute right-2 top-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">cm</span>
                            </div>
                          </div>
                        </td>
                        {/* Shoulder inputs */}
                        <td className="py-3 px-4">
                          <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                              <Input
                                value={row.shoulder.in}
                                onChange={(e) => handleCellChange(rowIndex, 'shoulder', 'in', e.target.value)}
                                className="h-9 text-xs rounded-none bg-background pr-6 border-border"
                              />
                              <span className="absolute right-2 top-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">in</span>
                            </div>
                            <div className="relative flex-1">
                              <Input
                                value={row.shoulder.cm}
                                onChange={(e) => handleCellChange(rowIndex, 'shoulder', 'cm', e.target.value)}
                                className="h-9 text-xs rounded-none bg-background pr-6 border-border"
                              />
                              <span className="absolute right-2 top-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">cm</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Preview Card */}
          <div className="p-6 border border-border bg-muted/10 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-bold text-foreground">Live Customer Preview</h4>
            <div className="border border-border/80 bg-background overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="py-3 px-4 text-foreground uppercase tracking-wider font-bold">Size</th>
                    <th className="py-3 px-4 text-foreground uppercase tracking-wider font-bold text-right">Chest (in / cm)</th>
                    <th className="py-3 px-4 text-foreground uppercase tracking-wider font-bold text-right">Length (in / cm)</th>
                    <th className="py-3 px-4 text-foreground uppercase tracking-wider font-bold text-right">Shoulder (in / cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {activeChart.rows.map((row) => (
                    <tr key={row.size}>
                      <td className="py-3 px-4 font-bold text-foreground">{row.size}</td>
                      <td className="py-3 px-4 text-muted-foreground text-right">{row.chest.in || '-'} in / {row.chest.cm || '-'} cm</td>
                      <td className="py-3 px-4 text-muted-foreground text-right">{row.length.in || '-'} in / {row.length.cm || '-'} cm</td>
                      <td className="py-3 px-4 text-muted-foreground text-right">{row.shoulder.in || '-'} in / {row.shoulder.cm || '-'} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
