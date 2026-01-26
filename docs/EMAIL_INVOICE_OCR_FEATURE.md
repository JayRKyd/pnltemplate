# Email Invoice Processing & OCR Feature

## Overview

This feature enables automatic invoice processing through email. Users can forward invoices to a dedicated email address, and the system will:
1. Receive and parse the email
2. Download attached invoices/documents
3. Extract data using OCR (Optical Character Recognition)
4. Create a draft expense with pre-filled fields

---

## 1. Email Receiving System

### 1.1 Dedicated Email Addresses

Each company/team gets a unique email address for submitting invoices:

```
Format: {company-slug}@invoices.yourdomain.com
Example: bono@invoices.yourdomain.com
         acme-corp@invoices.yourdomain.com
```

**Alternative approach** - Single inbox with routing:
```
Format: invoices+{team-id}@yourdomain.com
Example: invoices+abc123@yourdomain.com
```

### 1.2 Email Provider Options

| Provider | Pros | Cons | Cost |
|----------|------|------|------|
| **Resend** (recommended) | Already integrated, webhooks | Limited email parsing | Free tier available |
| **Postmark** | Excellent inbound parsing | Additional service | $10/mo |
| **SendGrid** | Full-featured inbound parse | Complex setup | Free tier |
| **Mailgun** | Good routing/parsing | EU compliance issues | $35/mo |
| **Custom IMAP** | Full control | Self-hosted, maintenance | Server costs |

### 1.3 Recommended: Resend Inbound Emails

```typescript
// Webhook endpoint: /api/webhooks/email-invoice
// Receives POST from Resend when email arrives

interface InboundEmail {
  from: string;           // sender@example.com
  to: string;             // bono@invoices.domain.com
  subject: string;
  text: string;
  html: string;
  attachments: {
    filename: string;
    content: string;      // Base64 encoded
    contentType: string;  // "application/pdf", "image/jpeg", etc.
  }[];
  headers: Record<string, string>;
}
```

---

## 2. Email Processing Pipeline

### 2.1 Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Email Arrives  │────▶│  Webhook Handler │────▶│  Team Routing   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Draft Created  │◀────│   OCR Extract    │◀────│ Store Document  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 2.2 Webhook Handler

```typescript
// app/api/webhooks/email-invoice/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { processInboundInvoice } from '@/app/actions/email-invoice';

export async function POST(req: NextRequest) {
  // Verify webhook signature (security)
  const signature = req.headers.get('x-resend-signature');
  if (!verifySignature(signature, await req.text())) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const email = await req.json();
  
  try {
    const result = await processInboundInvoice(email);
    return NextResponse.json({ success: true, expenseId: result.expenseId });
  } catch (error) {
    console.error('Email processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
```

### 2.3 Team Routing Logic

```typescript
// lib/email-routing.ts

interface TeamRouting {
  teamId: string;
  teamName: string;
  emailPrefix: string;  // e.g., "bono" for bono@invoices.domain.com
}

export async function resolveTeamFromEmail(toAddress: string): Promise<string | null> {
  // Extract prefix from email: "bono@invoices.domain.com" -> "bono"
  const prefix = toAddress.split('@')[0].toLowerCase();
  
  // Check for +routing format: "invoices+abc123@domain.com" -> "abc123"
  if (prefix.includes('+')) {
    const teamId = prefix.split('+')[1];
    return teamId;
  }
  
  // Look up team by email prefix
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('invoice_email_prefix', prefix)
    .single();
    
  return team?.id || null;
}
```

---

## 3. Document Storage

### 3.1 Store Attachments in Supabase Storage

```typescript
// app/actions/email-invoice.ts

export async function storeEmailAttachment(
  teamId: string,
  attachment: { filename: string; content: string; contentType: string }
): Promise<string> {
  const buffer = Buffer.from(attachment.content, 'base64');
  const filename = `${Date.now()}-${attachment.filename}`;
  const path = `${teamId}/email-invoices/${filename}`;

  const { data, error } = await supabase.storage
    .from('expense-attachments')
    .upload(path, buffer, {
      contentType: attachment.contentType,
      upsert: false,
    });

  if (error) throw new Error(`Storage error: ${error.message}`);
  
  return path;
}
```

