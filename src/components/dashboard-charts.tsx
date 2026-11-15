"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatMoney, type Currency } from "@/lib/currency";
import type { DashboardData } from "@/lib/dashboard";

const config = {
  income: { label: "Pemasukan", color: "var(--chart-1)" },
  expense: { label: "Pengeluaran", color: "var(--chart-2)" },
  balance: { label: "Saldo tercatat", color: "var(--chart-3)" },
} satisfies ChartConfig;
const compact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export function formatChartDate(
  value: string,
  granularity: DashboardData["granularity"],
) {
  return new Date(value + "T00:00:00Z").toLocaleDateString("id-ID", {
    timeZone: "UTC",
    year: granularity === "day" ? undefined : "numeric",
    month: granularity === "year" ? undefined : "short",
    day: granularity === "day" ? "numeric" : undefined,
  });
}
function ChartEmpty({ hidden = false }: { hidden?: boolean }) {
  return (
    <Empty className="min-h-64">
      <EmptyHeader>
        <EmptyTitle>
          {hidden ? "Grafik disembunyikan" : "Belum ada data untuk grafik ini"}
        </EmptyTitle>
        <EmptyDescription>
          {hidden
            ? "Tampilkan nominal untuk melihat grafik dan tooltip."
            : "Coba periode atau mata uang lain. Grafik akan mengikuti transaksi yang tersimpan."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function DashboardCharts({
  data,
  currency,
  hidden,
  overview = false,
}: {
  overview?: boolean;
  data: DashboardData;
  currency: Currency;
  hidden: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const money = (value: number) =>
    hidden ? `${currency} •••••` : formatMoney(value, currency);
  const tick = (value: string) => formatChartDate(value, data.granularity);
  const unit =
    data.granularity === "day"
      ? "harian"
      : data.granularity === "month"
        ? "bulanan"
        : "tahunan";
  const tooltip = (
    <ChartTooltipContent
      labelFormatter={(value) => tick(String(value))}
      formatter={(value, name) => (
        <div className="flex flex-1 items-center justify-between gap-6">
          <span className="text-muted-foreground">
            {config[name as keyof typeof config]?.label ?? String(name)}
          </span>
          <span className="font-mono font-medium tabular-nums">
            {money(Number(value))}
          </span>
        </div>
      )}
    />
  );
  const flowChart = (
    <Card id="arus-kas" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Uang masuk & keluar</CardTitle>
        <CardDescription>
          Perbandingan {unit} · {currency}. Kedua area ditampilkan terpisah,
          bukan ditumpuk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hidden || !data.entries.length ? (
          <ChartEmpty hidden={hidden} />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-72 w-full"
            aria-label={`Pemasukan dan pengeluaran ${unit} dalam ${currency}`}
          >
            <AreaChart
              accessibilityLayer
              data={data.series}
              margin={{ left: 4, right: 12, top: 12 }}
            >
              <defs>
                {["income", "expense"].map((key) => (
                  <linearGradient
                    key={key}
                    id={`${uid}-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={tick}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={compact}
                tickLine={false}
                axisLine={false}
                width={55}
                domain={[0, "auto"]}
              />
              <ChartTooltip content={tooltip} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="income"
                type="linear"
                stroke="var(--color-income)"
                strokeWidth={2}
                fill={`url(#${uid}-income)`}
                dot={data.series.length === 1}
                isAnimationActive={false}
              />
              <Area
                dataKey="expense"
                type="linear"
                stroke="var(--color-expense)"
                strokeWidth={2}
                fill={`url(#${uid}-expense)`}
                dot={data.series.length === 1}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="mt-auto min-h-20 text-xs text-muted-foreground">
        {data.entries.length} transaksi · Arus kas bersih{" "}
        {money(data.totals.balance)}
      </CardFooter>
    </Card>
  );
  if (overview) return flowChart;
  return (
    <>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        {flowChart}
        <Card>
          <CardHeader>
            <CardTitle>Perjalanan saldo tercatat</CardTitle>
            <CardDescription>
              Saldo akhir setiap titik {unit}, termasuk saldo awal dan transaksi
              sebelum periode terpilih.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hidden || !data.entries.length ? (
              <ChartEmpty hidden={hidden} />
            ) : (
              <ChartContainer
                config={config}
                className="aspect-auto h-72 w-full"
                aria-label={`Perjalanan saldo tercatat dalam ${currency}`}
              >
                <AreaChart
                  accessibilityLayer
                  data={data.series}
                  margin={{ left: 4, right: 12, top: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={tick}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={compact}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                    domain={["auto", "auto"]}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <ChartTooltip content={tooltip} />
                  <Area
                    dataKey="balance"
                    type="stepAfter"
                    stroke="var(--color-balance)"
                    strokeWidth={2}
                    fill="var(--color-balance)"
                    fillOpacity={0.14}
                    dot={data.series.length === 1}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="mt-auto flex min-h-20 flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>Awal rentang {money(data.initial)}</span>
            <span>Akhir rentang {money(data.closingBalance)}</span>
          </CardFooter>
        </Card>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Catatan dengan pengeluaran terbesar</CardTitle>
            <CardDescription>
              Enam nama catatan teratas; nama yang sama digabung tanpa menebak
              kategorinya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hidden || !data.ranking.length ? (
              <ChartEmpty hidden={hidden} />
            ) : (
              <ChartContainer
                config={config}
                className="aspect-auto h-72 w-full"
                aria-label={`Pengeluaran berdasarkan nama catatan dalam ${currency}`}
              >
                <BarChart
                  accessibilityLayer
                  data={data.ranking.slice(0, 6)}
                  layout="vertical"
                  margin={{ left: 0, right: 12, top: 8 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={compact}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      String(value).length > 18
                        ? `${String(value).slice(0, 18)}…`
                        : String(value)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, _name, item) => (
                          <div className="grid max-w-64 gap-1">
                            <span className="font-medium wrap-break-word">
                              {item.payload.name}
                            </span>
                            <span>
                              {money(Number(value))} · {item.payload.count}{" "}
                              transaksi
                            </span>
                          </div>
                        )}
                        hideLabel
                      />
                    }
                  />
                  <Bar
                    dataKey="expense"
                    fill="var(--color-expense)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={30}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="mt-auto min-h-20 text-xs text-muted-foreground">
            Berdasarkan nominal pengeluaran, bukan jumlah transaksi.{" "}
            {data.ranking.length} nama catatan berbeda.
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Arus kas per rekening</CardTitle>
            <CardDescription>
              Pemasukan dan pengeluaran periode terpilih · {currency}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hidden || !data.entries.length ? (
              <ChartEmpty hidden={hidden} />
            ) : (
              <ChartContainer
                config={config}
                className="aspect-auto h-72 w-full"
                aria-label={`Arus kas per rekening dalam ${currency}`}
              >
                <BarChart
                  accessibilityLayer
                  data={data.byAccount.filter((account) => account.count > 0)}
                  layout="vertical"
                  margin={{ left: 0, right: 12, top: 8 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={compact}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="id"
                    width={100}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const name =
                        data.byAccount.find((account) => account.id === value)
                          ?.name ?? "";
                      return name.length > 16 ? name.slice(0, 16) + "…" : name;
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          data.byAccount.find((account) => account.id === value)
                            ?.name
                        }
                        formatter={(value, name) => (
                          <div className="flex flex-1 justify-between gap-6">
                            <span>
                              {config[name as keyof typeof config]?.label}
                            </span>
                            <span className="font-mono tabular-nums">
                              {money(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="income"
                    fill="var(--color-income)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={25}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="expense"
                    fill="var(--color-expense)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={25}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="mt-auto min-h-20 text-xs text-muted-foreground">
            Hanya rekening yang memiliki transaksi pada periode ini. Mata uang
            lain tidak digabung.
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
