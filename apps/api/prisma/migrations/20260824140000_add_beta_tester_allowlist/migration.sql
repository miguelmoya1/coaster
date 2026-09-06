CREATE TABLE "BetaTester" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaTester_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BetaTester_email_key" ON "BetaTester"("email");

ALTER TABLE "BetaTester" ADD CONSTRAINT "BetaTester_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
