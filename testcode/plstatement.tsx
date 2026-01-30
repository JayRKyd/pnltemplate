// @ts-nocheck
import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { RefreshCw, Download, Check, Upload, ChevronRight, ChevronDown, X, Loader2 } from 'lucide-react';
import { CustomSelect } from './customselect';
import { CategoryDetail } from './categorydetail';
import { DeltaView } from './deltaview';
import { MonthYearPicker } from './monthyearpicker';
import { BudgetTemplateForm, BudgetTemplate } from './budgettemplateform';
import { importBudgetFromExcel } from '@/app/actions/budget';

// Real data interface from server
interface RealPnlData {
  cheltuieli: number[];
  categories: {
    id: string;
    name: string;
    values: number[];
    subcategories: {
      id: string;
      name: string;
      values: number[];
    }[];
  }[];
  venituri: number[];
  budget: number[];
  budgetCategories: {
    id: string;
    name: string;
    values: number[];
    subcategories: {
      id: string;
      name: string;
      values: number[];
    }[];
  }[];
  expenses: {
    id: string;
    date: string;
    supplier: string;
    description: string;
    invoiceNumber: string;
    amount: number;
    status: string;
    category: string;
    subcategory: string;
    type: 'reale' | 'recurente';
  }[];
}

interface PLStatementProps {
  onBack: () => void;
  venituri: number[];
  setVenituri: (venituri: number[]) => void;
  // Real data from database
  realData?: RealPnlData;
  teamId?: string;
  // Budget template save function
  onSaveBudgetTemplate?: (teamId: string, template: BudgetTemplate) => Promise<{ success: boolean; error?: string }>;
  // Callback when budget is uploaded to refresh data
  onBudgetUploaded?: () => void;
  // Function to fetch category expenses for popup
  getCategoryExpensesFn?: (teamId: string, categoryName: string, year: number, month: number) => Promise<any[]>;
  // Callback when year changes to refresh P&L data
  onYearChange?: (year: string) => void;
}

interface Subcategory {
  name: string;
  values: number[];
  vatDeductible?: boolean;
}

interface Category {
  name: string;
  values: number[];
  vatDeductible?: boolean;
  subcategories?: Subcategory[];
}

interface Invoice {
  id: string;
  date: string;
  supplier: string;
  description: string;
  invoiceNumber: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Final';
  category: string;
  type: 'reale' | 'recurente';
}

const mockInvoices: Invoice[] = [
  // 2.2 Google ads - Jan 2026
  { id: '1', date: '2026-01-05', supplier: 'AWS Europe SARL', description: 'Cloud hosting infrastructure - Ianuarie', invoiceNumber: 'AWS-2026-001', amount: 1500, status: 'Final', category: '2.2 Google ads', type: 'reale' },
  { id: '2', date: '2026-01-12', supplier: 'Microsoft Ireland Ltd', description: 'Office 365 Business Premium - 50 licente', invoiceNumber: 'MS-2026-001', amount: 2300, status: 'Final', category: '2.2 Google ads', type: 'reale' },
  { id: '3', date: '2026-01-20', supplier: 'Adobe Systems Software', description: 'Creative Cloud All Apps - 15 users', invoiceNumber: 'AD-2026-001', amount: 850, status: 'Final', category: '2.2 Google ads', type: 'reale' },
  { id: '4', date: '2026-01-28', supplier: 'Google Ireland Ltd', description: 'Google Workspace Business Standard', invoiceNumber: 'GO-2026-001', amount: 420, status: 'Final', category: '2.2 Google ads', type: 'recurente' },
  { id: '5', date: '2026-01-30', supplier: 'Orange Romania SA', description: 'Abonament telefonie - Ianuarie', invoiceNumber: 'OR-2026-001', amount: 890, status: 'Final', category: '2.2 Google ads', type: 'recurente' },
  
  // 1.1 Salarii
  { id: '11', date: '2026-01-05', supplier: 'Angajati', description: 'Salarii nete - Ianuarie 2026', invoiceNumber: 'SAL-01-26', amount: 28500, status: 'Final', category: '1.1 Salarii', type: 'reale' },
  { id: '12', date: '2026-01-25', supplier: 'Bugetul de Stat', description: 'Contributii salariale', invoiceNumber: 'TAX-01-26', amount: 12500, status: 'Final', category: '1.1 Salarii', type: 'recurente' },

  // 4.1 Chirie
  { id: '21', date: '2026-01-03', supplier: 'Office Building SRL', description: 'Chirie spatiu birouri - Ianuarie', invoiceNumber: 'CH-2026-001', amount: 3500, status: 'Final', category: '4.1 Chirie', type: 'recurente' },
  { id: '22', date: '2026-01-15', supplier: 'Office Building SRL', description: 'Costuri mentenanta', invoiceNumber: 'MN-2026-001', amount: 270, status: 'Final', category: '4.1 Chirie', type: 'reale' },

  // Generic fallback for other categories
  { id: '6', date: '2026-08-15', supplier: 'Generic Supplier SRL', description: 'Servicii diverse', invoiceNumber: 'GEN-001', amount: 1000, status: 'Final', category: 'General', type: 'reale' },
];

