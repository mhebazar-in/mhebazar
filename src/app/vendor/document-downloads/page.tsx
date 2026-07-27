// src/app/vendor/document-downloads/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { FileText, Percent, Inbox } from "lucide-react";
import api from "@/lib/api";

type DocumentDownload = {
  id: number;
  document_type: "offer" | "brochure";
  file_name: string;
  downloaded_at: string;
  product: number;
  product_name: string;
  user: number;
  user_name: string;
  user_email?: string;
};

type FilterType = "all" | "offer" | "brochure";

const ROWS_PER_PAGE = 10;

export default function VendorDocumentDownloadsPage() {
  const [downloads, setDownloads] = useState<DocumentDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        setLoading(true);
        // Backend scopes this to the logged-in vendor's own products.
        const response = await api.get("/products/document-downloads/");
        const data = response.data?.results || response.data || [];
        setDownloads(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error("Failed to load document downloads:", err);
        setError("Failed to load download history. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDownloads();
  }, []);

  const filteredDownloads = useMemo(() => {
    if (filter === "all") return downloads;
    return downloads.filter((d) => d.document_type === filter);
  }, [downloads, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDownloads.length / ROWS_PER_PAGE)
  );
  const currentRows = filteredDownloads.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Document Downloads
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              See who downloaded your product brochures and offers.
            </p>
          </div>

          <Tabs
            value={filter}
            onValueChange={(v) => {
              setFilter(v as FilterType);
              setCurrentPage(1);
            }}
          >
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="brochure">Brochure</TabsTrigger>
              <TabsTrigger value="offer">Offer</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {currentRows.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No downloads yet
                </h3>
                <p className="text-sm text-gray-500">
                  Once a logged-in user downloads a brochure or offer, it
                  will show up here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Downloaded By</TableHead>
                    <TableHead className="text-right">Date &amp; Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        {row.product_name || `Product #${row.product}`}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                            row.document_type === "offer"
                              ? "text-orange-700 bg-orange-50"
                              : "text-blue-700 bg-blue-50"
                          }`}
                        >
                          {row.document_type === "offer" ? (
                            <Percent className="w-3 h-3" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          {row.document_type === "offer" ? "Offer" : "Brochure"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 truncate max-w-[200px]">
                        {row.file_name}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {row.user_name}
                        {row.user_email && (
                          <span className="block text-xs text-gray-400">
                            {row.user_email}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-gray-500 text-sm">
                        {new Date(row.downloaded_at).toLocaleString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                      className={
                        currentPage === i + 1
                          ? "bg-[#5CA131] text-white hover:bg-[#4A8127]"
                          : "hover:bg-green-50"
                      }
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
