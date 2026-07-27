// src/components/products/ProductListing.tsx
"use client";

import React, { useState } from "react";
import { ChevronDown, List, Menu, X } from "lucide-react";
import { ProductCardContainer } from "@/components/elements/Product";
import dynamic from "next/dynamic";
const SideFilter = dynamic(() => import("./SideFilter"), {
  loading: () => <div className="w-64 h-screen bg-gray-100 animate-pulse" />,
  ssr: false, // Filters are purely client-side interactive
});
import Image from "next/image";
import { Toaster, toast } from "sonner";
import QuoteForm from "../forms/enquiryForm/quotesForm";
import DOMPurify from 'dompurify';
import { IoGrid } from "react-icons/io5";
import { useRouter } from "next/navigation";
import RentalForm from "../forms/enquiryForm/rentalForm";
import { useUser } from "@/context/UserContext"; // Added useUser import

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Badge } from "@/components/ui/badge";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import api from "@/lib/api";

export interface Product {
  type: string;
  id: string;
  image: string;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  direct_sale: boolean;
  category_name: string;
  subcategory_name: string | null;
  is_active: boolean;
  hide_price: boolean;
  stock_quantity: number;
  manufacturer: string;
  average_rating: number | null;
  category_id: number | null;
  model: string | null;
  user_name: string;
  created_at: string | null;
}

interface ProductGridProps {
  products: Product[];
  viewMode?: "grid" | "list";
  noProductsMessage: string | null;
  pageUrlType: string;
  isInitialPage?: boolean;
}

const badgeStyles = {
  new: "border-green-400 bg-green-100 text-green-800",
  used: "border-yellow-400 bg-yellow-100 text-yellow-800",
  rental: "border-blue-400 bg-blue-100 text-blue-800",
  attachments: "border-slate-400 bg-slate-100 text-slate-800",
};

const showNewBadge = (createdAt: string | null | undefined) => {
  if (!createdAt) return false;
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const productDate = new Date(createdAt);
  const currentDate = new Date();
  const differenceInMs = currentDate.getTime() - productDate.getTime();
  return differenceInMs <= thirtyDaysInMs;
};

