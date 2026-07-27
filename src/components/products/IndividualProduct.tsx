// src/components/products/IndividualProduct.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Heart,
  Share2,
  Star,
  Truck,
  Headphones,
  CreditCard,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  X,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Trash2,
  FileText,
  Download,
  Lock,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import axios from "axios";
import { toast } from "sonner";
import { useUser } from "@/context/UserContext";
// import QuoteForm from "@/components/forms/enquiryForm/quotesForm";
import RentalForm from "@/components/forms/enquiryForm/rentalForm";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// import MheWriteAReview from "@/components/forms/product/ProductReviewForm";
// import ReviewSection from "./Reviews";
import DOMPurify from "dompurify";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import categories from "@/data/categories.json";
import dynamic from 'next/dynamic';

const ReviewSection = dynamic(() => import("./Reviews"), {
  ssr: false,
  // 🎯 FIX: Match the real height (~500px) to prevent the footer from jumping
  loading: () => <div className="min-h-[500px] w-full bg-gray-50 animate-pulse rounded-xl mt-10" />
});

const QuoteForm = dynamic(() => import("@/components/forms/enquiryForm/quotesForm"), {
  ssr: false
});
const MheWriteAReview = dynamic(() => import("@/components/forms/product/ProductReviewForm"), { ssr: false });

const sanitizeHTML = (html: string) => {
  // If we are on the server (SSR), return the raw HTML
  // Next.js will hydrate the safe version once it hits the browser.
  if (typeof window === "undefined") return html;

  // Handle Turbopack's module resolution quirk
  const purify = (DOMPurify as any).default || DOMPurify;

  // Double-check if sanitize exists before calling it to prevent the crash
  return (typeof purify.sanitize === 'function')
    ? purify.sanitize(html)
    : html;
};

type ProductImage = {
  id: number;
  image: string;
};
type ProductDetails = {
  capacity?: string;
  [key: string]: unknown;
};

type ProductData = {
  id: number;
  name: string;
  description: string;
  meta_title: string | null;
  meta_description: string | null;
  manufacturer: string | null;
  model: string | null;
  product_details: ProductDetails | null;

  price: string;
  type: string | string[]; // Can be string or string[] based on product type
  is_active: boolean;
  direct_sale: boolean;
  online_payment: boolean;
  hide_price: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  user: number;
  category: number;
  subcategory: number | null;
  category_name: string;
  subcategory_name: string | null;
  user_name: string;
  images: ProductImage[];
  brochure: string | null;
  offer: string | null;
  average_rating: number | null;
  review_count: number;
  user_description: string | null;
  user_image: string | null;
  category_details?: {
    cat_image: string | null;
  };
};

interface CartItemApi {
  id: number;
  product: number;
  product_details: ProductData;
  quantity: number;
  total_price: number;
}

interface WishlistItemApi {
  id: number;
  product: number;
  product_details: ProductData;
}

// FIX 2: Add productSlug to ProductSectionProps
interface ProductSectionProps {
  productId: number | string | null;
  productSlug: string;
  initialData: ProductData;
  //  productTitle: string;
}

const imgUrl =
  process.env.NEXT_PUBLIC_API_BASE_MEDIA_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

// --- Helper Functions for Media ---

/**
 * Checks for API-encoded video URLs and cleans them.
 */
const cleanMediaUrl = (url: string): string => {
  if (!url) return "";

  // Pattern to find the encoded protocol (http%3A or https%3A)
  const encodedProtocolRegex = /(http|https)%3A/;

  const match = url.match(encodedProtocolRegex);

  if (match && match.index !== undefined && match.index > 0) {
    // If the encoded protocol is found, decode the rest of the string
    const encodedPart = url.substring(match.index);
    try {
      return decodeURIComponent(encodedPart);
    } catch (e) {
      console.error("Failed to decode external URL:", url, e);
      return url;
    }
  }
  // Return original URL if no suspicious encoding pattern is found
  return url;
};

const isVideoUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  const cleanedUrl = cleanMediaUrl(url);

  // Checks for common video extensions or YouTube/Vimeo patterns
  return (
    /\.(mp4|webm|ogg|mov|avi|flv|wmv)$/i.test(cleanedUrl) ||
    /youtu\.be|youtube\.com|vimeo\.com/i.test(cleanedUrl)
  );
};

