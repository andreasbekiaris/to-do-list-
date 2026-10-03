CREATE TABLE "auth_attempts" (
	"bucket" varchar(32) PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"resets_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton" boolean DEFAULT true NOT NULL,
	"username" varchar(32) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_accounts_singleton_unique" UNIQUE("singleton"),
	CONSTRAINT "owner_accounts_username_unique" UNIQUE("username"),
	CONSTRAINT "owner_accounts_single_owner" CHECK ("owner_accounts"."singleton" = true),
	CONSTRAINT "owner_accounts_username_format" CHECK ("owner_accounts"."username" ~ '^[a-z0-9._-]{3,32}$')
);