function ProductGrid({
  products,
  viewMode = "grid",
  noProductsMessage,
  pageUrlType,
  isInitialPage = true,
}: ProductGridProps) {
  const router = useRouter();
  const { addToCart, isProductInCart, user } = useUser();
  const [fallbackProducts, setFallbackProducts] = React.useState<Product[]>([]);
  const [isFallbackLoading, setIsFallbackLoading] = React.useState(false);

  // 1. Fetch Fallback Logic
  React.useEffect(() => {
    if (products.length === 0) {
      const fetchMHEProducts = async () => {
        setIsFallbackLoading(true);
        try {
          let response;
          let fetchedSpecial = false;
          const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

          const specialCategoryUrls: Record<string, string> = {
            "/forklift-attachments/tissue-roll-clamp": "forklift-attachments",
            "/forklift-attachments/forks-plus": "forklift-attachments",
            "/forklift-attachments/double-deep": "forklift-attachments",
            "/forklift-attachments/hose-reel": "forklift-attachments",
            "/conveyor/truckloading-conveyor": "conveyor",
            "/conveyor/belt-conveyor": "conveyor",
            "/conveyor/modular-belt-conveyor": "conveyor",
            "/conveyor/slat-belt-conveyor": "conveyor",
            "/conveyor/telescopic-conveyor": "conveyor",
            "/conveyor/roller-conveyor": "conveyor",
            "/conveyor/skate-wheel-conveyor": "conveyor",
            "/conveyor/gravity-spiral-roller-conveyor": "conveyor",
            "/wrapping-machine/stretch-wrapping-machine": "wrapping-machine",
            "/wrapping-machine/paper-roll-stretch-wrapping-machine": "wrapping-machine",
            "/wrapping-machine/top-pressure-pallet-stretch-wrapping-machine": "wrapping-machine",
            "/wrapping-machine/box-stretch-wrapping-machine": "wrapping-machine"
          };

          if (pathname && specialCategoryUrls[pathname]) {
            const targetSlug = specialCategoryUrls[pathname];
            const formattedParamName = targetSlug.replace(/-/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            
            try {
              const catRes = await api.get(`/categories/?name=${formattedParamName}`);
              if (catRes.data && catRes.data.length > 0) {
                const catId = catRes.data[0].id;
                const targetProdRes = await api.get(`/products/?category=${catId}&page_size=1to12`);
                if (targetProdRes.data && targetProdRes.data.results && targetProdRes.data.results.length > 0) {
                  response = targetProdRes;
                  fetchedSpecial = true;
                }
              }
            } catch (err) {
              console.error("Error fetching special category products", err);
            }
          }

          if (!fetchedSpecial) {
            // Changed query param to 'user' as per your URL sample
            response = await api.get('/products/?user=24&page_size=1to12');
          }

          if (response?.data && response.data.results) {
            const transformed = response.data.results.map((p: any) => ({
              id: p.id.toString(),
              image: p.images?.[0]?.image || "/placeholder.jpg",
              title: p.name,
              subtitle: p.description,
              price: parseFloat(p.price),
              currency: "₹",
              direct_sale: p.direct_sale,
              category_name: p.category_name,
              subcategory_name: p.subcategory_name,
              is_active: p.is_active,
              hide_price: p.hide_price,
              stock_quantity: p.stock_quantity,
              manufacturer: p.manufacturer,
              average_rating: p.average_rating,
              category_id: p.category,
              model: p.model,
              user_name: p.user_name,
              created_at: p.created_at
            }));
            setFallbackProducts(transformed);
          }
        } catch (error) {
          console.error("Error fetching MHE Bazar products", error);
        } finally {
          setIsFallbackLoading(false);
        }
      };
      fetchMHEProducts();
    }
  }, [products.length]);

  // 2. consolidated empty products logic
  if (products.length === 0) {
    // if (isFallbackLoading) {
    //   return (
    //     <div className="flex justify-center items-center py-20 w-full">
    //       <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
    //     </div>
    //   );
    // }

    // This is the critical fix: return the fallbackProducts grid here!
    return (
      <div className="w-full">
        <div className="mb-8 border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold text-gray-800  tracking-tight">Recommended for You </h3>
          <p className="text-gray-400 text-sm italic mt-1">No exact matches found. Showing top picks from MHE Bazar.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 p-2 sm:p-4 md:p-6">
          {fallbackProducts.map((product: Product, index: number) => (
            <ProductCardContainer
              key={product.id}
              id={parseInt(product.id, 10)}
              image={product.image}
              title={product.title}
              subtitle={product.subtitle}
              price={product.price}
              currency={product.currency}
              directSale={product.direct_sale}
              is_active={product.is_active}
              hide_price={product.hide_price}
              type={product.type}
              stock_quantity={product.stock_quantity}
              category_id={product.category_id}
              pageUrlType={pageUrlType}
              model={product.model}
              manufacturer={product.manufacturer}
              user_name={product.user_name}
              created_at={product.created_at}
              priority={isInitialPage && index < 2}
            />
          ))}
        </div>
      </div>
    );
  }  // Determine button logic based on URL type
  const isRentalPage = pageUrlType === 'rental';
  const isUsedPage = pageUrlType === 'used';
  const buttonText = isRentalPage ? "Rent Now" : "Get a Quote";

  // Handlers for List View
  const handleAddToCart = async (productId: number) => {
    if (!user) {
      toast.error("Please log in to add products to your cart.");
      router.push("/login");
      return;
    }
    if (isProductInCart(productId)) {
      toast.info("This product is already in your cart.");
      return;
    }

    const success = await addToCart(productId);
    if (success) {
      toast.success("Product added to cart!", {
        action: {
          label: "View Cart",
          onClick: () => router.push("/cart"),
        },
      });
    } else {
      toast.error("Failed to add product to cart.");
    }
  };

  const handleBuyNow = async (productId: number) => {
    if (!user) {
      toast.error("Please log in to proceed with purchase.");
      router.push("/login");
      return;
    }

    if (!isProductInCart(productId)) {
      await addToCart(productId);
    }
    router.push("/cart");
  };

  if (viewMode === "list") {
    return (
      <div className="space-y-4 md:space-y-6">
        {products.map((product: Product, index: number) => (
          <div
            key={product.id}
            className={`group bg-white rounded-xl shadow-sm border-2 border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-green-50/30 transition-all duration-300 overflow-hidden backdrop-blur-sm ${(!product.is_active || (product.direct_sale && product.stock_quantity === 0))
              ? 'opacity-60 pointer-events-none grayscale-[0.3]'
              : 'hover:shadow-lg hover:border-green-200 hover:-translate-y-1'
              }`}
          >
            <div className="flex flex-col sm:flex-row items-stretch">
              {/* Image Section */}
              <div className="w-full sm:w-32 md:w-44 lg:w-52 flex-shrink-0 relative overflow-hidden p-4 sm:p-5 md:p-6">
                <Image
                  src={product.image}
                  alt={product.title}
                  width={300}
                  height={300}
                  className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
                  quality={90}
                  priority={isInitialPage && index < 2}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Content Section */}
              <div className="flex-1 p-4 sm:p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between min-h-[140px] sm:min-h-[128px] md:min-h-[144px] lg:min-h-[160px]">
                {/* Product Info */}
                <div className="flex-1 min-w-0 mb-4 sm:mb-0 sm:pr-6 w-full">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {Array.isArray(product.type) &&
                      product.type.map((type, index) => {
                        // CASE 1: Handle the special logic for the 'new' badge.
                        if (type === "new") {
                          return (
                            showNewBadge(product.created_at) && (
                              <Badge
                                key={index}
                                className={badgeStyles.new || "default-new-badge"}
                              >
                                New
                              </Badge>
                            )
                          );
                        }

                        // CASE 2: Handle all other badge types.
                        const badgeStyle = badgeStyles[type as keyof typeof badgeStyles] || "default-badge-style";
                        return (
                          <Badge
                            key={index}
                            className={badgeStyle}
                          >
                            {/* Capitalize the first letter for better display */}
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Badge>
                        );
                      })}

                    {/* Availability badge for category 18 */}
                    {product.category_id == 18 && (
                      <Badge
                        className={
                          product.stock_quantity > 0
                            ? "border-green-400 bg-green-100 text-green-800"
                            : "border-red-400 bg-red-100 text-red-800"
                        }
                      >
                        {product.is_active
                          ? product.stock_quantity > 0
                            ? `Available`
                            : "Unavailable"
                          : "Inactive"}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors duration-200">
                    {product.title}
                  </h3>
                  <div className="text-sm sm:text-base md:text-lg text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: typeof window !== 'undefined'
                          ? DOMPurify.sanitize(product.subtitle)
                          : product.subtitle // On server, send raw text to avoid the crash
                      }}
                    />
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    {(product.hide_price == true || Number(product.price) <= 0) ? (
                      <span className="text-xl md:text-2xl font-bold text-gray-400 tracking-wider">
                        {product.currency} *******
                      </span>
                    ) : (
                      <span className="text-xl md:text-2xl lg:text-3xl font-bold text-emerald-600 tracking-wide">
                        {product.currency} {typeof product.price === "number" ? product.price.toLocaleString("en-IN") : parseFloat(String(product.price)).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-row sm:flex-col gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
                  {product.direct_sale ? (
                    <>
                      <button
                        onClick={() => handleAddToCart(parseInt(product.id, 10))} // Added onClick
                        className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap min-w-[120px] sm:min-w-[140px]"
                        disabled={!product.is_active || product.stock_quantity === 0}
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => handleBuyNow(parseInt(product.id, 10))} // Added onClick
                        className="flex-1 sm:flex-none bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap min-w-[120px] sm:min-w-[140px]"
                        disabled={!product.is_active || product.stock_quantity === 0}
                      >
                        Buy Now
                      </button>
                    </>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          className="flex items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 py-2.5 sm:py-3 px-4 sm:px-6 text-white font-semibold transition-all duration-200 w-full sm:w-auto shadow-md hover:shadow-lg transform hover:-translate-y-0.5 min-w-[120px] sm:min-w-[140px]"
                          aria-label={buttonText}
                          disabled={!product.is_active}
                        >
                          {buttonText}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="w-full sm:max-w-2xl">
                        {isRentalPage ? (
                          <RentalForm
                            productId={parseInt(product.id, 10)}
                            productDetails={{
                              image: product.image,
                              title: product.title,
                              description: product.subtitle,
                              price: product.price,
                              stock_quantity: product.stock_quantity
                            }}
                            onClose={() => document.querySelector<HTMLButtonElement>('[data-dialog-close]')?.click()}
                          />
                        ) : (
                          <QuoteForm product={product as any} onClose={() => document.querySelector<HTMLButtonElement>('[data-dialog-close]')?.click()}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 p-2 sm:p-4 md:p-6">
      {products.map((product: Product, index: number) => (
        // console.log(product),
        <ProductCardContainer
          key={product.id}
          id={parseInt(product.id, 10)}
          image={product.image}
          title={product.title}
          subtitle={product.subtitle}
          price={product.price}
          currency={product.currency}
          directSale={product.direct_sale}
          is_active={product.is_active}
          hide_price={product.hide_price}
          type={product.type}
          stock_quantity={product.stock_quantity}
          category_id={product.category_id}
          pageUrlType={pageUrlType}
          model={product.model}
          manufacturer={product.manufacturer}
          user_name={product.user_name}
          created_at={product.created_at}
          priority={isInitialPage && index < 2}
        />
      ))}
    </div>
  );
}

interface ProductListingProps {
  sponsorBanner?: React.ReactNode;
  products: Product[];
  title?: string;
  totalCount: number;
  onFilterChange: (
    filterValue: string | number,
    filterType: "category" | "subcategory" | "type" | "price_range" | "manufacturer" | "rating" | "sort_by",
    newValue?: number | string | string[] | { min: number | ''; max: number | '' } | null
  ) => void;
  selectedFilters: Set<string>;
  selectedCategoryName: string | null;
  selectedSubcategoryName: string | null;
  selectedTypeName: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  noProductsMessage: string | null;
  minPrice: number | '';
  maxPrice: number | '';
  selectedManufacturer: string | null;
  selectedRating: number | null;
  sortBy: string;
  onSortChange: (value: string) => void;
  showManufacturerFilter?: boolean;
  pageUrlType: string;
}

export default function ProductListing({
  sponsorBanner,
  products,
  title,
  totalCount,
  onFilterChange,
  selectedFilters,
  selectedCategoryName,
  selectedSubcategoryName,
  selectedTypeName,
  currentPage,
  totalPages,
  onPageChange,
  noProductsMessage = null,
  minPrice,
  maxPrice,
  selectedManufacturer,
  selectedRating,
  sortBy,
  onSortChange,
  showManufacturerFilter = true,
  pageUrlType,
}: ProductListingProps) {
  const [currentView, setCurrentView] = useState<"grid" | "list">("grid");
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const router = useRouter();


  const handleViewChange = (view: "grid" | "list") => {
    setCurrentView(view);
  };

  const isUsedOrRentalPage = selectedTypeName === "Used" || selectedTypeName === "Rental";

  const handleToggle = (type: "used" | "rental") => {
    router.push(`/${type}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/30">
      <Toaster position="top-right" richColors />
      <div className="flex flex-col lg:flex-row">

        {/* --- START: Conditional Rendering for Filters --- */}
        <>
          {/* Desktop Sidebar */}
          <div className="hidden lg:block flex-shrink-0 w-fit">
            <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto">
              <SideFilter
                selectedFilters={selectedFilters}
                onFilterChange={onFilterChange}
                selectedCategoryName={selectedCategoryName}
                selectedSubcategoryName={selectedSubcategoryName}
                selectedTypes={selectedTypeName ? [selectedTypeName] : []}
                minPrice={minPrice}
                maxPrice={maxPrice}
                selectedManufacturer={selectedManufacturer}
                showManufacturerFilter={showManufacturerFilter}
                selectedRating={selectedRating}
              />
            </div>
          </div>

          {/* Sidebar Mobile Drawer */}
          <div
            className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300 ${mobileFilterOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
              }`}
            onClick={() => setMobileFilterOpen(false)}
          >
            <aside
              className={`absolute left-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ${mobileFilterOpen ? "translate-x-0" : "-translate-x-full"
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
                <span className="font-bold text-lg sm:text-xl text-gray-800">Filters</span>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-2 rounded-full hover:bg-white/80 transition-colors duration-200 shadow-sm"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="h-[calc(100%-80px)] overflow-y-auto">
                <SideFilter
                  selectedFilters={selectedFilters}
                  onFilterChange={onFilterChange}
                  selectedCategoryName={selectedCategoryName}
                  selectedSubcategoryName={selectedSubcategoryName}
                  selectedTypes={selectedTypeName ? [selectedTypeName] : []}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  selectedManufacturer={selectedManufacturer}
                  showManufacturerFilter={showManufacturerFilter}
                  selectedRating={selectedRating}
                />
              </div>
            </aside>
          </div>
        </>
        {/* --- END: Conditional Rendering for Filters --- */}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Controls - Refactored to match the provided UI */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              {/* Left Section - Title and Results & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 w-full sm:w-auto">
                {/* Title and Count */}
                <div className="flex flex-col">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-sans">
                    {title || "New Arrivals"}
                  </h1>

                  <p className="text-sm sm:text-base text-gray-500 font-normal font-sans mt-1">
                    Showing {1 + (currentPage - 1) * 12}–{(currentPage - 1) * 12 + products.length} of {totalCount} results
                  </p>
                </div>
                {/* Used/Rental Toggle Buttons */}
                {isUsedOrRentalPage && (
                  <div className="flex items-center sm:mt-0 mt-2">
                    <button
                      className={`py-1 px-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${selectedTypeName === "Used" ? 'text-green-600 border-green-600' : 'text-gray-500 hover:text-green-600 border-transparent'}`}
                      onClick={() => handleToggle("used")}
                    >
                      Used MHE
                    </button>
                    <button
                      className={`py-1 px-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${selectedTypeName === "Rental" ? 'text-green-600 border-green-600' : 'text-gray-500 hover:text-green-600 border-transparent'}`}
                      onClick={() => handleToggle("rental")}
                    >
                      Rental
                    </button>
                  </div>
                )}
              </div>

              {/* Right Section - Sort, View Toggle, Mobile Filter */}
              <div className="flex items-center gap-4 flex-shrink-0 sm:mt-0 mt-4">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    className="appearance-none bg-white border border-gray-300 rounded text-sm text-gray-700 px-4 py-2 pr-10 font-sans focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all duration-200"
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value)}
                  >
                    <option value="relevance">Sort by</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    {/* <option value="newest">Newest First</option> */}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* View Toggle Buttons */}
                <div className="flex items-center rounded-md border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => handleViewChange("grid")}
                    className={`p-2 transition-colors duration-200 ${currentView === "grid"
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "text-gray-500 hover:bg-gray-100"
                      }`}
                    aria-label="Grid View"
                  >
                    <IoGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleViewChange("list")}
                    className={`p-2 transition-colors duration-200 border-l border-gray-300 ${currentView === "list"
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "text-gray-500 hover:bg-gray-100"
                      }`}
                    aria-label="List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Filter Button - Only show if NOT a vendor page */}
                {!window.location.pathname.startsWith("/vendor-listing/") && (
                  <button
                    className="lg:hidden flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-xs font-medium shadow transition-all duration-200"
                    onClick={() => setMobileFilterOpen(true)}
                    aria-label="Open filters"
                  >
                    <Menu className="w-4 h-4" />
                    <span>Filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {sponsorBanner && (
            <div className="px-4 sm:px-6 lg:px-8">
              {sponsorBanner}
            </div>
          )}

          {/* Products Grid and Pagination */}
          <div className="p-4 sm:p-6 lg:p-8">
            <ProductGrid products={products} viewMode={currentView} noProductsMessage={noProductsMessage} pageUrlType={pageUrlType} isInitialPage={currentPage === 1} />

            {totalPages > 1 && (
              <div className="mt-8 sm:mt-12 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-green-50"}
                      />
                    </PaginationItem>

                    {(() => {
                      const items = [];
                      const delta = 2;

                      // Always show first page
                      items.push(
                        <PaginationItem key={1}>
                          <PaginationLink
                            onClick={() => onPageChange(1)}
                            isActive={currentPage === 1}
                            className={currentPage === 1
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "cursor-pointer hover:bg-green-50"}
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                      );

                      // Add ellipsis if there's a gap after page 1
                      if (currentPage - delta > 2) {
                        items.push(
                          <PaginationItem key="ellipsis-start">
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }

                      // Add pages around current page
                      const start = Math.max(2, currentPage - delta);
                      const end = Math.min(totalPages - 1, currentPage + delta);

                      for (let i = start; i <= end; i++) {
                        items.push(
                          <PaginationItem key={i}>
                            <PaginationLink
                              onClick={() => onPageChange(i)}
                              isActive={currentPage === i}
                              className={currentPage === i
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "cursor-pointer hover:bg-green-50"}
                            >
                              {i}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }

                      // Add ellipsis if there's a gap before last page
                      if (currentPage + delta < totalPages - 1) {
                        items.push(
                          <PaginationItem key="ellipsis-end">
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }

                      // Always show last page (if more than 1 page total)
                      if (totalPages > 1) {
                        items.push(
                          <PaginationItem key={totalPages}>
                            <PaginationLink
                              onClick={() => onPageChange(totalPages)}
                              isActive={currentPage === totalPages}
                              className={currentPage === totalPages
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "cursor-pointer hover:bg-green-50"}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }

                      return items;
                    })()}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-green-50"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// function setIsFallbackLoading(arg0: boolean) {
//   throw new Error("Function not implemented.");
// }
// function setFallbackProducts(transformed: any) {
//   throw new Error("Function not implemented.");
// }