export const PLStatement = forwardRef<{ resetCategory: () => void }, PLStatementProps>(
  ({ onBack, venituri, setVenituri, realData, teamId, onSaveBudgetTemplate, onBudgetUploaded, getCategoryExpensesFn, onYearChange }, ref) => {
    const [activeTab, setActiveTab] = useState<'expenses' | 'budget' | 'delta'>('expenses');
    const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'RON'>('EUR');
    const [selectedYear, setSelectedYear] = useState('2026');
    const [deltaSelectedMonth, setDeltaSelectedMonth] = useState(0); // January (0-indexed)
    const [deltaSelectedYear, setDeltaSelectedYear] = useState(2026);
    const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly');
    const [viewType, setViewType] = useState<'lunar' | 'trimestrial' | 'anual'>('lunar');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [cheltuieliExpanded, setCheltuieliExpanded] = useState(false);
    const [vatDeductibility, setVatDeductibility] = useState<{[key: string]: boolean}>({
      '1. Echipa': true,
      '1. Salarii': true,
      '2. Bonusuri': true,
      '3. Training': true,
      '4. Team events': true,
      '2. Marketing': true,
      '20. Social media ads': false,
      '21. Google ads': true,
      '22. Fee agentie': true,
      '3. IT': true,
      '5. Cloud hosting': true,
      '6. Software licenses': true,
      '4. Sediu': true,
      '7. Chirie': true,
      '8. Utilitati': true,
      '9. Investitii amenajare': false,
      '10. Altele': true,
      '5. Servicii': true,
      '417. Recurutare': true,
      '418. Contabilitate': true,
      '419. Avocati': true,
      '420. Altele': false,
      '6. Altele': true,
      '13. Asigurari': true,
      '14. Taxe si impozite': false,
    });
    const [showInvoicesPopup, setShowInvoicesPopup] = useState<{ category: string, month: string, monthIndex: number } | null>(null);
    const [popupInvoices, setPopupInvoices] = useState<any[]>([]);
    const [popupLoading, setPopupLoading] = useState(false);

    // Fetch invoices when popup opens
    useEffect(() => {
      if (showInvoicesPopup && getCategoryExpensesFn && teamId) {
        setPopupLoading(true);
        const monthIndex = showInvoicesPopup.monthIndex;
        
        // Determine the correct year based on view type and column index
        // For P&L Realizat view: indices 0-11 are prev year, index 12 is current year
        // For Budget view: all indices are for the selected year
        let year: number;
        let month: number;
        
        if (activeTab === 'budget') {
          // Budget view: all months are from selected year
          year = parseInt(selectedYear);
          month = monthIndex + 1; // 1-12
        } else {
          // P&L Realizat view: rolling year (Jan prev year -> Jan current year)
          const prevYear = parseInt(selectedYear) - 1;
          if (monthIndex < 12) {
            // Indices 0-11 are months from previous year
            year = prevYear;
            month = monthIndex + 1; // 1-12
          } else {
            // Index 12 is January of current year
            year = parseInt(selectedYear);
            month = 1; // January
          }
        }
        
        getCategoryExpensesFn(teamId, showInvoicesPopup.category, year, month)
          .then(data => {
            console.log('Popup data received:', data);
            // Transform API data to match the expected format
            const transformed = data.map((exp: any) => {
              // Handle date - use expense_date or accounting_period or fallback to current date
              let dateStr = exp.expense_date || exp.accounting_period;
              let date;
              if (dateStr) {
                // Try to parse the date
                date = new Date(dateStr);
                // Check if valid date
                if (isNaN(date.getTime())) {
                  date = new Date();
                }
              } else {
                date = new Date();
              }
              
              // Handle amount - ensure it's a valid number
              const amount = typeof exp.total_amount === 'number' ? exp.total_amount : 
                            typeof exp.amount === 'number' ? exp.amount :
                            parseFloat(exp.total_amount) || parseFloat(exp.amount) || 0;
              
              // Handle supplier - check multiple possible field names
              const supplier = exp.supplier_name || exp.supplier || exp.furnizor || 'N/A';
              
              // Handle description
              const description = exp.description || exp.descriere || '-';
              
              // Handle invoice number
              const invoiceNumber = exp.invoice_number || exp.numar_factura || '-';
              
              return {
                id: exp.id,
                date: date.toISOString(),
                supplier: supplier,
                description: description,
                invoiceNumber: invoiceNumber,
                amount: amount,
                status: exp.status || 'Final',
                category: exp.subcategory_name || exp.category_name || showInvoicesPopup.category,
                subcategory: exp.subcategory_name,
                type: exp.is_recurring ? 'recurente' : 'reale'
              };
            });
            console.log('Transformed popup data:', transformed);
            setPopupInvoices(transformed);
          })
          .catch(err => {
            console.error('Error fetching category expenses:', err);
            setPopupInvoices([]);
          })
          .finally(() => setPopupLoading(false));
      }
    }, [showInvoicesPopup, getCategoryExpensesFn, teamId, selectedYear]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingBudget, setUploadingBudget] = useState(false);
    const [uploadedBudgets, setUploadedBudgets] = useState<{[year: string]: string}>({
      '2025': 'Buget_2025.xlsx'
    });
    const [showBudgetTemplateForm, setShowBudgetTemplateForm] = useState(false);
    const [budgetTemplates, setBudgetTemplates] = useState<{[year: string]: BudgetTemplate}>({
      '2026': {
        year: '2026',
        venituriCategories: [],
        cheltuieliCategories: [
          {
            name: 'Echipa',
            subcategories: [
              { name: 'Salarii' },
              { name: 'Bonusuri' },
              { name: 'Training' },
              { name: 'Team events' }
            ],
            expanded: false
          },
          {
            name: 'Marketing',
            subcategories: [
              { name: 'Social media ads' },
              { name: 'Google ads' },
              { name: 'Fee agentie' }
            ],
            expanded: false
          },
          {
            name: 'IT',
            subcategories: [
              { name: 'Cloud hosting' },
              { name: 'Software licenses' }
            ],
            expanded: false
          },
          {
            name: 'Sediu',
            subcategories: [
              { name: 'Chirie' },
              { name: 'Utilitati' },
              { name: 'Investitii amenajare' },
              { name: 'Altele' }
            ],
            expanded: false
          },
          {
            name: 'Servicii',
            subcategories: [
              { name: 'Recurutare' },
              { name: 'Contabilitate' },
              { name: 'Avocati' },
              { name: 'Altele' }
            ],
            expanded: false
          },
          {
            name: 'Altele',
            subcategories: [
              { name: 'Asigurari' },
              { name: 'Taxe si impozite' }
            ],
            expanded: false
          }
        ]
      }
    });

    useImperativeHandle(ref, () => ({
      resetCategory: () => {
        setSelectedCategory(null);
      }
    }));

    const months = [
      'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
      'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
    ];

    const quarters = ['Q1-24', 'Q2-24', 'Q3-24', 'Q4-24', 'Q1-25', 'Q2-25', 'Q3-25', 'Q4-25'];

    // Use real data if available, otherwise fall back to mock data
    // Check if we have real expenses data (even if categories are empty)
    const hasRealData = realData && (
      (realData.categories && realData.categories.length > 0) || 
      (realData.cheltuieli && realData.cheltuieli.some(v => v > 0))
    );
    
    // Mock data structure - 24 months: first 12 for 2025, last 12 for 2026
    const mockData = {
      cheltuieli: [
        // 2025 data (Jan-Jul not shown in screenshot but needed for structure)
        40000, 42000, 48000, 52000, 54000, 58000, 62000, 
        // Aug-Dec 2025 (Visible in screenshot)
        55000, 57000, 80000, 54000, 65000,
        // 2026 data (Jan-Aug visible in screenshot)
        44225, 44692, 50851, 57335, 59991, 63038, 67785, 58623, 
        // Sep-Dec 2026 (Future/Not in screenshot)
        60449, 85126, 58228, 70000
      ],
      categories: [
        { 
          name: '1. Echipa', 
          values: [
            // 2025 (Jan-Jul hidden)
            35000, 36000, 42000, 44000, 46000, 48000, 54000, 
            // Aug-Dec 2025
            47000, 45000, 42000, 27000, 38000,
            // 2026 (Jan-Aug)
            37797, 39318, 45365, 48156, 50759, 52224, 59301, 50752,
            // Sep-Dec 2026
            47997, 45761, 29946, 41000
          ],
          subcategories: [
            { name: '1.1 Salarii', values: [30000, 31000, 36000, 38000, 40000, 42000, 48000, 41000, 39000, 36000, 22000, 32000, 32367, 33856, 38881, 41579, 44176, 45691, 52704, 44248, 41606, 39205, 24407, 35000] },
            { name: '1.2 Bonusuri', values: [3000, 3000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 3000, 4000, 3237, 3278, 4321, 4376, 4416, 4352, 4393, 4318, 4267, 4357, 3328, 4000] },
            { name: '1.3 Training', values: [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1619, 1639, 1621, 1641, 1641, 1632, 1648, 1619, 1600, 1634, 1665, 1500] },
            { name: '1.4 Team events', values: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 540, 546, 540, 547, 552, 544, 549, 540, 533, 545, 540, 500] },
          ]
        },
        { 
          name: '2. Marketing', 
          values: [
            // 2025
            900, 700, 1000, 2400, 2300, 3000, 2000, 
            // Aug-Dec 2025
            1300, 750, 750, 0, 1200,
            // 2026
            1001, 761, 1118, 2625, 2485, 3308, 2157, 1379, 
            // Sep-Dec 2026
            790, 790, 0, 1500
          ],
          subcategories: [
            { name: '2.1 Social media ads', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: '2.2 Google ads', values: [0, 0, 0, 2400, 2080, 5689, 5030, 1095, 0, 0, 0, 0, 0, 0, 0, 2400, 2080, 3000, 2000, 1095, 0, 0, 0, 1000] },
            { name: '2.3 Fee agentie', values: [900, 700, 1000, 0, 220, 0, 0, 205, 750, 750, 0, 1200, 1001, 761, 1118, 225, 405, 308, 157, 284, 790, 790, 0, 500] },
          ]
        },
        { 
          name: '3. IT', 
          values: [
            // 2025
            500, 800, 500, 2500, 2300, 3300, 2800, 
            // Aug-Dec 2025
            3100, 2900, 3300, 2400, 2800,
            // 2026
            533, 872, 526, 2736, 2483, 3574, 2968, 3315, 
            // Sep-Dec 2026
            3037, 3484, 2561, 3100
          ],
          subcategories: [
            { name: '3.1 Cloud hosting', values: [300, 500, 300, 1500, 1300, 1800, 1500, 1800, 1600, 1800, 1200, 1500, 323, 546, 315, 1642, 1404, 1951, 1590, 1928, 1674, 1900, 1281, 1600] },
            { name: '3.2 Software licenses', values: [200, 300, 200, 1000, 1000, 1500, 1300, 1300, 1300, 1500, 1200, 1300, 210, 326, 210, 1094, 1079, 1623, 1378, 1387, 1363, 1584, 1280, 1500] },
          ]
        },
        { 
          name: '4. Sediu', 
          values: [
            // 2025
            4500, 3500, 3100, 3300, 3200, 2900, 3000, 
            // Aug-Dec 2025
            2900, 3100, 28000, 3900, 4200,
            // 2026
            4811, 3741, 3330, 3582, 3465, 3078, 3214, 3096, 
            // Sep-Dec 2026
            3338, 30110, 4197, 4500
          ],
          subcategories: [
            { name: '4.1 Chirie', values: [3500, 2500, 2100, 2300, 2200, 1900, 2000, 1900, 2100, 3000, 2900, 3000, 3770, 2685, 2257, 2497, 2380, 2061, 2120, 2034, 2261, 3165, 3099, 3200] },
            { name: '4.2 Utilitati', values: [800, 800, 800, 800, 800, 800, 800, 800, 800, 900, 800, 900, 861, 859, 860, 869, 865, 869, 849, 856, 861, 949, 855, 900] },
            { name: '4.3 Investitii amenajare', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 24000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25882, 0, 0] },
            { name: '4.4 Altele', values: [200, 200, 200, 200, 200, 200, 200, 200, 200, 100, 200, 300, 180, 197, 213, 216, 220, 148, 245, 206, 216, 114, 243, 400] },
          ]
        },
        { 
          name: '5. Servicii', 
          values: [
            // 2025
            80, 0, 320, 35, 500, 380, 50, 
            // Aug-Dec 2025
            75, 1350, 1300, 230, 400,
            // 2026
            83, 0, 342, 40, 545, 408, 53, 81, 
            // Sep-Dec 2026
            1419, 1365, 246, 450
          ],
          subcategories: [
            { name: '5.1 Recurutare', values: [0, 0, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1050, 1050, 0, 0] },
            { name: '5.2 Contabilitate', values: [80, 0, 320, 35, 500, 380, 50, 75, 350, 300, 230, 400, 83, 0, 342, 40, 545, 408, 53, 81, 369, 315, 246, 450] },
            { name: '5.3 Avocati', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: '5.4 Altele', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
          ]
        },
        { 
          name: '6. Altele', 
          values: [
            // 2025
            0, 0, 160, 180, 240, 420, 85, 
            // Aug-Dec 2025
            0, 3600, 3400, 20000, 18000,
            // 2026
            0, 0, 170, 196, 254, 446, 92, 0, 
            // Sep-Dec 2026
            3868, 3616, 21278, 19450
          ],
          subcategories: [
            { name: '6.1 Asigurari', values: [0, 0, 160, 180, 240, 420, 85, 0, 600, 400, 0, 0, 0, 0, 170, 196, 254, 446, 92, 0, 618, 416, 0, 0] },
            { name: '6.2 Taxe si impozite', values: [0, 0, 0, 0, 0, 0, 0, 0, 3000, 3000, 20000, 18000, 0, 0, 0, 0, 0, 0, 0, 0, 3250, 3200, 21278, 19450] },
          ]
        }
      ]
    };

    // Use real data when available, otherwise use mock data
    const data = hasRealData ? {
      cheltuieli: realData.cheltuieli,
      categories: realData.categories.map(cat => ({
        name: cat.name,
        values: cat.values,
        subcategories: cat.subcategories.map(sub => ({
          name: sub.name,
          values: sub.values
        }))
      }))
    } : mockData;

    // Use real invoices when available
    const invoices = hasRealData ? realData.expenses : mockInvoices;

    // Budget data - use real budget when available, otherwise calculate from actual
    const budgetVenituri = hasRealData && realData.budget 
      ? realData.budget 
      : venituri.map(v => v * 1.05);
    
    const budgetCheltuieli = hasRealData && realData.budget 
      ? realData.budget 
      : data.cheltuieli.map(c => c * 0.95);
    
    const budgetCategories = hasRealData && realData.budgetCategories && realData.budgetCategories.length > 0
      ? realData.budgetCategories.map(cat => ({
          name: cat.name,
          values: cat.values,
          subcategories: cat.subcategories?.map(sub => ({
            name: sub.name,
            values: sub.values
          }))
        }))
      : data.categories.map(cat => ({
          ...cat,
          values: cat.values.map(v => v * 0.95),
          subcategories: cat.subcategories?.map(sub => ({
            ...sub,
            values: sub.values.map(v => v * 0.95)
          }))
        }));

    const handleVenituriChange = (index: number, value: string) => {
      const numValue = value === '' ? 0 : parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
      const newVenituri = [...venituri];
      newVenituri[index] = numValue;
      setVenituri(newVenituri);
    };

    const formatAmount = (amount: number) => {
      return amount.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const calculateTotal = (values: number[]) => {
      return values.reduce((sum, val) => sum + val, 0);
    };

    const calculateProfit = (index: number) => {
      return data.venituri[index] - data.cheltuieli[index];
    };

    // Get year offset for data (0 for prev year, 12 for current year)
    const getYearOffset = () => {
      return selectedYear === '2026' ? 12 : (selectedYear === '2025' ? 12 : 0);
    };

    // Get the data for the current view
    const getYearData = (values: number[]) => {
      if (activeTab === 'budget') {
        // Budget view: Calendar year (Jan-Dec of selected year)
        // For 2026: Jan 2026 (index 12) -> Dec 2026 (index 23)
        // For 2025: Jan 2025 (index 0) -> Dec 2025 (index 11) when viewing 2025-2026 data
        const yearOffset = selectedYear === '2026' ? 12 : 0;
        return values.slice(yearOffset, yearOffset + 12);
      }
      // P&L Realizat view: Rolling year (Jan-Jan)
      // Always return Jan previous year -> Jan current year (13 months)
      // For 2026: Jan 2025 (index 0) -> Jan 2026 (index 12)
      return values.slice(0, 13);
    };

    // Get month labels based on active tab
    const getMonthLabels = () => {
      if (activeTab === 'budget') {
        // Budget view: Calendar year (Jan-Dec)
        return ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      }
      // P&L Realizat view: Rolling year (Jan-Jan)
      return ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'IAN'];
    };

    // Determine if an index is the current month (only for P&L Realizat view)
    const isCurrentMonth = (index: number) => {
      if (activeTab === 'budget') return false; // No current month highlight in budget view
      // In Jan-Jan view, Jan 2026 is index 12 (last column)
      return index === 12; // Jan 2026 is the current month
    };

    // Get column styles for highlights
    const getColumnStyle = (index: number, isHeader: boolean = false) => {
      if (activeTab === 'budget') {
        // Budget view: DEC column (index 11) gets different styling for header vs data
        if (index === 11) {
          return {
            backgroundColor: isHeader ? '#E5E7EB80' : '#AED4FF26'
          };
        }
        return {};
      }
      
      const isCurrent = isCurrentMonth(index);
      
      if (isCurrent) {
        // Current month (Jan 2026) highlighted (Orange/Beige)
        return {
          backgroundColor: isHeader ? '#FFF1E6' : '#FFF1E6',
          fontWeight: 700,
          color: '#1F2937'
        };
      }
      
      // Header-specific styling for previous year months (Jan-Dec 2025)
      if (isHeader && index < 12) {
        return {
          color: '#9CA3AF', // Gray for past year
          fontWeight: 600
        };
      }
      
      return {};
    };

    // Grid layout definition - different for budget vs P&L Realizat
    const getGridLayout = () => {
      if (activeTab === 'budget') {
        // Budget: 12 months + YTD + TOTAL
        return {
          display: 'grid',
          gridTemplateColumns: '220px repeat(12, minmax(60px, 1fr)) 90px 90px',
          gap: '0',
          alignItems: 'center'
        };
      }
      // P&L Realizat: 13 months (Jan-Jan) + YTD
      return {
        display: 'grid',
        gridTemplateColumns: '220px repeat(13, minmax(60px, 1fr)) 100px',
        gap: '0',
        alignItems: 'center'
      };
    };

    const handleBudgetUpload = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && teamId) {
        setUploadingBudget(true);
        try {
          // Read file as base64
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = (event.target?.result as string)?.split(',')[1];
            if (base64) {
              try {
                const result = await importBudgetFromExcel(
                  teamId,
                  parseInt(selectedYear),
                  base64,
                  file.name
                );
                
                if (result.imported > 0) {
                  setUploadedBudgets(prev => ({
                    ...prev,
                    [selectedYear]: file.name
                  }));
                  alert(`Buget importat cu succes!\n${result.imported} rânduri importate${result.failed > 0 ? `\n${result.failed} rânduri cu erori` : ''}`);
                  
                  // Trigger refresh of P&L data
                  onBudgetUploaded?.();
                } else {
                  alert(`Eroare la import: ${result.errors.join('\n')}`);
                }
              } catch (err) {
                console.error('Budget import error:', err);
                alert('Eroare la importul bugetului: ' + (err instanceof Error ? err.message : 'Eroare necunoscută'));
              }
            }
            setUploadingBudget(false);
          };
          reader.onerror = () => {
            alert('Eroare la citirea fișierului');
            setUploadingBudget(false);
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error('File read error:', err);
          alert('Eroare la citirea fișierului');
          setUploadingBudget(false);
        }
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleDeleteBudget = () => {
      setUploadedBudgets(prev => {
        const newBudgets = { ...prev };
        delete newBudgets[selectedYear];
        return newBudgets;
      });
    };

    const handleModifyBudget = () => {
      fileInputRef.current?.click();
    };

    const VATBadge = ({ isDeductible, onClick }: { isDeductible: boolean, onClick: (e: React.MouseEvent) => void }) => (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center w-6 h-4 rounded-full cursor-pointer transition-all ${
          isDeductible
            ? 'bg-emerald-100/80 hover:bg-emerald-200/80'
            : 'bg-rose-100/80 hover:bg-rose-200/80'
        }`}
      >
        {isDeductible ? (
          <Check size={10} className="text-gray-700" strokeWidth={3} />
        ) : (
          <X size={10} className="text-gray-700" strokeWidth={3} />
        )}
      </div>
    );

    const CurrencyFlag = () => {
      if (selectedCurrency === 'RON') {
        return (
          <div className="w-5 h-3 rounded-full overflow-hidden flex">
            <div className="w-[6.67px] h-3 bg-[#002B7F]"></div>
            <div className="w-[6.67px] h-3 bg-[#FCD116]"></div>
            <div className="w-[6.67px] h-3 bg-[#CE1126]"></div>
          </div>
        );
      } else {
        return (
          <div className="w-5 h-3 rounded-full overflow-hidden bg-[#003399] flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="6" r="1.5" fill="#FFCC00"/>
                <circle cx="7" cy="3" r="0.8" fill="#FFCC00"/>
                <circle cx="13" cy="3" r="0.8" fill="#FFCC00"/>
                <circle cx="5.5" cy="6" r="0.8" fill="#FFCC00"/>
                <circle cx="14.5" cy="6" r="0.8" fill="#FFCC00"/>
                <circle cx="7" cy="9" r="0.8" fill="#FFCC00"/>
                <circle cx="13" cy="9" r="0.8" fill="#FFCC00"/>
                <circle cx="4.5" cy="9.5" r="0.8" fill="#FFCC00"/>
                <circle cx="15.5" cy="9.5" r="0.8" fill="#FFCC00"/>
                <circle cx="4.5" cy="2.5" r="0.8" fill="#FFCC00"/>
                <circle cx="15.5" cy="2.5" r="0.8" fill="#FFCC00"/>
                <circle cx="10" cy="2" r="0.8" fill="#FFCC00"/>
              </svg>
            </div>
          </div>
        );
      }
    };

    const displayVenituri = activeTab === 'budget' ? budgetVenituri : venituri;
    const displayCheltuieli = activeTab === 'budget' ? budgetCheltuieli : data.cheltuieli;
    const displayCategories = activeTab === 'budget' ? budgetCategories : data.categories;

    const handleSaveBudgetTemplate = async (template: BudgetTemplate) => {
      // Update local state
      setBudgetTemplates({
        ...budgetTemplates,
        [template.year]: template
      });
      
      // Save to database if function provided
      if (onSaveBudgetTemplate && teamId) {
        try {
          const result = await onSaveBudgetTemplate(teamId, template);
          if (result.success) {
            alert("Template salvat cu succes!");
          } else {
            alert("Eroare la salvare: " + (result.error || "Eroare necunoscută"));
          }
        } catch (err) {
          console.error("Error saving budget template:", err);
          alert("Eroare la salvarea template-ului");
        }
      }
    };

    return (
      <React.Fragment>
        {showBudgetTemplateForm ? (
          <BudgetTemplateForm
            year={selectedYear}
            onClose={() => setShowBudgetTemplateForm(false)}
            onSave={handleSaveBudgetTemplate}
            initialTemplate={budgetTemplates[selectedYear]}
          />
        ) : (
          <div className="px-4 md:px-8 py-4 md:py-6" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro", Roboto, sans-serif' }}>
            {selectedCategory ? (
              <CategoryDetail
                categoryName={selectedCategory}
                onBack={() => setSelectedCategory(null)}
                selectedYear={selectedYear}
                selectedCurrency={selectedCurrency}
              />
            ) : (
              <React.Fragment>
                {/* Tabs and Selectors Row */}
                <div className="flex flex-wrap items-center justify-between mb-6">
                  {/* Tabs */}
                  <div className="inline-flex bg-white rounded-full p-1 shadow-sm border border-gray-100">
                    <button
                      onClick={() => setActiveTab('expenses')}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                        activeTab === 'expenses'
                          ? 'bg-[#0EA5E9] text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {activeTab === 'expenses' && <Check size={14} className="text-white" />}
                      P&L Realizat
                    </button>
                    <button
                      onClick={() => setActiveTab('budget')}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                        activeTab === 'budget'
                          ? 'bg-[#0EA5E9] text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {activeTab === 'budget' && <Check size={14} className="text-white" />}
                      Buget
                    </button>
                    <button
                      onClick={() => setActiveTab('delta')}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                        activeTab === 'delta'
                          ? 'bg-[#0EA5E9] text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {activeTab === 'delta' && <Check size={14} className="text-white" />}
                      Delta
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {activeTab === 'budget' ? (
                      <>
                        <button
                          onClick={() => setShowBudgetTemplateForm(true)}
                          className="px-5 py-2 bg-[#46ECD580] text-[#0D9488] rounded-full text-sm font-medium hover:bg-[#46ECD5] transition-colors whitespace-nowrap"
                        >
                          Template Buget {selectedYear}
                        </button>
                        <CustomSelect
                          value={selectedYear}
                          onChange={(value) => {
                            setSelectedYear(value);
                            onYearChange?.(value);
                          }}
                          options={[{ value: '2026', label: '2026' }, { value: '2025', label: '2025' }, { value: '2024', label: '2024' }]}
                          className="w-24 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent"
                        />
                        <button
                          onClick={handleBudgetUpload}
                          disabled={uploadingBudget}
                          className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingBudget ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          {uploadingBudget ? 'Se încarcă...' : `Încarcă buget ${selectedYear}`}
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept=".xlsx,.xls"
                        />
                      </>
                    ) : (
                      <>
                        <CustomSelect
                          value={selectedCurrency}
                          onChange={(value) => setSelectedCurrency(value as 'EUR' | 'RON')}
                          options={[{ value: 'EUR', label: 'EUR' }, { value: 'RON', label: 'RON' }]}
                          className="w-24 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent"
                        />
                        <CustomSelect
                          value={selectedYear}
                          onChange={(value) => {
                            setSelectedYear(value);
                            onYearChange?.(value);
                          }}
                          options={[{ value: '2026', label: '2026' }, { value: '2025', label: '2025' }, { value: '2024', label: '2024' }]}
                          className="w-24 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent"
                        />
                      </>
                    )}
                  </div>
                </div>

                {activeTab === 'delta' ? (
                  <DeltaView
                    selectedMonth={deltaSelectedMonth}
                    selectedYear={deltaSelectedYear}
                    selectedCurrency={selectedCurrency}
                    venituri={venituri}
                    cheltuieli={data.cheltuieli}
                    categories={data.categories}
                    onMonthYearChange={(month, year) => {
                      setDeltaSelectedMonth(month);
                      setDeltaSelectedYear(year);
                    }}
                    onCurrencyChange={setSelectedCurrency}
                  />
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Row */}
                    <div 
                      style={{ 
                        ...getGridLayout(),
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: activeTab === 'budget' ? '#E5E7EB80' : '#FAFAFA'
                      }}
                    >
                      <div className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 pl-6">
                        {selectedCurrency} <CurrencyFlag />
                      </div>
                      {getMonthLabels().map((month, index) => (
                        <div 
                          key={index} 
                          className="py-3 text-center text-xs font-semibold uppercase tracking-wider"
                          style={{
                            ...(activeTab === 'budget' ? {} : getColumnStyle(index, true)),
                            color: activeTab === 'budget' ? '#374151' : (index < 5 ? '#9CA3AF' : '#374151')
                          }}
                        >
                          {month}
                        </div>
                      ))}
                      <div className={`py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider ${activeTab === 'budget' ? '' : 'bg-[#E6F4EA]'}`}>
                        YTD
                      </div>
                      {activeTab === 'budget' && (
                        <div className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          TOTAL
                        </div>
                      )}
                    </div>

                    {/* Venituri Row */}
                    {!cheltuieliExpanded && (
                      <div 
                        className="group transition-colors hover:bg-gray-50"
                        style={{ 
                          ...getGridLayout(),
                          borderBottom: '1px solid #E5E7EB'
                        }}
                      >
                        <div className="px-6 py-3 text-sm font-semibold text-gray-900">
                          Venituri
                        </div>
                        {getYearData(displayVenituri).map((amount, index) => (
                          <div 
                            key={index} 
                            className="py-3 text-center text-sm text-[#3B82F6] font-medium"
                            style={getColumnStyle(index)}
                          >
                            {formatAmount(amount)}
                          </div>
                        ))}
                        <div className={`py-3 text-center text-sm font-semibold text-[#3B82F6] ${activeTab === 'budget' ? 'bg-[#FB923C4D]' : 'bg-[#E6F4EA]'}`}>
                          {formatAmount(calculateTotal(getYearData(displayVenituri)))}
                        </div>
                        {activeTab === 'budget' && (
                          <div className="py-3 text-center text-sm font-semibold text-[#3B82F6] bg-[#E6F4EA]">
                            {formatAmount(calculateTotal(getYearData(displayVenituri)))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cheltuieli Header */}
                    <div 
                      className="group transition-colors hover:bg-gray-50 cursor-pointer"
                      style={{ 
                        ...getGridLayout(),
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: '#FFFFFF'
                      }}
                      onClick={() => setCheltuieliExpanded(!cheltuieliExpanded)}
                    >
                      <div className="px-6 py-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                        {cheltuieliExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        Cheltuieli
                      </div>
                      {getYearData(displayCheltuieli).map((amount, index) => (
                        <div 
                          key={index} 
                          className="py-3 text-center text-sm font-bold text-gray-900"
                          style={getColumnStyle(index)}
                        >
                          {formatAmount(amount)}
                        </div>
                      ))}
                      <div className={`py-3 text-center text-sm font-semibold text-gray-900 ${activeTab === 'budget' ? 'bg-[#FB923C4D]' : 'bg-[#E6F4EA]'}`}>
                        {formatAmount(calculateTotal(getYearData(displayCheltuieli)))}
                      </div>
                      {activeTab === 'budget' && (
                        <div className="py-3 text-center text-sm font-semibold text-gray-900 bg-[#E6F4EA]">
                          {formatAmount(calculateTotal(getYearData(displayCheltuieli)))}
                        </div>
                      )}
                    </div>

                    {/* Categories */}
                    {cheltuieliExpanded && displayCategories.map((category, catIndex) => (
                      <div key={catIndex}>
                        <div 
                          className="group transition-colors hover:bg-gray-50 cursor-pointer"
                          style={{ 
                            ...getGridLayout(),
                            borderBottom: '1px solid #F3F4F6'
                          }}
                          onClick={() => {
                            if (expandedCategories.includes(category.name)) {
                              setExpandedCategories(expandedCategories.filter(c => c !== category.name));
                            } else {
                              setExpandedCategories([...expandedCategories, category.name]);
                            }
                          }}
                        >
                          <div className="px-6 py-3 text-sm font-medium text-gray-800 flex items-center gap-2 pl-10">
                            {category.subcategories && category.subcategories.length > 0 && (
                              expandedCategories.includes(category.name) ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                            )}
                            {category.name}
                          </div>
                          
                          {getYearData(category.values).map((amount, index) => (
                            <div 
                              key={index} 
                              className="py-3 text-center text-sm text-gray-900 font-medium cursor-pointer hover:text-[#0EA5E9]"
                              style={getColumnStyle(index)}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (amount > 0) setShowInvoicesPopup({ category: category.name, month: getMonthLabels()[index], monthIndex: index });
                              }}
                            >
                              {amount > 0 ? formatAmount(amount) : 0}
                            </div>
                          ))}
                          
                          <div className={`py-3 text-center text-sm font-medium text-gray-900 ${activeTab === 'budget' ? 'bg-[#FB923C4D]' : 'bg-[#E6F4EA]'}`}>
                            {formatAmount(calculateTotal(getYearData(category.values)))}
                          </div>
                          {activeTab === 'budget' && (
                            <div className="py-3 text-center text-sm font-medium text-gray-900 bg-[#E6F4EA]">
                              {formatAmount(calculateTotal(getYearData(category.values)))}
                            </div>
                          )}
                        </div>

                        {/* Subcategories */}
                        {expandedCategories.includes(category.name) && category.subcategories?.map((subcat, subIndex) => (
                          <div 
                            key={`${catIndex}-${subIndex}`}
                            className="group transition-colors hover:bg-gray-50"
                            style={{ 
                              ...getGridLayout(),
                              borderBottom: '1px solid #F3F4F6',
                              backgroundColor: '#F9FAFB'
                            }}
                          >
                            <div className="px-6 py-2 text-xs text-gray-500 pl-16 hover:text-[#0EA5E9]">
                              {subcat.name}
                            </div>
                            
                            {getYearData(subcat.values).map((amount, index) => (
                              <div 
                                key={index} 
                                className="py-2 text-center text-xs text-gray-500 hover:text-[#0EA5E9]"
                                style={getColumnStyle(index)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (amount > 0) setShowInvoicesPopup({ category: subcat.name, month: getMonthLabels()[index], monthIndex: index });
                                }}
                              >
                                {amount > 0 ? formatAmount(amount) : 0}
                              </div>
                            ))}
                            
                            <div className={`py-2 text-center text-xs font-medium text-gray-600 hover:text-[#0EA5E9] ${activeTab === 'budget' ? 'bg-[#FB923C4D]' : 'bg-[#E6F4EA]'}`}>
                              {formatAmount(calculateTotal(getYearData(subcat.values)))}
                            </div>
                            {activeTab === 'budget' && (
                              <div className="py-2 text-center text-xs font-medium text-gray-600 bg-[#E6F4EA] hover:text-[#0EA5E9]">
                                {formatAmount(calculateTotal(getYearData(subcat.values)))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Profit Row */}
                    {!cheltuieliExpanded && (
                      <div 
                        style={{ 
                          ...getGridLayout(),
                          borderTop: '2px solid #E5E7EB',
                          backgroundColor: '#FFFFFF'
                        }}
                      >
                        <div className="px-6 py-3 text-sm font-bold text-gray-900">
                          Profit
                        </div>
                        {getYearData(displayVenituri).map((v, index) => {
                          const profit = v - getYearData(displayCheltuieli)[index];
                          return (
                            <div 
                              key={index} 
                              className={`py-3 text-center text-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                              style={getColumnStyle(index)}
                            >
                              {formatAmount(profit)}
                            </div>
                          );
                        })}
                        {(() => {
                          const totalProfit = calculateTotal(getYearData(displayVenituri)) - calculateTotal(getYearData(displayCheltuieli));
                          return (
                            <>
                              <div className={`py-3 text-center text-sm font-bold ${
                                activeTab === 'budget' 
                                  ? (totalProfit >= 0 ? 'text-emerald-700 bg-[#FB923C4D]' : 'text-rose-700 bg-[#FB923C4D]')
                                  : (totalProfit >= 0 ? 'text-emerald-700 bg-[#D1FAE5]' : 'text-rose-700 bg-rose-100')
                              }`}>
                                {formatAmount(totalProfit)}
                              </div>
                              {activeTab === 'budget' && (
                                <div className={`py-3 text-center text-sm font-bold ${totalProfit >= 0 ? 'text-emerald-700 bg-[#D1FAE5]' : 'text-rose-700 bg-rose-100'}`}>
                                  {formatAmount(totalProfit)}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Invoices Popup */}
                {showInvoicesPopup && (
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInvoicesPopup(null)}>
                    <div 
                      className="bg-white rounded-[20px] shadow-2xl w-[900px] max-h-[90vh] flex flex-col mx-4 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-white">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 mb-1">
                            Facturi – {showInvoicesPopup.category}
                          </h2>
                          <p className="text-sm text-gray-500">
                            {showInvoicesPopup.month.charAt(0) + showInvoicesPopup.month.slice(1).toLowerCase()} {
                              activeTab === 'budget' 
                                ? selectedYear 
                                : (showInvoicesPopup.monthIndex < 12 ? parseInt(selectedYear) - 1 : selectedYear)
                            }
                          </p>
                        </div>
                        <button
                          onClick={() => setShowInvoicesPopup(null)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                        >
                          <X size={20} className="text-gray-400" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="overflow-y-auto flex-1 p-8 bg-white">
                        {popupLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                          </div>
                        ) : (() => {
                          const realInvoices = popupInvoices.filter(i => i.type === 'reale');
                          const recurrentInvoices = popupInvoices.filter(i => i.type === 'recurente');
                          const total = popupInvoices.reduce((sum, i) => sum + i.amount, 0);

                          return (
                            <div className="space-y-8">
                              {realInvoices.length > 0 && (
                                <div>
                                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                    DECONTURI REALE
                                  </div>
                                  <div className="space-y-4">
                                    {realInvoices.map(invoice => (
                                      <div key={invoice.id} className="grid grid-cols-[100px_200px_1fr_120px] gap-4 items-center group hover:bg-gray-50/50 py-4 border-b border-gray-100 last:border-0 transition-colors">
                                        <div className="text-sm text-gray-900">
                                          {new Date(invoice.date).toLocaleDateString('ro-RO')}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {invoice.supplier}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {invoice.description}
                                        </div>
                                        <div className="text-sm font-bold text-gray-900 text-right">
                                          {formatAmount(invoice.amount)} Lei
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {recurrentInvoices.length > 0 && (
                                <div>
                                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-lg mb-4">
                                    DECONTURI RECURENTE
                                  </div>
                                  <div className="space-y-4 px-2">
                                    {recurrentInvoices.map(invoice => (
                                      <div key={invoice.id} className="grid grid-cols-[100px_200px_1fr_120px] gap-4 items-center group hover:bg-gray-50/50 py-4 border-b border-gray-100 last:border-0 transition-colors">
                                        <div className="text-sm text-gray-900">
                                          {new Date(invoice.date).toLocaleDateString('ro-RO')}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {invoice.supplier}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {invoice.description}
                                        </div>
                                        <div className="text-sm font-bold text-gray-900 text-right">
                                          {formatAmount(invoice.amount)} Lei
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {popupInvoices.length === 0 && !popupLoading && (
                                <div className="text-center py-12 text-gray-500">
                                  Nu există facturi pentru această perioadă.
                                </div>
                              )}

                              {/* Total */}
                              {popupInvoices.length > 0 && (
                                <div className="border-t border-gray-100 mt-8 pt-6 flex justify-end items-center gap-8 px-4">
                                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TOTAL</span>
                                  <span className="text-xl font-bold text-gray-900">{formatAmount(total)} Lei</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            )}
          </div>
        )}
      </React.Fragment>
    );
  }
);

export default PLStatement;