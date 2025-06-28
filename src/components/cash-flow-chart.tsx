/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect } from "react";
import { Pie, PieChart, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import {
  type ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
} from "@/components/ui/chart";
import type { BudgetEntry, Category } from "@/lib/supabase";

interface CashFlowChartProps {
  entries: BudgetEntry[];
  categories: Category[];
}

const CHART_COLORS = [
  "#fda4af", // light rose
  "#fb7185", //
  "#f87171", //
  "#f43f5e", //
  "#ef4444", //
  "#e11d48", //
  "#dc2626", //
  "#be123c", // deep rose
];

export function CashFlowChart({ entries, categories }: CashFlowChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [animatedRadius, setAnimatedRadius] = useState<number>(100);

  const { chartData, chartConfig, totalExpenses } = useMemo(() => {
    // Only show expense data in the pie chart
    const expenseEntries = entries.filter((entry) => {
      const category = categories.find((cat) => cat.id === entry.category_id);
      return category?.type === "Expense";
    });

    const categoryTotals = expenseEntries.reduce((acc, entry) => {
      const category = categories.find((cat) => cat.id === entry.category_id);
      if (category) {
        acc[category.name] = (acc[category.name] || 0) + entry.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(categoryTotals)
      .map(([name, value], index) => ({
        category: name,
        amount: value,
        fill: CHART_COLORS[index % CHART_COLORS.length],
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = data.reduce((sum, item) => sum + item.amount, 0);

    // Create chart config dynamically
    const config: ChartConfig = {
      amount: {
        label: "Amount",
      },
    };

    // Add colors for each category using the predefined colors
    data.forEach((item, index) => {
      const colorKey = `category-${index}`;
      config[colorKey] = {
        label: item.category,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });

    return { chartData: data, chartConfig: config, totalExpenses: total };
  }, [entries, categories]);

  // Animate radius changes
  useEffect(() => {
    const targetRadius = activeIndex !== undefined ? 110 : 100;
    const startRadius = animatedRadius;
    const duration = 300; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);

      const currentRadius =
        startRadius + (targetRadius - startRadius) * easedProgress;
      setAnimatedRadius(currentRadius);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [activeIndex, animatedRadius]);

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalExpenses) * 100).toFixed(1);
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.payload.category}</p>
          <p className="text-red-400">{formatCurrency(data.value)}</p>
          <p className="text-gray-400 text-sm">
            {percentage}% of total expenses
          </p>
        </div>
      );
    }
    return null;
  };

  const renderActiveShape = (props: PieSectorDataItem) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
    } = props;

    // Handle mouse events on the sector itself
    const handleMouseEnter = () => {
      const index = chartData.findIndex(
        (item) => item.category === payload.category
      );
      setActiveIndex(index);
    };

    const handleMouseLeave = () => {
      setActiveIndex(undefined);
    };

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={animatedRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))",
            cursor: "pointer",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </g>
    );
  };

  // Custom shape for inactive sectors
  const renderInactiveShape = (props: PieSectorDataItem) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
    } = props;

    const handleMouseEnter = () => {
      const index = chartData.findIndex(
        (item) => item.category === payload.category
      );
      setActiveIndex(index);
    };

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            cursor: "pointer",
          }}
          onMouseEnter={handleMouseEnter}
        />
      </g>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        No expense data to display
      </div>
    );
  }

  const id = "cash-flow-chart";

  return (
    <div data-chart={id} className="h-64">
      <ChartStyle id={id} config={chartConfig} />
      <ChartContainer
        id={id}
        config={chartConfig}
        className="mx-auto aspect-square w-full max-w-[300px] h-full"
      >
        <PieChart>
          <ChartTooltip cursor={false} content={<CustomTooltip />} />
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="category"
            innerRadius={50}
            outerRadius={100}
            strokeWidth={0}
            stroke="none"
            activeIndex={activeIndex}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
            activeShape={renderActiveShape}
            inactiveShape={renderInactiveShape}
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
