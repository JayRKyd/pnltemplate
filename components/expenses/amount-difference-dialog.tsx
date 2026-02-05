"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface AmountDifferenceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expectedAmount: number;
  actualAmount: number;
  differencePercent: number;
  onConfirm: () => void;
  onUpdateTemplate: () => void;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AmountDifferenceDialog({
  isOpen,
  onClose,
  expectedAmount,
  actualAmount,
  differencePercent,
  onConfirm,
  onUpdateTemplate,
}: AmountDifferenceDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300, // Higher than convert dialog
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: "520px",
          margin: "16px",
          padding: "32px",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "rgba(254, 243, 199, 1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertTriangle size={24} style={{ color: "rgba(245, 158, 11, 1)" }} />
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "rgba(16, 24, 40, 1)",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          Diferență de sumă detectată
        </h2>

        {/* Description */}
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <p
            style={{
              color: "rgba(107, 114, 128, 1)",
              marginBottom: "16px",
              lineHeight: "1.5",
            }}
          >
            Suma reală (<strong>{formatAmount(actualAmount)} Lei</strong>) diferă
            cu <strong style={{ color: "rgba(245, 158, 11, 1)" }}>{differencePercent.toFixed(1)}%</strong> față
            de suma așteptată (<strong>{formatAmount(expectedAmount)} Lei</strong>).
          </p>

          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "rgba(254, 243, 199, 0.3)",
              borderRadius: "10px",
              fontSize: "14px",
              color: "rgba(120, 53, 15, 1)",
              border: "1px solid rgba(253, 224, 71, 0.3)",
            }}
          >
            Vrei să actualizezi template-ul recurent cu noua sumă sau să confirmi cheltuiala cu
            suma diferită?
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={onUpdateTemplate}
            style={{
              padding: "12px 24px",
              background:
                "linear-gradient(180deg, rgba(0, 212, 146, 1) 0%, rgba(81, 162, 255, 1) 100%)",
              color: "white",
              borderRadius: "9999px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              boxShadow: "0px 4px 15px rgba(0, 180, 150, 0.25)",
              fontSize: "14px",
            }}
          >
            Actualizează template & confirmă
          </button>

          <button
            onClick={onConfirm}
            style={{
              padding: "12px 24px",
              backgroundColor: "white",
              border: "1px solid rgba(17, 198, 182, 1)",
              color: "rgba(17, 198, 182, 1)",
              borderRadius: "9999px",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Confirmă oricum (fără update template)
          </button>

          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              border: "1px solid rgba(229, 231, 235, 1)",
              borderRadius: "9999px",
              color: "rgba(55, 65, 81, 1)",
              fontWeight: 500,
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}
