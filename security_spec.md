# Security Spec for ReUse

## Data Invariants
- An Item must have a valid `ownerId` matching the creator.
- An ExchangeRequest must involve two different users (requester and owner).
- Only the requester or owner of an exchange can create/read messages in that exchange.
- Users cannot modify their own point balances directly.

## The "Dirty Dozen" Payloads
1. Attempt to update another user's profile.
2. Attempt to create an item with someone else's `ownerId`.
3. Attempt to update someone else's item.
4. Attempt to read an exchange that doesn't involve the current user.
5. Attempt to create a message in an exchange not involving the current user.
6. Attempt to update an item's `pointsValue` after creation (if restricted).
7. Attempt to accept an exchange request where the current user is the requester (not the owner).
8. Attempt to inject a 2MB string into an item's title.
9. Attempt to create an item without a `status`.
10. Attempt to read PII from another user's private data (if any).
11. Attempt to spoof `request.auth.uid`.
12. Attempt to skip exchange status steps (e.g., from `pending` straight to `completed` without acceptance).

## Test Runner
(I will implement the rules directly based on these scenarios)