---

## 4. OCR Integration

### 4.1 OCR Provider Options

| Provider | Accuracy | Speed | Cost | Romanian Support |
|----------|----------|-------|------|------------------|
| **Google Cloud Vision** | Excellent | Fast | $1.50/1000 | ✅ Yes |
| **AWS Textract** | Excellent | Fast | $1.50/1000 | ✅ Yes |
| **Azure Form Recognizer** | Excellent | Fast | $1/1000 | ✅ Yes |
| **Tesseract.js** | Good | Slow | Free | ⚠️ Limited |
| **OpenAI GPT-4 Vision** | Excellent | Medium | $0.01/image | ✅ Yes |

### 4.2 Recommended: Google Cloud Vision + GPT-4 Hybrid

**Step 1: Extract raw text with Google Cloud Vision**
**Step 2: Parse structured data with GPT-4**

```typescript
// lib/ocr/index.ts

export interface ExtractedInvoiceData {
  supplier?: {
    name: string;
    cui: string;      // Romanian fiscal code
    address?: string;
  };
  invoice?: {
    number: string;
    date: string;
    dueDate?: string;
  };
  amounts?: {
    subtotal: number;
    vat: number;
    total: number;
    currency: string;
  };
  lineItems?: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  confidence: number;  // 0-1 confidence score
}

export async function extractInvoiceData(
  filePath: string,
  contentType: string
): Promise<ExtractedInvoiceData> {
  // Step 1: Get raw text from OCR
  const rawText = await performOCR(filePath, contentType);
  
  // Step 2: Parse with GPT-4
  const structuredData = await parseWithGPT(rawText);
  
  return structuredData;
}
```

### 4.3 Google Cloud Vision Integration

```typescript
// lib/ocr/google-vision.ts

import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

export async function performOCR(
  filePath: string,
  contentType: string
): Promise<string> {
  // Get file from Supabase storage
  const { data: fileData } = await supabase.storage
    .from('expense-attachments')
    .download(filePath);
    
  if (!fileData) throw new Error('File not found');
  
  const buffer = Buffer.from(await fileData.arrayBuffer());
  
  // For PDFs, use document text detection
  if (contentType === 'application/pdf') {
    const [result] = await client.documentTextDetection({
      image: { content: buffer.toString('base64') },
      imageContext: {
        languageHints: ['ro', 'en'], // Romanian and English
      },
    });
    return result.fullTextAnnotation?.text || '';
  }
  
  // For images
  const [result] = await client.textDetection({
    image: { content: buffer.toString('base64') },
    imageContext: {
      languageHints: ['ro', 'en'],
    },
  });
  
  return result.fullTextAnnotation?.text || '';
}
```

### 4.4 GPT-4 Structured Parsing

```typescript
// lib/ocr/gpt-parser.ts

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseWithGPT(rawText: string): Promise<ExtractedInvoiceData> {
  const prompt = `
You are an expert at parsing Romanian invoices (facturi). 
Extract the following information from this invoice text:

1. Supplier Information:
   - Company name (Furnizor/Prestator)
   - CUI (Cod Unic de Înregistrare / Fiscal Code)
   - Address (optional)

2. Invoice Details:
   - Invoice number (Nr. factura / Seria)
   - Invoice date (Data factura)
   - Due date if present (Scadenta)

3. Amounts:
   - Subtotal without VAT (Baza impozabila / Suma fara TVA)
   - VAT amount (TVA)
   - Total with VAT (Total de plata / Suma cu TVA)
   - Currency (RON, EUR, etc.)

4. Line items if visible:
   - Description
   - Quantity
   - Unit price
   - Line total

Return the data as JSON. If a field is not found, omit it.
Include a confidence score (0-1) based on how clearly the data was present.

