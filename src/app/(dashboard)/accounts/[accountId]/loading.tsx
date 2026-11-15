import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function Loading() {
  return (
    <div aria-busy="true" role="status">
      <Card>
        <CardHeader>
          <CardTitle>Memuat rekening…</CardTitle>
          <CardDescription>
            Menyiapkan saldo dan transaksi rekeningmu.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
