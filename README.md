# SankhyaPrep — Competitive Mathematics Practice Platform (Phase 1)

SankhyaPrep is an integrated Competitive Mathematics Practice Platform built with **React + TypeScript + Tailwind CSS**, an **Offline-First IndexedDB Persistence Layer**, **Firebase Authentication & Cloud Firestore**, a **Modular Dynamic Question Generation Engine**, and a **Protected Web Admin Studio** with CSV/Excel/JSON bulk import.

## Architecture Overview

1. **Student Practice Application** (`src/components/HomeDashboard.tsx`, `QuickRecallView.tsx`, `PracticeAndTestView.tsx`, `PracticeSessionRunner.tsx`, `PerformanceView.tsx`, `ProfileSettingsView.tsx`)
   - **Bilingual UI**: Full English and Hindi (`en` / `hi`) support, Light & Dark theme.
   - **Quick Recall Module (9 Topics)**: Squares (`1–100`), Cubes (`1–30`), Square Roots, Cube Roots, Multiplication Tables (`1–100`, single or multi-table), Trigonometry (`0°, 30°, 45°, 60°, 90°`, reciprocal & Pythagorean identities), Percentages, Fractions, and DI Column Addition (`2–5` terms, decimal & large numbers).
   - **Basics Module (5 Topics)**: Addition, Subtraction, Multiplication (including `×11, ×12, ×25, ×50, ×100` shortcuts), Division (exact, remainders, missing divisors), and Mixed Arithmetic (`BODMAS`).
   - **Test & Exam Mode**: Topic-wise, Mixed All Topics, and Custom multi-topic timed exams with auto-submission, configurable marks, and negative marking (`0`, `-0.25`, `-0.33`, `-0.5`, `-1`).
   - **Guest Mode + Account Migration**: Immediate offline practice without mandatory sign-in, with one-click migration of local guest sessions to a verified Google/Email account.

2. **Dynamic Mathematics Question Generation Engine** (`src/engine/questionGenerator.ts`)
   - Supports 7 formats (`direct`, `mcq`, `fill_blank`, `missing_number`, `reverse`, `true_false`, `identify_incorrect`), deduplication within sessions, GCD fraction reduction, division-by-zero prevention, and tolerance/radical-aware answer checking.

3. **Offline-First Storage & Cloud Sync** (`src/db/offlineDb.ts`, `src/services/syncService.ts`)
   - Pre-loads seed categories, topics, generator bounds, and 70+ verified questions (`src/data/seedQuestionBank.ts`) on first launch so the platform works completely offline.
   - Saves in-progress practice state on every question so unexpected refreshes or disconnects never lose answers.
   - Queues offline writes in `pending_sync_records` and synchronizes cleanly to Firestore (`practice_sessions` before `user_answers`) when connectivity returns.

4. **Protected Web Admin Studio** (`src/components/AdminPanelView.tsx`, `src/services/adminService.ts`)
   - Enforces server-side authorization via Firestore Security Rules (`isAdmin()` checking `/admins/{uid}` or verified owner email).
   - Provides Category, Topic, and Question Bank CRUD, search/filter/pagination, CSV/Excel (`.xlsx`)/JSON bulk import with validation & duplicate detection, generator range configuration, and student question report resolution.

5. **Firebase Backend & Security** (`firebase-blueprint.json`, `firestore.rules`, `security_spec.md`)
   - Covers 13 Firestore collections with strict schema validation, PII isolation on `/users/{userId}`, terminal state locking on completed sessions, and ESLint security-rule verification.

## Owner Setup & Verification Notes
- **Authentication**: Google Sign-In works immediately. To also allow Email/Password login, enable the **Email/Password** provider in Firebase Console → Authentication → Sign-in method.
- **Initial Cloud Seed**: Sign into the **Admin** tab with your authorized Google account and click **Initialize Cloud Seed Bank** to publish the starter curriculum and generator configs into Cloud Firestore.
- **Native Android Companion**: This AI Studio workspace builds and serves the full-stack Web Student Platform + Web Admin Panel + Firebase Backend on port 3000; compiling a signed Android APK/AAB requires running Gradle inside Android Studio locally.
