// components/ActivityGrid.tsx
import React from "react";
import {
  eachDayOfInterval,
  subMonths,
  format,
  startOfWeek,
  endOfToday,
} from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ActivityGridProps = {
  workoutData: Record<string, number>; // key: "YYYY-MM-DD", value: count
};

const getColorClass = (count: number): string => {
  if (count === 0) return "bg-gray-200";
  if (count < 2) return "bg-green-300";
  if (count < 4) return "bg-green-500";
  if (count < 6) return "bg-green-700";
  return "bg-green-900";
};

const generateDateGrid = () => {
  const today = endOfToday();
  const startDate = startOfWeek(subMonths(today, 3)); // aligns to Sunday
  const days = eachDayOfInterval({ start: startDate, end: today });

  const columns: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  return columns;
};

const ActivityGrid: React.FC<ActivityGridProps> = ({ workoutData }) => {
  const columns = generateDateGrid();

  return (
    <div className="overflow-x-auto px-4">
      <h2 className="font-semibold mb-4">Last 3 Months</h2>
      <TooltipProvider>
        <div className="flex gap-[4px]">
          {columns.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-[4px]">
              {week.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const count = workoutData[dateStr] || 0;
                const displayDate = format(date, "EEE, MMM d");

                return (
                  <Tooltip key={dateStr}>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-4 h-4 rounded-sm ${getColorClass(
                          count
                        )} cursor-pointer`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        {displayDate}
                        <br />
                        {count} exercise{count === 1 ? "" : "s"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default ActivityGrid;
