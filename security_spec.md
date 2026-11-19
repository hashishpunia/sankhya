# Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`users`, `practice_sessions`, `user_answers`, `user_statistics`, `daily_activity`, `user_settings`, `reported_questions`) must have its `uid` / `userId` equal to `request.auth.uid`, and `userId` is immutable on update.
2. **Privilege Escalation Prevention**: Regular students cannot set `role: "admin"` on `/users/{userId}` or write to `/admins/{adminId}`. Only verified existing admins or the bootstrapped verified owner email (`hashishpunia@gmail.com` with `email_verified == true`) hold `isAdmin()`.
3. **Catalog Protection**: Only verified admins can create, update, or delete `/categories`, `/topics`, `/questions`, `/generator_configs`, and `/app_config`. Students can only read active catalog records (`active == true` / `enabled == true`).
4. **Relational Integrity**: Topics must reference an existing `categoryId` in `/categories`. Questions must reference an existing `categoryId` and `topicId`. User answers must reference an existing `sessionId` owned by `request.auth.uid`.
5. **Terminal State Locking**: Once a `practice_sessions` document transitions to `status == "completed"`, non-admin clients cannot mutate its score, answers, or status.
6. **PII Isolation**: `/users/{userId}` (containing `email` and `fullName`) is readable only by the owner (`request.auth.uid == userId`) or `isAdmin()`. Blanket `allow list` for non-admins is denied.
7. **Temporal Integrity & Size Bounds**: Every string field enforces strict `.size()` caps; `id` path variables enforce `^[a-zA-Z0-9_\-]+$` (`<= 128` chars); server timestamps (`request.time`) are enforced on `createdAt`/`updatedAt`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Assigned Admin Role**: Student creates `/users/{uid}` with `role: "admin"`.
2. **Shadow Ghost Field Injection**: Student updates `/user_settings/{uid}` adding extra field `isPremium: true`.
3. **Email Spoofing (Unverified Email)**: Caller with `email == "hashishpunia@gmail.com"` and `email_verified == false` attempts to create a question in `/questions/{id}`.
4. **Cross-User PII Read**: Authenticated Student A attempts `get` or `list` on `/users/{studentB_uid}`.
5. **Student Question Bank Tampering**: Authenticated Student attempts `create` or `update` on `/questions/q_101`.
6. **Session Owner Spoofing**: Student A attempts to create `/practice_sessions/s_1` with `userId: studentB_uid`.
7. **Terminal Session Score Tampering**: Student A attempts to update `/practice_sessions/s_1` after `status == "completed"` to change `correctAnswers: 100`.
8. **Orphaned Topic Creation**: Admin attempts to create `/topics/t_bad` referencing non-existent `categoryId: "missing_cat"`.
9. **Resource Poisoning (Oversized ID / String)**: Caller writes document ID of 500 characters or `questionText` > 1000 chars.
10. **Client Timestamp Forgery**: Caller writes `/categories/c_1` with `createdAt` set to a past client timestamp instead of `request.time`.
11. **Report Status Forgery**: Student creates `/reported_questions/r_1` with `status: "resolved"` instead of `"open"`, or tries to resolve their own report.
12. **Blanket Unfiltered List Query**: Student attempts `list` on `/practice_sessions` without filtering by `userId == request.auth.uid`.
