"use client";

import React from "react";
import { Upload, X } from "lucide-react";
import { FormattedInput } from "./FormattedInput";
import { CustomSelect } from "./customselect";
import { MonthYearPicker } from "./monthyearpicker";

type Props = {
  uploadedImage: string | null;
  uploadedFileName: string;
  onFileUpload: (file: File) => void;
  onClearFile: () => void;
  furnizor: string;
  onFurnizorChange: (value: string) => void;
  onFurnizorBlur?: () => void;
  furnizorSuggestions?: string[];
  showFurnizorDropdown?: boolean;
  onSelectSupplier?: (supplier: any) => void;
  docType: string;
  onDocTypeChange: (value: string) => void;
  docNumber: string;
  onDocNumberChange: (value: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  plata: string;
  onPlataChange: (value: string) => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  totalAmount: number;
  onAmountChange: (value: number) => void;
  observatii: string;
  onObservatiiChange: (value: string) => void;
  onSubmit: () => void;
};

// Minimal layout to satisfy the test component; uses generic inputs and selectors.
export function NewExpenseFormLayoutC(props: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormattedInput
          label="Furnizor"
          value={props.furnizor}
          onChange={props.onFurnizorChange}
          placeholder="Introdu furnizor"
        />
        <FormattedInput
          label="Numar document"
          value={props.docNumber}
          onChange={props.onDocNumberChange}
          placeholder="Ex: INV-123"
        />
        <FormattedInput
          label="Plata"
          value={props.plata}
          onChange={props.onPlataChange}
          placeholder="Card / Cash"
        />
        <FormattedInput
          label="Suma"
          value={props.totalAmount}
          onChange={(v) => props.onAmountChange(Number(v))}
          placeholder="0.00"
          type="number"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm mb-1 text-gray-600">Tip document</label>
          <CustomSelect
            options={[
              { value: "Factura", label: "Factura" },
              { value: "Bon", label: "Bon" },
              { value: "Chitanta", label: "Chitanta" },
            ]}
            value={props.docType}
            onChange={props.onDocTypeChange}
            placeholder="Alege tip document"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-gray-600">Data</label>
          <MonthYearPicker
            selectedDate={props.selectedDate}
            onDateChange={props.onDateChange}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1 text-gray-600">Categorie</label>
        <CustomSelect
          multiple
          options={[
            { value: "Taxe", label: "Taxe" },
            { value: "Operare", label: "Operare" },
            { value: "Marketing", label: "Marketing" },
          ]}
          value={props.selectedCategories}
          onChange={props.onCategoriesChange}
          placeholder="Selecteaza categorii"
        />
      </div>

      <div>
        <label className="block text-sm mb-1 text-gray-600">Observatii</label>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
          rows={3}
          value={props.observatii}
          onChange={(e) => props.onObservatiiChange(e.target.value)}
          placeholder="Note optional"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) props.onFileUpload(file);
          }}
        />
        {props.uploadedFileName && (
          <div className="text-sm text-gray-700 flex items-center gap-2">
            <span>{props.uploadedFileName}</span>
            <button
              type="button"
              onClick={props.onClearFile}
              className="text-red-500 hover:underline"
            >
              Sterge
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={props.onSubmit}
        className="w-full md:w-auto px-6 py-3 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"
      >
        Salveaza
      </button>
    </div>
  );
}
