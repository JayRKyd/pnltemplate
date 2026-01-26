import { useState } from 'react';
import { X, ChevronRight, ChevronDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Subcategory {
  name: string;
}

interface Category {
  name: string;
  subcategories: Subcategory[];
  expanded: boolean;
}

interface BudgetTemplateFormProps {
  year: string;
  onClose: () => void;
  onSave: (template: BudgetTemplate) => void | Promise<void>;
  initialTemplate?: BudgetTemplate;
}

export interface BudgetTemplate {
  year: string;
  venituriCategories: Category[];
  cheltuieliCategories: Category[];
}

export function BudgetTemplateForm({ year, onClose, onSave, initialTemplate }: BudgetTemplateFormProps) {
  const [numVenituriCategories, setNumVenituriCategories] = useState(initialTemplate?.venituriCategories.length || 0);
  const [numCheltuieliCategories, setNumCheltuieliCategories] = useState(initialTemplate?.cheltuieliCategories.length || 0);
  const [venituriCategories, setVenituriCategories] = useState<Category[]>(initialTemplate?.venituriCategories || []);
  const [cheltuieliCategories, setCheltuieliCategories] = useState<Category[]>(initialTemplate?.cheltuieliCategories || []);
  const [venituriExpanded, setVenituriExpanded] = useState(false);
  const [cheltuieliExpanded, setCheltuieliExpanded] = useState(false);

  const handleNumVenituriChange = (value: string) => {
    const num = parseInt(value) || 0;
    setNumVenituriCategories(num);
    
    const newCategories = [...venituriCategories];
    if (num > venituriCategories.length) {
      for (let i = venituriCategories.length; i < num; i++) {
        newCategories.push({ name: '', subcategories: [], expanded: false });
      }
    } else {
      newCategories.splice(num);
    }
    setVenituriCategories(newCategories);
  };

  const handleNumCheltuieliChange = (value: string) => {
    const num = parseInt(value) || 0;
    setNumCheltuieliCategories(num);
    
    const newCategories = [...cheltuieliCategories];
    if (num > cheltuieliCategories.length) {
      for (let i = cheltuieliCategories.length; i < num; i++) {
        newCategories.push({ name: '', subcategories: [], expanded: false });
      }
    } else {
      newCategories.splice(num);
    }
    setCheltuieliCategories(newCategories);
  };

  const handleVenituriCategoryNameChange = (index: number, name: string) => {
    const newCategories = [...venituriCategories];
    newCategories[index].name = name;
    setVenituriCategories(newCategories);
  };

  const handleCheltuieliCategoryNameChange = (index: number, name: string) => {
    const newCategories = [...cheltuieliCategories];
    newCategories[index].name = name;
    setCheltuieliCategories(newCategories);
  };

  const toggleVenituriCategoryExpanded = (index: number) => {
    const newCategories = [...venituriCategories];
    newCategories[index].expanded = !newCategories[index].expanded;
    setVenituriCategories(newCategories);
  };

  const toggleCheltuieliCategoryExpanded = (index: number) => {
    const newCategories = [...cheltuieliCategories];
    newCategories[index].expanded = !newCategories[index].expanded;
    setCheltuieliCategories(newCategories);
  };

  const handleVenituriSubcategoriesCountChange = (categoryIndex: number, count: string) => {
    const num = parseInt(count) || 0;
    const newCategories = [...venituriCategories];
    const category = newCategories[categoryIndex];
    
    if (num > category.subcategories.length) {
      for (let i = category.subcategories.length; i < num; i++) {
        category.subcategories.push({ name: '' });
      }
    } else {
      category.subcategories.splice(num);
    }
    setVenituriCategories(newCategories);
  };

  const handleCheltuieliSubcategoriesCountChange = (categoryIndex: number, count: string) => {
    const num = parseInt(count) || 0;
    const newCategories = [...cheltuieliCategories];
    const category = newCategories[categoryIndex];
    
    if (num > category.subcategories.length) {
      for (let i = category.subcategories.length; i < num; i++) {
        category.subcategories.push({ name: '' });
      }
    } else {
      category.subcategories.splice(num);
    }
    setCheltuieliCategories(newCategories);
  };

  const handleVenituriSubcategoryNameChange = (categoryIndex: number, subcategoryIndex: number, name: string) => {
    const newCategories = [...venituriCategories];
    newCategories[categoryIndex].subcategories[subcategoryIndex].name = name;
    setVenituriCategories(newCategories);
  };

  const handleCheltuieliSubcategoryNameChange = (categoryIndex: number, subcategoryIndex: number, name: string) => {
    const newCategories = [...cheltuieliCategories];
    newCategories[categoryIndex].subcategories[subcategoryIndex].name = name;
    setCheltuieliCategories(newCategories);
  };

  const handleSave = async () => {
    // Call onSave and let parent handle the close
    await onSave({
      year,
      venituriCategories: venituriCategories.filter(cat => cat.name.trim() !== ''),
      cheltuieliCategories: cheltuieliCategories.filter(cat => cat.name.trim() !== '')
    });
    // Don't call onClose here - parent will handle navigation after save completes
  };

  const handleDownload = () => {
    const template: BudgetTemplate = {
      year,
      venituriCategories: venituriCategories.filter(cat => cat.name.trim() !== ''),
      cheltuieliCategories: cheltuieliCategories.filter(cat => cat.name.trim() !== '')
    };

    const workbook = XLSX.utils.book_new();
    
    // Header row with months
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const headerRow = ['Categorie', ...months, 'Total'];
    
    // Build data rows
    const sheetData: any[][] = [headerRow];
    
    // Add Venituri section
    sheetData.push(['Venituri', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    template.venituriCategories.forEach((cat, catIndex) => {
      sheetData.push([`${catIndex + 1}. ${cat.name}`, '', '', '', '', '', '', '', '', '', '', '', '', '']);
      cat.subcategories.forEach((subcat, subIndex) => {
        sheetData.push([`  ${catIndex + 1}.${subIndex + 1} ${subcat.name}`, '', '', '', '', '', '', '', '', '', '', '', '', '']);
      });
    });
    
    // Add empty row separator
    sheetData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    
    // Add Cheltuieli section
    sheetData.push(['Cheltuieli', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    template.cheltuieliCategories.forEach((cat, catIndex) => {
      sheetData.push([`${catIndex + 1}. ${cat.name}`, '', '', '', '', '', '', '', '', '', '', '', '', '']);
      cat.subcategories.forEach((subcat, subIndex) => {
        sheetData.push([`  ${catIndex + 1}.${subIndex + 1} ${subcat.name}`, '', '', '', '', '', '', '', '', '', '', '', '', '']);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 40 }, // Categorie column
      ...months.map(() => ({ wch: 12 })), // Month columns
      { wch: 12 } // Total column
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, `Buget ${year}`);
    XLSX.writeFile(workbook, `Template_Buget_${year}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro", Roboto, sans-serif' }}>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#212529' }}>
              Template Buget {year}
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="px-6 py-2 rounded-full bg-white border-2 border-teal-600 text-gray-700 hover:bg-teal-50 transition-all flex items-center gap-2"
                style={{ fontSize: '14px', fontWeight: 400 }}
              >
                <Download size={16} />
                Descarcă Excel
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-gray-100/80 hover:bg-gray-200/80 transition-all flex items-center justify-center"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30">
          
          {/* Venituri Row */}
          <div 
            className="px-6 border-b border-gray-200/50 hover:bg-[#F1F3F5] transition-colors"
            style={{ 
              display: 'grid',
              gridTemplateColumns: '200px 48px 1fr',
              gap: '1rem',
              alignItems: 'center',
              minHeight: '48px'
            }}
          >
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setVenituriExpanded(!venituriExpanded)}
              style={{ fontSize: '15px', fontWeight: 500, color: '#212529', paddingTop: '10px', paddingBottom: '10px' }}
            >
              {venituriExpanded ? (
                <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
              )}
              Venituri
            </div>
            <div>
              <input
                type="number"
                min="0"
                value={numVenituriCategories || 0}
                onChange={(e) => handleNumVenituriChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-500 transition-all"
                style={{ fontSize: '14px', fontWeight: 300, height: '36px', width: '48px' }}
                placeholder=""
              />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 300, color: '#6B7280' }}>
              categorii
            </div>
          </div>

          {/* Venituri Categories - Expanded */}
          {venituriExpanded && venituriCategories.map((category, catIndex) => (
            <div key={catIndex}>
              {/* Category Row */}
              <div 
                className="px-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors bg-gray-50/20"
                style={{ 
                  display: 'grid',
                  gridTemplateColumns: '60px 196px 48px 1fr',
                  gap: '0.5rem',
                  alignItems: 'center',
                  minHeight: '48px'
                }}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVenituriCategoryExpanded(catIndex)}
                    className="p-1 hover:bg-gray-200/50 rounded transition-colors flex-shrink-0"
                  >
                    {category.expanded ? (
                      <ChevronDown size={12} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={12} className="text-gray-500" />
                    )}
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#6B7280' }}>
                    {catIndex + 1}.
                  </span>
                </div>
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => handleVenituriCategoryNameChange(catIndex, e.target.value)}
                  className="px-3 py-2 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-500 transition-all"
                  style={{ fontSize: '13px', fontWeight: 250, height: '36px', width: '196px' }}
                  placeholder="Categorie"
                />
                <input
                  type="number"
                  min="0"
                  value={category.subcategories.length || 0}
                  onChange={(e) => handleVenituriSubcategoriesCountChange(catIndex, e.target.value)}
                  className="px-3 py-2 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-500 transition-all"
                  style={{ fontSize: '14px', fontWeight: 300, height: '36px', width: '48px' }}
                  placeholder=""
                />
                <div style={{ fontSize: '12px', fontWeight: 300, color: '#6B7280' }}>
                  subcategorii
                </div>
              </div>

              {/* Subcategories */}
              {category.expanded && category.subcategories.map((subcat, subIndex) => (
                <div 
                  key={subIndex}
                  className="pl-16 pr-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors bg-gray-50/50"
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: '60px 196px 48px 1fr',
                    gap: '0.5rem',
                    alignItems: 'center',
                    minHeight: '40px'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '12px', fontWeight: 300, color: '#6B7280' }}>
                      {catIndex + 1}.{subIndex + 1}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={subcat.name}
                    onChange={(e) => handleVenituriSubcategoryNameChange(catIndex, subIndex, e.target.value)}
                    className="px-3 py-2 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-500 transition-all"
                    style={{ fontSize: '12px', fontWeight: 150, height: '32px', width: '196px' }}
                    placeholder="Subcategorie"
                  />
                  <div></div>
                  <div></div>
                </div>
              ))}
            </div>
          ))}

          {/* Cheltuieli Row */}
          <div 
            className="px-6 border-b border-gray-200/50 hover:bg-[#F1F3F5] transition-colors"
            style={{ 
              display: 'grid',
              gridTemplateColumns: '200px 48px 1fr',
              gap: '1rem',
              alignItems: 'center',
              minHeight: '48px'
            }}
          >
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setCheltuieliExpanded(!cheltuieliExpanded)}
              style={{ fontSize: '15px', fontWeight: 500, color: '#212529', paddingTop: '10px', paddingBottom: '10px' }}
            >
              {cheltuieliExpanded ? (
                <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
              )}
              Cheltuieli
            </div>
            <div>
              <input
                type="number"
                min="0"
                value={numCheltuieliCategories || 0}
                onChange={(e) => handleNumCheltuieliChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-500 transition-all"
                style={{ fontSize: '14px', fontWeight: 300, height: '36px', width: '48px' }}
                placeholder=""
              />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 300, color: '#6B7280' }}>
              categorii
            </div>
          </div>

          {/* Cheltuieli Categories - Expanded */}
          {cheltuieliExpanded && cheltuieliCategories.map((category, catIndex) => (
            <div key={catIndex}>
              {/* Category Row */}
              <div 
                className="px-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors bg-gray-50/20"
                style={{ 
                  display: 'grid',
                  gridTemplateColumns: '60px 196px 48px 1fr',
                  gap: '0.5rem',
                  alignItems: 'center',
                  minHeight: '48px'
                }}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCheltuieliCategoryExpanded(catIndex)}
                    className="p-1 hover:bg-gray-200/50 rounded transition-colors flex-shrink-0"
                  >
                    {category.expanded ? (
                      <ChevronDown size={12} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={12} className="text-gray-500" />
                    )}
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#6B7280' }}>
                    {catIndex + 1}.
                  </span>
                </div>
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => handleCheltuieliCategoryNameChange(catIndex, e.target.value)}
                  className="px-3 py-2 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-500 transition-all"
                  style={{ fontSize: '13px', fontWeight: 250, height: '36px', width: '196px' }}
                  placeholder="Categorie"
                />
                <input
                  type="number"
                  min="0"
                  value={category.subcategories.length || 0}
                  onChange={(e) => handleCheltuieliSubcategoriesCountChange(catIndex, e.target.value)}
                  className="px-3 py-2 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-500 transition-all"
                  style={{ fontSize: '14px', fontWeight: 300, height: '36px', width: '48px' }}
                  placeholder=""
                />
                <div style={{ fontSize: '12px', fontWeight: 300, color: '#6B7280' }}>
                  subcategorii
                </div>
              </div>

              {/* Subcategories */}
              {category.expanded && category.subcategories.map((subcat, subIndex) => (
                <div 
                  key={subIndex}
                  className="pl-16 pr-6 py-1.5 border-b border-gray-200/30 hover:bg-gray-50/30 transition-colors bg-gray-50/50"
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: '60px 196px 48px 1fr',
                    gap: '0.5rem',
                    alignItems: 'center',
                    minHeight: '40px'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '12px', fontWeight: 300, color: '#6B7280' }}>
                      {catIndex + 1}.{subIndex + 1}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={subcat.name}
                    onChange={(e) => handleCheltuieliSubcategoryNameChange(catIndex, subIndex, e.target.value)}
                    className="px-3 py-2 border border-gray-300/50 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:border-teal-500 transition-all"
                    style={{ fontSize: '12px', fontWeight: 150, height: '32px', width: '196px' }}
                    placeholder="Subcategorie"
                  />
                  <div></div>
                  <div></div>
                </div>
              ))}
            </div>
          ))}

        </div>
      </div>

      {/* Save Button */}
      <div className="px-8 py-6 flex justify-center gap-4">
        <button
          onClick={handleSave}
          className="px-8 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-[0_2px_8px_rgba(13,148,136,0.3)]"
          style={{ fontSize: '14px', fontWeight: 400 }}
        >
          Salvează Template
        </button>
      </div>
    </div>
  );
}