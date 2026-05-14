## Plan: Availability Fields In Profile

Add three required numeric profile fields for daily availability, monthly availability, and minimum effort hours; persist them through the existing profile flow; and replace the current hardcoded DOCX availability placeholders with formatted values derived from the saved profile. Reuse the current ProfilePage -> electronAPI -> database.saveUserProfile flow, keep the existing DOCX template placeholders unchanged, and preserve backward compatibility by falling back to the current hardcoded DOCX strings only when legacy profiles still have null values.

**Steps**
1. Phase 1 - Extend the profile contract in the persistence and renderer types. Add `daily_availability`, `monthly_availability`, and `minimum_effort_hours` to the `UserProfile` entity as nullable integer columns so existing installations can open without migration failures, and add the same fields to `UserProfileData` so renderer, preload, and browser fallback share one shape. This step blocks the rest.
2. Phase 2 - Extend the profile form state and hydration flow in the renderer. Update the `ProfileForm` type, `initialForm`, `buildProfileFingerprint`, `loadProfile`, and `persistProfile` logic in the profile page so the new fields load from Electron or localStorage, participate in dirty-state detection, and save through the existing `saveUserProfile` route. This depends on step 1.
3. Phase 3 - Add the UI inputs in the profile page. Insert a new section after `correlating_activities` and before the action buttons, reusing the existing input frame, error, and spacing patterns. Render three number inputs for Disponibilidade Diária, Disponibilidade Mensal, and Esforço Mínimo em Horas, with labels and field-level error messages consistent with the rest of the page. This depends on step 2.
4. Phase 4 - Enforce validation and numeric normalization. Update `validateProfile` so the three new fields are mandatory and must be positive integers; reject empty, zero, negative, NaN, or partially typed invalid values at validation time; and make the profile page keep renderer state compatible with numeric persistence by normalizing number-input values before save. This depends on steps 2 and 3.
5. Phase 5 - Wire the new fields into DOCX generation. Replace the hardcoded replacements for `{{daily_availability}}`, `{{monthly_availability}}`, and `{{minimum_effort_hours}}` in the report generator with formatter helpers fed by the profile values. Format them as `8 horas/dia`, `168 horas/mes`, and `168` respectively, while leaving the existing template, placeholder names, and `getReportPayload()` contract untouched. To avoid breaking pre-existing saved profiles, keep the current hardcoded strings as generator fallbacks only when one of the new fields is still null. This depends on step 1 and can run in parallel with steps 2-4 once the field names are fixed.
6. Phase 6 - Extend focused automated tests. Add database coverage for create/update/getReportPayload round-trip with the new fields; extend profile validation tests to cover required-field and positive-integer cases; and update DOCX integration tests to assert the generated XML contains the formatted availability values from the profile instead of only checking placeholder removal. This depends on steps 1-5.
6.1 Phase 6.1 - Add playwrite tests for the profile page to cover the new inputs, validation, and persistence in both desktop and browser fallback modes. This depends on steps 1-4.
7. Phase 7 - Run manual verification in both desktop and browser-fallback flows. Confirm a new profile can be saved with the three fields, an existing profile loads and can be updated, localStorage fallback preserves the same shape, report generation emits the formatted values into the DOCX, and a legacy profile without the fields still generates a report with the legacy fallback strings until the profile is resaved. This depends on steps 3-6.

**Relevant files**
- `d:\Programacao\Electron\ship-it\electron\entities\UserProfile.ts` - add the three persisted columns to the user profile entity.
- `d:\Programacao\Electron\ship-it\src\vite-env.d.ts` - extend `UserProfileData` so the renderer and preload bridge use the new fields.
- `d:\Programacao\Electron\ship-it\src\pages\ProfilePage.tsx` - update form state, hydration, save payload, fingerprinting, UI inputs, and per-field error display.
- `d:\Programacao\Electron\ship-it\src\utils\validation.ts` - add required positive-integer validation rules and messages.
- `d:\Programacao\Electron\ship-it\electron\report-generator.ts` - replace hardcoded availability replacements with profile-driven formatting helpers and legacy fallbacks.
- `d:\Programacao\Electron\ship-it\electron\database.ts` - reuse existing `saveUserProfile()` and `getReportPayload()` flow; verify no logic change is needed beyond the entity contract.
- `d:\Programacao\Electron\ship-it\electron\main.ts` - reuse the existing `app:generateReport` path; no change expected unless fallback strategy is revised.
- `d:\Programacao\Electron\ship-it\electron\database.test.ts` - add persistence and report-payload assertions for the new fields.
- `d:\Programacao\Electron\ship-it\src\utils\validation.test.ts` - add validation coverage for the three required numeric fields.
- `d:\Programacao\Electron\ship-it\electron\report-generator.integration.test.ts` - assert generated DOCX content uses formatted profile values.
- `d:\Programacao\Electron\ship-it\docs\plan-docx-generator\docx-template-map.md` - reference only; placeholders already exist, so no template-map edit is required for this feature.

**Verification**
1. Run the focused unit/integration tests for the touched slices: `npm run test -- electron/database.test.ts src/utils/validation.test.ts electron/report-generator.integration.test.ts` or the repository-equivalent Vitest invocation already used by the project.
2. In desktop mode, open Perfil, fill the three new fields, save, reopen the page, and verify values round-trip correctly.
3. Generate a DOCX for a month with activities and confirm the resulting `word/document.xml` contains the formatted values (`X horas/dia`, `Y horas/mes`, `Z`) and no raw placeholders for those fields remain.
4. Validate a legacy-profile scenario by loading an existing DB/profile without the new columns populated and confirming report generation still succeeds using the fallback strings until the user edits and resaves the profile.
5. In browser fallback mode, save the profile with the new fields and confirm `localStorage['shipit-profile']` contains the same keys and values the desktop flow uses.

**Decisions**
- Included scope: profile UI, profile persistence, validation, browser fallback shape, DOCX substitution, and automated tests for persistence/validation/report generation.
- Excluded scope: changing the DOCX template file itself, adding new IPC methods, changing dashboard UX around report generation, and documentation/changelog updates.
- Storage format: numeric hours stored as integers in profile data; DOCX human-readable units are applied only inside the report generator.
- Backward compatibility: generator keeps the old hardcoded strings as fallback only for pre-existing profiles missing the new fields, so the release does not break report generation before the user revisits the profile.

**Further Considerations**
1. If fractional hours become necessary later, change the three columns and renderer normalization from integer to real in a separate follow-up rather than widening this release.
2. If the team later wants stricter data quality, add a second follow-up to block report generation when the new fields are missing instead of using legacy fallback values.