// @ts-nocheck
import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { RefreshCw, Download, Check, Upload, ChevronRight, ChevronDown, X } from 'lucide-react';
import { CustomSelect } from './customselect';
import { CategoryDetail } from './categorydetail';
import { DeltaView } from './deltaview';
import { MonthYearPicker } from './monthyearpicker';
import { BudgetTemplateForm, BudgetTemplate } from './budgettemplateform';

interface PLStatementProps {
  onBack: () => void;
  venituri: number[];
  setVenituri: (venituri: number[]) => void;
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

export const PLStatement = forwardRef<{ resetCategory: () => void }, PLStatementProps>(
  ({ onBack, venituri, setVenituri }, ref) => {
    const [activeTab, setActiveTab] = useState<'expenses' | 'budget' | 'delta'>('expenses');
    const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'RON'>('EUR');
    const [selectedYear, setSelectedYear] = useState('2025');
    const [deltaSelectedMonth, setDeltaSelectedMonth] = useState(11); // December (0-indexed)
    const [deltaSelectedYear, setDeltaSelectedYear] = useState(2025);
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
    const [showInvoicesPopup, setShowInvoicesPopup] = useState<{ category: string, month: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedBudgets, setUploadedBudgets] = useState<{[year: string]: string}>({
      '2024': 'Buget_2024.xlsx'
    });
    const [showBudgetTemplateForm, setShowBudgetTemplateForm] = useState(false);
    const [budgetTemplates, setBudgetTemplates] = useState<{[year: string]: BudgetTemplate}>({
      '2025': {
        year: '2025',
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

    // Mock data structure - 24 months: first 12 for 2024, last 12 for 2025
    const data = {
      cheltuieli: [
        // 2024 data
        40000, 42000, 48000, 52000, 54000, 58000, 62000, 55000, 57000, 80000, 54000, 65000,
        // 2025 data
        44225, 44692, 50851, 57335, 59991, 63038, 67785, 58623, 60449, 85126, 58228, 70000
      ],
      categories: [
        { 
          name: '1. Echipa', 
          values: [
            // 2024
            35000, 36000, 42000, 44000, 46000, 48000, 54000, 47000, 45000, 42000, 27000, 38000,
            // 2025
            37797, 39318, 45365, 48156, 50759, 52224, 59301, 50752, 47997, 45761, 29946, 41000
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
            // 2024
            900, 700, 1000, 2400, 2300, 3000, 2000, 1300, 750, 750, 0, 1200,
            // 2025
            1001, 761, 1118, 2625, 2485, 3308, 2157, 1379, 790, 790, 0, 1500
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
            // 2024
            500, 800, 500, 2500, 2300, 3300, 2800, 3100, 2900, 3300, 2400, 2800,
            // 2025
            533, 872, 526, 2736, 2483, 3574, 2968, 3315, 3037, 3484, 2561, 3100
          ],
          subcategories: [
            { name: '3.1 Cloud hosting', values: [300, 500, 300, 1500, 1300, 1800, 1500, 1800, 1600, 1800, 1200, 1500, 323, 546, 315, 1642, 1404, 1951, 1590, 1928, 1674, 1900, 1281, 1600] },
            { name: '3.2 Software licenses', values: [200, 300, 200, 1000, 1000, 1500, 1300, 1300, 1300, 1500, 1200, 1300, 210, 326, 210, 1094, 1079, 1623, 1378, 1387, 1363, 1584, 1280, 1500] },
          ]
        },
        { 
          name: '4. Sediu', 
          values: [
            // 2024
            4500, 3500, 3100, 3300, 3200, 2900, 3000, 2900, 3100, 28000, 3900, 4200,
            // 2025
            4811, 3741, 3330, 3582, 3465, 3078, 3214, 3096, 3338, 30110, 4197, 4500
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
            // 2024
            80, 0, 320, 35, 500, 380, 50, 75, 1350, 1300, 230, 400,
            // 2025
            83, 0, 342, 40, 545, 408, 53, 81, 1419, 1365, 246, 450
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
            // 2024
            0, 0, 160, 180, 240, 420, 85, 0, 3600, 3400, 20000, 18000,
            // 2025
            0, 0, 170, 196, 254, 446, 92, 0, 3868, 3616, 21278, 19450
          ],
          subcategories: [
            { name: '6.1 Asigurari', values: [0, 0, 160, 180, 240, 420, 85, 0, 600, 400, 0, 0, 0, 0, 170, 196, 254, 446, 92, 0, 618, 416, 0, 0] },
            { name: '6.2 Taxe si impozite', values: [0, 0, 0, 0, 0, 0, 0, 0, 3000, 3000, 20000, 18000, 0, 0, 0, 0, 0, 0, 0, 0, 3250, 3200, 21278, 19450] },
          ]
        }
      ]
    };

    // Budget data - slightly higher than actual for comparison
    const budgetVenituri = venituri.map(v => v * 1.05);
    const budgetCheltuieli = data.cheltuieli.map(c => c * 0.95);
    const budgetCategories = data.categories.map(cat => ({
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

    // Get year offset for data (0 for 2024, 12 for 2025)
    const getYearOffset = () => {
      return selectedYear === '2024' ? 0 : 12;
    };

    // Get the 13 months of data for the fiscal year (Aug-Aug)
    const getYearData = (values: number[]) => {
      if (selectedYear === '2025') {
        // For FY 2025: Aug 2024 (index 7) + Sep-Dec 2024 (index 8-11) + Jan-Aug 2025 (index 12-19) = 13 months
        return [...values.slice(7, 12), ...values.slice(12, 20)];
      } else {
        // For FY 2024: Jul 2024 (index 6) + Aug-Dec 2024 (index 7-11) + Jan-Jun 2024 (index 0-6) = 13 months
        return [...values.slice(6, 12), ...values.slice(0, 7)];
      }
    };

    // Get month labels for the 13-month fiscal year view (Aug-Aug)
    const getMonthLabels = () => {
      const fiscalMonths = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug'];
      return fiscalMonths;
    };

    // Determine if an index is the current month (Aug 2025)
    const isCurrentMonth = (index: number) => {
      // Current month is Aug 2025 (last Aug in fiscal year)
      // In fiscal year view (Aug-Aug), the last August is at index 12
      return index === 12;
    };

    // Determine if an index is from last year (Aug-Dec 2024)
    const isLastYear = (index: number) => {
      // Last year months: Aug-Dec 2024 (indices 0-4) - includes Dec!
      return index >= 0 && index <= 4;
    };

    // Get column styles for Apple-style frosted effect
    const getColumnStyle = (index: number, isHeader: boolean = false) => {
      const isCurrent = isCurrentMonth(index);
      const isLast = isLastYear(index);
      
      if (isCurrent) {
        // Luna curentă: gradient portocaliu pal frosted + border
        return {
          background: isHeader 
            ? 'linear-gradient(180deg, rgba(251,146,60,0.15) 0%, rgba(251,146,60,0.10) 100%)'
            : 'linear-gradient(180deg, rgba(251,146,60,0.10) 0%, rgba(251,146,60,0.15) 100%)',
          borderLeft: '1px solid rgba(251,146,60,0.3)',
          borderRight: '1px solid rgba(251,146,60,0.3)',
          fontWeight: 600
        };
      } else if (isLast) {
        // Lunile din anul trecut: fundal albastru frosted glass Apple style
        return {
          background: isHeader
            ? 'linear-gradient(180deg, rgba(147,197,253,0.15) 0%, rgba(147,197,253,0.10) 100%)'
            : 'linear-gradient(180deg, rgba(147,197,253,0.10) 0%, rgba(147,197,253,0.15) 100%)',
          borderRight: '1px solid rgba(147,197,253,0.3)'
        };
      }
      return {};
    };

    // Group monthly data into quarters (24 months -> 8 quarters)
    const groupByQuarter = (values: number[]) => {
      return [
        // 2024 quarters (first 12 months)
        values[0] + values[1] + values[2],        // Q1-24: Jan-Mar 2024
        values[3] + values[4] + values[5],        // Q2-24: Apr-Jun 2024
        values[6] + values[7] + values[8],        // Q3-24: Jul-Sep 2024
        values[9] + values[10] + values[11],      // Q4-24: Oct-Dec 2024
        // 2025 quarters (last 12 months)
        values[12] + values[13] + values[14],     // Q1-25: Jan-Mar 2025
        values[15] + values[16] + values[17],     // Q2-25: Apr-Jun 2025
        values[18] + values[19] + values[20],     // Q3-25: Jul-Sep 2025
        values[21] + values[22] + values[23]      // Q4-25: Oct-Dec 2025
      ];
    };

    const getDisplayValues = (values: number[]) => {
      return viewMode === 'monthly' ? values : groupByQuarter(values);
    };

    const toggleCategory = (categoryName: string) => {
      setExpandedCategories(prev =>
        prev.includes(categoryName)
          ? prev.filter(name => name !== categoryName)
          : [...prev, categoryName]
      );
    };

    const toggleVATDeductibility = (categoryName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setVatDeductibility(prev => ({
        ...prev,
        [categoryName]: !prev[categoryName]
      }));
    };

    const handleBudgetUpload = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setUploadedBudgets(prev => ({
          ...prev,
          [selectedYear]: file.name
        }));
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

    // Mock invoices data for popup
    const mockInvoices = [
      { id: 1, date: '2025-01-05', supplier: 'AWS Europe SARL', description: 'Cloud hosting infrastructure - Ianuarie', amount: 1500, invoiceNumber: 'AWS-2025-001', status: 'Final' as const },
      { id: 2, date: '2025-01-12', supplier: 'Microsoft Ireland Ltd', description: 'Office 365 Business Premium - 50 licente', amount: 2300, invoiceNumber: 'MS-2025-047', status: 'Final' as const },
      { id: 3, date: '2025-01-20', supplier: 'Adobe Systems Software', description: 'Creative Cloud All Apps - 15 users', amount: 850, invoiceNumber: 'INV-85479', status: 'Final' as const },
      { id: 4, date: '2025-01-28', supplier: 'Google Ireland Ltd', description: 'Google Workspace Business Standard', amount: 420, invoiceNumber: 'G-2025-123', status: 'Recurent' as const },
      { id: 5, date: '2025-01-30', supplier: 'Orange Romania SA', description: 'Abonament telefonie - Ianuarie', amount: 890, invoiceNumber: 'ORG-2025-0189', status: 'Recurent' as const },
    ];

    const handleSaveBudgetTemplate = (template: BudgetTemplate) => {
      setBudgetTemplates({
        ...budgetTemplates,
        [template.year]: template
      });
    };

    return (
      <>
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
              <>
                {/* Tabs and Selectors Row */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Tabs */}
              <div className="inline-flex bg-white/70 backdrop-blur-xl rounded-full p-1.5 shadow-lg border border-gray-200/50">
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`flex-initial px-6 md:px-8 py-2.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === 'expenses'
                      ? 'bg-gray-200/80 text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                      : 'bg-transparent text-gray-500 hover:text-gray-900'
                  }`}
                  style={{ fontWeight: activeTab === 'expenses' ? 600 : 500 }}
                >
                  {activeTab === 'expenses' && (
                    <span className="bg-white rounded-full p-0.5 flex items-center justify-center">
                      <Check size={12} className="text-gray-900" />
                    </span>
                  )}
                  P&L Realizat
                </button>
                <button
                  onClick={() => setActiveTab('budget')}
                  className={`flex-initial px-6 md:px-8 py-2.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === 'budget'
                      ? 'bg-gray-200/80 text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                      : 'bg-transparent text-gray-500 hover:text-gray-900'
                  }`}
                  style={{ fontWeight: activeTab === 'budget' ? 600 : 500 }}
                >
                  {activeTab === 'budget' && (
                    <span className="bg-white rounded-full p-0.5 flex items-center justify-center">
                      <Check size={12} className="text-gray-900" />
                    </span>
                  )}
                  Buget
                </button>
                <button
                  onClick={() => setActiveTab('delta')}
                  className={`flex-initial px-6 md:px-8 py-2.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === 'delta'
                      ? 'bg-gray-200/80 text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                      : 'bg-transparent text-gray-500 hover:text-gray-900'
                  }`}
                  style={{ fontWeight: activeTab === 'delta' ? 600 : 500 }}
                >
                  {activeTab === 'delta' && (
                    <span className="bg-white rounded-full p-0.5 flex items-center justify-center">
                      <Check size={12} className="text-gray-900" />
                    </span>
                  )}
                  Delta
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Template Buget Button - Only show in budget tab */}
              {activeTab === 'budget' && (
                <button
                  onClick={() => setShowBudgetTemplateForm(true)}
                  className="px-6 py-3 border border-teal-300/50 bg-teal-50/70 backdrop-blur-xl rounded-full text-teal-700 hover:bg-teal-100/70 focus:outline-none transition-all shadow-[0_2px_8px_rgba(13,148,136,0.08)] hover:shadow-[0_4px_12px_rgba(13,148,136,0.12)]"
                  style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                >
                  Template Buget {selectedYear}
                </button>
              )}

              {/* Currency Select - Only show for expenses tab */}
              {activeTab === 'expenses' && (
              <div className="flex gap-2">
                <CustomSelect
                  value={selectedCurrency}
                  onChange={(value) => setSelectedCurrency(value as 'EUR' | 'RON')}
                  options={['EUR', 'RON']}
                  className="w-32 px-6 py-3 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-full text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                />
              </div>
              )}

              {/* Date Selector - Only show for non-delta tabs */}
              {activeTab !== 'delta' && (
                viewType !== 'anual' && (
                  <div className="w-28">
                    <CustomSelect
                      value={selectedYear}
                      onChange={setSelectedYear}
                      options={['2025', '2024', '2023']}
                      className="w-full px-6 py-3 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-full text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                )
              )}

              {/* Budget Upload Button - Only show in budget tab */}
              {activeTab === 'budget' && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  {uploadedBudgets[selectedYear] ? (
                    // Show uploaded budget card
                    <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-green-50/70 backdrop-blur-xl border border-green-300/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <Check size={16} className="text-green-700 flex-shrink-0" />
                      <span className="text-green-700" style={{ fontSize: '0.9375rem', fontWeight: 400 }}>
                        {uploadedBudgets[selectedYear]}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={handleModifyBudget}
                          className="px-4 py-1.5 rounded-full bg-white/70 hover:bg-gray-100/70 text-gray-700 border border-gray-300/50 transition-all"
                          style={{ fontSize: '0.8125rem', fontWeight: 400 }}
                        >
                          Modifică
                        </button>
                        <button
                          onClick={handleDeleteBudget}
                          className="p-1.5 rounded-full bg-white/70 hover:bg-red-50/70 text-gray-600 hover:text-red-600 border border-gray-300/50 hover:border-red-300/50 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Show upload button
                    <button
                      onClick={handleBudgetUpload}
                      className="px-6 py-3 rounded-full transition-all bg-white/70 backdrop-blur-xl text-gray-700 border border-gray-300/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center gap-2"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    >
                      <Upload size={16} />
                      Încarcă buget {selectedYear}
                    </button>
                  )}
                </>
              )}
            </div>



            {/* P&L Table */}
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
                onCurrencyChange={(currency) => setSelectedCurrency(currency)}
              />
            ) : activeTab === 'budget' ? (
              <div className="overflow-x-auto">
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
                  {/* Budget Header Row */}
                  <div 
                    className="bg-gray-50/70 backdrop-blur-xl px-6 py-3 border-b border-gray-200/50"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '200px repeat(12,minmax(50px,1fr)) minmax(50px,auto) minmax(50px,auto)',
                      gap: '1rem',
                      paddingTop: '14px',
                      paddingBottom: '10px'
                    }}
                  >
                    <div className="text-left text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      <div className="flex items-center gap-2">
                        <CustomSelect
                          value={selectedCurrency}
                          onChange={(value) => setSelectedCurrency(value as 'EUR' | 'RON')}
                          options={['EUR', 'RON']}
                          className="w-20 px-3 py-1.5 border border-gray-300/50 bg-white/70 backdrop-blur-sm rounded-lg text-gray-900 focus:outline-none focus:border-teal-400 transition-all"
                          style={{ fontSize: '0.75rem', fontWeight: 500 }}
                        />
                        <CurrencyFlag />
                      </div>
                    </div>
                    {['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((month, index) => {
                      const currentDate = new Date();
                      const currentMonth = currentDate.getMonth();
                      const isCurrentMonth = index === currentMonth;
                      return (
                        <div
                          key={index}
                          className="text-center text-gray-600"
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textDecoration: isCurrentMonth ? 'underline' : 'none'
                          }}
                        >
                          {month}
                        </div>
                      );
                    })}
                    <div className="text-center text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      YTD
                    </div>
                    <div className="text-center text-gray-600" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      TOTAL
                    </div>
                  </div>

                  {/* Venituri Row - Only show when not expanded */}
                  {!cheltuieliExpanded && (
                  <div 
                    className="px-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '200px repeat(12,minmax(50px,1fr)) minmax(50px,auto) minmax(50px,auto)',
                      gap: '1rem',
                      alignItems: 'center'
                    }}
                  >
                    <div className="py-3" style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                      Venituri
                    </div>
                    {(() => {
                      const offset = getYearOffset();
                      const yearData = budgetVenituri.slice(offset, offset + 12);
                      const currentDate = new Date();
                      const currentMonth = currentDate.getMonth();
                      return yearData.map((amount, index) => {
                        const isCurrentMonth = index === currentMonth;
                        return (
                          <div 
                            key={index} 
                            className="py-3 text-right" 
                            style={{ 
                              fontSize: '15px', 
                              fontWeight: 500, 
                              color: '#4B5563',
                              textDecoration: isCurrentMonth ? 'underline' : 'none'
                            }}
                          >
                            {amount > 0 ? formatAmount(amount) : '0'}
                          </div>
                        );
                      });
                    })()}
                    <div className="py-3 text-right" style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                      {(() => {
                        const offset = getYearOffset();
                        const currentDate = new Date();
                        const currentMonth = currentDate.getMonth();
                        const ytdData = budgetVenituri.slice(offset, offset + currentMonth + 1);
                        return formatAmount(calculateTotal(ytdData));
                      })()}
                    </div>
                    <div className="py-3 text-right" style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                      {(() => {
                        const offset = getYearOffset();
                        const yearData = budgetVenituri.slice(offset, offset + 12);
                        return formatAmount(calculateTotal(yearData));
                      })()}
                    </div>
                  </div>
                  )}

