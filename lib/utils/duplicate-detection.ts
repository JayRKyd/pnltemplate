export interface PotentialDuplicate {
  id: string;
  uid: string;
  supplier: string;
  docNumber: string;
  expenseDate: string;
  amountWithVat: number;
  matchScore: number; // How many fields match (2-4)
  matchedFields: string[];
}

// Format duplicate warning message
export function formatDuplicateWarning(duplicates: PotentialDuplicate[]): string {
  if (duplicates.length === 0) return "";

  const dup = duplicates[0];
  const fields = dup.matchedFields.join(", ");
  
  return `Atenție: Există o cheltuială similară (${dup.uid || dup.id.slice(0, 8)}) cu aceleași: ${fields}. Sigur doriți să continuați?`;
}
