"use client";

/**
 * WidgetList Component
 *
 * Displays a list of widgets with search, filter, and sorting capabilities.
 *
 * @see US-027: Listar Meus Widgets
 */

import { useState, useMemo, useCallback } from "react";
import { WidgetCard } from "./WidgetCard";
import type { Widget } from "../../lib/api";

export interface WidgetListProps {
  widgets: Widget[];
  isLoading: boolean;
  error: string | null;
  onEdit?: (widget: Widget) => void;
  onDuplicate?: (widget: Widget) => void;
  onDelete?: (widget: Widget) => void;
  onView?: (widget: Widget) => void;
  onRefresh?: () => void;
}

type SortOption = "newest" | "oldest" | "name" | "updated";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "name", label: "Nome (A-Z)" },
  { value: "updated", label: "Última atualização" },
];

const CHART_TYPE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "line", label: "Linha" },
  { value: "bar", label: "Barras" },
  { value: "pie", label: "Pizza" },
  { value: "donut", label: "Donut" },
];

export function WidgetList({
  widgets,
  isLoading,
  error,
  onEdit,
  onDuplicate,
  onDelete,
  onView,
  onRefresh,
}: WidgetListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [chartTypeFilter, setChartTypeFilter] = useState("all");

  // Filter and sort widgets
  const filteredWidgets = useMemo(() => {
    let result = [...widgets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (widget) =>
          widget.name.toLowerCase().includes(query) ||
          widget.description?.toLowerCase().includes(query)
      );
    }

    // Chart type filter
    if (chartTypeFilter !== "all") {
      result = result.filter(
        (widget) => widget.chartType.toLowerCase() === chartTypeFilter
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        break;
      case "updated":
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return result;
  }, [widgets, searchQuery, sortBy, chartTypeFilter]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
  }, []);

  const handleTypeFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setChartTypeFilter(e.target.value);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setChartTypeFilter("all");
    setSortBy("newest");
  }, []);

  const hasActiveFilters = searchQuery.trim() || chartTypeFilter !== "all";

  // Loading state
  if (isLoading && widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500">Carregando widgets...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <ErrorIcon className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar widgets</h3>
        <p className="text-gray-500 mb-4 max-w-md">{error}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Limpar busca"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={chartTypeFilter}
            onChange={handleTypeFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
            aria-label="Filtrar por tipo de gráfico"
          >
            {CHART_TYPE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={handleSortChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
            aria-label="Ordenar por"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Limpar filtros"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {filteredWidgets.length === widgets.length
            ? `${widgets.length} widget${widgets.length !== 1 ? "s" : ""}`
            : `${filteredWidgets.length} de ${widgets.length} widgets`}
        </span>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        )}
      </div>

      {/* Empty state */}
      {widgets.length === 0 ? (
        <EmptyState />
      ) : filteredWidgets.length === 0 ? (
        <NoResultsState onClear={clearFilters} />
      ) : (
        /* Widget Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWidgets.map((widget) => (
            <div key={widget.id} className="relative">
              <WidgetCard
                widget={widget}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onView={onView}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Empty state when user has no widgets.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <WidgetIcon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Nenhum widget salvo
      </h3>
      <p className="text-gray-500 max-w-md mb-6">
        Crie gráficos no chat e salve-os como widgets para visualizá-los aqui.
        Os widgets podem ser adicionados aos seus dashboards.
      </p>
      <a
        href="/"
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Ir para o Chat
      </a>
    </div>
  );
}

/**
 * No results state when filters return empty.
 */
function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <SearchIcon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Nenhum resultado encontrado
      </h3>
      <p className="text-gray-500 mb-4">
        Tente ajustar os filtros ou a busca.
      </p>
      <button
        onClick={onClear}
        className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
      >
        Limpar filtros
      </button>
    </div>
  );
}

// Icons
function LoadingSpinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function ErrorIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function WidgetIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
