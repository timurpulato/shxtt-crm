# Security Specification for MedCRM Firestore

## 1. Data Invariants
- A **Lead** must have a `fullName` and a `status`.
- A **Message** must have a `text`, `senderId`, `receiverId`, and `createdAt`.
- **Integrations** can only be modified by Admins.
- Users can only read their own **Messages** or messages where they are the receiver, unless they are Staff.
- Only Staff can see the full list of **Leads** and **Clients**.

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create a Lead with a fake `externalId` pretending to be a system-generated one.
2. **Privilege Escalation**: A manager trying to change their own role to `admin`.
3. **Orphaned Write**: Creating a student profile without a corresponding user document.
4. **Shadow Update**: Updating a lead and trying to inject a `hiddenAdmin` field.
5. **PII Leak**: An unauthenticated user attempting to list the `users` collection.
6. **Cross-User Read**: User A trying to read User B's private chat messages.
7. **Terminal State Bypass**: Trying to change a lead's status from `won` back to `new` (if terminal locking applied).
8. **Resource Poisoning**: Sending a 1MB string as a `fullName` for a lead.
9. **Query Scraping**: Authenticated user trying to `list` all messages without a filter.
10. **ID Injection**: Trying to use `../secrets` as a document ID.
11. **Timestamp Forgery**: Sending a `createdAt` date from 2001.
12. **Unverified Auth**: User with a spoofed email (not verified) trying to access staff data.

## 3. Test Runner
(See firestore.rules.test.ts for implementation)