Invoice text:
"""
${rawText}
"""
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: 'You extract structured data from invoice text. Always respond with valid JSON.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from GPT');
  
  return JSON.parse(content);
}
```

### 4.5 Alternative: GPT-4 Vision (Direct Image Analysis)

```typescript
// lib/ocr/gpt-vision.ts

export async function extractWithVision(
  imageBuffer: Buffer,
  contentType: string
): Promise<ExtractedInvoiceData> {
  const base64Image = imageBuffer.toString('base64');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this Romanian invoice image and extract:
- Supplier name and CUI (fiscal code)
- Invoice number and date
- Amounts (subtotal, VAT, total) with currency
- Line items if visible
Return as JSON with a confidence score.`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${contentType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from GPT Vision');
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');
  
  return JSON.parse(jsonMatch[0]);
}
```

---

## 5. Draft Expense Creation

### 5.1 Create Draft from Extracted Data

```typescript
// app/actions/email-invoice.ts

import { ExtractedInvoiceData } from '@/lib/ocr';

export async function createDraftFromEmail(
  teamId: string,
  userId: string,
  attachmentPath: string,
  extractedData: ExtractedInvoiceData,
  emailMetadata: { from: string; subject: string; receivedAt: Date }
): Promise<{ expenseId: string }> {
  
  // Generate expense UID
  const { data: uidData } = await supabase.rpc('get_next_expense_id', { 
    p_team_id: teamId 
  });
  const expenseUid = uidData || `DRAFT-${Date.now()}`;

  // Try to match supplier to existing records
  let supplierId = null;
  if (extractedData.supplier?.cui) {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('cui', extractedData.supplier.cui)
      .single();
    supplierId = supplier?.id;
  }

  // Create draft expense
  const { data: expense, error } = await supabase
    .from('team_expenses')
    .insert({
      expense_uid: expenseUid,
      team_id: teamId,
      user_id: userId,
      
      // Status
      status: 'draft',
      source: 'email',  // Track that this came from email
      
      // Extracted data
      supplier: extractedData.supplier?.name || null,
      supplier_cui: extractedData.supplier?.cui || null,
      doc_number: extractedData.invoice?.number || null,
      expense_date: extractedData.invoice?.date || null,
      
      // Amounts
      amount: extractedData.amounts?.total || null,
      amount_with_vat: extractedData.amounts?.total || null,
      amount_without_vat: extractedData.amounts?.subtotal || null,
      vat_amount: extractedData.amounts?.vat || null,
      currency: extractedData.amounts?.currency || 'RON',
      
      // OCR metadata
      ocr_confidence: extractedData.confidence,
      ocr_raw_data: extractedData,  // Store full extracted data
      
      // Email metadata
      email_from: emailMetadata.from,
      email_subject: emailMetadata.subject,
      email_received_at: emailMetadata.receivedAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create draft: ${error.message}`);

  // Link attachment to expense
  await supabase
    .from('expense_attachments')
    .insert({
      expense_id: expense.id,
      file_path: attachmentPath,
      file_type: 'invoice',
      is_primary: true,
    });

  // Send notification to team
  await notifyTeamOfNewDraft(teamId, expense.id, extractedData);

  return { expenseId: expense.id };
}
```

### 5.2 Full Processing Pipeline

```typescript
// app/actions/email-invoice.ts

export async function processInboundInvoice(email: InboundEmail): Promise<{ expenseId: string }> {
  // 1. Resolve team from email address
  const teamId = await resolveTeamFromEmail(email.to);
  if (!teamId) {
    throw new Error(`Unknown team for email: ${email.to}`);
  }

  // 2. Get default user for this team (or use a system user)
  const defaultUserId = await getTeamDefaultUser(teamId);

  // 3. Process each attachment
  const results: { expenseId: string }[] = [];
  
  for (const attachment of email.attachments) {
    // Skip non-document attachments
    if (!isDocumentType(attachment.contentType)) continue;
    
    // 3a. Store the attachment
    const storagePath = await storeEmailAttachment(teamId, attachment);
    
    // 3b. Extract data with OCR
    const extractedData = await extractInvoiceData(storagePath, attachment.contentType);
    
    // 3c. Create draft expense
    const result = await createDraftFromEmail(
      teamId,
      defaultUserId,
      storagePath,
      extractedData,
      {
        from: email.from,
        subject: email.subject,
        receivedAt: new Date(),
      }
    );
    
    results.push(result);
  }

  // Return first created expense (or handle multiple)
  return results[0] || { expenseId: '' };
}

