# User Guide — PCB Component BOM & Inventory Manager

This guide explains how to use the PCB Component BOM & Inventory Manager after signing in.

## 1. Open the application

Visit https://electfinalproj.vercel.app/ in a modern browser. Use your registered email and password to sign in. If you are a new user, select the registration option and provide the requested account details.

If email confirmation is enabled, open the confirmation email and follow its link before signing in.

## 2. Sign in and account recovery

- Enter your email address and password to sign in.
- Use the sign-out option when finished on a shared computer.
- If you forget your password, choose the password reset option and follow the email link.
- When the recovery link opens the application, enter and confirm a new password.

Keep your password private. Do not share account credentials with other workspace users.

## 3. Understand the dashboard

The dashboard summarizes the current workspace. Depending on the available records, it displays component totals, stock units, inventory value, low-stock alerts, and recent activity.

A low-stock alert means that a component's available stock is at or below its configured minimum-stock threshold. Open the component record to review its quantity and threshold.

## 4. Manage component inventory

### Add a component

1. Open the inventory section.
2. Select the add-component action.
3. Enter the component's MPN and name.
4. Add manufacturer, category, package type, footprint, and storage location when available.
5. Enter unit price, current stock, and minimum stock.
6. Add a datasheet or catalogue reference if available.
7. Save the component.

Use a consistent MPN so the same physical part can be identified across projects. MPN values must be unique within a workspace.

### Find or update a component

Use the search field to locate a component. Use category filters and sorting controls to narrow the list. Open a component to inspect its details or edit its information.

Update descriptive fields when a part's information changes. Use stock operations to change quantities so the movement history remains meaningful.

### Delete a component

Delete only components that are no longer needed. A component referenced by a BOM may be protected by database relationships. Remove or update dependent BOM lines before attempting to delete it.

## 5. Record stock movements

Use stock operations whenever component quantities change.

- **Stock in:** component units were added to the workspace.
- **Stock out:** component units were removed or used.
- **Stock correction:** the recorded stock was adjusted to match a verified physical count.
- **Initial stock:** the starting quantity was recorded.

Enter whole-number quantities. Add a note when useful, such as a purchase reference, project name, or reason for a correction. After saving, check the displayed stock and movement history.

Do not use a stock correction as a substitute for documenting a known purchase or usage event; choose the movement type that best describes what happened.

## 6. Create a project and BOM

1. Open the projects or BOM section.
2. Create a project and enter its name and description.
3. Open the project.
4. Add an inventory component to the BOM.
5. Enter the required quantity.
6. Enter reference designators, separated as supported by the interface (for example, R1, R2, C1).
7. Add notes if needed.
8. Repeat for each required component.

Review the BOM after adding all parts. Estimated costs are based on the inventory unit prices. Shortage indicators compare required quantities with available stock. Confirm the physical stock before beginning assembly.

## 7. Use catalogue lookup

Open the catalogue section and search for a component by its available search terms or part number. Review the returned information before using it. If the interface offers a prefill action, use it to populate the inventory form, then verify the MPN, package, description, and other fields.

Catalogue data is a convenience, not a purchasing guarantee. Always confirm the current price, stock, and exact part specification with the supplier.

## 8. Use the pinout inspector

Choose the supported device reference (ESP32 DevKit V1 or ATmega328P DIP-28) and review its pin information. Confirm pin names and electrical limits against the exact manufacturer's datasheet and board revision before wiring or fabricating a PCB.

## 9. Review analytics and export data

Use analytics to review inventory value, category summaries, and project cost information.

Available data tools include:
- CSV export for spreadsheet use.
- CSV import for supported inventory data.
- JSON backup for preserving application data.
- JSON restore for recovering a compatible backup.
- Printable component labels.

Before importing a CSV or restoring JSON, keep a separate copy of your existing data. Review imported records for duplicate MPNs, incorrect quantities, and missing fields.

## 10. Change preferences

Open the preferences/settings area to select the display currency and toggle low-stock alerts. The selected currency changes the display format only; it does not perform currency conversion. Preferences are associated with the signed-in profile.

## 11. Good inventory practices

- Use consistent component names and MPN values.
- Record the physical storage location clearly.
- Set realistic minimum-stock thresholds.
- Record every stock change using the appropriate movement type.
- Add notes to unusual corrections.
- Keep regular JSON backups in a secure location.
- Verify catalogue data and datasheets before purchasing or assembling.
- Sign out when using a shared computer.

## 12. If something goes wrong

1. Refresh the application once.
2. Confirm that the internet connection is working.
3. Sign out and sign in again if workspace data does not load.
4. Check that the account has the required workspace role.
5. Record the exact error message and the action that caused it.
6. Contact the project administrator with the error details; do not disable database security policies as a workaround.
