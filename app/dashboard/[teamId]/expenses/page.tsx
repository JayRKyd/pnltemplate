"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Search, Eye, Settings } from "lucide-react";
import { getTeamExpenses, TeamExpense, ExpenseFilters } from "@/app/actions/expenses";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import { formatAmount } from "@/lib/formatters";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
];

export default function ExpensesPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const [expenses, setExpenses] = useState<TeamExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadExpenses = useCallback(async () => {
    if (!params.teamId) return;

    setLoading(true);
    try {
      const filters: ExpenseFilters = {};
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const data = await getTeamExpenses(params.teamId, filters);
      setExpenses(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [params.teamId, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading..."
              : `${expenses.length} expense(s) • Total: ${formatAmount(totalAmount)} RON`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => router.push(`/dashboard/${params.teamId}/expenses/categories`)}
          >
            <Settings size={16} />
            Categories
          </button>
          <button
            className="flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            onClick={() => router.push(`/dashboard/${params.teamId}/expenses/new`)}
          >
            <Plus size={16} />
            New Expense
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium mb-1 text-muted-foreground">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier, description, ID..."
                className="w-full pl-9 pr-3 py-2 rounded-md border text-sm"
              />
            </div>
          </div>

          <div className="w-40">
            <label className="block text-xs font-medium mb-1 text-muted-foreground">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium mb-1 text-muted-foreground">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium mb-1 text-muted-foreground">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {(search || statusFilter || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No expenses found</p>
            <button
              onClick={() => router.push(`/dashboard/${params.teamId}/expenses/new`)}
              className="text-teal-600 hover:underline"
            >
              Create your first expense
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr
                  key={exp.id}
                  className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => router.push(`/dashboard/${params.teamId}/expenses/${exp.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {exp.expense_uid || exp.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">{exp.expense_date}</td>
                  <td className="px-4 py-3 font-medium">{exp.supplier || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                    {exp.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatAmount(exp.amount)} RON
                  </td>
                  <td className="px-4 py-3">
                    <ExpenseStatusBadge status={exp.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/${params.teamId}/expenses/${exp.id}`);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Eye size={16} className="text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
