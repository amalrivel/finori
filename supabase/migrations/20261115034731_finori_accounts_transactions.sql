SET local check_function_bodies = off;

CREATE TABLE "public"."accounts" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"            text                     NOT NULL,
  "kind"            text                     NOT NULL,
  "description"     text                     NOT NULL DEFAULT ''::text,
  "opening_balance" bigint                   NOT NULL DEFAULT 0,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "accounts_description_check" CHECK ((length(description) <= 160)),
  CONSTRAINT "accounts_kind_check" CHECK ((kind = ANY (ARRAY['Rekening bank'::text, 'Dompet digital'::text, 'Tunai'::text]))),
  CONSTRAINT "accounts_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80))),
  CONSTRAINT "accounts_opening_balance_check" CHECK (((opening_balance >= '-1000000000000'::bigint) AND (opening_balance <= '1000000000000'::bigint))),
  CONSTRAINT "accounts_pkey" PRIMARY KEY (id),
  "user_id"         uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "accounts_id_user_id_key" UNIQUE (id, user_id)
);

ALTER TABLE "public"."accounts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."accounts" FROM "anon";

CREATE TABLE "public"."transactions" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id" uuid                     NOT NULL,
  "name"       text                     NOT NULL,
  "category"   text                     NOT NULL,
  "date"       date                     NOT NULL,
  "amount"     bigint                   NOT NULL,
  "items"      jsonb,
  "discount"   bigint                   NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "transactions_amount_check" CHECK (((amount <> 0) AND ((amount >= '-1000000000000'::bigint) AND (amount <= '1000000000000'::bigint)))),
  CONSTRAINT "transactions_category_check"
    CHECK
    ((((amount > 0) AND (category = ANY (ARRAY['Gaji'::text, 'Freelance'::text, 'Lainnya'::text]))) OR ((amount < 0) AND (category = ANY (ARRAY['Makanan'::text, 'Belanja'::text,
    'Transportasi'::text, 'Tagihan'::text, 'Lainnya'::text]))))),
  CONSTRAINT "transactions_date_check" CHECK (((date >= '0001-01-01'::date) AND (date <= '9999-12-31'::date))),
  CONSTRAINT "transactions_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80))),
  CONSTRAINT "transactions_pkey" PRIMARY KEY (id),
  "user_id"    uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."transactions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."transactions" FROM "anon";

CREATE OR REPLACE FUNCTION public.finori_valid_purchase (
  items    jsonb,
  discount bigint,
  amount   bigint
)
  RETURNS boolean
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare
  item jsonb;
  subtotal numeric;
  total numeric := 0;
  qty numeric;
  price numeric;
  item_discount numeric;
begin
  if discount < 0 then return false; end if;
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
    if qty <= 0 or qty > 1000000 or price < 0 or price > 1000000000000 or price <> trunc(price)
      or item_discount < 0 or item_discount <> trunc(item_discount) then return false; end if;
    subtotal := round(qty * price);
    if subtotal > 1000000000000 or item_discount > subtotal then return false; end if;
    total := total + subtotal - item_discount;
  end loop;
  return total - discount = -amount;
exception when others then return false;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."finori_valid_purchase"(jsonb, bigint, bigint) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."finori_valid_purchase"(jsonb, bigint, bigint) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."finori_valid_purchase"(jsonb, bigint, bigint) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."finori_valid_purchase"(jsonb, bigint, bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."finori_valid_purchase"(jsonb, bigint, bigint) TO "service_role";

REVOKE ALL ON TABLE "public"."accounts" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."accounts" TO "authenticated";

REVOKE ALL ON TABLE "public"."accounts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "service_role";

REVOKE ALL ON TABLE "public"."transactions" FROM "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."transactions" TO "authenticated";

REVOKE ALL ON TABLE "public"."transactions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "service_role";

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

CREATE INDEX accounts_user_id_idx ON public.accounts USING btree (user_id);

CREATE POLICY "accounts_delete_own" ON "public"."accounts"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "accounts_insert_own" ON "public"."accounts"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "accounts_select_own" ON "public"."accounts"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "accounts_update_own" ON "public"."accounts"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_owned_account_fkey" FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE RESTRICT;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

CREATE INDEX transactions_account_owner_idx ON public.transactions USING btree (account_id, user_id);

CREATE INDEX transactions_user_date_idx ON public.transactions USING btree (user_id, date DESC);

CREATE POLICY "transactions_insert_own" ON "public"."transactions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "transactions_select_own" ON "public"."transactions"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_purchase_check" CHECK (public.finori_valid_purchase(items, discount, amount));

