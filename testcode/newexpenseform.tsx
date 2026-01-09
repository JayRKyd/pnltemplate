// @ts-nocheck
import { useState, Fragment } from 'react';
import { ArrowLeft, Upload, Calendar, Search, Plus, X } from 'lucide-react';
import { CustomSelect } from './customselect';
import { MonthYearPicker } from './monthyearpicker';
import { formatAmount, parseAmount } from '../utils/formatters';
import { FormattedAmount } from './formattedamount';
import { FormattedInput } from './FormattedInput';
import { NewExpenseFormLayoutC } from './NewExpenseFormLayoutC';

interface RecurringExpenseData {
  supplier: string;
  description: string;
  amount: number;
  month: string;
}

interface RecurringExpense {
  id: number;
  supplier: string;
  description: string;
  amount: number;
  createdDate: Date;
  category: string;
  subcategory: string;
  status: 'Activ' | 'Inactiv';
  months: {
    dec: boolean;
    nov: boolean;
    oct: boolean;
    sep: boolean;
    aug: boolean;
    jul: boolean;
  };
}

interface NewExpenseFormProps {
  onBack: () => void;
  isRecurring?: boolean;
  expense?: {
    id: number;
    date: Date;
    supplier: string;
    description: string;
    amount: number;
    type: string;
    operator: string;
    status: 'Final' | 'Draft' | 'Recurent';
  } | null;
  recurringExpenseData?: RecurringExpenseData | null;
  recurringTemplate?: RecurringExpense | null;
  isMobileMode?: boolean;
}

