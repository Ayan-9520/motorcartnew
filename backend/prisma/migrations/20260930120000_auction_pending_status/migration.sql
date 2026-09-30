-- Dealer / customer submitted lots wait for admin approval before scheduling.
ALTER TYPE "AuctionStatus" ADD VALUE IF NOT EXISTS 'pending';
