// src/components/category/CategoryClient.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, HydrationBoundary, DehydratedState } from "@tanstack/react-query";
import ProductListing from "@/components/products/ProductListing";
import Breadcrumb from "@/components/elements/Breadcrumb";
import { RouteContext, Product as ApiProduct, getProducts } from "@/lib/product-api";
import { Product as ListingProduct } from "@/components/products/ProductListing";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import api from "@/lib/api";

// Dynalektric vendor's user_id in users_vendor, used to route the charger
// category sponsor banners to one of their live products.
const DYNALEKTRIC_VENDOR_USER_ID = 729;

interface CategoryClientProps {
    dehydratedState: unknown;
    urlParamSlug: string;
    subcategoryParamSlug?: string;
    initialContext: RouteContext;
}

export default function CategoryClient({
    dehydratedState,
    urlParamSlug,
    subcategoryParamSlug,
    initialContext
}: CategoryClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const autoplayPlugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

    // Context is static for this route, initially from server
    const context = initialContext;

    // Filter state synced with URL
    const [filterState, setFilterState] = useState({
        minPrice: (searchParams.get('min_price') ? Number(searchParams.get('min_price')) : '') as number | '',
        maxPrice: (searchParams.get('max_price') ? Number(searchParams.get('max_price')) : '') as number | '',
        selectedManufacturer: searchParams.get('search') || null as string | null,
        selectedRating: (searchParams.get('average_rating') ? Number(searchParams.get('average_rating')) : null) as number | null,
        sortBy: searchParams.get('sort_by') || 'relevance',
        currentPage: (searchParams.get('page') ? Number(searchParams.get('page')) : 1) as number,
    });

    const { minPrice, maxPrice, selectedManufacturer, selectedRating, sortBy, currentPage } = filterState;

    // Sync state with URL changes
    useEffect(() => {
        setFilterState({
            minPrice: (searchParams.get('min_price') ? Number(searchParams.get('min_price')) : '') as number | '',
            maxPrice: (searchParams.get('max_price') ? Number(searchParams.get('max_price')) : '') as number | '',
            selectedManufacturer: searchParams.get('search') || null,
            selectedRating: (searchParams.get('average_rating') ? Number(searchParams.get('average_rating')) : null),
            sortBy: searchParams.get('sort_by') || 'relevance',
            currentPage: (searchParams.get('page') ? Number(searchParams.get('page')) : 1),
        });
    }, [searchParams]);

    // Fetch up to 4 live Dynalektric products, one per sponsor banner
    // (only needed on the charger category page).
    const [dynalektricProductIds, setDynalektricProductIds] = useState<number[]>([]);
    useEffect(() => {
        if (urlParamSlug?.toLowerCase() !== 'charger') return;
        let cancelled = false;
        api.get('/products/', { params: { user: DYNALEKTRIC_VENDOR_USER_ID, page_size: 4 } })
            .then((res) => {
                if (cancelled) return;
                const results = res.data?.results || res.data || [];
                const ids = Array.isArray(results)
                    ? results.map((p: { id: number }) => p.id).filter(Boolean)
                    : [];
                setDynalektricProductIds(ids);
            })
            .catch((err) => console.error('Failed to load Dynalektric products for banner links:', err));
        return () => { cancelled = true; };
    }, [urlParamSlug]);

    // Cycles through whatever products were found, so each banner points
    // at a different one even if there are fewer than 4 in stock.
    const handleDynalektricBannerClick = useCallback((bannerIndex: number) => {
        if (dynalektricProductIds.length === 0) return;
        const productId = dynalektricProductIds[bannerIndex % dynalektricProductIds.length];
        router.push(`/product/dynalektric-${productId}`);
    }, [dynalektricProductIds, router]);

    // React Query for Products (Hydrated from server)
    const {
        data: productsData,
        isLoading,
        isFetching,
        error: productsError
    } = useQuery({
        queryKey: [
            'products',
            context?.type,
            context?.name,
            context?.subName,
            context?.id,
            context?.subId,
            currentPage,
            minPrice,
            maxPrice,
            selectedManufacturer,
            selectedRating,
            sortBy
        ],
        queryFn: () => getProducts({
            context,
            page: currentPage,
            minPrice,
            maxPrice,
            manufacturer: selectedManufacturer,
            rating: selectedRating,
            sortBy
        }),
        staleTime: 60 * 1000,
    });

    const handleFilterChange = useCallback((
        filterValue: string | number,
        filterType: "category" | "subcategory" | "type" | "price_range" | "manufacturer" | "rating" | "sort_by",
        newValue?: string | number | string[] | { min: number | ""; max: number | ""; } | null | undefined
    ) => {
        const currentPath = `/${urlParamSlug}${subcategoryParamSlug ? `/${subcategoryParamSlug}` : ''}`;
        const newSearchParams = new URLSearchParams(searchParams.toString());

        if (filterType === "category" || filterType === "subcategory" || filterType === "type") {
            const formattedFilterSlug = String(filterValue).toLowerCase().replace(/\s+/g, '-');
            ['min_price', 'max_price', 'search', 'average_rating', 'sort_by'].forEach(p => newSearchParams.delete(p));
            newSearchParams.set('page', '1');

            let newPath = "";
            if (filterType === "category" || filterType === "type") {
                newPath = `/${formattedFilterSlug}`;
            } else if (filterType === "subcategory") {
                const currentCategorySlug = context?.name?.toLowerCase().replace(/\s+/g, '-');
                newPath = currentCategorySlug ? `/${currentCategorySlug}/${formattedFilterSlug}` : `/${formattedFilterSlug}`;
            }
            router.push(`${newPath}?${newSearchParams.toString()}`);
        } else {
            if (filterType === "price_range" && typeof newValue === 'object' && newValue !== null) {
                const { min, max } = newValue as { min: number | '', max: number | '' };
                min === '' ? newSearchParams.delete('min_price') : newSearchParams.set('min_price', String(min));
                max === '' ? newSearchParams.delete('max_price') : newSearchParams.set('max_price', String(max));
            } else if (filterType === "manufacturer") {
                newValue ? newSearchParams.set('search', String(newValue)) : newSearchParams.delete('search');
            } else if (filterType === "rating") {
                newValue ? newSearchParams.set('average_rating', String(newValue)) : newSearchParams.delete('average_rating');
            } else if (filterType === "sort_by" && typeof filterValue === 'string') {
                filterValue === 'relevance' ? newSearchParams.delete('sort_by') : newSearchParams.set('sort_by', filterValue);
            }

            newSearchParams.set('page', '1');
            router.push(`${currentPath}?${newSearchParams.toString()}`);
        }
    }, [urlParamSlug, subcategoryParamSlug, context, router, searchParams]);

    const handlePageChange = (page: number) => {
        const currentPath = `/${urlParamSlug}${subcategoryParamSlug ? `/${subcategoryParamSlug}` : ''}`;
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('page', page.toString());
        router.push(`${currentPath}?${newSearchParams.toString()}`);
    };

    const handleSortChange = (value: string) => {
        const currentPath = `/${urlParamSlug}${subcategoryParamSlug ? `/${subcategoryParamSlug}` : ''}`;
        const newSearchParams = new URLSearchParams(searchParams.toString());
        value === 'relevance' ? newSearchParams.delete('sort_by') : newSearchParams.set('sort_by', value);
        newSearchParams.set('page', '1');
        router.push(`${currentPath}?${newSearchParams.toString()}`);
    };

    const breadcrumbItems = useMemo(() => {
        const items = [{ label: "Home", href: "/" }];
        if (context?.type === 'category' || context?.type === 'subcategory') {
            items.push({ label: context.name!, href: `/${urlParamSlug}` });
            if (context.type === 'subcategory') {
                items.push({ label: context.subName!, href: `/${urlParamSlug}/${subcategoryParamSlug}` });
            }
        } else if (context?.type === 'type') {
            items.push({ label: context.name!, href: `/${urlParamSlug}` });
        }
        return items;
    }, [context, urlParamSlug, subcategoryParamSlug]);

    const selectedFilters = useMemo(() => {
        const filters = new Set<string>();
        if (context?.name) filters.add(context.name);
        if (context?.subName) filters.add(context.subName);
        return filters;
    }, [context]);

    if (productsError) {
        return (
            <div className="text-center p-8 min-h-[50vh] text-red-600">
                <h2>Error Loading Data</h2>
                <p>{(productsError as Error).message}</p>
            </div>
        );
    }

    // SPONSOR BANNERS FOR CHARGER CATEGORY
    const chargerBanners = urlParamSlug?.toLowerCase() === 'charger' ? (
        <div className="w-full mb-8 mt-4">
            <Carousel 
                opts={{ align: "start", loop: true }}
                plugins={[autoplayPlugin.current]}
                className="w-full relative group"
            >
                <CarouselContent>
                    {['dynalektric1.jpeg', 'dynalektric2.jpeg', 'dynalektric3.jpeg', 'dynalektric4.jpeg'].map((img, i) => (
                        <CarouselItem key={i}>
                            <div
                                className="w-full relative overflow-hidden rounded-xl shadow-lg cursor-pointer"
                                onClick={() => handleDynalektricBannerClick(i)}
                                role="button"
                                aria-label="View Dynalektric products"
                            >
                                <img
                                    src={`/category-sponsor/${img}`}
                                    alt={`Dynalektric Banner ${i + 1}`}
                                    className="w-full h-auto object-contain"
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 border-none shadow-md" />
                    <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 border-none shadow-md" />
                </div>
            </Carousel>
        </div>
    ) : null;

    return (
        <HydrationBoundary state={dehydratedState as DehydratedState}>
            <Breadcrumb items={breadcrumbItems} />
            <div className={`transition-opacity duration-300 ${isFetching && !isLoading ? 'opacity-50' : 'opacity-100'}`}>
                <ProductListing
                    sponsorBanner={chargerBanners}  
                    products={productsData?.products as ListingProduct[] || []}
                    title={context?.subName || context?.name || "All Products"}
                    totalCount={productsData?.totalCount || 0}
                    onFilterChange={handleFilterChange}
                    selectedFilters={selectedFilters}
                    selectedCategoryName={context?.type === 'category' || context?.type === 'subcategory' ? context.name : null}
                    selectedSubcategoryName={context?.type === 'subcategory' ? context.subName : null}
                    selectedTypeName={context?.type === 'type' ? context.name : null}
                    currentPage={currentPage}
                    totalPages={productsData?.totalPages || 1}
                    onPageChange={handlePageChange}
                    noProductsMessage={productsData?.noProductsFound ? `No products found for "${context?.subName || context?.name}" with the selected filters.` : null}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    selectedManufacturer={selectedManufacturer}
                    selectedRating={selectedRating}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    pageUrlType={urlParamSlug}
                />
            </div>
        </HydrationBoundary>
    );
}