-- AlterTable
ALTER TABLE "otp_codes" ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "otp_codes" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "otp_codes" ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'phone_login';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "otp_codes_email_idx" ON "otp_codes"("email");
CREATE INDEX IF NOT EXISTS "otp_codes_purpose_idx" ON "otp_codes"("purpose");