                  {/* Cheltuieli Row */}
                  <div 
                    onClick={() => setCheltuieliExpanded(!cheltuieliExpanded)}
                    className="px-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors cursor-pointer"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '200px repeat(12,minmax(50px,1fr)) minmax(50px,auto) minmax(50px,auto)',
                      gap: '1rem',
                      alignItems: 'center'
                    }}
                  >
                    <div className="py-3 flex items-center gap-2" style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                      Cheltuieli
                      {cheltuieliExpanded ? (
                        <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
                      )}
                    </div>
                    {(() => {
                      const offset = getYearOffset();
                      const yearData = budgetCheltuieli.slice(offset, offset + 12);
                      const currentDate = new Date();
                      const currentMonth = currentDate.getMonth();
                      return yearData.map((amount, index) => {
                        const isCurrentMonth = index === currentMonth;
                        return (
                          <div 
                            key={index} 
                            className="py-3 text-right" 
                            style={{ 
                              fontSize: '15px', 
                              fontWeight: 500, 
                              color: '#4B5563',
                              textDecoration: isCurrentMonth ? 'underline' : 'none'
                            }}
                          >
                            {formatAmount(amount)}
                          </div>
                        );
                      });
                    })()}
                    <div className="py-3 text-right" style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                      {(() => {
                        const offset = getYearOffset();
                        const currentDate = new Date();
                        const currentMonth = currentDate.getMonth();
                        const ytdData = budgetCheltuieli.slice(offset, offset + currentMonth + 1);
                        return formatAmount(calculateTotal(ytdData));
                      })()}
                    </div>
                    <div className="py-3 text-right" style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                      {(() => {
                        const offset = getYearOffset();
                        const yearData = budgetCheltuieli.slice(offset, offset + 12);
                        return formatAmount(calculateTotal(yearData));
                      })()}
                    </div>
                  </div>

                  {/* Profit Row - Only show when not expanded */}
                  {!cheltuieliExpanded && (
                  <div 
                    className="px-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '200px repeat(12,minmax(50px,1fr)) minmax(50px,auto) minmax(50px,auto)',
                      gap: '1rem',
                      alignItems: 'center'
                    }}
                  >
                    <div className="py-3" style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                      Profit
                    </div>
                    {(() => {
                      const offset = getYearOffset();
                      const venituriYear = budgetVenituri.slice(offset, offset + 12);
                      const cheltuieliYear = budgetCheltuieli.slice(offset, offset + 12);
                      const currentDate = new Date();
                      const currentMonth = currentDate.getMonth();
                      return venituriYear.map((venituriAmount, index) => {
                        const cheltuieliAmount = cheltuieliYear[index];
                        const profit = venituriAmount - cheltuieliAmount;
                        const isCurrentMonth = index === currentMonth;
                        return (
                          <div 
                            key={index} 
                            className="py-3 text-right" 
                            style={{ 
                              fontSize: '15px', 
                              fontWeight: 500, 
                              color: profit < 0 ? '#DC2626' : '#16A34A',
                              textDecoration: isCurrentMonth ? 'underline' : 'none'
                            }}
                          >
                            {profit < 0 ? '-' : ''}{formatAmount(Math.abs(profit))}
                          </div>
                        );
                      });
                    })()}
                    <div className="py-3 text-right" style={{ 
                      fontSize: '15px', 
                      fontWeight: 500, 
                      color: (() => {
                        const offset = getYearOffset();
                        const currentDate = new Date();
                        const currentMonth = currentDate.getMonth();
                        const ytdVenituri = budgetVenituri.slice(offset, offset + currentMonth + 1);
                        const ytdCheltuieli = budgetCheltuieli.slice(offset, offset + currentMonth + 1);
                        const ytdProfit = calculateTotal(ytdVenituri) - calculateTotal(ytdCheltuieli);
                        return ytdProfit < 0 ? '#DC2626' : '#16A34A';
                      })()
                    }}>
                      {(() => {
                        const offset = getYearOffset();
                        const currentDate = new Date();
                        const currentMonth = currentDate.getMonth();
                        const ytdVenituri = budgetVenituri.slice(offset, offset + currentMonth + 1);
                        const ytdCheltuieli = budgetCheltuieli.slice(offset, offset + currentMonth + 1);
                        const ytdProfit = calculateTotal(ytdVenituri) - calculateTotal(ytdCheltuieli);
                        return ytdProfit < 0 ? '-' + formatAmount(Math.abs(ytdProfit)) : formatAmount(ytdProfit);
                      })()}
                    </div>
                    <div className="py-3 text-right" style={{ 
                      fontSize: '15px', 
                      fontWeight: 500, 
                      color: (() => {
                        const offset = getYearOffset();
                        const venituriYear = budgetVenituri.slice(offset, offset + 12);
                        const cheltuieliYear = budgetCheltuieli.slice(offset, offset + 12);
                        const totalProfit = calculateTotal(venituriYear) - calculateTotal(cheltuieliYear);
                        return totalProfit < 0 ? '#DC2626' : '#16A34A';
                      })()
                    }}>
                      {(() => {
                        const offset = getYearOffset();
                        const venituriYear = budgetVenituri.slice(offset, offset + 12);
                        const cheltuieliYear = budgetCheltuieli.slice(offset, offset + 12);
                        const totalProfit = calculateTotal(venituriYear) - calculateTotal(cheltuieliYear);
                        return totalProfit < 0 ? '-' + formatAmount(Math.abs(totalProfit)) : formatAmount(totalProfit);
                      })()}
                    </div>
                  </div>
                  )}

                  {/* Separator row - Only show when expanded */}
                  {cheltuieliExpanded && (
                  <div 
                    className="bg-[#E5E7EB]"
                    style={{ 
                      height: '8px'
                    }}
                  >
                  </div>
                  )}

                  {/* Category Rows with expandable subcategories - Only show when expanded */}
                  {cheltuieliExpanded && budgetCategories.map((category, catIndex) => (
                    <div key={catIndex}>
                      {/* Main Category Row */}
                      <div
                        onClick={() => toggleCategory(category.name)}
                        className="px-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors cursor-pointer"
                        style={{ 
                          display: 'grid',
                          gridTemplateColumns: '200px repeat(12,minmax(50px,1fr)) minmax(50px,auto) minmax(50px,auto)',
                          gap: '1rem',
                          alignItems: 'center'
                        }}
                      >
                        <div className="py-3 flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 250, color: '#4B5563', whiteSpace: 'nowrap' }}>
                          {category.subcategories && category.subcategories.length > 0 && (
                            expandedCategories.includes(category.name) ? (
                              <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight size={16} className="text-gray-500 flex-shrink-0" />
                            )
                          )}
                          {category.name}
                        </div>
                        {(() => {
                          const offset = getYearOffset();
                          const yearData = category.values.slice(offset, offset + 12);
                          const currentDate = new Date();
                          const currentMonth = currentDate.getMonth();
                          return yearData.map((amount, index) => {
                            const isCurrentMonth = index === currentMonth;
                            return (
                              <div 
                                key={index} 
                                className="py-3 text-right" 
                                style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 250, 
                                  color: '#4B5563',
                                  textDecoration: isCurrentMonth ? 'underline' : 'none'
                                }}
                              >
                                {amount > 0 ? formatAmount(amount) : amount}
                              </div>
                            );
                          });
                        })()}
                        <div className="py-3 text-right" style={{ fontSize: '13px', fontWeight: 250, color: '#1F2937' }}>
                          {(() => {
                            const offset = getYearOffset();
                            const currentDate = new Date();
                            const currentMonth = currentDate.getMonth();
                            const ytdData = category.values.slice(offset, offset + currentMonth + 1);
                            return formatAmount(calculateTotal(ytdData));
                          })()}
                        </div>
                        <div className="py-3 text-right" style={{ fontSize: '13px', fontWeight: 250, color: '#1F2937' }}>
                          {formatAmount(calculateTotal(category.values.slice(getYearOffset(), getYearOffset() + 12)))}
                        </div>
                      </div>

                      {/* Subcategories */}
                      {expandedCategories.includes(category.name) && category.subcategories && (
                        <div className="bg-gray-50/20">
                          {category.subcategories.map((subcat, subIndex) => (
                            <div
                              key={subIndex}
                              className="px-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/50 transition-colors"
                              style={{ 
                                display: 'grid',
                                gridTemplateColumns: '200px repeat(12,minmax(50px,1fr)) minmax(50px,auto) minmax(50px,auto)',
                                gap: '1rem',
                                alignItems: 'center'
                              }}
                            >
                              <div className="py-3 pl-8" style={{ fontSize: '12px', fontWeight: 150, color: '#6B7280', whiteSpace: 'nowrap' }}>
                                {subcat.name}
                              </div>
                              {(() => {
                                const offset = getYearOffset();
                                const yearData = subcat.values.slice(offset, offset + 12);
                                const currentDate = new Date();
                                const currentMonth = currentDate.getMonth();
                                return yearData.map((amount, index) => {
                                  const isCurrentMonth = index === currentMonth;
                                  return (
                                    <div 
                                      key={index}
                                      onClick={() => {
                                        if (amount > 0) {
                                          setShowInvoicesPopup({ 
                                            category: subcat.name, 
                                            month: ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][index]
                                          });
                                        }
                                      }}
                                      className={`py-3 text-right ${amount > 0 ? 'cursor-pointer hover:text-teal-600' : ''}`}
                                      style={{ 
                                        fontSize: '12px', 
                                        fontWeight: 150, 
                                        color: '#6B7280',
                                        textDecoration: isCurrentMonth ? 'underline' : 'none'
                                      }}
                                    >
                                      {amount > 0 ? formatAmount(amount) : amount}
                                    </div>
                                  );
                                });
                              })()}
                              <div className="py-3 text-right" style={{ fontSize: '12px', fontWeight: 150, color: '#4B5563' }}>
                                {(() => {
                                  const offset = getYearOffset();
                                  const currentDate = new Date();
                                  const currentMonth = currentDate.getMonth();
                                  const ytdData = subcat.values.slice(offset, offset + currentMonth + 1);
                                  return formatAmount(calculateTotal(ytdData));
                                })()}
                              </div>
                              <div className="py-3 text-right" style={{ fontSize: '12px', fontWeight: 150, color: '#4B5563' }}>
                                {formatAmount(calculateTotal(subcat.values.slice(getYearOffset(), getYearOffset() + 12)))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Expenses view - P&L Realizat with tree structure
              <div className="overflow-x-auto">
                <div className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
                  {/* Header Row */}
                  <div 
                    className="bg-[#FAFAFA] px-6 border-b border-gray-200/50"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: viewMode === 'monthly' 
                        ? '200px repeat(13,minmax(40px,1fr)) minmax(70px,auto)'
                        : '200px repeat(8,minmax(40px,1fr)) minmax(70px,auto)',
                      gap: '0.125rem',
                      paddingTop: '18px',
                      paddingBottom: '18px'
                    }}
                  >
                    <div className="text-left" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280' }}>
                      <div className="flex items-center gap-2">
                        <span>{selectedCurrency}</span>
                        <CurrencyFlag />
                      </div>
                    </div>
                    {viewMode === 'monthly' ? (
                      getMonthLabels().map((month, index) => {
                        const columnStyle = getColumnStyle(index, true);
                        return (
                          <div
                            key={index}
                            className="text-center"
                            style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: columnStyle.fontWeight || 600,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              color: '#6B7280',
                              paddingTop: '18px',
                              paddingBottom: '18px',
                              marginTop: '-18px',
                              marginBottom: '-18px',
                              ...columnStyle
                            }}
                          >
                            {month}
                          </div>
                        );
                      })
                    ) : (
                      quarters.map((quarter, index) => (
                        <div
                          key={index}
                          className="text-right"
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: '#6B7280',
                            borderLeft: index === 7 ? '2px solid #CED4DA' : 'none',
                            paddingLeft: index === 7 ? '0.5rem' : '0',
                            backgroundColor: index === 7 ? '#F8F9FA' : 'transparent'
                          }}
                        >
                          {quarter}
                        </div>
                      ))
                    )}
                    <div className="text-center" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', background: 'linear-gradient(180deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.08) 100%)', paddingTop: '18px', paddingBottom: '18px', paddingLeft: '0.5rem', paddingRight: '0.5rem', marginTop: '-18px', marginBottom: '-18px', marginLeft: '-0.5rem', marginRight: '-0.5rem' }}>
                      YTD
                    </div>
                  </div>

                  {/* Venituri Row - Only show when not expanded */}
                  {!cheltuieliExpanded && (
                  <div 
                    className="px-6 border-b border-gray-200/50 hover:bg-[#F1F3F5] transition-colors cursor-pointer"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: viewMode === 'monthly' 
                        ? '200px repeat(13,minmax(40px,1fr)) minmax(70px,auto)'
                        : '200px repeat(8,minmax(40px,1fr)) minmax(70px,auto)',
                      gap: '0.125rem',
                      alignItems: 'center',
                      minHeight: '48px'
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 400, color: '#212529', paddingTop: '10px', paddingBottom: '10px' }}>
                      Venituri
                    </div>
                    {viewMode === 'monthly' ? (
                      getYearData(venituri).map((amount, index) => {
                        const columnStyle = getColumnStyle(index);
                        // Calculate actual index in the venituri array for fiscal year (Aug-Aug)
                        const actualIndex = selectedYear === '2025' 
                          ? (index < 5 ? 7 + index : 12 + (index - 5)) // Aug-Dec 2024 (7-11) or Jan-Aug 2025 (12-19)
                          : (index < 6 ? 6 + index : index - 6); // Jul-Dec 2024 (6-11) or Jan-Jun 2024 (0-5)
                        return (
                          <input
                            key={index}
                            type="text"
                            value={amount > 0 ? formatAmount(amount) : ''}
                            onChange={(e) => handleVenituriChange(actualIndex, e.target.value)}
                            className="text-center bg-transparent border-none outline-none focus:bg-blue-50/30 transition-colors"
                            style={{
                              fontSize: '15px',
                              fontWeight: columnStyle.fontWeight || 400,
                              color: '#2563EB',
                              width: '100%',
                              paddingTop: '10px',
                              paddingBottom: '10px',
                              ...columnStyle
                            }}
                            placeholder="0"
                          />
                        );
                      })
                    ) : (
                      getDisplayValues(venituri).map((amount, index) => (
                        <div key={index} className="text-right" style={{ 
                          fontSize: '15px', 
                          fontWeight: 400, 
                          color: '#212529',
                          borderLeft: index === 7 ? '2px solid #CED4DA' : 'none',
                          paddingLeft: index === 7 ? '0.5rem' : '0',
                          backgroundColor: index === 7 ? '#F8F9FA' : 'transparent',
                          paddingTop: '10px',
                          paddingBottom: '10px'
                        }}>
                          {amount > 0 ? formatAmount(amount) : '0'}
                        </div>
                      ))
                    )}
                    <div className="text-right" style={{ 
                      fontSize: '15px', 
                      fontWeight: 400, 
                      color: 'rgba(0,0,0,0.85)',
                      background: 'linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.15) 100%)',
                      paddingLeft: '0.5rem',
                      paddingTop: '10px',
                      paddingBottom: '10px'
                    }}>
                      {viewMode === 'monthly' 
                        ? formatAmount(calculateTotal(getYearData(venituri)))
                        : formatAmount(calculateTotal(getDisplayValues(venituri)))
                      }
                    </div>
                  </div>
                  )}

                  {/* Cheltuieli Row */}
                  <div 
                    onClick={() => setCheltuieliExpanded(!cheltuieliExpanded)}
                    className="px-6 border-b border-gray-200/50 hover:bg-[#F1F3F5] transition-colors cursor-pointer"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: viewMode === 'monthly' 
                        ? '200px repeat(13,minmax(40px,1fr)) minmax(70px,auto)'
                        : '200px repeat(8,minmax(40px,1fr)) minmax(70px,auto)',
                      gap: '0.125rem',
                      alignItems: 'center',
                      minHeight: '48px'
                    }}
                  >
                    <div className="flex items-center gap-2" style={{ fontSize: '15px', fontWeight: 400, color: '#212529', paddingTop: '10px', paddingBottom: '10px' }}>
                      Cheltuieli
                      {cheltuieliExpanded ? (
                        <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
                      )}
                    </div>
                    {viewMode === 'monthly' ? (
                      getYearData(data.cheltuieli).map((amount, index) => {
                        const columnStyle = getColumnStyle(index);
                        return (
                          <div 
                            key={index} 
                            className="text-center" 
                            style={{ 
                              fontSize: '15px', 
                              fontWeight: columnStyle.fontWeight || 400, 
                              color: '#212529',
                              paddingTop: '10px',
                              paddingBottom: '10px',
                              ...columnStyle
                            }}
                          >
                            {formatAmount(amount)}
                          </div>
                        );
                      })
                    ) : (
                      getDisplayValues(data.cheltuieli).map((amount, index) => (
                        <div key={index} className="text-right" style={{ 
                          fontSize: '15px', 
                          fontWeight: 400, 
          color: '#212529',
                          borderLeft: index === 7 ? '2px solid #CED4DA' : 'none',
                          paddingLeft: index === 7 ? '0.5rem' : '0',
                          backgroundColor: index === 7 ? '#F8F9FA' : 'transparent',
                          paddingTop: '10px',
                          paddingBottom: '10px'
                        }}>
                          {formatAmount(amount)}
                        </div>
                      ))
                    )}
                    <div className="text-right" style={{ 
                      fontSize: '15px', 
                      fontWeight: 400, 
                      color: 'rgba(0,0,0,0.85)',
                      background: 'linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.15) 100%)',
                      paddingLeft: '0.5rem',
                      paddingTop: '10px',
                      paddingBottom: '10px'
                    }}>
                      {viewMode === 'monthly' 
                        ? formatAmount(calculateTotal(getYearData(data.cheltuieli)))
                        : formatAmount(calculateTotal(getDisplayValues(data.cheltuieli)))
                      }
                    </div>
                  </div>

                  {/* Profit Row - Only show when not expanded */}
                  {!cheltuieliExpanded && (
                  <div 
                    className="px-6 border-b-2 border-gray-200/50 hover:bg-[#F1F3F5] transition-colors cursor-pointer"
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: viewMode === 'monthly' 
                        ? '200px repeat(13,minmax(40px,1fr)) minmax(70px,auto)'
                        : '200px repeat(8,minmax(40px,1fr)) minmax(70px,auto)',
                      gap: '0.125rem',
                      alignItems: 'center',
                      minHeight: '48px'
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 400, color: '#212529', paddingTop: '10px', paddingBottom: '10px' }}>
                      Profit
                    </div>
                    {viewMode === 'monthly' ? (
                      getYearData(venituri).map((venituriAmount, index) => {
                        const cheltuieliAmount = getYearData(data.cheltuieli)[index];
                        const profit = venituriAmount - cheltuieliAmount;
                        const columnStyle = getColumnStyle(index);
                        return (
                          <div 
                            key={index} 
                            className="text-center" 
                            style={{ 
                              fontSize: '15px', 
                              fontWeight: columnStyle.fontWeight || 400, 
                              color: profit < 0 ? '#E03131' : '#16A34A',
                              paddingTop: '10px',
                              paddingBottom: '10px',
                              ...columnStyle
                            }}
                          >
                            {profit < 0 ? '-' : ''}{formatAmount(Math.abs(profit))}
                          </div>
                        );
                      })
                    ) : (
                      getDisplayValues(venituri).map((venituriAmount, index) => {
                        const cheltuieliAmount = getDisplayValues(data.cheltuieli)[index];
                        const profit = venituriAmount - cheltuieliAmount;
                        return (
                          <div 
                            key={index} 
                            className="text-right" 
                            style={{ 
                              fontSize: '15px', 
                              fontWeight: 400, 
                              color: profit < 0 ? '#E03131' : '#16A34A',
                              borderLeft: index === 7 ? '2px solid #CED4DA' : 'none',
                              paddingLeft: index === 7 ? '0.5rem' : '0',
                              backgroundColor: index === 7 ? '#F8F9FA' : 'transparent',
                              paddingTop: '10px',
                              paddingBottom: '10px'
                            }}
                          >
                            {profit < 0 ? '-' : ''}{formatAmount(Math.abs(profit))}
                          </div>
                        );
                      })
                    )}
                    <div className="text-right" style={{ 
                      fontSize: '15px', 
                      fontWeight: 400, 
                      color: (() => {
                        const totalVenituri = viewMode === 'monthly' 
                          ? calculateTotal(getYearData(venituri))
                          : calculateTotal(getDisplayValues(venituri));
                        const totalCheltuieli = viewMode === 'monthly' 
                          ? calculateTotal(getYearData(data.cheltuieli))
                          : calculateTotal(getDisplayValues(data.cheltuieli));
                        const totalProfit = totalVenituri - totalCheltuieli;
                        return totalProfit < 0 ? '#E03131' : '#16A34A';
                      })(),
                      background: 'linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.15) 100%)',
                      paddingLeft: '0.5rem',
                      paddingTop: '10px',
                      paddingBottom: '10px'
                    }}>
                      {(() => {
                        const totalVenituri = viewMode === 'monthly' 
                          ? calculateTotal(getYearData(venituri))
                          : calculateTotal(getDisplayValues(venituri));
                        const totalCheltuieli = viewMode === 'monthly' 
                          ? calculateTotal(getYearData(data.cheltuieli))
                          : calculateTotal(getDisplayValues(data.cheltuieli));
                        const totalProfit = totalVenituri - totalCheltuieli;
                        return totalProfit < 0 ? '-' + formatAmount(Math.abs(totalProfit)) : formatAmount(totalProfit);
                      })()}
                    </div>
                  </div>
                  )}

                  {/* Separator row - Only show when expanded */}
                  {cheltuieliExpanded && (
                  <div 
                    className="bg-[#E5E7EB]"
                    style={{ 
                      height: '8px'
                    }}
                  >
                  </div>
                  )}

                  {/* Category Rows with expandable subcategories */}
                  {cheltuieliExpanded && data.categories.map((category, catIndex) => (
                    <div key={catIndex}>
                      {/* Main Category Row */}
                      <div
                        onClick={() => toggleCategory(category.name)}
                        className="px-6 border-b border-gray-200/50 hover:bg-[#F1F3F5] transition-colors cursor-pointer"
                        style={{ 
                          display: 'grid',
                          gridTemplateColumns: viewMode === 'monthly' 
                            ? '200px repeat(13,minmax(40px,1fr)) minmax(70px,auto)'
                            : '200px repeat(8,minmax(40px,1fr)) minmax(70px,auto)',
                          gap: '0.125rem',
                          alignItems: 'center',
                          minHeight: '48px'
                        }}
                      >
                        <div className="flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 250, color: '#212529', whiteSpace: 'nowrap', paddingTop: '10px', paddingBottom: '10px' }}>
                          {category.subcategories && category.subcategories.length > 0 && (
                            expandedCategories.includes(category.name) ? (
                              <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
                            )
                          )}
                          {category.name}
                        </div>
                        {viewMode === 'monthly' ? (
                          getYearData(category.values).map((amount, index) => {
                            const columnStyle = getColumnStyle(index);
                            return (
                              <div 
                                key={index} 
                                className="text-center" 
                                style={{ 
                                  fontSize: '13px', 
                                  fontWeight: columnStyle.fontWeight || 250, 
                                  color: '#212529',
                                  paddingTop: '10px',
                                  paddingBottom: '10px',
                                  ...columnStyle
                                }}
                              >
                                {amount > 0 ? formatAmount(amount) : amount}
                              </div>
                            );
                          })
                        ) : (
                          getDisplayValues(category.values).map((amount, index) => (
                            <div 
                              key={index} 
                              className="text-right" 
                              style={{ 
                                fontSize: '13px', 
                                fontWeight: 250, 
                                color: '#212529',
                                borderLeft: index === 7 ? '2px solid #CED4DA' : 'none',
                                paddingLeft: index === 7 ? '0.5rem' : '0',
                                backgroundColor: index === 7 ? '#F8F9FA' : 'transparent',
                                paddingTop: '10px',
                                paddingBottom: '10px'
                              }}
                            >
                              {amount > 0 ? formatAmount(amount) : amount}
                            </div>
                          ))
                        )}
                        <div className="text-right" style={{ 
                          fontSize: '13px', 
                          fontWeight: 250, 
                          color: '#212529',
                          background: 'linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.15) 100%)',
                          paddingLeft: '0.5rem',
                          paddingTop: '10px',
                          paddingBottom: '10px'
                        }}>
                          {viewMode === 'monthly' 
                            ? formatAmount(calculateTotal(getYearData(category.values)))
                            : formatAmount(calculateTotal(getDisplayValues(category.values)))
                          }
                        </div>
                      </div>

                      {/* Subcategories */}
                      {expandedCategories.includes(category.name) && category.subcategories && (
                        <div className="bg-[#FAFAFA]">
                          {category.subcategories.map((subcat, subIndex) => (
                            <div
                              key={subIndex}
                              className="px-6 border-b border-gray-200/50 hover:bg-[#F1F3F5] transition-colors"
                              style={{ 
                                display: 'grid',
                                gridTemplateColumns: viewMode === 'monthly' 
                                  ? '200px repeat(13,minmax(40px,1fr)) minmax(70px,auto)'
                                  : '200px repeat(8,minmax(40px,1fr)) minmax(70px,auto)',
                                gap: '0.125rem',
                                alignItems: 'center',
                                minHeight: '44px'
                              }}
                            >
                              <div className="pl-4" style={{ fontSize: '12px', fontWeight: 150, color: '#6B7280', whiteSpace: 'nowrap', paddingTop: '8px', paddingBottom: '8px' }}>
                                {subcat.name}
                              </div>
                              {viewMode === 'monthly' ? (
                                getYearData(subcat.values).map((amount, index) => {
                                  const columnStyle = getColumnStyle(index);
                                  return (
                                    <div 
                                      key={index}
                                      onClick={() => {
                                        if (amount > 0) {
                                          const monthLabels = getMonthLabels();
                                          setShowInvoicesPopup({ 
                                            category: subcat.name, 
                                            month: monthLabels[index]
                                          });
                                        }
                                      }}
                                      className={`text-center ${amount > 0 ? 'cursor-pointer hover:text-teal-600' : ''}`}
                                      style={{ 
                                        fontSize: '12px', 
                                        fontWeight: columnStyle.fontWeight || 150, 
                                        color: '#6B7280',
                                        paddingTop: '8px',
                                        paddingBottom: '8px',
                                        ...columnStyle
                                      }}
                                    >
                                      {amount > 0 ? formatAmount(amount) : amount}
                                    </div>
                                  );
                                })
                              ) : (
                                getDisplayValues(subcat.values).map((amount, index) => (
                                  <div 
                                    key={index}
                                    onClick={() => {
                                      if (amount > 0) {
                                        setShowInvoicesPopup({ 
                                          category: subcat.name, 
                                          month: quarters[index]
                                        });
                                      }
                                    }}
                                    className={`text-right ${amount > 0 ? 'cursor-pointer hover:text-teal-600' : ''}`}
                                    style={{ 
                                      fontSize: '12px', 
                                      fontWeight: 150, 
                                      color: '#6B7280',
                                      borderLeft: index === 7 ? '2px solid #CED4DA' : 'none',
                                      paddingLeft: index === 7 ? '0.5rem' : '0',
                                      backgroundColor: index === 7 ? '#F8F9FA' : 'transparent',
                                      paddingTop: '8px',
                                      paddingBottom: '8px'
                                    }}
                                  >
                                    {amount > 0 ? formatAmount(amount) : amount}
                                  </div>
                                ))
                              )}
                              <div className="text-right" style={{ 
                                fontSize: '12px', 
                                fontWeight: 150, 
                                color: '#6B7280',
                                background: 'linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.15) 100%)',
                                paddingLeft: '0.5rem',
                                paddingTop: '8px',
                                paddingBottom: '8px'
                              }}>
                                {viewMode === 'monthly' 
                                  ? formatAmount(calculateTotal(getYearData(subcat.values)))
                                  : formatAmount(calculateTotal(getDisplayValues(subcat.values)))
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoices Popup */}
            {showInvoicesPopup && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInvoicesPopup(null)}>
                <div 
                  className="bg-white/72 backdrop-blur-[32px] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] w-[920px] mx-4 relative overflow-hidden"
                  style={{ padding: '32px 40px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setShowInvoicesPopup(null)}
                    className="absolute top-8 right-8 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={20} className="text-[#B0B0B0] hover:text-[#1A1A1A]" />
                  </button>

                  {/* Header */}
                  <div className="mb-6">
                    <h2 className="text-[#1A1A1A]" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '2px' }}>
                      Facturi – {showInvoicesPopup.category}
                    </h2>
                    <p className="text-[#8F8F8F]" style={{ fontSize: '13px', fontWeight: 400 }}>
                      {showInvoicesPopup.month} {selectedYear}
                    </p>
                  </div>

                  {/* Table */}
                  <div className="space-y-0 mb-4">
                    {/* Table Header */}
                    <div 
                      className="pb-3 border-b border-[#EEEEEE]"
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: '100px 180px 1fr 120px 120px',
                        gap: '24px'
                      }}
                    >
                      <div className="text-[#8F8F8F] uppercase" style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.3px' }}>
                        DATA
                      </div>
                      <div className="text-[#8F8F8F] uppercase" style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.3px' }}>
                        FURNIZOR
                      </div>
                      <div className="text-[#8F8F8F] uppercase" style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.3px' }}>
                        DESCRIERE
                      </div>
                      <div className="text-[#8F8F8F] uppercase" style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.3px' }}>
                        NR. FACTURĂ
                      </div>
                      <div className="text-right text-[#8F8F8F] uppercase" style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.3px' }}>
                        SUMĂ
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {/* Final invoices */}
                      {mockInvoices
                        .filter(invoice => invoice.status === 'Final')
                        .map((invoice) => (
                          <div 
                            key={invoice.id}
                            className="py-3 border-b border-[#EEEEEE] last:border-0"
                            style={{ 
                              display: 'grid',
                              gridTemplateColumns: '100px 180px 1fr 120px 120px',
                              gap: '24px',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ fontSize: '14px', fontWeight: 400, color: '#1A1A1A' }}>
                              {new Date(invoice.date).toLocaleDateString('ro-RO')}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>
                              {invoice.supplier}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 400, color: '#7A7A7A' }}>
                              {invoice.description}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 400, color: '#4D7BE5' }}>
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-right" style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>
                              {formatAmount(invoice.amount)}
                            </div>
                          </div>
                        ))}
                      
                      {/* Separator if there are Recurent invoices */}
                      {mockInvoices.filter(invoice => invoice.status === 'Recurent').length > 0 && 
                       mockInvoices.filter(invoice => invoice.status === 'Final').length > 0 && (
                        <div className="py-3 border-b border-[#EEEEEE]">
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Recurente
                          </div>
                        </div>
                      )}

                      {/* Recurent invoices */}
                      {mockInvoices
                        .filter(invoice => invoice.status === 'Recurent')
                        .map((invoice) => (
                          <div 
                            key={invoice.id}
                            className="py-3 border-b border-[#EEEEEE] last:border-0"
                            style={{ 
                              display: 'grid',
                              gridTemplateColumns: '100px 180px 1fr 120px 120px',
                              gap: '24px',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ fontSize: '14px', fontWeight: 400, color: '#1A1A1A' }}>
                              {new Date(invoice.date).toLocaleDateString('ro-RO')}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>
                              {invoice.supplier}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 400, color: '#7A7A7A' }}>
                              {invoice.description}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 400, color: '#4D7BE5' }}>
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-right" style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>
                              {formatAmount(invoice.amount)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Total Row - Footer */}
                  <div 
                    className="bg-white border-t border-[#EEEEEE] -mx-10 px-10 py-5 rounded-full"
                  >
                    <div 
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: '100px 180px 1fr 120px 120px',
                        gap: '24px',
                        alignItems: 'center'
                      }}
                    >
                      <div></div>
                      <div></div>
                      <div></div>
                      <div className="uppercase" style={{ fontSize: '13px', fontWeight: 600, color: '#999999', letterSpacing: '0.3px' }}>
                        TOTAL
                      </div>
                      <div className="text-right" style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>
                        {formatAmount(mockInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        )}
      </>
    );
  }
);