CREATE TABLE "public"."drive_connections" (
  "user_id"        uuid                     NOT NULL,
  "refresh_token"  text,
  "folder_id"      text,
  "google_user_id" text                     NOT NULL,
  "connected_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "drive_connections_pkey" PRIMARY KEY (user_id)
);

ALTER TABLE "public"."drive_connections"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."drive_connections" FROM "anon", "authenticated";

CREATE TABLE "public"."transaction_attachments" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"        uuid                     NOT NULL,
  "transaction_id" uuid                     NOT NULL,
  "drive_file_id"  text                     NOT NULL,
  "google_user_id" text                     NOT NULL,
  "slot"           smallint                 NOT NULL,
  "name"           text                     NOT NULL,
  "mime_type"      text                     NOT NULL,
  "size"           integer                  NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "transaction_attachments_drive_file_id_key" UNIQUE (drive_file_id),
  CONSTRAINT "transaction_attachments_mime_type_check" CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))),
  CONSTRAINT "transaction_attachments_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120))),
  CONSTRAINT "transaction_attachments_pkey" PRIMARY KEY (id),
  CONSTRAINT "transaction_attachments_size_check" CHECK (((size >= 1) AND (size <= 5242880))),
  CONSTRAINT "transaction_attachments_slot_check" CHECK (((slot >= 1) AND (slot <= 10))),
  CONSTRAINT "transaction_attachments_transaction_id_slot_key" UNIQUE (transaction_id, slot)
);

ALTER TABLE "public"."transaction_attachments"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."transaction_attachments" FROM "anon";

ALTER TABLE "public"."drive_connections"
  ADD CONSTRAINT "drive_connections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."transaction_attachments"
  ADD CONSTRAINT "transaction_attachments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_id_user_key" UNIQUE (id, user_id);

ALTER TABLE "public"."transaction_attachments"
  ADD CONSTRAINT "transaction_attachments_transaction_id_user_id_fkey" FOREIGN KEY (transaction_id, user_id) REFERENCES public.transactions(id, user_id) ON UPDATE RESTRICT
    ON DELETE RESTRICT;

CREATE INDEX transaction_attachments_owner_idx ON public.transaction_attachments USING btree (user_id, transaction_id);

CREATE POLICY "attachments_select_own" ON "public"."transaction_attachments"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "transactions_delete_own" ON "public"."transactions"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "transactions_update_own" ON "public"."transactions"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

REVOKE ALL ON TABLE "public"."drive_connections" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."drive_connections" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."drive_connections" TO "service_role";

REVOKE ALL ON TABLE "public"."transaction_attachments" FROM "authenticated";

GRANT SELECT ON TABLE "public"."transaction_attachments" TO "authenticated";

REVOKE ALL ON TABLE "public"."transaction_attachments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transaction_attachments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transaction_attachments" TO "service_role";

REVOKE ALL ON TABLE "public"."transactions" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."transactions" TO "authenticated";