function isDocumentType(contentType: string): boolean {
  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/tiff',
  ];
  return validTypes.includes(contentType.toLowerCase());
}
```

---

## 6. Database Schema Updates

```sql
-- Migration: Add email invoice support fields

-- Add email-related columns to team_expenses
ALTER TABLE team_expenses
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS email_from TEXT,
ADD COLUMN IF NOT EXISTS email_subject TEXT,
ADD COLUMN IF NOT EXISTS email_received_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ocr_raw_data JSONB;

-- Add invoice email prefix to teams
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS invoice_email_prefix TEXT UNIQUE;

-- Create index for email processing
CREATE INDEX IF NOT EXISTS idx_expenses_source ON team_expenses(source);
CREATE INDEX IF NOT EXISTS idx_expenses_email_received ON team_expenses(email_received_at) 
WHERE source = 'email';

-- Add constraint for source values
ALTER TABLE team_expenses
ADD CONSTRAINT check_source 
CHECK (source IN ('manual', 'email', 'api', 'recurring'));
```

---

## 7. Notifications

### 7.1 Notify Team of New Draft

```typescript
// lib/notifications.ts

export async function notifyTeamOfNewDraft(
  teamId: string,
  expenseId: string,
  extractedData: ExtractedInvoiceData
): Promise<void> {
  // Get team admins
  const { data: members } = await supabase
    .from('team_memberships')
    .select('user_id, users(email, display_name)')
    .eq('team_id', teamId)
    .in('role', ['owner', 'admin']);

  if (!members?.length) return;

  // Send notification email
  const supplierName = extractedData.supplier?.name || 'Unknown Supplier';
  const amount = extractedData.amounts?.total 
    ? `${extractedData.amounts.total} ${extractedData.amounts.currency || 'RON'}`
    : 'Amount not detected';

  for (const member of members) {
    await resend.emails.send({
      from: 'invoices@yourdomain.com',
      to: member.users.email,
      subject: `New Invoice Draft: ${supplierName}`,
      html: `
        <h2>New Invoice Received</h2>
        <p>A new invoice has been received and processed:</p>
        <ul>
          <li><strong>Supplier:</strong> ${supplierName}</li>
          <li><strong>Amount:</strong> ${amount}</li>
          <li><strong>Invoice #:</strong> ${extractedData.invoice?.number || 'Not detected'}</li>
          <li><strong>Date:</strong> ${extractedData.invoice?.date || 'Not detected'}</li>
          <li><strong>OCR Confidence:</strong> ${Math.round(extractedData.confidence * 100)}%</li>
        </ul>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${teamId}/expenses/${expenseId}">
            Review and Complete Draft →
          </a>
        </p>
      `,
    });
  }
}
```

---

## 8. UI Components

### 8.1 Draft Review Interface

When viewing a draft created from email, show:

1. **Original document preview** (right panel)
2. **Extracted data** (pre-filled form fields)
3. **Confidence indicators** (highlight low-confidence fields)
4. **"Accept" / "Edit" actions** for each field
5. **Email source info** (from, subject, received date)

### 8.2 Email Settings Page

Team settings should include:

```typescript
// Settings fields
- Invoice email address display (readonly)
- Enable/disable email processing
- Default category for email invoices
- Notification preferences
- Allowed sender domains (whitelist)
```

---

## 9. Security Considerations

### 9.1 Email Verification

```typescript
// Verify sender is authorized
export async function verifySender(
  teamId: string,
  fromEmail: string
): Promise<boolean> {
  // Check if sender is a team member
  const { data: membership } = await supabase
    .from('team_memberships')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_email', fromEmail)
    .single();
    
  if (membership) return true;
  
  // Check whitelist
  const { data: whitelist } = await supabase
    .from('team_email_whitelist')
    .select('domain')
    .eq('team_id', teamId);
    
  const senderDomain = fromEmail.split('@')[1];
  return whitelist?.some(w => w.domain === senderDomain) || false;
}
```

### 9.2 Rate Limiting

```typescript
// Prevent abuse
const RATE_LIMITS = {
  perTeamPerHour: 50,
  perSenderPerHour: 10,
};

