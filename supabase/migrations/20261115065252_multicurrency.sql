SET local check_function_bodies = off;

ALTER TABLE "public"."accounts"
  DROP CONSTRAINT "accounts_opening_balance_check";

ALTER TABLE "public"."transactions"
  DROP CONSTRAINT "transactions_amount_check";

ALTER TABLE "public"."transactions"
  DROP CONSTRAINT "transactions_category_check";

ALTER TABLE "public"."transactions"
  DROP CONSTRAINT "transactions_owned_account_fkey";

ALTER TABLE "public"."transactions"
  DROP CONSTRAINT "transactions_purchase_check";

DROP FUNCTION "public"."finori_valid_purchase"(jsonb, bigint, bigint);

ALTER TABLE "public"."accounts"
  ADD COLUMN "currency" text NOT NULL DEFAULT 'IDR'::text;

ALTER TABLE "public"."transactions"
  ADD COLUMN "currency" text NOT NULL DEFAULT 'IDR'::text;

ALTER TABLE "public"."accounts"
  ALTER COLUMN "opening_balance" DROP DEFAULT;

ALTER TABLE "public"."accounts"
  ALTER COLUMN "opening_balance" TYPE numeric USING "opening_balance"::numeric;

ALTER TABLE "public"."accounts"
  ALTER COLUMN "opening_balance" SET DEFAULT 0;

ALTER TABLE "public"."transactions"
  ALTER COLUMN "amount" DROP DEFAULT;

ALTER TABLE "public"."transactions"
  ALTER COLUMN "amount" TYPE numeric USING "amount"::numeric;

ALTER TABLE "public"."transactions"
  ALTER COLUMN "discount" DROP DEFAULT;

ALTER TABLE "public"."transactions"
  ALTER COLUMN "discount" TYPE numeric USING "discount"::numeric;

ALTER TABLE "public"."transactions"
  ALTER COLUMN "discount" SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.finori_valid_purchase (
  items    jsonb,
  discount numeric,
  amount   numeric,
  currency text
)
  RETURNS boolean
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare
  digits integer := case when currency = 'USD' then 2 else 0 end;
  item jsonb;
  subtotal numeric;
  total numeric := 0;
  qty numeric;
  price numeric;
  item_discount numeric;
begin
  if currency not in ('IDR', 'JPY', 'USD') or discount <> round(discount, digits) or discount < 0 then return false; end if;
  if items is null then return discount = 0; end if;
  if amount >= 0 or jsonb_typeof(items) <> 'array' then return false; end if;
  if jsonb_array_length(items) not between 1 and 100 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object' then return false; end if;
    if exists (select 1 from jsonb_object_keys(item) as k where k not in ('name', 'quantity', 'unitPrice', 'discount', 'kind', 'group')) then return false; end if;
    if jsonb_typeof(item->'name') is distinct from 'string' or length(trim(item->>'name')) not between 1 and 80
      or jsonb_typeof(item->'quantity') is distinct from 'number'
      or jsonb_typeof(item->'unitPrice') is distinct from 'number'
      or jsonb_typeof(item->'discount') is distinct from 'number'
      or jsonb_typeof(item->'kind') is distinct from 'string' or length(item->>'kind') > 80
      or jsonb_typeof(item->'group') is distinct from 'string' or length(item->>'group') > 80 then return false; end if;
    qty := (item->>'quantity')::numeric;
    price := (item->>'unitPrice')::numeric;
    item_discount := (item->>'discount')::numeric;
    if qty <= 0 or qty > 1000000 or price < 0 or price > 1000000000000 or price <> round(price, digits)
      or item_discount < 0 or item_discount <> round(item_discount, digits) then return false; end if;
    subtotal := round(qty * price, digits);
    if subtotal > 1000000000000 or item_discount > subtotal then return false; end if;
    total := total + subtotal - item_discount;
  end loop;
  return total - discount = -amount;
exception when others then return false;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."finori_valid_purchase"(jsonb, numeric, numeric, text) FROM PUBLIC, "anon";

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_currency_check" CHECK ((currency = ANY (ARRAY['IDR'::text, 'JPY'::text, 'USD'::text])));

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_id_user_currency_key" UNIQUE (id, user_id, currency);

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_opening_balance_check" CHECK (((opening_balance >= ('-1000000000000'::bigint)::numeric) AND (opening_balance <= ('1000000000000'::bigint)::numeric)));

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_precision_check" CHECK ((opening_balance = round(opening_balance,
CASE
    WHEN (currency = 'USD'::text) THEN 2
    ELSE 0
END)));

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_amount_check"
    CHECK (((amount <> (0)::numeric) AND ((amount >= ('-1000000000000'::bigint)::numeric) AND (amount <= ('1000000000000'::bigint)::numeric))));

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_category_check"
    CHECK
    ((((amount > (0)::numeric) AND (category = ANY (ARRAY['Gaji'::text, 'Freelance'::text, 'Lainnya'::text]))) OR ((amount < (0)::numeric) AND (category = ANY
    (ARRAY['Makanan'::text, 'Belanja'::text, 'Transportasi'::text, 'Tagihan'::text, 'Lainnya'::text])))));

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_currency_check" CHECK ((currency = ANY (ARRAY['IDR'::text, 'JPY'::text, 'USD'::text])));

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_owned_account_fkey" FOREIGN KEY (account_id, user_id, currency) REFERENCES public.accounts(id, user_id, currency) ON UPDATE RESTRICT
    ON DELETE RESTRICT;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_precision_check" CHECK ((amount = round(amount,
CASE
    WHEN (currency = 'USD'::text) THEN 2
    ELSE 0
END)));

GRANT EXECUTE ON FUNCTION "public"."finori_valid_purchase"(jsonb, numeric, numeric, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."finori_valid_purchase"(jsonb, numeric, numeric, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."finori_valid_purchase"(jsonb, numeric, numeric, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."finori_valid_purchase"(jsonb, numeric, numeric, text) TO "service_role";

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_purchase_check" CHECK (public.finori_valid_purchase(items, discount, amount, currency));

