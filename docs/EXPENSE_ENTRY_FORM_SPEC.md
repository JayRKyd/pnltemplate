# Expense Entry – Manual Upload Form
## Functional Description (v1.0)

This screen allows users to manually record a business expense by uploading a supporting document (invoice, receipt, etc.) and filling in all relevant details. Each entry may include one or more products or services from a single document.

---

## 🔹 1. Document Header (General Information)

### 1.1 Supplier Field
- **Type:** Smart search input connected to Romanian business registry API
- **Search by:** CUI (unique fiscal ID) or company name
- **Trigger:** After typing 3+ characters, dropdown with suggestions appears
- **Display Format:** `Company Name / CUI`
- **On Select:** Closes dropdown and locks the field
- **Data Saved:** Both name and CUI stored with expense record

### 1.2 Document Type
- **Type:** Dropdown
- **Options:** `Bon`, `Factura`, `eFactura`, `Chitanta`, `Altceva`
- **Default:** `Factura`
- **Behavior:** Closes when clicking outside or after selection

### 1.3 Document Number
- **Type:** Free text field
- **Format:** Accepts letters, numbers, slashes, dots, etc.
- **Example:** `SER1234/01.10.2025`

### 1.4 Issue Date (Data Doc)
- **Type:** Calendar picker
- **Default:** Today's date
- **Validation:** 
  - Cannot be a future date
  - Must be after January 1, 2026

### 1.5 Paid / Unpaid Toggle (Plătit / Neplătit)
- **Type:** Binary toggle
- **Options:** `Plătit` / `Neplătit`
- **Default:** `Neplătit`
- **Usage:** Payment reports and filtered views

### 1.6 Upload Document
- **Type:** Upload button
- **Accepts:** Any file type (PDF, JPG, PNG, etc.)
- **Max Size:** 10MB
- **After Upload:** 
  - Filename displayed with delete (✕) icon
  - Re-uploading replaces previous file
  - Document previewed on right-hand panel

---

## 🔹 2. Product / Line Item Card

Each expense line from a document is entered as a separate line item. Multiple line items are stored as individual expense records but remain visually grouped and linked to the same document/photo.

### 2.1 Description (Descriere)
- **Type:** Free text field
- **Purpose:** Briefly describes the product/service
- **Examples:** `Office rent`, `Flight to Berlin`, `Printer cartridges`

### 2.2 Amount Fields
| Field | Type | Notes |
|-------|------|-------|
| **Suma cu TVA** (Amount with VAT) | Numeric | Editable |
| **Suma fără TVA** (Amount without VAT) | Numeric | Editable |
| **TVA** (VAT amount) | Numeric | Editable |

**Auto-Calculation Logic:**
- Any two fields can be filled manually
- The third is calculated automatically and becomes read-only
- Read-only field shows ✕ icon to reset all three values
- Format: Up to 2 decimal places

### 2.3 VAT Rate (Cota TVA)
- **Type:** Read-only (auto-calculated)
- **Formula:** `(TVA / Suma fără TVA) * 100`

### 2.4 P&L Month (Luna P&L)
- **Type:** Dropdown
- **Default:** Same month as Issue Date (Data Doc)
- **Editable:** Yes, can be changed manually
- **Purpose:** Determines which month the expense appears in P&L report

### 2.5 Account + Subaccount (Cont + Subcont)
- **Type:** Cascading dropdowns
- **Data Source:** Budget structure from the year of selected P&L month
- **Behavior:**
  - Selecting an account enables the subaccount dropdown
  - Subaccount options filtered by selected account
  - Changing account resets subaccount

### 2.6 VAT Deductible (TVA Deductibil)
- **Type:** Yes/No switch
- **Default:** Yes
- **Logic:**
  - If "Yes" → `Suma fără TVA` is included in P&L
  - If "No" → `Suma cu TVA` is included in P&L

### 2.7 Tags
- **Type:** Multi-value input
- **Required:** No (optional)
- **Format:** `#tag`
- **Separators:** Comma or Enter
- **Features:** Autocomplete for previously entered tags
- **Usage:** Grouping, filtering, searching in expense list

---

## 🔹 3. Buttons & Logic

### 3.1 Add Product (+ Produs)
- **Action:** Adds another identical line item section
- **Limit:** Maximum 5 line items per document
- **UX:** Auto-scrolls to new section after adding

### 3.2 Save Button (Salvează)
**On Click:**
1. All filled fields are validated
2. If required fields are missing → confirmation message appears
3. Once confirmed → form is saved

**Saving Logic:**
- Each product line saved as separate expense record
- Internal system ID generated for the group: `XXX-YYY`
  - `XXX`: 3 letters (excluding "i" and "o")
  - `YYY`: 3 digits
  - Suffix: `-a`, `-b`, `-c` for multiple line items
- All expenses in same group share the same document attachment

---

## 🔹 4. Document Preview Panel

- **Location:** Right side of screen
- **Features:**
  - Scrollable if multiple pages
  - Shared across all line items in the form

---

## 🔹 5. Draft Entries & Incomplete Data

If user saves form with missing fields (excluding tags):
1. Confirmation message displayed
2. Once confirmed → saved with status "Draft"
3. Missing fields appear blank in expense list

**Purpose:** Allows creating expense form (Decont) even if full data not yet available.

---

# Implementation Tickets

## ✅ MAIN TICKETS

