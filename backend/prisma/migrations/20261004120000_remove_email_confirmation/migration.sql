DROP TABLE "EmailVerification";

ALTER TABLE "User" DROP COLUMN "emailVerifiedAt";

DROP TYPE "VerificationDeliveryStatus";