const getYouTubeEmbedUrl = (url: string): string | null => {
  const cleanedUrl = cleanMediaUrl(url);

  if (!/youtu\.be|youtube\.com/i.test(cleanedUrl)) return null;

  let videoId = "";
  // Simple ID extraction for various YouTube URL formats
  if (cleanedUrl.includes("v=")) {
    // Ensure we only take the ID before any other parameters (&)
    videoId = cleanedUrl.split("v=")[1].split("&")[0];
  } else if (cleanedUrl.includes("youtu.be/")) {
    // Ensure we only take the ID before any other parameters (?)
    videoId = cleanedUrl.split("youtu.be/")[1].split("?")[0];
  }

  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&showinfo=0&controls=1`;
  }
  return null;
};
// --- End Helper Functions for Media ---

// Custom Image component with an error handler to show a fallback and hide the parent element
const FallbackImage = ({
  src,
  alt,
  width,
  height,
  className,
  fallbackSrc,
  style,
  priority,
  onImageError,
  id,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  fallbackSrc?: string | null;
  style?: React.CSSProperties;
  priority?: boolean;
  onImageError: (id: number) => void;
  id: number;
}) => {
  // const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    // setImgSrc(src);
    setError(false);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!error) {
      setError(true);
      const target = e.currentTarget;
      // Fallback logic happens only on error, not on initial load
      target.src = fallbackSrc || "/placeholder-image.png";
      onImageError(id);
    }
  };

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      priority={priority}
      // Keep this
      fetchPriority="high" // Keep this
      sizes="(max-width: 768px) 100vw, 40vw"
      unoptimized={
        src.startsWith("/placeholder-image.png") || src === fallbackSrc
      }
      onError={handleError}
    />
  );
};

// New Video Component
const VideoPlayer: React.FC<{
  src: string;
  alt: string;
  className: string;
  fallbackSrc?: string | null;
}> = ({ src, alt, className }) => {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(src);

  // YouTube iFrame
  if (youtubeEmbedUrl) {
    return (
      <iframe
        // Ensure iframe takes full container size for main view/modal and uses the aspect ratio of the parent div
        className={`${className} border-0 w-full h-full`}
        src={youtubeEmbedUrl}
        title={alt}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Direct Video Tag (HTML5)
  return (
    <video
      className={`${className} object-contain w-full h-full`}
      controls
      loop
      muted
      poster="/video-poster.jpg" // Optional poster image
    >
      <source src={src} type="video/mp4" />
      <p>
        Your browser does not support the video tag.{" "}
        <a href={src}>Download the video</a> instead.
      </p>
    </video>
  );
};

// Add this new component for video thumbnails
const VideoThumbnail: React.FC<{ videoUrl: string; className?: string }> = ({
  videoUrl,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Show a static thumbnail with play button overlay */}
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
        <div className="w-8 h-8 md:w-12 md:h-12 bg-white/80 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 md:w-4 md:h-4 border-t-8 border-t-transparent border-l-[16px] border-l-black border-b-8 border-b-transparent ml-1" />
        </div>
      </div>
      {/* Show first frame of video as thumbnail */}
      <video className={`w-full h-full object-cover`} preload="metadata">
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
};

// Update the MediaFallbackImage component
const MediaFallbackImage: React.FC<
  Omit<React.ComponentProps<typeof FallbackImage>, "onImageError" | "id"> & {
    onImageError: (id: number) => void;
    id: number;
    isThumb?: boolean;
  }
> = (props) => {
  const { isThumb = false, ...restProps } = props;
  const cleanedSrc = cleanMediaUrl(props.src);
  const isVideo = isVideoUrl(cleanedSrc);

  // For thumbnails, always show the VideoThumbnail component for videos
  if (isThumb && isVideo) {
    return <VideoThumbnail videoUrl={cleanedSrc} className={props.className} />;
  }

  // For main display, render video player or image based on type
  if (isVideo) {
    return <VideoPlayer {...props} src={cleanedSrc} />;
  }

  return <FallbackImage {...restProps} src={cleanedSrc} />;
};

// Framer motion variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ProductSection({
  initialData,
}: ProductSectionProps) {
  const router = useRouter();
  const { user } = useUser();

  // const [data, setData] = useState<ProductData>(initialData);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<
    "desc" | "spec" | "vendor" | null
  >("desc");
  const [isInCart, setIsInCart] = useState(false);
  const [currentCartQuantity, setCurrentCartQuantity] = useState(0);
  const [cartItemId, setCartItemId] = useState<number | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isLoading] = useState(false);
  const [erroredImageIds, setErroredImageIds] = useState<Set<number>>(
    new Set()
  );

  // Thank You popup shown after a Brochure/Offer download is triggered
  const [thankYouDoc, setThankYouDoc] = useState<
    { type: "offer" | "brochure"; fileName: string } | null
  >(null);

  // State for the media gallery modal
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Add new zoom-related state and handlers to the component
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const data = initialData;
  // Use a ref to store a function that can refresh reviews
  const reviewsRefresher = useRef<(() => void) | null>(null);

  const sanitizedDescription = useMemo(() => {
    // Only attempt to sanitize if window is available (Client Side)
    if (typeof window === "undefined") return data.description;

    return sanitizeHTML(data.description);
  }, [data.description]);

  const sanitizedVendorDesc = useMemo(() => {
    if (!data.user_description) return "";
    if (typeof window === "undefined") return data.user_description;
    return sanitizeHTML(data.user_description);
  }, [data.user_description]);

  // IMPROVEMENT: Memoize cleaned media URLs to avoid regex overhead on every frame
  const cleanedImages = useMemo(() =>
    data.images.map(img => ({ ...img, image: cleanMediaUrl(img.image) })),
    [data.images]);

  // Ref to hold the latest state values for async operations
  const latestCartState = useRef({ currentCartQuantity, cartItemId, isInCart });
  useEffect(() => {
    latestCartState.current = { currentCartQuantity, cartItemId, isInCart };
  }, [currentCartQuantity, cartItemId, isInCart]);

  // In-memory cache for product data
  const productCache = useRef(new Map<string, ProductData>());

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const getValidSpecs = (specs: Record<string, unknown> | null) => {
    if (!specs) return [];
    return Object.entries(specs).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        String(value).trim() !== ""
    );
  };

  const handleImageError = useCallback((id: number) => {
    setErroredImageIds((prev) => new Set(prev).add(id));
  }, []);

  const fetchInitialStatus = useCallback(async () => {
    if (user && data?.id) {
      try {
        const wishlistResponse = await api.get<{ results: WishlistItemApi[] }>(
          `/wishlist/?product=${data.id}&user=${user.id}`
        );
        setIsWishlisted(wishlistResponse.data.results.length > 0);

        const cartResponse = await api.get<{ results: CartItemApi[] }>(
          `/cart/?product=${data.id}&user=${user.id}`
        );
        if (cartResponse.data.results.length > 0) {
          const itemInCart = cartResponse.data.results[0];
          setIsInCart(true);
          setCurrentCartQuantity(itemInCart.quantity);
          setCartItemId(itemInCart.id);
        } else {
          setIsInCart(false);
          setCurrentCartQuantity(0);
          setCartItemId(null);
        }
      } catch (error) {
        console.error("Failed to fetch initial wishlist/cart status:", error);
      }
    } else {
      setIsWishlisted(false);
      setIsInCart(false);
      setCurrentCartQuantity(0);
      setCartItemId(null);
    }
  }, [user, data?.id]);


  const handleAddToCart = useCallback(
    async (productId: number) => {
      if (!user) {
        toast.error("Please log in to add products to your cart.");
        router.push("/login");
        return;
      }
      try {
        if (latestCartState.current.isInCart) {
          toast.info("This product is already in your cart.", {
            action: {
              label: "View Cart",
              onClick: () => router.push("/cart"),
            },
          });
          return;
        }
        const response = await api.post(`/cart/`, {
          product: productId,
          quantity: 1,
        });
        setIsInCart(true);
        setCurrentCartQuantity(1);
        setCartItemId(response.data.id);
        toast.success("Product added to cart!", {
          action: {
            label: "View Cart",
            onClick: () => router.push("/cart"),
          },
        });
      } catch (error: unknown) {
        console.error("Error adding to cart:", error);
        if (axios.isAxiosError(error) && error.response) {
          if (
            error.response.status === 400 &&
            error.response.data?.non_field_errors?.[0] ===
            "The fields user, product must make a unique set."
          ) {
            toast.info("Product is already in your cart.", {
              action: {
                label: "View Cart",
                onClick: () => router.push("/cart"),
              },
            });
            fetchInitialStatus();
          } else {
            toast.error(
              error.response.data?.message ||
              `Failed to add to cart: ${error.response.statusText}`
            );
          }
        } else {
          toast.error(
            "An unexpected error occurred while adding to cart. Please try again."
          );
        }
      }
    },
    [user, router, fetchInitialStatus]
  );

  const handleRemoveFromCart = useCallback(
    async (cartId: number) => {
      if (!user || !cartId) return;
      try {
        await api.delete(`/cart/${cartId}/`);
        setIsInCart(false);
        setCurrentCartQuantity(0);
        setCartItemId(null);
        toast.success("Product removed from cart.");
      } catch (error) {
        console.error("Error removing from cart:", error);
        toast.error("Failed to remove product from cart.");
      }
    },
    [user]
  );

  const handleIncreaseQuantity = useCallback(
    async (cartId: number) => {
      if (!user || !cartId) return;
      try {
        const newQuantity = latestCartState.current.currentCartQuantity + 1;
        await api.patch(`/cart/${cartId}/`, { quantity: newQuantity });
        setCurrentCartQuantity(newQuantity);
        toast.success("Quantity increased!");
      } catch (error) {
        console.error("Error increasing quantity:", error);
        if (
          axios.isAxiosError(error) &&
          error.response &&
          error.response.data?.quantity
        ) {
          toast.error(
            `Failed to increase quantity: ${error.response.data.quantity[0]}`
          );
        } else {
          toast.error("Failed to increase quantity.");
        }
      }
    },
    [user]
  );

  const handleDecreaseQuantity = useCallback(
    async (cartId: number) => {
      if (!user || !cartId) return;
      if (latestCartState.current.currentCartQuantity <= 1) {
        toast.info(
          "Quantity cannot be less than 1. Use the remove button (trash icon) to take it out of cart.",
          {
            action: {
              label: "Remove",
              onClick: () => handleRemoveFromCart(cartId),
            },
          }
        );
        return;
      }
      try {
        const newQuantity = latestCartState.current.currentCartQuantity - 1;
        await api.patch(`/cart/${cartId}/`, { quantity: newQuantity });
        setCurrentCartQuantity(newQuantity);
        toast.success("Quantity decreased!");
      } catch (error) {
        console.error("Error decreasing quantity:", error);
        if (
          axios.isAxiosError(error) &&
          error.response &&
          error.response.data?.quantity
        ) {
          toast.error(
            `Failed to decrease quantity: ${error.response.data.quantity[0]}`
          );
        } else {
          toast.error("Failed to decrease quantity.");
        }
      }
    },
    [user, handleRemoveFromCart]
  );

  const handleWishlist = useCallback(async () => {
    if (!user || !data?.id) {
      toast.error("Please log in to manage your wishlist.");
      router.push("/login");
      return;
    }
    try {
      if (isWishlisted) {
        const wishlistResponse = await api.get<{ results: WishlistItemApi[] }>(
          `/wishlist/?product=${data.id}&user=${user.id}`
        );
        if (wishlistResponse.data.results.length > 0) {
          const wishlistItemId = wishlistResponse.data.results[0].id;
          await api.delete(`/wishlist/${wishlistItemId}/`);
          setIsWishlisted(false);
          toast.success("Product removed from wishlist!");
        } else {
          setIsWishlisted(false);
          toast.info("Product was not found in your wishlist. Syncing state.");
        }
      } else {
        await api.post(`/wishlist/`, { product: data.id });
        setIsWishlisted(true);
        toast.success("Product added to wishlist!");
      }
    } catch (error: unknown) {
      console.error("Error updating wishlist:", error);
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.status === 400 &&
          error.response.data?.non_field_errors?.[0] ===
          "The fields user, product must make a unique set."
        ) {
          toast.info("Product is already in your wishlist.");
          setIsWishlisted(true);
        } else {
          toast.error(
            error.response.data?.message ||
            `Failed to add to wishlist: ${error.response.statusText}`
          );
        }
      } else {
        toast.error(
          "An unexpected error occurred while updating wishlist. Please try again."
        );
      }
    }
  }, [user, data?.id, isWishlisted, router]);

  const handleCompare = useCallback(() => {
    if (!data) return;
    const COMPARE_KEY = "mhe_compare_products";
    if (typeof window !== "undefined") {
      const currentCompare: ProductData[] = JSON.parse(
        localStorage.getItem(COMPARE_KEY) || "[]"
      );
      const existingProduct = currentCompare.find(
        (p: ProductData) => p.id === data.id
      );
      if (!existingProduct) {
        const dataToStore = { ...data };
        if (data.hide_price) {
          const { price: _, ...restOfData } = dataToStore;
          currentCompare.push(restOfData as unknown as ProductData);
        } else {
          currentCompare.push(dataToStore);
        }
        localStorage.setItem(COMPARE_KEY, JSON.stringify(currentCompare));
        toast.success("Product added to comparison!");
      } else {
        toast.info("Product is already in comparison.");
      }
    }
  }, [data]);

  const handleBuyNow = useCallback(async () => {
    if (!user) {
      toast.error("Please log in to proceed with purchase.");
      router.push("/login");
      return;
    }
    if (
      !data ||
      !data.direct_sale ||
      data.stock_quantity === 0 ||
      !data.is_active
    ) {
      toast.error("This product is not available for direct purchase.");
      return;
    }
    try {
      if (!latestCartState.current.isInCart) {
        await api.post(`/cart/`, { product: data.id, quantity: 1 });
      }
      router.push("/cart");
    } catch (error: unknown) {
      console.error("Error during buy now process:", error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(
          error.response.data?.message ||
          `Failed to add product to cart: ${error.response.statusText}`
        );
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    }
  }, [user, router, data]);

  const handleShare = useCallback(() => {
    if (!data) return;
    const productUrl = window.location.href;
    const productTitle = data.name;
    if (navigator.share) {
      navigator
        .share({
          title: productTitle,
          url: productUrl,
        })
        .then(() => {
          toast.success("Product link shared successfully!");
        })
        .catch((error) => {
          if (error.name === "AbortError") {
            toast.info("Sharing cancelled.");
          } else {
            toast.error("Failed to share product link.");
            console.error("Error sharing:", error);
          }
        });
    } else {
      navigator.clipboard
        .writeText(productUrl)
        .then(() => {
          toast.success("Product link copied to clipboard!");
        })
        .catch((err) => {
          toast.error("Failed to copy link to clipboard.");
          console.error("Error copying link:", err);
        });
    }
  }, [data]);

  // Best-effort download tracking. Silently ignored if the backend
  // endpoint isn't available yet, so it never blocks the download itself.
  const trackDownload = useCallback(
    async (documentType: "offer" | "brochure") => {
      if (!data?.id) return;
      try {
        await api.post(`/products/${data.id}/track-download/`, {
          document_type: documentType,
        });
      } catch (err) {
        console.error(`Failed to record ${documentType} download:`, err);
      }
    },
    [data?.id]
  );

  const getFileName = (path: string, fallback: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1] || fallback;
  };

  const handleDownloadBrochure = useCallback(() => {
    if (!data?.brochure) return;
    trackDownload("brochure");
    setThankYouDoc({
      type: "brochure",
      fileName: getFileName(data.brochure, "Brochure"),
    });
  }, [data?.brochure, trackDownload]);

  const handleViewOffer = useCallback(() => {
    if (!user) {
      toast.error("Please log in to view this product's offer.");
      router.push("/login");
      return;
    }
    if (data?.offer) {
      window.open(cleanMediaUrl(data.offer), "_blank", "noopener,noreferrer");
      trackDownload("offer");
      setThankYouDoc({
        type: "offer",
        fileName: getFileName(data.offer, "Offer"),
      });
    }
  }, [user, data?.offer, router, trackDownload]);

  const registerReviewsRefresher = useCallback((refresher: () => void) => {
    // This function is still defined here, but unused in the final code structure
    // as per previous request to ignore the error.
    // reviewsRefresher.current = refresher;
  }, []);

  const openGallery = (index: number) => {
    setCurrentMediaIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
  };

  const goToNextMedia = () => {
    if (data?.images) {
      setCurrentMediaIndex((prevIndex) => (prevIndex + 1) % data.images.length);
    }
  };

  const goToPrevMedia = () => {
    if (data?.images) {
      setCurrentMediaIndex(
        (prevIndex) => (prevIndex - 1 + data.images.length) % data.images.length
      );
    }
  };

  // Add this new handler for zoom functionality
  const handleImageZoom = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || isSelectedMediaVideo) return;

    const container = imageContainerRef.current;
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({ x, y });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="bg-gray-200 rounded-lg w-full md:w-96 h-96 mb-4" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isPurchasable = data.is_active;
  const displayPrice = parseFloat(data.price).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const originalPrice = parseFloat(data.price);
  const fakePrice = (originalPrice * 1.1).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const youSaveAmount = (originalPrice * 0.1).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formButtonText =
    data.type === "rental" ||
      data.type === "used" ||
      (Array.isArray(data.type) &&
        (data.type.includes("rental") || data.type.includes("used")))
      ? "Rent Now"
      : "Get a Quote";
  const validSpecs = getValidSpecs(data.product_details);

  const isRentalOrUsed =
    Array.isArray(data.type) &&
    (data.type.includes("rental") || data.type.includes("used"));

  // ✅ Clean the display title to allow ALL requested punctuation for UI presentation
  const formatCapacity = (capacity?: string) => {
    if (!capacity) return "";
    // Automatically append units if missing
    if (/^\d+$/.test(capacity)) return `${capacity} kg`;
    if (/^\d+(\.\d+)?\s?t(on)?$/i.test(capacity)) return capacity.replace(/\s?ton/i, "t");
    return capacity;
  };

  const userName = (data?.user_name || "").replace("_", " ");
  const productName = data?.name || "";
  const model = data?.model || "";
  const capacity = formatCapacity(data?.product_details?.capacity) || "";

  const cleanTitle = `${userName} ${productName} ${model} ${capacity}`
    .replace(/[^a-zA-Z0-9 \-\.\(\)/\\*?,!@#$^&%+×]/g, "")
    .replace(/\s+/g, " ")
    .trim();


  // Determine if the currently selected media is a video
  const isSelectedMediaVideo =
    data.images.length > 0
      ? isVideoUrl(data.images[selectedImage]?.image)
      : false;

  return (
    <motion.div
      className="px-4 mx-auto p-2 sm:p-10 bg-white w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Side - Product Images (Now fully responsive) */}
        <div className="flex flex-col md:flex-row-reverse gap-4 w-full md:w-[40%]">
          {/* Main Product Image/Video Container */}
          <div
            ref={imageContainerRef}
            className={`relative bg-gray-50 rounded-lg overflow-hidden aspect-square w-full md:w-full md:h-[464px] mx-auto group ${isSelectedMediaVideo ? "" : "cursor-zoom-in"
              }`}
            onClick={
              isSelectedMediaVideo
                ? undefined
                : (e) => openGallery(selectedImage)
            }
            onMouseMove={handleImageZoom}
            onMouseEnter={() => !isSelectedMediaVideo && setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            aria-label={
              isSelectedMediaVideo
                ? "Product video player"
                : "View product images in full-screen gallery"
            }
          >
            {/* Main Media Display */}
            <MediaFallbackImage
              src={
                cleanedImages[selectedImage]?.image ||
                imgUrl +
                (categories.find((cat) => cat.id === data.category)
                  ?.image_url || "")
              }
              alt={data.name}
              className={`w-full h-full object-contain transition-transform duration-200 ${isZoomed && !isSelectedMediaVideo ? "opacity-50" : ""
                }`}
              width={700}
              height={700}
              fallbackSrc={data.category_details?.cat_image}
              priority={true}
              onImageError={handleImageError}
              id={data.images[selectedImage]?.id || 0}
            />

            {/* Zoom Overlay */}
            {isZoomed && !isSelectedMediaVideo && (
              <div
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{
                  backgroundImage: `url(${data.images[selectedImage]?.image})`,
                  backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  backgroundSize: "200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            )}

            {/* Top right icons */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWishlist();
                }}
                disabled={!data.is_active}
                aria-label="Add to wishlist"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-gray-600"
                    }`}
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                aria-label="Share product"
              >
                <Share2 className="w-4 h-4 text-gray-600" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompare();
                }}
                disabled={!data.is_active}
                aria-label="Compare product"
              >
                <RotateCcw className="w-4 h-4 text-gray-600" />
              </motion.button>
            </div>
          </div>

          {/* Thumbnail Images (Responsive horizontal scroll on mobile, vertical on desktop) */}
          <div className="relative w-full md:w-[20%] h-28 md:h-[464px] overflow-x-auto md:overflow-hidden">
            {/* This inner div handles the layout change from row (mobile) to column (desktop) */}
            <motion.div
              className="flex flex-row md:flex-col gap-2 h-full"
              animate={{ y: `-${scrollOffset * 112}px` }} // This animation is for the vertical desktop view
              transition={{ duration: 0.3 }}
            >
              {data.images
                .filter((img) => !erroredImageIds.has(img.id))
                .map((img, index) => (
                  <motion.button
                    key={img.id}
                    onClick={() => setSelectedImage(index)}
                    className={`rounded border-2 overflow-hidden flex-shrink-0 w-fit ${selectedImage === index
                      ? "border-orange-500"
                      : "border-gray-200"
                      } hover:border-orange-300 transition-colors`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Select image ${index + 1}`}
                  >
                    <MediaFallbackImage
                      src={img.image}
                      alt={`${data.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-contain"
                      width={104}
                      height={104}
                      id={img.id}
                      priority={true}
                      onImageError={handleImageError}
                      isThumb={true}
                    />
                  </motion.button>
                ))}
            </motion.div>

            {/* Navigation arrows (Only visible on desktop) */}
            {data.images.length > 4 && (
              <div className="hidden md:block">
                {scrollOffset > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      setScrollOffset(Math.max(0, scrollOffset - 1))
                    }
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 z-20"
                    aria-label="Scroll thumbnails up"
                  >
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  </motion.button>
                )}

                {scrollOffset < data.images.length - 4 && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      setScrollOffset(
                        Math.min(data.images.length - 4, scrollOffset + 1)
                      )
                    }
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 z-20"
                    aria-label="Scroll thumbnails down"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Product Details */}
        <div className="space-y-6 w-full md:w-[60%]">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-2/3">
              {/* Product Title (Now includes punctuation) */}
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">
                {cleanTitle}
              </h1>
              {/* Rating and Reviews */}
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 transition-colors ${data.average_rating !== null &&
                        star <= data.average_rating
                        ? "fill-orange-400 text-orange-400"
                        : "text-gray-300"
                        }`}
                    />
                  ))}
                  <span className="text-base text-gray-600 ml-1">
                    (
                    {data.average_rating
                      ? data.average_rating.toFixed(1)
                      : "0.0"}
                    )
                  </span>
                </div>
                <p className="text-base text-gray-600">|</p>

                <Dialog>
                  <DialogTrigger asChild>
                    <span className="text-base hover:underline cursor-pointer">
                      {data.review_count > 0
                        ? `${data.review_count} Reviews`
                        : "Write a Review"}
                    </span>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-2xl z-[120]">
                    <MheWriteAReview productId={data.id} />
                  </DialogContent>
                </Dialog>

                <p className="text-base text-gray-600">|</p>

                <span className="text-lg text-gray-600">by</span>
                <Link
                  href={`/vendor-listing/${data.user_name}`}
                  className="text-lg hover:underline text-green-400"
                >
                  {data.user_name || "MHE Bazar"}
                </Link>
              </div>
              {/* Price */}
              <div className="mb-2">
                {data.hide_price || Number(data.price) <= 0 ? (
                  <span className="text-3xl font-semibold text-[#5CA131]">
                    ₹ *******
                  </span>
                ) : (
                  <>
                    <div className="flex gap-4">
                      <p className="text-3xl font-semibold text-red-400">
                        -10%
                      </p>
                      <p className="text-3xl font-semibold text-[#5CA131]">
                        ₹{displayPrice} excl. GST
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <p className="text-base text-gray-500">Price:</p>
                      <p className="text-base text-gray-500 line-through">
                        ₹{fakePrice}
                      </p>
                    </div>
                    <p className="text-sm mt-1">
                      You Save: ₹{youSaveAmount} excl. of all taxes
                    </p>
                  </>
                )}
              </div>
            </div>
            {/* Delivery & Actions */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
              {/* Delivery Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="space-y-2">
                  {data.direct_sale ? (
                    <p className="text-base font-semibold text-green-600">
                      In Stock
                    </p>
                  ) : (
                    <p className="text-sm md:text-base font-semibold">
                      Available for {data.type === "rental" ? "Rental" : "Quote"}
                    </p>
                  )}
                  {!data.is_active && (
                    <p className="text-sm font-semibold text-red-600">
                      Product is currently inactive.
                    </p>
                  )}
                </div>
                {/* Conditional rendering for direct sale */}
                {data.direct_sale ? (
                  isPurchasable ? (
                    isInCart ? (
                      <div className="mt-4 flex items-center justify-between bg-green-50 text-green-700 font-medium py-1 px-1 rounded-lg">
                        <motion.button
                          onClick={() =>
                            handleDecreaseQuantity(cartItemId as number)
                          }
                          disabled={currentCartQuantity <= 1 || !isPurchasable}
                          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </motion.button>
                        <span className="text-green-800 font-semibold text-center flex-1 text-base">
                          {currentCartQuantity}
                        </span>
                        <motion.button
                          onClick={() =>
                            handleIncreaseQuantity(cartItemId as number)
                          }
                          disabled={!isPurchasable}
                          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          onClick={() =>
                            handleRemoveFromCart(cartItemId as number)
                          }
                          className="h-8 w-8 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition-colors ml-1"
                          aria-label="Remove from cart"
                          title="Remove from Cart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAddToCart(data.id)}
                          className="w-full bg-[#5CA131] hover:bg-green-700 text-white font-semibold py-3 rounded-md text-base transition"
                          aria-label="Add to Cart"
                        >
                          <ShoppingCart className="inline-block mr-2 w-5 h-5" />{" "}
                          Add to Cart
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleBuyNow}
                          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-md text-base transition"
                          aria-label="Buy Now"
                        >
                          Buy Now
                        </motion.button>
                      </div>
                    )
                  ) : (
                    <div className="mt-4 flex flex-col gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-[#5CA131] hover:bg-green-700 text-white font-semibold py-3 rounded-md text-base transition"
                            aria-label="Get a quote"
                            disabled={!data.is_active}
                          >
                            Get a Quote
                          </motion.button>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-2xl z-[120]">
                          <QuoteForm
                            product={data as any}
                            onClose={() =>
                              document
                                .querySelector<HTMLButtonElement>(
                                  "[data-dialog-close]"
                                )
                                ?.click()
                            }
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  )
                ) : (
                  <div className="mt-4 flex flex-col gap-2">
                    {isRentalOrUsed ? (
                      <>
                        <Dialog>
                          <DialogTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full bg-[#5CA131] hover:bg-green-700 text-white font-semibold py-3 rounded-md text-base transition"
                              aria-label="Rent Now"
                              disabled={!data.is_active}
                            >
                              Rent Now
                            </motion.button>
                          </DialogTrigger>
                          <DialogContent className="w-full max-w-2xl z-[120]">
                            <RentalForm
                              productId={data.id}
                              productDetails={{
                                image:
                                  data.images[0]?.image ||
                                  data.category_details?.cat_image ||
                                  "/no-product.jpg",
                                title: data.name,
                                description: data.description,
                                price: data.price,
                                stock_quantity: data.stock_quantity,
                              }}
                              onClose={() =>
                                document
                                  .querySelector<HTMLButtonElement>(
                                    "[data-dialog-close]"
                                  )
                                  ?.click()
                              }
                            />
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-md text-base transition"
                              aria-label="Get a Quote"
                              disabled={!data.is_active}
                            >
                              Get a Quote
                            </motion.button>
                          </DialogTrigger>
                          <DialogContent className="w-full max-w-2xl z-[120]">
                            <QuoteForm
                              product={data as any}
                              onClose={() =>
                                document
                                  .querySelector<HTMLButtonElement>(
                                    "[data-dialog-close]"
                                  )
                                  ?.click()
                              }
                            />
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-[#5CA131] hover:bg-green-700 text-white font-semibold py-3 rounded-md text-base transition"
                            aria-label={formButtonText}
                            disabled={!data.is_active}
                          >
                            {formButtonText}
                          </motion.button>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-2xl z-[120]">
                          <QuoteForm
                            product={data as any}
                            onClose={() =>
                              document
                                .querySelector<HTMLButtonElement>(
                                  "[data-dialog-close]"
                                )
                                ?.click()
                            }
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Features Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-semibold text-xs mb-1">Worldwide Delivery</p>
              <p className="text-xs text-gray-600">
                We deliver products globally
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Headphones className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-semibold text-xs mb-1">Support 24/7</p>
              <p className="text-xs text-gray-600">Reach our experts today!</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-semibold text-xs mb-1">
                First Purchase Discount
              </p>
              <p className="text-xs text-gray-600">Up to 5% discount</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <RotateCcw className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-semibold text-xs mb-1">Easy Returns</p>
              <p className="text-xs text-gray-600">Read our return policy</p>
            </div>
          </div>

          {/* Documents: Brochure (public) & Offer (logged-in users only) */}
          {(data.brochure || data.offer) && (
            <div className="pt-6 border-t border-gray-200">
              <p className="text-lg md:text-2xl font-bold mb-4">Documents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.brochure && (
                  <a
                    href={cleanMediaUrl(data.brochure)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleDownloadBrochure}
                    className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-[#5CA131] hover:shadow-md transition-all"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-[#5CA131] group-hover:bg-[#5CA131] group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">Product Brochure</p>
                      <p className="text-xs text-gray-500">Full specifications (PDF)</p>
                    </div>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-[#5CA131] transition-colors shrink-0" />
                  </a>
                )}

                {data.offer && (
                  <button
                    type="button"
                    onClick={handleViewOffer}
                    className="group flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-left hover:border-orange-400 hover:shadow-md transition-all"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">Special Offer</p>
                      <p className="text-xs text-gray-500">
                        {user ? "Click to view" : "Login required to view"}
                      </p>
                    </div>
                    {user ? (
                      <Download className="w-4 h-4 text-orange-500 group-hover:text-orange-700 transition-colors shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-orange-500 group-hover:text-orange-700 transition-colors shrink-0" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-200">
            <p className="text-lg md:text-2xl font-bold">Product Details</p>
            <div className="relative">
              {/* ✅ FIX: Render description as HTML output */}
              <div
                className="line-clamp-4 text-sm md:text-base prose max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
              <button
                onClick={() => {
                  setOpenAccordion("desc");
                  document
                    .querySelector("#description-accordion")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                }}
                className="mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 group"
              >
                Read More
                <ChevronDown className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <div className="flex gap-4 mt-4">
              <Dialog>
                <DialogTrigger asChild disabled={!data.is_active}>
                  <motion.button
                    whileHover={{ x: data.is_active ? 5 : 0 }}
                    className="underline cursor-pointer font-semibold text-left disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline text-xl"
                    aria-label={formButtonText}
                    disabled={!data.is_active}
                  >
                    {formButtonText}
                  </motion.button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-2xl z-[120]">
                  {isRentalOrUsed ? (
                    <RentalForm
                      productId={data.id}
                      productDetails={{
                        image:
                          data.images[0]?.image ||
                          data.category_details?.cat_image ||
                          "/no-product.jpg",
                        title: data.name,
                        description: data.description,
                        price: data.price,
                        stock_quantity: data.stock_quantity,
                      }}
                      onClose={() =>
                        document
                          .querySelector<HTMLButtonElement>(
                            "[data-dialog-close]"
                          )
                          ?.click()
                      }
                    />
                  ) : (
                    <QuoteForm
                      product={data as any}
                      onClose={() =>
                        document
                          .querySelector<HTMLButtonElement>(
                            "[data-dialog-close]"
                          )
                          ?.click()
                      }
                    />
                  )}
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild disabled={!data.is_active}>
                  <motion.button
                    whileHover={{ x: data.is_active ? 5 : 0 }}
                    className="underline cursor-pointer font-semibold text-left disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline text-xl"
                    aria-label="Rent This"
                    disabled={!data.is_active}
                  >
                    Rent This Instead
                  </motion.button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-2xl z-[120]">
                  <RentalForm
                    productId={data.id}
                    productDetails={{
                      image:
                        data.images[0]?.image ||
                        data.category_details?.cat_image ||
                        "/no-product.jpg",
                      title: data.name,
                      description: data.description,
                      price: data.price,
                      stock_quantity: data.stock_quantity,
                    }}
                    onClose={() =>
                      document
                        .querySelector<HTMLButtonElement>("[data-dialog-close]")
                        ?.click()
                    }
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Section */}
      <div className="mt-8">
        {/* Description */}
        <div
          id="description-accordion"
          className="border rounded-lg mb-4 overflow-hidden"
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
            onClick={() =>
              setOpenAccordion(openAccordion === "desc" ? null : "desc")
            }
          >
            <span className="font-bold text-base md:text-xl">Description</span>
            <motion.div
              animate={{ rotate: openAccordion === "desc" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
         <AnimatePresence>
            {openAccordion === "desc" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-4 py-3 text-gray-700 text-sm overflow-hidden prose max-w-none [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_td]:border [&_td]:border-gray-300 [&_td]:p-3 [&_th]:border [&_th]:border-gray-300 [&_th]:p-3 [&_th]:bg-gray-100"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
            )}
          </AnimatePresence>
        </div>
        {/* Specification */}
        <div className="border rounded-lg mb-4 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
            onClick={() => {
              if (!user) {
                toast.error("Please log in to view product specifications.");
                router.push("/login");
                return;
              }
              setOpenAccordion(openAccordion === "spec" ? null : "spec");
            }}
          >
            <span className="font-bold text-base md:text-xl">
              Specification
            </span>
            <motion.div
              animate={{ rotate: openAccordion === "spec" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
          <AnimatePresence>
            {openAccordion === "spec" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="p-0 overflow-hidden"
              >
                {validSpecs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Specification
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {validSpecs.flatMap(([key, value], index) => {
                          if (
                            typeof value === "string" &&
                            value.startsWith("[") &&
                            value.endsWith("]")
                          ) {
                            try {
                              const parsedArray = JSON.parse(value);
                              if (Array.isArray(parsedArray)) {
                                return parsedArray.map((item, specIndex) => {
                                  const colonIndex = item.indexOf(':');
                                  const specKey = colonIndex !== -1 ? item.substring(0, colonIndex).trim() : "Detail";
                                  const specValue = colonIndex !== -1 ? item.substring(colonIndex + 1).trim() : item;

                                  return (
                                    <tr
                                      key={`${key}-${specIndex}`}
                                      className={`hover:bg-gray-50 transition-colors duration-150 ${specIndex % 2 === 0
                                        ? "bg-white"
                                        : "bg-gray-25"
                                        }`}
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-700">
                                          {specKey}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="text-sm text-gray-900 font-medium">
                                          {specValue}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                });
                              }
                            } catch (e) {
                              console.error(
                                "Failed to parse spec string:",
                                value,
                                e
                              );
                            }
                          }

                          return (
                            <tr
                              key={key}
                              className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? "bg-white" : "bg-gray-25"
                                }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-700">
                                  {formatKey(key)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-gray-900 font-medium">
                                  {String(value)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">
                      No specifications available at this time.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Vendor */}
        <div className="border rounded-lg mb-4 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
            onClick={() =>
              setOpenAccordion(openAccordion === "vendor" ? null : "vendor")
            }
          >
            <span className="font-bold text-base md:text-xl">Vendor</span>
            <motion.div
              animate={{ rotate: openAccordion === "vendor" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
          <AnimatePresence>
            {openAccordion === "vendor" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4" // Use padding on the container
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Vendor Image */}
                  {data.user_image && (
                    <img
                      src={data.user_image}
                      alt={data.user_name || "Vendor Profile"}
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  )}

                  <div className="flex-1">
                    {/* Vendor Name */}
                    <p className="font-semibold text-lg text-gray-800">
                      {data.user_name || "N/A"}
                    </p>

                  {data.user_description ? (
                      <div
                        className="mt-2 text-sm text-gray-700 prose max-w-none [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_td]:border [&_td]:border-gray-300 [&_td]:p-3 [&_th]:border [&_th]:border-gray-300 [&_th]:p-3 [&_th]:bg-gray-100"
                        dangerouslySetInnerHTML={{ __html: sanitizedVendorDesc }}
                      />
                    ) : (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        No description available.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {data.id && (
        <ReviewSection
          productId={data.id}
        // The prop 'registerRefresher' has been removed from ReviewSection
        // based on your request to ignore the previous error.
        />
      )}

      {/* --- New, Dedicated, Centered Media Gallery Modal --- */}
      <AnimatePresence>
        {isGalleryOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/90 p-4 md:p-8 flex items-center justify-center overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative w-full h-full max-w-6xl flex flex-col items-center justify-center">
              {/* Close button at the top right */}
              <button
                className="absolute top-4 right-4 text-white z-20 hover:scale-110 transition-transform"
                onClick={closeGallery}
                aria-label="Close media gallery"
              >
                <X className="w-8 h-8" />
              </button>

              {/* Main media view */}
              <div className="relative w-full h-[70vh] md:h-[80vh] flex items-center justify-center">
                {/* 🎯 FIX: Render Video/Image in Modal with clean URLs */}
                {isVideoUrl(data.images[currentMediaIndex]?.image) ? (
                  <VideoPlayer
                    src={cleanMediaUrl(
                      data.images[currentMediaIndex]?.image || "/no-product.jpg"
                    )}
                    alt={`${data.name} media ${currentMediaIndex + 1}`}
                    // Use max-w/h-full to ensure it fits the container while respecting its aspect ratio
                    className="max-h-full max-w-full rounded-md"
                  />
                ) : (
                  <FallbackImage
                    src={cleanMediaUrl(
                      data.images[currentMediaIndex]?.image || "/no-product.jpg"
                    )}
                    alt={`${data.name} media ${currentMediaIndex + 1}`}
                    // Use max-h/w-full to ensure it fits the container
                    className="max-h-full max-w-full object-contain rounded-md"
                    width={1000}
                    height={1000}
                    fallbackSrc={data.category_details?.cat_image}
                    priority
                    onImageError={() => { }} // No-op handler since this image is critical
                    id={data.images[currentMediaIndex]?.id || 0}
                  />
                )}

                {/* Navigation arrows */}
                {data.images.length > 1 && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-40 transition-colors z-10"
                      onClick={goToPrevMedia}
                      aria-label="Previous media item"
                    >
                      <ChevronLeft className="w-6 h-6 text-black" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-40 transition-colors z-10"
                      onClick={goToNextMedia}
                      aria-label="Next media item"
                    >
                      <ChevronRight className="w-6 h-6 text-black" />
                    </motion.button>
                  </>
                )}
              </div>

              {/* Responsive Thumbnails at the bottom */}
              <div className="mt-4 w-full flex justify-center overflow-x-auto gap-2">
                {data.images.map((img, index) => (
                  <motion.button
                    key={img.id}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${currentMediaIndex === index
                      ? "border-orange-500"
                      : "border-transparent hover:border-gray-600"
                      }`}
                    aria-label={`Select media thumbnail ${index + 1}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MediaFallbackImage
                      src={img.image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      width={80}
                      height={80}
                      id={img.id}
                      onImageError={() => { }}
                      isThumb={true}
                    />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thank You popup shown after a Brochure/Offer download is triggered */}
      <Dialog
        open={!!thankYouDoc}
        onOpenChange={(open) => {
          if (!open) setThankYouDoc(null);
        }}
      >
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="w-8 h-8 text-[#5CA131]" />
            </div>
            <DialogTitle className="text-xl">Thank You!</DialogTitle>
            <DialogDescription className="text-sm">
              {thankYouDoc?.type === "offer" ? "The offer" : "The brochure"}{" "}
              <span className="font-medium text-gray-700">
                {thankYouDoc?.fileName}
              </span>{" "}
              has started downloading.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