export async function checkRateLimit(
  teamId: string,
  senderEmail: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Check team limit
  const { count: teamCount } = await supabase
    .from('team_expenses')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('source', 'email')
    .gte('created_at', oneHourAgo.toISOString());
    
  if ((teamCount || 0) >= RATE_LIMITS.perTeamPerHour) {
    return false;
  }
  
  // Check sender limit
  const { count: senderCount } = await supabase
    .from('team_expenses')
    .select('*', { count: 'exact', head: true })
    .eq('email_from', senderEmail)
    .eq('source', 'email')
    .gte('created_at', oneHourAgo.toISOString());
    
  return (senderCount || 0) < RATE_LIMITS.perSenderPerHour;
}
```

---

## 10. Implementation Checklist

### Phase 1: Email Infrastructure
- [ ] Set up Resend inbound email domain
- [ ] Create webhook endpoint `/api/webhooks/email-invoice`
- [ ] Implement team routing logic
- [ ] Add `invoice_email_prefix` to teams table

### Phase 2: Document Storage
- [ ] Create storage bucket for email attachments
- [ ] Implement attachment storage function
- [ ] Set up file size limits (10MB max)

### Phase 3: OCR Integration
- [ ] Set up Google Cloud Vision credentials
- [ ] Implement OCR text extraction
- [ ] Implement GPT-4 structured parsing
- [ ] Create fallback for low-confidence results

### Phase 4: Draft Creation
- [ ] Add database columns for email metadata
- [ ] Implement draft expense creation
- [ ] Link attachments to expenses
- [ ] Add OCR data storage

### Phase 5: UI Updates
- [ ] Show email source indicator on drafts
- [ ] Highlight OCR-extracted fields
- [ ] Add confidence indicators
- [ ] Create email settings page

### Phase 6: Notifications
- [ ] Send email notification on new draft
- [ ] Add in-app notification
- [ ] Dashboard widget for pending email drafts

### Phase 7: Security & Polish
- [ ] Implement sender verification
- [ ] Add rate limiting
- [ ] Set up monitoring/alerting
- [ ] Create documentation for users

---

## 11. Environment Variables

```env
# Email Processing
RESEND_WEBHOOK_SECRET=whsec_xxxxx
INBOUND_EMAIL_DOMAIN=invoices.yourdomain.com

# OCR - Google Cloud Vision
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}

# OCR - OpenAI (for GPT-4 parsing)
OPENAI_API_KEY=sk-xxxxx

# Optional: AWS Textract alternative
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=eu-central-1
```

---

## 12. Cost Estimates

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Resend Inbound | 500 emails/mo | ~$0 (included) |
| Google Cloud Vision | 500 pages/mo | ~$0.75 |
| OpenAI GPT-4 | 500 parses/mo | ~$5-10 |
| Supabase Storage | 1GB | ~$0 (included) |
| **Total** | | **~$10-15/mo** |

---

## 13. Future Enhancements

1. **Multi-page PDF support** - Split and process each page
2. **Duplicate detection** - Check if invoice already exists
3. **Auto-categorization** - ML model to suggest expense category
4. **Supplier matching** - Auto-link to existing suppliers
5. **Approval workflow** - Route high-value invoices for approval
6. **Mobile app integration** - Push notifications for new drafts
7. **Batch processing** - Handle emails with multiple invoices
8. **Language detection** - Support invoices in multiple languages