export function NewExpenseForm({ onBack, expense, isRecurring = false, recurringExpenseData = null, recurringTemplate = null, isMobileMode = false }: NewExpenseFormProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(expense?.date || null);
  const [currentMonth, setCurrentMonth] = useState(expense?.date || new Date());
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [showImagePopup, setShowImagePopup] = useState(false);
  
  // Dropdown states
  const [docType, setDocType] = useState(expense?.type || '');
  const [numLinii, setNumLinii] = useState('1 tranzactie');
  const [plata, setPlata] = useState('Platit');
  
  // Form values
  const [furnizor, setFurnizor] = useState(recurringExpenseData ? recurringExpenseData.supplier : '');
  const [docNumber, setDocNumber] = useState('');
  
  // Recurring expenses popup
  const [showRecurringPopup, setShowRecurringPopup] = useState(false);
  const [selectedSupplierRecurring, setSelectedSupplierRecurring] = useState<any[]>([]);
  
  // Furnizor autocomplete
  const [showFurnizorDropdown, setShowFurnizorDropdown] = useState(false);
  const [furnizorSuggestions, setFurnizorSuggestions] = useState<string[]>([]);
  
  // Recurring form values
  const [recurringFurnizor, setRecurringFurnizor] = useState(recurringTemplate?.supplier || '');
  const [recurringSumaCuTVA, setRecurringSumaCuTVA] = useState(recurringTemplate ? String(recurringTemplate.amount) : '0');
  const [recurringSumaFaraTVA, setRecurringSumaFaraTVA] = useState(recurringTemplate ? String(Math.round(recurringTemplate.amount / 1.19)) : '0');
  const [recurringCont, setRecurringCont] = useState<string>('- Please Choose -');
  const [recurringSubcont, setRecurringSubcont] = useState<string>('- Please choose -');
  const [recurringDescriere, setRecurringDescriere] = useState(recurringTemplate?.description || '');
  const [recurringStatus, setRecurringStatus] = useState<'Activ' | 'Inactiv'>('Activ');
  const [showInactiveConfirmation, setShowInactiveConfirmation] = useState(false);
  
  // Debug log
  console.log('Recurring state:', { recurringCont, recurringSubcont });
  
  // Error states
  const [errors, setErrors] = useState<{
    furnizor?: boolean;
    docNumber?: boolean;
    docDate?: boolean;
    transactions?: { [key: number]: { cont?: boolean; subcont?: boolean } };
    recurringFurnizor?: boolean;
    recurringCont?: boolean;
    recurringSubcont?: boolean;
  }>({});
  
  // Transaction data arrays - one per transaction
  const [transactions, setTransactions] = useState([
    {
      totalTVA: recurringExpenseData ? String(recurringExpenseData.amount) : (expense ? String(expense.amount) : '6500'),
      totalWithoutTVA: recurringExpenseData ? String(Math.round(recurringExpenseData.amount / 1.19)) : (expense ? String(Math.round(expense.amount / 1.19)) : '5430'),
      tvaDeductibil: false,
      lunaP: recurringExpenseData ? recurringExpenseData.month : 'noiembrie 2025',
      cont: '',
      subcont: '',
      descriere: recurringExpenseData ? recurringExpenseData.description : (expense?.description || '')
    }
  ]);

  // Update transactions array when numLinii changes
  const handleNumLiniiChange = (value: string) => {
    setNumLinii(value);
    const num = parseInt(value.split(' ')[0]);
    const newTransactions = [...transactions];
    
    if (num > transactions.length) {
      // Add new transactions
      for (let i = transactions.length; i < num; i++) {
        newTransactions.push({
          totalTVA: '0',
          totalWithoutTVA: '0',
          tvaDeductibil: false,
          lunaP: 'noiembrie 2025',
          cont: '',
          subcont: '',
          descriere: ''
        });
      }
    } else if (num < transactions.length) {
      // Remove transactions
      newTransactions.splice(num);
    }
    
    setTransactions(newTransactions);
  };

  // Update individual transaction
  const updateTransaction = (index: number, field: string, value: any) => {
    const newTransactions = [...transactions];
    newTransactions[index] = { ...newTransactions[index], [field]: value };
    setTransactions(newTransactions);
  };

  // Add new transaction
  const handleAddTransaction = () => {
    setTransactions([
      ...transactions,
      {
        totalTVA: '0',
        totalWithoutTVA: '0',
        tvaDeductibil: false,
        lunaP: 'noiembrie 2025',
        cont: '',
        subcont: '',
        descriere: ''
      }
    ]);
    // Update numLinii to reflect the new count
    setNumLinii(`${transactions.length + 1} linii`);
  };

  // Mock suppliers database
  const allSuppliers = [
    'Engie', 'Enel', 'Orange', 'Slack', 'Vodafone', 'Telekom', 
    'Microsoft', 'Google', 'Amazon', 'Adobe', 'Dropbox', 
    'Zoom', 'eMag', 'Kaufland', 'Mega Image', 'Carrefour'
  ];

  // Mock recurring expenses database
  const recurringExpensesDB: { [supplier: string]: any[] } = {
    'engie': [
      { description: 'Gaz Noiembrie', amount: 1250, month: 'noiembrie 2025' },
      { description: 'Gaz Octombrie', amount: 1180, month: 'octombrie 2025' },
      { description: 'Gaz Septembrie', amount: 980, month: 'septembrie 2025' }
    ],
    'enel': [
      { description: 'Energie Noiembrie', amount: 2340, month: 'noiembrie 2025' },
      { description: 'Energie Octombrie', amount: 2210, month: 'octombrie 2025' }
    ],
    'orange': [
      { description: 'Abonament Internet & Telefonie', amount: 450, month: 'noiembrie 2025' }
    ],
    'slack': [
      { description: 'Subscription Pro Plan', amount: 850, month: 'noiembrie 2025' },
      { description: 'Subscription Pro Plan', amount: 850, month: 'octombrie 2025' }
    ]
  };

  // Handle furnizor input change with autocomplete
  const handleFurnizorChange = (value: string) => {
    setFurnizor(value);
    
    if (value.length >= 3) {
      const matches = allSuppliers.filter(supplier => 
        supplier.toLowerCase().includes(value.toLowerCase())
      );
      setFurnizorSuggestions(matches);
      setShowFurnizorDropdown(matches.length > 0);
    } else {
      setShowFurnizorDropdown(false);
      setFurnizorSuggestions([]);
    }
  };

  // Handle furnizor blur - check for recurring expenses
  const handleFurnizorBlur = () => {
    // Close dropdown after a small delay to allow click selection
    setTimeout(() => {
      setShowFurnizorDropdown(false);
    }, 200);
    
    // Check if typed supplier has recurring expenses
    const supplierKey = furnizor.trim().toLowerCase();
    if (supplierKey && recurringExpensesDB[supplierKey]) {
      console.log('Found recurring expenses for typed supplier:', furnizor);
      setSelectedSupplierRecurring(recurringExpensesDB[supplierKey]);
      setShowRecurringPopup(true);
    }
  };

  // Handle selecting a supplier from dropdown
  const handleSelectSupplier = (supplier: string) => {
    setFurnizor(supplier);
    setShowFurnizorDropdown(false);
    
    // Check if supplier has recurring expenses
    const supplierKey = supplier.toLowerCase();
    if (recurringExpensesDB[supplierKey]) {
      console.log('Found recurring expenses for:', supplier);
      setSelectedSupplierRecurring(recurringExpensesDB[supplierKey]);
      setShowRecurringPopup(true);
    }
  };

  // Handle furnizor search button click
  const handleFurnizorSearch = () => {
    const trimmedFurnizor = furnizor.trim().toLowerCase();
    console.log('Searching for:', trimmedFurnizor);
    console.log('Available suppliers:', Object.keys(recurringExpensesDB));
    
    if (trimmedFurnizor && recurringExpensesDB[trimmedFurnizor]) {
      console.log('Found recurring expenses:', recurringExpensesDB[trimmedFurnizor]);
      setSelectedSupplierRecurring(recurringExpensesDB[trimmedFurnizor]);
      setShowRecurringPopup(true);
    } else {
      console.log('No recurring expenses found for:', trimmedFurnizor);
    }
  };

  // Handle selecting a recurring expense from popup
  const handleSelectRecurring = (recurring: any) => {
    // Prefill form with recurring expense data
    setTransactions([{
      totalTVA: String(recurring.amount),
      totalWithoutTVA: String(Math.round(recurring.amount / 1.19)),
      tvaDeductibil: false,
      lunaP: recurring.month,
      cont: '',
      subcont: '',
      descriere: recurring.description
    }]);
    setShowRecurringPopup(false);
  };

  // Handle continuing with normal expense
  const handleContinueNormal = () => {
    setShowRecurringPopup(false);
  };

  // Handle create new recurring expense
  const handleCreateRecurring = () => {
    setShowRecurringPopup(false);
    // Here you would navigate to create a new recurring expense
    console.log('Creating new recurring expense for:', furnizor);
  };

  // Validate recurring form
  const validateRecurringForm = () => {
    const newErrors: {
      recurringFurnizor?: boolean;
      recurringCont?: boolean;
      recurringSubcont?: boolean;
    } = {};

    if (!recurringFurnizor.trim()) {
      newErrors.recurringFurnizor = true;
    }
    if (!recurringCont.trim() || recurringCont === '- Please Choose -' || recurringCont === '- Please choose -') {
      newErrors.recurringCont = true;
    }
    if (!recurringSubcont.trim() || recurringSubcont === '- Please choose -' || recurringSubcont === '- Please Choose -') {
      newErrors.recurringSubcont = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate form
  const validateForm = () => {
    const newErrors: {
      furnizor?: boolean;
      docNumber?: boolean;
      docDate?: boolean;
      transactions?: { [key: number]: { cont?: boolean; subcont?: boolean } };
    } = {};

    // Validate main fields
    if (!furnizor.trim()) {
      newErrors.furnizor = true;
    }
    if (!docNumber.trim()) {
      newErrors.docNumber = true;
    }
    if (!selectedDate) {
      newErrors.docDate = true;
    }

    // Validate transactions
    const transactionErrors: { [key: number]: { cont?: boolean; subcont?: boolean } } = {};
    transactions.forEach((transaction, index) => {
      const txErrors: { cont?: boolean; subcont?: boolean } = {};
      if (!transaction.cont.trim() || transaction.cont === '- Please Choose -') {
        txErrors.cont = true;
      }
      if (!transaction.subcont.trim() || transaction.subcont === '- Please choose -') {
        txErrors.subcont = true;
      }
      if (txErrors.cont || txErrors.subcont) {
        transactionErrors[index] = txErrors;
      }
    });

    if (Object.keys(transactionErrors).length > 0) {
      newErrors.transactions = transactionErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (isRecurring) {
      if (validateRecurringForm()) {
        console.log('Recurring form is valid, saving...');
      } else {
        console.log('Recurring form has errors');
      }
    } else {
      if (validateForm()) {
        console.log('Form is valid, saving...');
      } else {
        console.log('Form has errors');
      }
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(clickedDate);
    setShowDatePicker(false);
  };

  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.getTime() === selectedDate.getTime();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setUploadedFileName(file.name);
    }
  };

  // Normal expense form - full width format with inline upload
  if (!isRecurring) {
    return (
      <>
        {/* Recurring Expenses Popup */}
        {showRecurringPopup && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
              onClick={handleContinueNormal}
            />
            
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-2xl">
              <div className="bg-white/80 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 p-8 animate-in">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Deconturi Recurente - {furnizor}
                  </h3>
                  <button 
                    onClick={handleContinueNormal}
                    className="p-1.5 hover:bg-white/70 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
                
                <p className="text-gray-600 mb-6" style={{ fontSize: '0.9375rem', fontWeight: 400 }}>
                  Am identificat {selectedSupplierRecurring.length} deconturi recurente pentru acest furnizor.
                </p>

                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {selectedSupplierRecurring.map((expense, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectRecurringExpense(expense)}
                      className="w-full p-4 bg-white/70 hover:bg-teal-50/70 rounded-2xl transition-all text-left border border-gray-200/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                            {expense.description}
                          </p>
                          <p className="text-gray-600 mt-1" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                            {expense.category} → {expense.subcategory}
                          </p>
                        </div>
                        <p className="text-gray-900" style={{ fontSize: '1rem', fontWeight: 500 }}>
                          {formatAmount(expense.amount)} RON
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleContinueNormal}
                    className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-all"
                    style={{ fontSize: '0.9375rem', fontWeight: 500 }}
                  >
                    Continua cu decont normal
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <NewExpenseFormLayoutC
          uploadedImage={uploadedImage}
          uploadedFileName={uploadedFileName}
          onFileUpload={handleFileUpload}
          onClearFile={() => {
            setUploadedFileName('');
            setUploadedImage(null);
          }}
          furnizor={furnizor}
          onFurnizorChange={handleFurnizorChange}
          onFurnizorBlur={handleFurnizorBlur}
          furnizorSuggestions={furnizorSuggestions}
          showFurnizorDropdown={showFurnizorDropdown}
          onSelectSupplier={handleSelectSupplier}
          docType={docType}
          onDocTypeChange={setDocType}
          docNumber={docNumber}
          onDocNumberChange={setDocNumber}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          plata={plata}
          onPlataChange={setPlata}
          transactions={transactions}
          onTransactionsChange={setTransactions}
          errors={errors}
          isMobileMode={isMobileMode}
          onBack={onBack}
        />

        {/* Date Picker Popup */}
        {showDatePicker && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowDatePicker(false)}
            />
            
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md">
              <div className="bg-white/80 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Selectează data
                  </h3>
                  <button 
                    onClick={() => setShowDatePicker(false)}
                    className="p-1.5 hover:bg-white/70 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
                
                <div className="bg-white/70 rounded-2xl p-4">
                  {/* Calendar implementation would go here */}
                  <p className="text-gray-600 text-center" style={{ fontSize: '0.875rem' }}>
                    Calendar placeholder
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Recurring form - simple centered layout
  if (isRecurring) {
    return (
      <div className="px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 md:p-10 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30 relative">
            {/* Close button - top left inside card */}
            <button
              onClick={onBack}
              className="absolute top-6 left-6 p-2 bg-white/70 backdrop-blur-xl rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] border border-gray-200/50 transition-all hover:bg-gray-100/70 z-10"
            >
              <X size={20} className="text-gray-600" />
            </button>
            
            <div className="flex items-center justify-center mb-6 relative">
              <h2 className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Decont Recurent
              </h2>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xl rounded-full p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200/50 absolute right-0">
                <button
                  type="button"
                  onClick={() => setRecurringStatus('Activ')}
                  className={`px-4 py-1.5 rounded-full transition-all ${
                    recurringStatus === 'Activ'
                      ? 'bg-teal-500 text-white shadow-[0_2px_8px_rgba(20,184,166,0.3)]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ fontSize: '0.8125rem', fontWeight: 500 }}
                >
                  Activ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (recurringStatus === 'Activ') {
                      setShowInactiveConfirmation(true);
                    } else {
                      setRecurringStatus('Inactiv');
                    }
                  }}
                  className={`px-4 py-1.5 rounded-full transition-all ${
                    recurringStatus === 'Inactiv'
                      ? 'bg-gray-400 text-white shadow-[0_2px_8px_rgba(156,163,175,0.3)]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ fontSize: '0.8125rem', fontWeight: 500 }}
                >
                  Inactiv
                </button>
              </div>
            </div>
            
            <div className="space-y-5">
              {/* Furnizor */}
              <div className="flex items-center gap-2">
                <label className="text-gray-600 w-32 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Furnizor
                </label>
                <input
                  type="text"
                  placeholder="Cauta dupa nume sau CUI"
                  value={recurringFurnizor}
                  onChange={(e) => setRecurringFurnizor(e.target.value)}
                  className={`w-[532px] px-4 py-2.5 border ${errors.recurringFurnizor ? 'border-red-500' : 'border-gray-300/50'} bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]`}
                  style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                />
              </div>

              {/* Suma cu TVA / Suma fara TVA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 w-32 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    Suma cu TVA
                  </label>
                  <FormattedInput
                    value={recurringSumaCuTVA}
                    onChange={setRecurringSumaCuTVA}
                    suffix="RON"
                    align="left"
                    className="w-48 px-4 py-2.5 pr-14 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 w-32 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    Suma fara TVA
                  </label>
                  <FormattedInput
                    value={recurringSumaFaraTVA}
                    onChange={setRecurringSumaFaraTVA}
                    suffix="RON"
                    align="left"
                    className="w-48 px-4 py-2.5 pr-14 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                  />
                </div>
              </div>

              {/* TVA Deductibil / Cota TVA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 w-32 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    TVA Deductibil
                  </label>
                  <CustomSelect
                    value="Nu"
                    onChange={() => {}}
                    options={['Da', 'Nu']}
                    className="w-48 px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 w-32 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    Cota TVA (%)
                  </label>
                  <input
                    type="text"
                    value="0.00%"
                    readOnly
                    className="w-48 px-4 py-2.5 border border-gray-300/50 bg-gray-50/50 backdrop-blur-xl rounded-xl text-gray-700 cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                  />
                </div>
              </div>

              {/* Cont / Subcont */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 w-32 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    Cont
                  </label>
                  <CustomSelect
                    value={recurringCont}
                    onChange={setRecurringCont}
                    options={['- Please Choose -', 'Cont 1', 'Cont 2']}
                    className="w-48 px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    hasError={errors.recurringCont}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 w-32 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    Subcont
                  </label>
                  <CustomSelect
                    value={recurringSubcont}
                    onChange={setRecurringSubcont}
                    options={['- Please choose -', 'Subcont 1', 'Subcont 2']}
                    className="w-48 px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    hasError={errors.recurringSubcont}
                  />
                </div>
              </div>

              {/* Descriere */}
              <div className="flex items-start gap-2">
                <label className="text-gray-600 w-32 flex-shrink-0 pt-2.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Descriere
                </label>
                <textarea
                  placeholder="Adauga descriere..."
                  value={recurringDescriere}
                  onChange={(e) => setRecurringDescriere(e.target.value)}
                  rows={2}
                  className="w-[532px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] resize-none"
                  style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                />
              </div>

              {/* Salveaza Button */}
              <div className="flex justify-center pt-2">
                <button 
                  onClick={handleSave}
                  type="button"
                  className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
                >
                  <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Salveaza</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Inactive Confirmation Popup */}
        {showInactiveConfirmation && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowInactiveConfirmation(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div 
                className="bg-white/80 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 max-w-md w-full transform transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-4 bg-[rgba(233,226,226,0)] rounded-[6px]">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-600">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                      Inactivare decont recurent
                    </h3>
                    <p className="text-gray-700" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                      {recurringFurnizor}
                    </p>
                    <p className="text-gray-600" style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                      {formatAmount(parseAmount(recurringSumaCuTVA))} RON
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowInactiveConfirmation(false)}
                      className="flex-1 px-6 py-3 bg-white/70 backdrop-blur-xl border border-gray-300/50 text-gray-700 rounded-full transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                      style={{ fontSize: '0.9375rem', fontWeight: 500 }}
                    >
                      Păstrează
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecurringStatus('Inactiv');
                        setShowInactiveConfirmation(false);
                      }}
                      className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
                      style={{ fontSize: '0.9375rem', fontWeight: 500 }}
                    >
                      Inactivează
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6">
      {/* Recurring Expenses Popup */}
      {showRecurringPopup && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={handleContinueNormal}
          />
          
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-2xl">
            <div className="bg-white/80 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 p-8 animate-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  Deconturi Recurente - {furnizor}
                </h3>
                <button 
                  onClick={handleContinueNormal}
                  className="p-1.5 hover:bg-white/70 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>

              <p className="text-gray-600 mb-6" style={{ fontSize: '0.9375rem', fontWeight: 400 }}>
                Am gasit deconturi recurente pentru acest furnizor. Alege unul pentru a precompeta formularul sau continua cu un decont normal.
              </p>

              <div className="space-y-3 mb-6">
                {selectedSupplierRecurring.map((recurring, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectRecurring(recurring)}
                    className="w-full p-4 bg-white/70 hover:bg-teal-50/70 border border-gray-300/50 hover:border-teal-400 rounded-xl transition-all text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-gray-900 mb-1" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                          {recurring.description}
                        </div>
                        <div className="text-gray-500" style={{ fontSize: '0.8125rem', fontWeight: 400 }}>
                          {recurring.month}
                        </div>
                      </div>
                      <div className="text-right" style={{ width: '175px' }}>
                        <div className="text-gray-900" style={{ fontSize: '1rem', fontWeight: 500 }}>
                          <span style={{ fontSize: '1rem' }}>{recurring.amount.toLocaleString('ro-RO')}</span>
                          <span style={{ fontSize: '0.875rem' }}>,00</span>
                        </div>
                        <div className="text-gray-500 flex items-center gap-1 justify-end mt-0.5">
                          <span style={{ fontSize: '0.75rem' }}>RON</span>
                          <div className="w-3 h-3 rounded-full overflow-hidden flex">
                            <div className="w-1/3 bg-[#002B7F]"></div>
                            <div className="w-1/3 bg-[#FCD116]"></div>
                            <div className="w-1/3 bg-[#CE1126]"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleContinueNormal}
                  className="px-6 py-2.5 bg-gray-200/70 hover:bg-gray-300/70 text-gray-900 rounded-xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  style={{ fontSize: '0.9375rem', fontWeight: 500 }}
                >
                  Continua cu Decont Normal
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Document Preview - Mobile only - show when image is uploaded */}
      {uploadedImage && (
        <div className="mb-6 lg:hidden">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
            <div className="rounded-xl overflow-hidden border border-gray-200/50 shadow-sm">
              <img 
                src={uploadedImage} 
                alt="Uploaded document" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-1 space-y-6 relative z-10">
          {/* Section 1: Document */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30 overflow-visible relative">
            {/* Close button - left on desktop */}
            <button
              onClick={onBack}
              className="absolute top-6 left-6 p-2 bg-white/70 backdrop-blur-xl rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] border border-gray-200/50 transition-all hover:bg-gray-100/70 z-10"
            >
              <X size={20} className="text-gray-600" />
            </button>
            
            <div className="space-y-5">
              {/* Furnizor */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <label className="text-gray-700 md:text-right pt-2" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Furnizor
                </label>
                <div className="md:col-span-3 relative">
                  <input
                    type="text"
                    placeholder="Cauta un furnizor..."
                    value={furnizor}
                    onChange={(e) => handleFurnizorChange(e.target.value)}
                    className={`w-full pl-4 pr-12 py-2.5 border ${errors.furnizor ? 'border-red-500' : 'border-gray-300/50'} bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]`}
                    style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                  />
                  <button 
                    type="button"
                    onClick={handleFurnizorSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors"
                  >
                    <Search size={16} className="text-white" />
                  </button>
                  
                  {/* Autocomplete dropdown */}
                  {showFurnizorDropdown && furnizorSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white/90 backdrop-blur-xl border border-gray-300/50 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden" style={{ zIndex: 9999 }}>
                      {furnizorSuggestions.map((supplier, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectSupplier(supplier)}
                          className="w-full px-4 py-2.5 text-left hover:bg-teal-50/70 transition-colors text-gray-900"
                          style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                        >
                          {supplier}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* DocType */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <label className="text-gray-700 md:text-right pt-2" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  DocType
                </label>
                <div className="md:col-span-3">
                  <CustomSelect
                    value={docType}
                    onChange={setDocType}
                    options={['Factura', 'Bon Fiscal', 'Chitanta']}
                    className="w-full px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                  />
                </div>
              </div>

              {/* DocNumber */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <label className="text-gray-700 md:text-right pt-2" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  DocNumber
                </label>
                <div className="md:col-span-3">
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className={`w-full px-4 py-2.5 border ${errors.docNumber ? 'border-red-500' : 'border-gray-300/50'} bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]`}
                    style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                  />
                </div>
              </div>

              {/* DocDate */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <label className="text-gray-700 md:text-right pt-2" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  DocDate
                </label>
                <div className="md:col-span-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedDate ? (() => {
                        const day = selectedDate.getDate().toString().padStart(2, '0');
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const month = monthNames[selectedDate.getMonth()];
                        const year = selectedDate.getFullYear().toString().slice(-2);
                        return `${day}-${month}-${year}`;
                      })() : ''}
                      placeholder="Data la care documentul a fost emis"
                      readOnly
                      onClick={() => setShowDatePicker(true)}
                      className={`w-full pl-4 pr-12 py-2.5 border ${errors.docDate ? 'border-red-500' : 'border-gray-300/50'} bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 cursor-pointer focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]`}
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                    <button 
                      onClick={() => setShowDatePicker(true)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
                    >
                      <Calendar size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Produse/Servicii */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <label className="text-gray-700 md:text-right pt-2" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Produse/Servicii
                </label>
                <div className="md:col-span-3">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isSelected = parseInt(numLinii.split(' ')[0]) === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleNumLiniiChange(`${num} ${num === 1 ? 'tranzactie' : 'tranzactii'}`)}
                          className={`flex-1 px-4 py-2.5 border rounded-xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50/70 backdrop-blur-xl text-teal-700'
                              : 'border-gray-300/50 bg-white/70 backdrop-blur-xl text-gray-700 hover:border-gray-400'
                          }`}
                          style={{ fontSize: '0.9375rem', fontWeight: isSelected ? 500 : 400 }}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-gray-500 text-center mt-2 italic" style={{ fontSize: '0.8125rem', fontWeight: 350 }}>
                    Daca sunt mai multe produse/servicii diferite pe bon/factura
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Detalii Tranzactie */}
          {transactions.map((transaction, index) => (
            <Fragment key={index}>
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
              
              <div className="space-y-5">
                {/* cu TVA & fara TVA - full width, no left label */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Suma cu TVA
                    </label>
                    <FormattedInput
                      value={transaction.totalTVA}
                      onChange={(value) => updateTransaction(index, 'totalTVA', value)}
                      suffix="RON"
                      align="center"
                      className="w-full min-w-[150px] px-4 py-2.5 pr-14 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Suma fara TVA
                    </label>
                    <FormattedInput
                      value={transaction.totalWithoutTVA}
                      onChange={(value) => updateTransaction(index, 'totalWithoutTVA', value)}
                      suffix="RON"
                      align="center"
                      className="w-full min-w-[150px] px-4 py-2.5 pr-14 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                </div>

                {/* TVA & Cota TVA - full width, no left label */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      TVA
                    </label>
                    <FormattedInput
                      value={(() => {
                        const sumaTVA = parseFloat(transaction.totalTVA) || 0;
                        const sumaFaraTVA = parseFloat(transaction.totalWithoutTVA) || 0;
                        const tva = sumaTVA - sumaFaraTVA;
                        return tva.toString();
                      })()}
                      onChange={() => {}}
                      readOnly={true}
                      suffix="RON"
                      align="center"
                      className="w-full min-w-[150px] px-4 py-2.5 pr-14 border border-gray-300/50 bg-gray-50/50 backdrop-blur-xl rounded-xl text-gray-700 cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Cota TVA (%)
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const sumaTVA = parseFloat(transaction.totalTVA) || 0;
                        const sumaFaraTVA = parseFloat(transaction.totalWithoutTVA) || 0;
                        const tva = sumaTVA - sumaFaraTVA;
                        const cotaTVA = sumaTVA > 0 ? (tva / sumaFaraTVA) * 100 : 0;
                        return cotaTVA > 0 ? cotaTVA.toFixed(2) + '%' : '0.00%';
                      })()}
                      readOnly
                      className="w-full min-w-[150px] px-4 py-2.5 border border-gray-300/50 bg-gray-50/50 backdrop-blur-xl rounded-xl text-gray-700 cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                </div>

                {/* TVA deductibil & Luna P&L - pe acelasi rand */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      TVA deductibil
                    </label>
                    <CustomSelect
                      value={transaction.tvaDeductibil ? 'Da' : 'Nu'}
                      onChange={(value) => updateTransaction(index, 'tvaDeductibil', value === 'Da')}
                      options={['Da', 'Nu']}
                      className="w-full min-w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-center"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Luna P&L
                    </label>
                    <MonthYearPicker
                      value={transaction.lunaP}
                      onChange={(value) => updateTransaction(index, 'lunaP', value)}
                      placeholder="Selectează luna"
                      className="w-full min-w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                </div>

                {/* Cont & Subcont - pe acelasi rand */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Cont
                    </label>
                    <CustomSelect
                      value={transaction.cont}
                      onChange={(value) => updateTransaction(index, 'cont', value)}
                      options={['- Please Choose -', 'Cont 1', 'Cont 2']}
                      className="w-full min-w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-center"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                      hasError={errors.transactions?.[index]?.cont}
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Subcont
                    </label>
                    <CustomSelect
                      value={transaction.subcont}
                      onChange={(value) => updateTransaction(index, 'subcont', value)}
                      options={['- Please choose -', 'Subcont 1', 'Subcont 2']}
                      className="w-full min-w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-center"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                      hasError={errors.transactions?.[index]?.subcont}
                    />
                  </div>
                </div>

                {/* Descriere & Tags - 2 coloane pe acelasi rand */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Descriere
                    </label>
                    <textarea
                      placeholder="Adauga descriere..."
                      rows={2}
                      value={transaction.descriere}
                      onChange={(e) => updateTransaction(index, 'descriere', e.target.value)}
                      className="w-full min-w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] resize-none text-center"
                      style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 mb-3 block" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Tags
                    </label>
                    <input
                      type="text"
                      placeholder="#platitdeSOLO #contributieR3"
                      value={transaction.tags || ''}
                      onChange={(e) => updateTransaction(index, 'tags', e.target.value)}
                      className="w-full min-w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-center"
                      style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                    />
                  </div>
                </div>

                {/* Salveaza Button - only show on last transaction */}
                {index === transactions.length - 1 && (
                  <div className="flex justify-center pt-2">
                    <button 
                      onClick={handleSave}
                      type="button"
                      className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
                    >
                      <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Salveaza</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Second Card - Horizontal Labels Style (Decont Recurent Layout) */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
              
              <div className="space-y-5">
                {/* Suma cu TVA / Suma fara TVA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Suma cu TVA
                    </label>
                    <FormattedInput
                      value={transaction.totalTVA}
                      onChange={(value) => updateTransaction(index, 'totalTVA', value)}
                      suffix="RON"
                      align="left"
                      className="w-[150px] px-4 py-2.5 pr-8 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Suma fara TVA
                    </label>
                    <FormattedInput
                      value={transaction.totalWithoutTVA}
                      onChange={(value) => updateTransaction(index, 'totalWithoutTVA', value)}
                      suffix="RON"
                      align="left"
                      className="w-[150px] px-4 py-2.5 pr-8 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                </div>

                {/* TVA / Cota TVA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      TVA
                    </label>
                    <FormattedInput
                      value={(() => {
                        const sumaTVA = parseFloat(transaction.totalTVA) || 0;
                        const sumaFaraTVA = parseFloat(transaction.totalWithoutTVA) || 0;
                        const tva = sumaTVA - sumaFaraTVA;
                        return tva.toString();
                      })()}
                      onChange={() => {}}
                      readOnly={true}
                      suffix="RON"
                      align="left"
                      className="w-[150px] px-4 py-2.5 pr-8 border border-gray-300/50 bg-gray-50/50 backdrop-blur-xl rounded-xl text-gray-700 cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Cota TVA (%)
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const sumaTVA = parseFloat(transaction.totalTVA) || 0;
                        const sumaFaraTVA = parseFloat(transaction.totalWithoutTVA) || 0;
                        const tva = sumaTVA - sumaFaraTVA;
                        const cotaTVA = sumaTVA > 0 ? (tva / sumaFaraTVA) * 100 : 0;
                        return cotaTVA > 0 ? cotaTVA.toFixed(2) + '%' : '0.00%';
                      })()}
                      readOnly
                      className="w-[150px] px-4 py-2.5 border border-gray-300/50 bg-gray-50/50 backdrop-blur-xl rounded-xl text-gray-700 cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                </div>

                {/* TVA Deductibil / Luna P&L */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      TVA Deductibil
                    </label>
                    <CustomSelect
                      value={transaction.tvaDeductibil ? 'Da' : 'Nu'}
                      onChange={(value) => updateTransaction(index, 'tvaDeductibil', value === 'Da')}
                      options={['Da', 'Nu']}
                      className="w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Luna P&L
                    </label>
                    <MonthYearPicker
                      value={transaction.lunaP}
                      onChange={(value) => updateTransaction(index, 'lunaP', value)}
                      placeholder="Selectează luna"
                      className="w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                    />
                  </div>
                </div>

                {/* Cont / Subcont */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Cont
                    </label>
                    <CustomSelect
                      value={transaction.cont}
                      onChange={(value) => updateTransaction(index, 'cont', value)}
                      options={['- Please Choose -', 'Cont 1', 'Cont 2']}
                      className="w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                      hasError={errors.transactions?.[index]?.cont}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Subcont
                    </label>
                    <CustomSelect
                      value={transaction.subcont}
                      onChange={(value) => updateTransaction(index, 'subcont', value)}
                      options={['- Please choose -', 'Subcont 1', 'Subcont 2']}
                      className="w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                      hasError={errors.transactions?.[index]?.subcont}
                    />
                  </div>
                </div>

                {/* Descriere & Tags - pe acelasi rand, 2 coloane */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0 pt-2.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Descriere
                    </label>
                    <textarea
                      placeholder="Adauga descriere..."
                      rows={2}
                      value={transaction.descriere}
                      onChange={(e) => updateTransaction(index, 'descriere', e.target.value)}
                      className="w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] resize-none"
                      style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-gray-600 w-24 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Tags
                    </label>
                    <input
                      type="text"
                      placeholder="#platitdeSOLO #contributieR3"
                      value={transaction.tags || ''}
                      onChange={(e) => updateTransaction(index, 'tags', e.target.value)}
                      className="w-[150px] px-4 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      style={{ fontSize: '0.9375rem', fontWeight: 350 }}
                    />
                  </div>
                </div>

                {/* Salveaza Button - only show on last transaction */}
                {index === transactions.length - 1 && (
                  <div className="flex justify-center pt-2">
                    <button 
                      onClick={handleSave}
                      type="button"
                      className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
                    >
                      <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Salveaza</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            </Fragment>
          ))}
        </div>

        {/* Right Column - Upload & Document Preview (Desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Upload Section */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <div className="relative">
                <div 
                  className="w-full pl-4 pr-12 py-2.5 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-xl text-gray-900 cursor-pointer focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <span 
                    className={uploadedFileName ? 'text-gray-900' : 'text-gray-400'}
                    style={{ fontSize: '0.9375rem', fontWeight: uploadedFileName ? 400 : 350 }}
                  >
                    {uploadedFileName || 'Incarca un document'}
                  </span>
                </div>
                <label 
                  htmlFor="file-upload"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Upload size={14} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                    {uploadedFileName ? 'Change' : 'Upload'}
                  </span>
                </label>
              </div>
            </div>

            {/* Document Preview */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
              {uploadedImage ? (
                <div className="rounded-xl overflow-hidden border border-gray-200/50 shadow-sm">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded document" 
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-300/50 bg-gray-50/50 backdrop-blur-xl flex flex-col items-center justify-center py-32">
                  <Upload size={48} className="text-gray-300 mb-4" />
                  <p className="text-gray-400 text-center" style={{ fontSize: '0.9375rem', fontWeight: 400 }}>
                    Preview-ul documentului va apărea aici
                  </p>
                  <p className="text-gray-300 text-center mt-2" style={{ fontSize: '0.8125rem', fontWeight: 300 }}>
                    Încarcă un bon sau o factură
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowDatePicker(false)}
          />
          
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[360px]">
            <div className="bg-white/80 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 p-8 animate-in">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900">Select Date</h3>
                <button 
                  onClick={() => setShowDatePicker(false)}
                  className="p-1.5 hover:bg-white/70 rounded-full transition-colors"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 hover:bg-white/70 rounded-full transition-colors"
                >
                  <ArrowLeft size={18} className="text-gray-700" />
                </button>
                <span className="text-gray-900 text-sm">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 hover:bg-white/70 rounded-full transition-colors"
                >
                  <ArrowLeft size={18} className="text-gray-700 rotate-180" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-gray-500 text-xs py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getDaysInMonth(currentMonth).firstDayOfMonth }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}
                {Array.from({ length: getDaysInMonth(currentMonth).daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const isSelected = isSelectedDate(day);
                  
                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`aspect-square rounded-full flex items-center justify-center text-xs transition-all ${
                        isSelected
                          ? 'bg-gray-900/90 text-white shadow-md'
                          : 'text-gray-700 hover:bg-white/70'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 mt-5 pt-5 border-t border-gray-200/40">
                <button
                  onClick={() => {
                    setSelectedDate(null);
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-4 py-1.5 text-xs bg-gray-900/90 backdrop-blur-sm text-white rounded-full hover:bg-gray-900 transition-all shadow-md"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}