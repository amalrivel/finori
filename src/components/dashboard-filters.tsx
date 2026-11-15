"use client";

import { useId } from "react";
import { currencies, currencyLabels, type Currency } from "@/lib/currency";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export function DashboardFilters({
  currency,
  period,
  periods,
  onCurrencyChange,
  onPeriodChange,
}: {
  currency: Currency;
  period: string;
  periods: readonly string[];
  onCurrencyChange: (currency: Currency) => void;
  onPeriodChange: (period: string) => void;
}) {
  const id = useId();
  return (
    <FieldGroup className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <Field className="min-w-0">
        <FieldLabel htmlFor={`${id}-currency`}>Mata uang</FieldLabel>
        <NativeSelect
          id={`${id}-currency`}
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value as Currency)}
          className="w-full min-w-0"
        >
          {currencies.map((code) => (
            <NativeSelectOption key={code} value={code}>
              {currencyLabels[code]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field className="min-w-0">
        <FieldLabel htmlFor={`${id}-period`}>Periode transaksi</FieldLabel>
        <NativeSelect
          id={`${id}-period`}
          value={period}
          onChange={(event) => onPeriodChange(event.target.value)}
          className="w-full min-w-0"
        >
          <NativeSelectOption value="all">Seluruh data</NativeSelectOption>
          {periods.map((month) => (
            <NativeSelectOption key={month} value={month}>
              {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </FieldGroup>
  );
}
