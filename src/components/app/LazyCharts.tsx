import { lazy, Suspense, type ReactNode } from "react";

const AreaChartImpl = lazy(async () => {
  const recharts = await import("recharts");
  return {
    default: ({
      data,
      sentColor = "#FF477E",
      receivedColor = "#06D6A0",
    }: {
      data: { m: string; sent: number; received: number }[];
      sentColor?: string;
      receivedColor?: string;
    }) => (
      <recharts.ResponsiveContainer width="100%" height="100%">
        <recharts.AreaChart data={data} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="gPink" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sentColor} stopOpacity={0.5} />
              <stop offset="100%" stopColor={sentColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gMint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={receivedColor} stopOpacity={0.5} />
              <stop offset="100%" stopColor={receivedColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <recharts.XAxis dataKey="m" stroke="#0B0B0F66" tickLine={false} axisLine={false} fontSize={11} />
          <recharts.YAxis stroke="#0B0B0F66" tickLine={false} axisLine={false} fontSize={11} />
          <recharts.Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)" }} />
          <recharts.Area type="monotone" dataKey="sent" stroke={sentColor} strokeWidth={2} fill="url(#gPink)" />
          <recharts.Area type="monotone" dataKey="received" stroke={receivedColor} strokeWidth={2} fill="url(#gMint)" />
        </recharts.AreaChart>
      </recharts.ResponsiveContainer>
    ),
  };
});

const BarChartImpl = lazy(async () => {
  const recharts = await import("recharts");
  return {
    default: ({
      data,
      barColor = "#FF477E",
    }: {
      data: { m: string; sent: number }[];
      barColor?: string;
    }) => (
      <recharts.ResponsiveContainer width="100%" height="100%">
        <recharts.BarChart data={data}>
          <recharts.XAxis dataKey="m" stroke="#0B0B0F66" tickLine={false} axisLine={false} fontSize={11} />
          <recharts.YAxis stroke="#0B0B0F66" tickLine={false} axisLine={false} fontSize={11} />
          <recharts.Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)" }} />
          <recharts.Bar dataKey="sent" radius={[8, 8, 0, 0]} fill={barColor} />
        </recharts.BarChart>
      </recharts.ResponsiveContainer>
    ),
  };
});

function ChartFallback({ children }: { children?: ReactNode }) {
  return (
    <div className="grid h-full w-full place-items-center text-xs text-ink/65">
      {children ?? "Loading chart..."}
    </div>
  );
}

export function PayMemoAreaChart(props: {
  data: { m: string; sent: number; received: number }[];
  sentColor?: string;
  receivedColor?: string;
}) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <AreaChartImpl {...props} />
    </Suspense>
  );
}

export function PayMemoBarChart(props: { data: { m: string; sent: number }[]; barColor?: string }) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <BarChartImpl {...props} />
    </Suspense>
  );
}
