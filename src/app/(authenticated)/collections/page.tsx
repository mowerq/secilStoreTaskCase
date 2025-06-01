"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import { EditIcon } from "lucide-react";

// --- Type Definitions ---
interface CollectionFilter {
  id: string;
  title: string;
  value: string;
  valueName: string | null;
  currency: string | null;
  comparisonType: number;
}

interface CollectionInfo {
  id: number;
  name: string;
  description: string; // Contains HTML
  url: string;
  langCode: string;
}

interface CollectionProduct {
  productCode: string;
  colorCode: string | null;
  name: string;
  imageUrl: string;
}

interface Collection {
  id: number;
  filters: {
    useOrLogic: boolean;
    filters: CollectionFilter[] | null;
  };
  type: number; // 0 for manual, 1 for dynamic (based on filters)
  info: CollectionInfo;
  salesChannelId: number;
  products: CollectionProduct[] | null;
}

interface Meta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface CollectionsApiResponse {
  meta: Meta;
  data: Collection[];
}
// --- End Type Definitions ---

// Helper to format product conditions from filters
const formatProductConditions = (
  filters: CollectionFilter[] | null
): React.ReactNode => {
  if (!filters || filters.length === 0) {
    return <span className="italic">Otomatik (Filtre Yok)</span>;
  }
  return (
    <ul className="list-disc list-inside">
      {filters.map((f, index) => (
        <li
          key={index}
          className="truncate"
          title={`${f.title}: ${f.valueName || f.value}`}
        >
          {f.title}: {f.valueName || f.value}
        </li>
      ))}
    </ul>
  );
};

export default function CollectionsPage() {
  // `required: true` will redirect to login if not authenticated
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const pageSize = 10; // Number of items per page

  const fetchCollections = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/collectionsProxy?page=${page}&pageSize=${pageSize}`
        );

        if (!response.ok) {
          const status = response.status;
          let errorMessage = `API request failed with status ${status}`;
          try {
            const errorResult = await response.json();
            errorMessage = errorResult.error || errorMessage;
          } catch (e) {
            // Could not parse JSON, use status text or default
            errorMessage = response.statusText || errorMessage;
          }

          if (status === 401) {
            console.error("Unauthorized error from API. Signing out.");
            const { signOut } = await import("next-auth/react");
            signOut({ callbackUrl: "/login" });
            throw new Error("Unauthorized access. Redirecting to login.");
          }
          throw new Error(errorMessage);
        }
        const result: CollectionsApiResponse = await response.json();

        // The actual API nests 'meta' and 'data' inside a top-level 'data' object if status is 0,
        // or directly if the proxy just returns the content of responseBody.data
        // Let's assume the proxy simplifies and returns { meta, data } directly for this component
        setCollections(result.data || []); // Ensure data is an array
        setMeta(result.meta || null); // Ensure meta is an object or null
      } catch (err: any) {
        setError(err.message || "Koleksiyonlar yüklenirken bir hata oluştu.");
        console.error("Fetch collections error:", err);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  ); // No session dependency here as proxy handles auth if needed

  useEffect(() => {
    if (status === "authenticated") {
      fetchCollections(currentPage);
    }
  }, [status, currentPage, fetchCollections]);

  const handlePageChange = (newPage: number) => {
    if (
      newPage > 0 &&
      meta &&
      newPage <= meta.totalPages &&
      newPage !== currentPage
    ) {
      setCurrentPage(newPage);
    }
  };

  const handleEditConstants = (collectionId: number) => {
    router.push(`/edit/${collectionId}`); // Navigate to the edit page
  };

  // Loading state for initial load or when session is loading
  if (status === "loading" || (loading && collections.length === 0 && !error)) {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">{t("Error")}</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 sm:p-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sm:px-6"
              >
                {t("collectionsPage.tableHeaders.title")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sm:px-6"
              >
                {t("collectionsPage.tableHeaders.productConditions")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sm:px-6"
              >
                {t("collectionsPage.tableHeaders.salesChannel")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sm:px-6"
              >
                {t("collectionsPage.tableHeaders.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {collections.map((collection) => (
              <tr
                key={collection.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 sm:px-6">
                  {collection.info.name}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs sm:px-6">
                  {collection.type === 0 ? (
                    <span className="italic text-gray-600 dark:text-gray-400">
                      {t("collectionsPage.manualCollection")} (
                      {collection.products?.length || 0}{" "}
                      {t("collectionsPage.productCountSuffix")})
                    </span>
                  ) : (
                    formatProductConditions(collection.filters.filters)
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 sm:px-6">
                  {t("collectionsPage.salesChannelPrefix")}{" "}
                  {collection.salesChannelId}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-center sm:px-6">
                  {" "}
                  {/* Added text-center for icon alignment */}
                  <Tooltip title={t("collectionsPage.editConstantsButton")}>
                    <IconButton
                      onClick={() => handleEditConstants(collection.id)}
                      size="small"
                      aria-label={t("collectionsPage.editConstantsButton")}
                      className="p-3! text-indigo-600 hover:bg-indigo-100/50 dark:text-gray-400! dark:hover:text-gray-700! dark:hover:bg-gray-300! transition-colors duration-150"
                    >
                      <EditIcon className="h-5 w-5" />
                    </IconButton>
                  </Tooltip>
                </td>
              </tr>
            ))}
            {collections.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {t("collectionsPage.noCollectionsFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 0 && (
        <nav
          className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 px-2 sm:px-0"
          aria-label={t("common.pagination")}
        >
          <div className="flex-1 flex justify-between sm:justify-end">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!meta.hasPreviousPage || loading}
              className="cursor-pointer disabled:cursor-auto relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {t("common.previous")}
            </button>
            <div className="hidden sm:flex sm:items-center sm:ml-4">
              <span className="text-sm text-gray-700 dark:text-gray-400">
                {t("common.page")}{" "}
                <span className="font-medium text-gray-900 dark:text-gray-200">
                  {meta.page}
                </span>{" "}
                {t("common.of")}{" "}
                <span className="font-medium text-gray-900 dark:text-gray-200">
                  {meta.totalPages}
                </span>
              </span>
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!meta.hasNextPage || loading}
              className="cursor-pointer disabled:cursor-auto ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {t("common.next")}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
