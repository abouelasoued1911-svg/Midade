# Security Spec for MIDADE

## 1. Data Invariants & Authorization Rules
- **User Document Isolation (`/users/{userId}`)**:
  - Only accessible when `request.auth.uid == userId`.
  - Modification requires `incoming().userId == request.auth.uid` and `incoming().userId == existing().userId`.
  - Listing the entire `/users` collection is prohibited (`allow list: if false`).

- **Decks (`/decks/{deckId}`)**:
  - Must have `userId == request.auth.uid` on create, read, update, and delete.
  - On update, neither `userId` nor `id` can be mutated (`incoming().userId == existing().userId && incoming().id == existing().id`).
  - Document ID must match record ID (`incoming().id == deckId`).
  - Strict field length constraints: `name` (1-256 chars), `description` (<= 2000 chars), `color` (<= 32 chars).

- **Cards (`/cards/{cardId}`)**:
  - Must have `userId == request.auth.uid` and match authenticated user on all operations.
  - Document ID must match record ID (`incoming().id == cardId`).
  - On update, `userId` and `id` are immutable.
  - Card front and back content bounds enforced (<= 20,000 characters).

- **Review Logs (`/reviewLogs/{logId}`)**:
  - Must have `userId == request.auth.uid`.
  - Rating must be an integer between 1 and 4 inclusive (`rating is number && rating >= 1 && rating <= 4 && rating == int(rating)`).
  - On update, `userId` and `id` cannot be modified.

- **Tombstones (`/tombstones/{tombId}`)**:
  - Used for multi-device deletion synchronization.
  - Restricted to authenticated owner (`userId == request.auth.uid`).
  - Type must be strictly `'card'` or `'deck'`.

- **Test Path (`/test/{docId}`)**:
  - Restricted to authenticated users only (`allow read: if isSignedIn()`). No public reads permitted.

## 2. Dirty Dozen Negative Test Matrix
1. **Unauthenticated Deck Create**: Write to `/decks/deck1` without login -> REJECTED.
2. **ID Poisoning Attack**: Write with mismatched path ID vs body ID -> REJECTED.
3. **Spoofed User Ownership on Card**: User `uid_A` creates card with `userId: "uid_B"` -> REJECTED.
4. **Blanket Query Scraping**: Querying `/decks` without filtering `userId == auth.uid` -> REJECTED.
5. **Cross-User Deck Modification**: User `uid_A` updates Deck created by `uid_B` -> REJECTED.
6. **Card Text Overflow**: Create card with front > 20,000 characters -> REJECTED.
7. **Modifying Immortal Fields**: Mutating `userId` or `id` during update -> REJECTED.
8. **Invalid Review Rating**: Submitting review log with rating `0`, `5`, `-1`, or `"great"` -> REJECTED.
9. **Cross-User Card Deletion**: User `uid_A` attempts deleting card of `uid_B` -> REJECTED.
10. **Unauthenticated Read on Logs**: Reading `/reviewLogs/{logId}` without login -> REJECTED.
11. **Tombstone Type Injection**: Writing tombstone with invalid type -> REJECTED.
12. **Catch-All Default Deny**: Accessing `/unknown_collection/xyz` -> REJECTED.