### 1. Form Container
- [ ] Build initial structure using component-based layout
- [ ] Split into Header (Document Info), Left Panel (Product Entry), Right Side (Document Image)
- [ ] Load test document image as placeholder for layout

---

### 2. Header Section – Document Info Fields

#### 2.1 Supplier Lookup Field
- [ ] Implement search-as-you-type with 3+ characters
- [ ] Search by CUI or name via external API
- [ ] Display format: `Company Name / CUI`
- [ ] On select, collapse dropdown and lock in selection

**Validations:**
- [ ] Required
- [ ] Must match a supplier in database

**Edge Cases:**
- [ ] No matching supplier → show "No results found"
- [ ] API timeout → show retry option

#### 2.2 Document Type Dropdown
- [ ] Options: `Bon`, `Factura`, `eFactura`, `Chitanta`, `Altceva`
- [ ] Default: `Factura`
- [ ] Dropdown should close on outside click

**Validations:**
- [ ] Required
- [ ] Must be one of allowed options

**Edge Case:**
- [ ] Clicking outside without selection should close dropdown

#### 2.3 Document Number
- [ ] Free text field (no validation)

#### 2.4 Issue Date Picker
- [ ] Standard calendar picker

**Validations:**
- [ ] Must be a date after Jan 1 2026
- [ ] Must not be a future date

#### 2.5 Paid Toggle
- [ ] Toggle switch: `Plătit` / `Neplătit`
- [ ] Default: `Neplătit`

#### 2.6 Upload Document Button
- [ ] Accept file types: any
- [ ] Show filename after upload + delete (✕) icon

**Validations:**
- [ ] Required
- [ ] Max 10MB
- [ ] Multiple documents allowed

**Edge Cases:**
- [ ] Re-upload replaces previous file

---

### 3. Product Entry Card (Line Item)

#### 3.1 Description
- [ ] Free text input

#### 3.2 Amount Fields: Suma cu TVA, Suma fără TVA, TVA
- [ ] All editable
- [ ] On entry of any 2, auto-calculate the 3rd
- [ ] 3rd becomes read-only + shows ✕ icon
- [ ] ✕ = reset all 3
- [ ] When field becomes active, placeholder deleted and start writing in empty field

**Edge Cases:**
- [ ] 2 decimal places max

#### 3.3 Cota TVA
- [ ] Auto-calculated, not editable
- [ ] Formula: `(TVA / Suma fără TVA) * 100`

#### 3.4 Luna P&L
- [ ] Default = Issue Date's month
- [ ] Editable via dropdown (Jan–Dec)

#### 3.5 Cont + Subcont Dropdowns
- [ ] Load from current year's budget structure
- [ ] Cont must be selected before Subcont appears

**Validations:**
- [ ] Subcont must belong to selected Cont

**Edge Cases:**
- [ ] Change of Cont resets Subcont
- [ ] If no subconts for a cont, subcont field is disabled

#### 3.6 TVA Deductibil Toggle (Yes/No)
- [ ] Default: Yes
- [ ] If Yes → Amount saved = `Suma fără TVA`
- [ ] If No → Amount saved = `Suma cu TVA`

#### 3.7 Tags Input
- [ ] Optional
- [ ] Tags start with `#`
- [ ] Allow multiple comma-separated or Enter-based tags
- [ ] Autocomplete past tags

**Validations:**
- [ ] Must start with `#`

---

### 4. Buttons & UX

#### 4.1 Add Product
- [ ] Appends another product card below
- [ ] Scroll to view new item

**Edge Cases:**
- [ ] Max 5 line items per document

#### 4.2 Save Button
- [ ] On click: Validate all fields
- [ ] Save one expense per product line
- [ ] Group all under internal ID: `ABC-123-a`, `ABC-123-b`

**Edge Cases:**
- [ ] Server error → show retry option
- [ ] Duplicate entry warning (based on any 2 from: number + supplier + date + Suma cu TVA)

---

### 5. ID Logic (Backend)
- [ ] On save: Assign system ID format `XXX-YYY` (no "i" or "o" in XXX)
- [ ] For multiple lines → suffix: `-a`, `-b`, etc.

---

### 6. Document Display (Right Panel)
- [ ] Show preview of uploaded file
- [ ] Scroll if multiple pages
- [ ] Shared between all line items

---

### 7. Accessibility & Keyboard
- [ ] Ensure tab order is logical
- [ ] Allow keyboard toggling for checkboxes, toggles, dropdowns

---

## Summary of Required Fields

| Field | Required | Validation |
|-------|----------|------------|
| Supplier | ✅ | Must match database |
| Document Type | ✅ | Must be valid option |
| Document Number | ❌ | - |
| Issue Date | ✅ | After Jan 1, 2026; not future |
| Upload Document | ✅ | Max 10MB |
| Description | ✅ | - |
| Amount fields | ✅ | 2 of 3 required |
| Cont | ✅ | - |
| Subcont | ✅ | Must match Cont |
| TVA Deductibil | ✅ | Default: Yes |
| Tags | ❌ | Must start with # if provided |

---

## API Integrations Required

1. **Romanian Business Registry API** - Supplier lookup by CUI/name
2. **Budget Categories API** - Cont/Subcont dropdown data (per year)
3. **Tags Autocomplete API** - Previously used tags

---

*Version: 1.0 | Last Updated: January 2026*
