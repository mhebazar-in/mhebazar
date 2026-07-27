"use client";

// Import statements
import '@/styles/animations.css';
import {
  Menu,
  ShoppingCart,
  X,
  Phone,
  ChevronDown,
  Tag,
  User,
  Package,
  Heart,
  LogOut,
  UserIcon,
  Repeat,
  LayoutDashboard,
  ClipboardList,
  Bell,
  ShieldCheck,
  UserPlus,
  FileText,
} from "lucide-react";
import { useRef, useState, useEffect, JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "./SearchBar";
import { useUser } from "@/context/UserContext";
import { useRouter, usePathname } from "next/navigation";
import { handleLogout } from "@/lib/auth/logout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import categoriesData from "@/data/categories.json";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import ContactForm from "../forms/publicforms/ContactForm";
import dynamic from 'next/dynamic';

// Dynamic imports without explicit loading/placeholder components
const DynamicCategoryMenu = dynamic(() => import("./NavOptions"), {
  ssr: false, 
});

const DynamicVendorRegistrationDrawer = dynamic(() => import("@/components/forms/publicforms/VendorRegistrationForm"), {
  ssr: false,
});


export interface Subcategory {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  image_url: string;
  subcategories: Subcategory[];
}

const navigationLinks = [
  { name: "Rental/Used MHE", href: "/used" },
  { name: "Attachments", href: "/attachments" },
  { name: "Spare Parts", href: "/spare-parts" },
  { name: "Services", href: "/services" },
  { name: "Training", href: "/training" },
  { name: "Blogs", href: "/blog" },
  { name: "Events", href: "/events" },
];

export interface User {
  id: number;
  username?: string | { image: string }[];
  email: string;
  role?: {
    id: number;
    name: string;
  };
  user_banner?: { url: string }[];
}

export default function Navbar(): JSX.Element {
  const categories: Category[] = categoriesData;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [categoriesOpen, setCategoriesOpen] = useState<boolean>(false);
  const [vendorDrawerOpen, setVendorDrawerOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // FIX 1: State to track if the component has mounted on the client side
  const [isMounted, setIsMounted] = useState(false);

  const createSlug = (name: string): string =>
    name.toLowerCase().replace(/\s+/g, "-");

  const [openCategory, setOpenCategory] = useState<number | null>(null);

  const { user, isLoading, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();

 useEffect(() => {
  if (!isMounted) return;
  if (isLoading) return;
  if (!user) return;

  const intent = localStorage.getItem("become_vendor");

  if (intent === "clicked") {
    // wait one tick so dynamic drawer mounts
    setTimeout(() => {
      setVendorDrawerOpen(true);
    }, 0);

    localStorage.removeItem("become_vendor");
  }
}, [isMounted, user, isLoading]);



  useEffect(() => {
    // FIX 1: Set mounted true on client-side to prevent initial render issues
    setIsMounted(true);

    const handleClickOutside = (event: MouseEvent): void => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setCategoriesOpen(false);
      }
    };
    if (categoriesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [categoriesOpen]);

  const onLogoutClick = async () => {
    await handleLogout(() => setUser(null), router);
  };

  return (
    // Re-applied sticky/shadow to the header element.
    <header className="bg-white shadow-sm z-50 sticky top-0"> 
      
      {/* -------------------- Top Bar (Green) -------------------- */}
      <div className="bg-[#5CA131] text-white">
        <div className="max-w-full mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-1 sm:gap-2 py-2">
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="">+91 73059 50939</span>
            </div>
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              {isLoading ? (
                // FIX: Added min-w-[120px] to reserve horizontal space, preventing layout shift
                <span role="status" aria-live="polite" className="min-w-[120px] text-center">Loading...</span>
              ) : user ? (
                <span className="font-semibold text-center sm:text-left text-xs sm:text-sm text-nowrap" aria-live="polite">
                  | Welcome,{" "}
                  {typeof user.username === "string"
                    ? user.username
                    : user.email}
                  !
                </span>
              ) : (
                // Wrapped links in a div to maintain consistent structure
                <div className="flex items-center gap-4 text-xs sm:text-sm">
                  <Link href="/login" className="hover:underline">
                    Sign In
                  </Link>
                  <span className="opacity-50">|</span>
                  <Link href="/register" className="hover:underline">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* -------------------- Main Bar (Logo, Search, Icons) -------------------- */}
      <div className="bg-white">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 sm:py-3">
            <button
              className="lg:hidden p-1 sm:p-2 rounded-md text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="flex items-center ml-2 sm:ml-5">
              <Link href="/" className="flex items-center relative shine-effect">
                <Image
                  src="/mhe-logo.png"
                  alt="MHE BAZAR Logo"
                  width={120}
                  height={35}
                  className="h-8 sm:h-10 w-auto object-contain"
                  priority
                />
                <span className="shine-overlay"></span>
              </Link>
            </div>

            <div className="hidden md:flex flex-1 max-w-5xl mx-2 sm:mx-8 items-center gap-2 sm:gap-4">
              <SearchBar
                categories={categories}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
              <Link
                href="/vendor-listing"
                className="flex-shrink-0 relative overflow-hidden rounded-md shine-effect hidden sm:block"
              >
                  <Image
                  src="/brand-image.webp"
                  alt="Brand Store"
                  width={120}
                  height={40}
                  priority
                  className="object-contain"
                  style={{ boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)" }}
                />
                <span className="shine-overlay"></span>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/compare"
                className="hidden sm:flex items-center text-gray-600 hover:text-gray-900 transition"
                aria-label="Compare Products"
              >
                <Repeat className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>

              {!isLoading && user && (
                <Link
                  href="/cart"
                  className="flex items-center text-gray-600 hover:text-gray-900 transition"
                  aria-label="Cart"
                >
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                </Link>
              )}

              <div className="relative" ref={profileMenuRef}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {/* FIX 3: Made the trigger button the same size across states to prevent layout shift */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                      {isLoading ? (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
                          <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
                        </div>
                      ) : user ? (
                        <>
                          {Array.isArray(user.username) && user.username[0]?.image ? (
                            <Image
                              src={user.username[0].image}
                              alt="Profile"
                              width={40}
                              height={40}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-green-600 shadow-sm object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-64" align="end">
                    {user ? (
                      <>
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href="/account" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4 text-green-600" />
                            <span>My Account</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/account/orders"
                            className="cursor-pointer"
                          >
                            <Package className="mr-2 h-4 w-4 text-green-600" />
                            <span>My Orders</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/account/wishlist"
                            className="cursor-pointer"
                          >
                            <Heart className="mr-2 h-4 w-4 text-green-600" />
                            <span>Wishlist</span>
                          </Link>
                        </DropdownMenuItem>

                        {user.role?.id === 2 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Vendor Panel</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/vendor/dashboard"
                                className="cursor-pointer"
                              >
                                <LayoutDashboard className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Dashboard</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/vendor/product-list"
                                className="cursor-pointer"
                              >
                                <Tag className="mr-2 h-4 w-4 text-blue-600" />
                                <span>My Products</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/vendor/document-downloads"
                                className="cursor-pointer"
                              >
                                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Document Downloads</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/vendor/profile"
                                className="cursor-pointer"
                              >
                                <User className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Vendor Profile</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/vendor/notifications"
                                className="cursor-pointer"
                              >
                                <Bell className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Notifications</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/vendor/enquiry"
                                className="cursor-pointer"
                              >
                                <ClipboardList className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Enquiries</span>
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}

                        {user.role?.id === 1 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Admin Panel</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href="/admin" className="cursor-pointer">
                                <ShieldCheck className="mr-2 h-4 w-4 text-red-600" />
                                <span>Admin Dashboard</span>
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={onLogoutClick}
                          className="cursor-pointer text-red-500 focus:text-red-700"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Logout</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/login" className="cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign In</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/register" className="cursor-pointer">
                            <UserPlus className="mr-2 h-4 w-4" />
                            <span>Sign Up</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="md:hidden pb-2 sm:pb-3">
            <div className="flex items-center gap-2">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
              <Link
                href="/vendor-listing"
                className="flex-shrink-0 relative overflow-hidden rounded-md shine-effect"
              >
                <Image
                  src="/brand-image.png"
                  alt="Brand Store"
                  width={120}
                  height={40}
                  priority
                  className="object-contain"
                  style={{ boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)" }}
                />
                <span className="shine-overlay"></span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------- Navigation Bar (Bottom Nav - RIBBON) -------------------- */}
      {/* FIX: Only show this complex navigation if the component is mounted on the client */}
      {isMounted && (
        <nav className="hidden lg:block bg-white border-t border-gray-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className="relative"
                  ref={categoryMenuRef}
                  onMouseEnter={() => setCategoriesOpen(true)}
                  onMouseLeave={() => setCategoriesOpen(false)}
                >
                  <button
                    className={`flex items-center gap-2 px-4 py-3 text-sm transition ${
                      pathname.includes("categories") || categoriesOpen
                        ? "text-gray-900 font-bold"
                        : "text-gray-700 hover:text-gray-900 font-normal"
                    }`}
                    aria-expanded={categoriesOpen} 
                    aria-controls="category-menu-dropdown" 
                  >
                    <Menu className="w-5 h-5" />
                    All Categories
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <DynamicCategoryMenu
                    isOpen={categoriesOpen}
                    onClose={() => setCategoriesOpen(false)}
                    categories={categories}
                  />
                </div>

                <div className="flex items-center">
                  {navigationLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      className={`px-4 py-3 text-sm transition ${
                        pathname === link.href
                          ? "text-gray-900 font-bold"
                          : "text-gray-700 hover:text-gray-900 font-normal"
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* These links were causing the jump when loading. They are now correctly placed only here. */}
              <div className="flex items-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`flex items-center gap-2 px-4 py-3 transition cursor-pointer ${
                        pathname === "/contact"
                          ? "text-gray-900 font-bold"
                          : "text-gray-600 hover:text-gray-900 font-normal"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center text-gray-700 font-normal text-sm">
                        ?
                      </div>
                      <span className="text-sm font-normal">Help</span>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Help</DialogTitle>
                      <DialogDescription>
                        <ContactForm />
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>

                {isLoading ? (
                  // FIX: Loading state placeholder for consistency
                  <span className="px-4 py-3 text-sm text-gray-600 font-normal min-w-[120px]" role="status" aria-live="polite">
                    {" "}
                    Loading...
                  </span>
                ) : user ? (
                  user.role?.id === 2 ? (
                    <Link
                      href="/vendor/dashboard"
                      className={`flex items-center gap-2 px-4 py-3 transition ${
                        pathname.includes("/vendor/dashboard")
                          ? "text-gray-900 font-bold"
                          : "text-gray-600 hover:text-gray-900 font-normal"
                      }`}
                    >
                      <User className="w-5 h-5" />
                      <span className="text-sm font-normal">
                        {" "}
                        My Vendor Dashboard
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVendorDrawerOpen(true)}
                      className={`flex items-center gap-2 px-4 py-3 transition bg-transparent border-0 cursor-pointer ${
                        pathname === "/become-a-vendor"
                          ? "text-gray-900 font-bold"
                          : "text-gray-600 hover:text-gray-900 font-normal"
                      }`}
                    >
                      <User className="w-5 h-5" />
                      <span className="text-sm font-normal">
                        Become a Vendor
                      </span>{" "}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setVendorDrawerOpen(true)}
                    className={`flex items-center gap-2 px-4 py-3 transition bg-transparent border-0 cursor-pointer ${
                      pathname === "/become-a-vendor"
                        ? "text-gray-900 font-bold"
                        : "text-gray-600 hover:text-gray-900 font-normal"
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-sm font-normal">Become a Vendor</span>
                  </button>
                )}

                <Link
                  href="/services/subscription-plan"
                  className={`flex items-center gap-2 px-4 py-3 transition ${
                    pathname === "/services/subscription-plan"
                      ? "text-gray-900 font-bold"
                      : "text-gray-600 hover:text-gray-900 font-normal"
                  }`}
                >
                  <Tag className="w-5 h-5" />
                  <span className="text-sm font-normal">Price Plan</span>{" "}
                </Link>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* -------------------- Mobile Menu Drawer -------------------- */}
      <AnimatePresence>
        {isMounted && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50"
          >
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 w-80 max-w-[85vw] h-full bg-white shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <Link
                  href="/"
                  className="flex items-center relative shine-effect"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Image
                    src="/mhe-logo.webp"
                    alt="MHE BAZAR Logo"
                    width={120}
                    height={32}
                    className="h-8 w-auto object-contain"
                    style={{ maxWidth: 120 }}
                    priority
                  />
                  <span className="shine-overlay"></span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  aria-label="Close navigation menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="border-b border-gray-200">
                  <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Categories
                  </div>
                  {categories?.map((category) => (
                    <div key={category.id} className="border-b border-gray-100">
                      <button
                        onClick={() => {
                          setOpenCategory(
                            openCategory === category.id ? null : category.id
                          );
                        }}
                        className={`w-full flex justify-between items-center px-6 py-3 text-left transition ${
                          pathname.startsWith(`/${createSlug(category.name)}`)
                            ? "text-gray-900 font-bold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        aria-expanded={openCategory === category.id} 
                        aria-controls={`mobile-category-${category.id}`} 
                      >
                        <span>{category.name}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                            openCategory === category.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {openCategory === category.id && (
                          <motion.div
                            id={`mobile-category-${category.id}`} 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-white"
                          >
                            <Link
                              href={`/${createSlug(category.name)}`}
                              className={`block pl-10 pr-6 py-3 font-medium transition ${
                                pathname === `/${createSlug(category.name)}`
                                  ? "text-gray-900 font-bold"
                                  : "text-gray-800 hover:bg-gray-50"
                              }`}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              All {category.name}
                            </Link>

                            {category.subcategories.length > 0 ? (
                              category.subcategories.map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`/${createSlug(
                                    category.name
                                  )}/${createSlug(sub.name)}`}
                                  className={`block pl-10 pr-6 py-3 transition ${
                                    pathname ===
                                    `/${createSlug(category.name)}/${createSlug(
                                      sub.name
                                    )}`
                                      ? "text-gray-900 font-bold"
                                      : "text-gray-600 hover:bg-gray-50"
                                  }`}
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {sub.name}
                                </Link>
                              ))
                            ) : (
                              <p className="pl-10 pr-6 py-3 text-gray-400 text-sm italic">
                                No subcategories found.
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                <div className="flex-1">
                  {navigationLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      className={`block px-4 py-3 border-b border-gray-100 font-medium transition ${
                        pathname === link.href
                          ? "text-gray-900 bg-gray-50 font-bold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ))}
                  <Link
                    href="/vendor-listing"
                    className={`block px-4 py-3 font-semibold border-b border-gray-100 transition relative overflow-hidden shine-effect ${
                      pathname === "/vendor-listing"
                        ? "text-gray-900 bg-gray-50 font-bold"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                      <Image
                    src="/brand-image.png"
                    alt="Brand Store"
                    width={120}
                    height={40}
                    priority
                    className="object-contain"
                    style={{ boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)" }}
                  />
                    <span className="shine-overlay"></span>
                  </Link>
                  <Link
                    href="/contact"
                    className={`block px-4 py-3 border-b border-gray-100 font-medium transition ${
                      pathname === "/contact"
                        ? "text-gray-900 bg-gray-50 font-bold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Help
                  </Link>
                  {isLoading ? (
                    <span className="block px-4 py-3 text-gray-700" role="status" aria-live="polite">
                      Loading...
                    </span>
                  ) : user?.role?.id === 2 ? (
                    <Link
                      href="/vendor/dashboard"
                      className={`block px-4 py-3 font-semibold border-b border-gray-100 transition ${
                        pathname.includes("/vendor/dashboard")
                          ? "text-gray-900 bg-gray-50 font-bold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Vendor Dashboard
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setVendorDrawerOpen(true);
                      }}
                      className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 border-b border-gray-100 font-medium transition bg-transparent"
                    >
                      Become a Vendor
                    </button>
                  )}
                  <Link
                    href="/services/subscription-plan"
                    className={`block px-4 py-3 border-b border-gray-100 font-medium transition ${
                      pathname === "/services/subscription-plan"
                        ? "text-gray-900 bg-gray-50 font-bold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Price Plan
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DynamicVendorRegistrationDrawer
        open={vendorDrawerOpen}
        onClose={() => setVendorDrawerOpen(false)}
      />
    </header>
  );
}