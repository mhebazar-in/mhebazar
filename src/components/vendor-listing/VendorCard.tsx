// src/components/VendorCard.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/api";

// --- Types ---
type Vendor = {
  id: number;
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  company_name: string;
  company_email: string;
  company_phone?: string;
  brand: string;
  is_approved: boolean;
  application_date: string;
  product_count?: number;
  user_info?: {
    id: number;
    profile_photo: string;
  };
};

type UserProfile = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
};

type Props = {
  vendor: Vendor;
};

const createSlug = (name: string): string => {
  if (!name) return "";
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

export default function VendorCard({ vendor }: Props) {
  const [isAdminPath, setIsAdminPath] = useState(false);
  const router = useRouter();

  // --- Modal States ---
  const [modalStep, setModalStep] = useState<"loading" | "login_required" | "form" | "contact_info">("loading");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setIsAdminPath(window.location.pathname.startsWith("/admin/"));
  }, []);

  const vendorSlug = createSlug(vendor.brand);
  const href = isAdminPath
    ? `/admin/accounts/registered-vendors/${vendorSlug}/?user=${vendor?.user_info?.id}`
    : `/vendor-listing/${vendorSlug}`;
  const trackVendorClick = async () => {
    try {
      await api.post("/track-vendor-click/", {
        vendor_id: vendor.id,
      });
    } catch (error) {
      console.error("Tracking failed:", error);

    }
  };

  // --- 1. HANDLE CONTACT CLICK ---
  const handleContactClick = async () => {
    setIsModalOpen(true);
    setModalStep("loading");
    setError("");

    try {
      const res = await api.get("/users/me/");
      const userData: UserProfile = res.data;

      setCurrentUser(userData);

      const isMissingInfo =
        !userData.first_name ||
        // !userData.last_name ||
        !userData.phone ||
        !userData.email;

      if (isMissingInfo) {
        setFormData({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          phone: userData.phone || "",
        });
        setModalStep("form");
      } else {
        setModalStep("contact_info");
        trackVendorClick();
      }

    } catch (error: any) {
      if (error.response?.status === 401) {
        setModalStep("login_required");
        return;
      }

      console.error("Profile fetch error:", error);
      setError(
        error.response?.data?.detail ||
        "Unable to load profile. Please try again."
      );
    }
  };

  // --- 2. HANDLE FORM SUBMIT ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;

    try {
      const res = await api.patch(
        `/users/${currentUser.id}/`,
        formData
      );

      // ✅ Same success logic as before
      if (res.status >= 200 && res.status < 300) {
        setModalStep("contact_info");
        trackVendorClick();
      }

    } catch (error: any) {
      console.error(error);

      // ✅ Keep same 401 handling logic style
      if (error.response?.status === 401) {
        setModalStep("login_required");
        return;
      }

      // ✅ Keep same backend error extraction logic
      const errData = error.response?.data;

      if (errData) {
        setError(JSON.stringify(errData.detail || errData));
      } else {
        setError("Failed to update profile. Please try again.");
      }
    }
  };

  const getModalTitle = () => {
    switch (modalStep) {
      case "contact_info": return "Vendor Contact Details";
      case "login_required": return "Login Required";
      case "form": return "Complete Your Profile";
      default: return "Please Wait";
    }
  };

  return (
    <>
      <div className="relative border border-gray-200 rounded-2xl p-4 flex flex-col items-center shadow-sm hover:shadow-lg transition-all duration-200 bg-white w-full h-full font-inter">
        {vendor.product_count !== undefined && (
          <span className="absolute top-4 right-4 bg-green-500/20 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">
            {vendor.product_count} items
          </span>
        )}

        <div className="relative w-28 h-28 my-4 rounded-xl flex items-center justify-center overflow-hidden">
          <Image
            src={vendor.user_info?.profile_photo || "/placeholder-logo.png"}
            alt={`${vendor.brand} Logo`}
            width={112}
            height={112}
            className="object-contain"
          />
        </div>

        <h3 className="text-lg font-semibold text-center text-gray-900 mb-1">
          {vendor.brand}
        </h3>

        <p className="text-sm text-gray-500 text-center mb-4 line-clamp-1">
          {vendor.company_name}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 w-full mt-auto">
          <Link href={href} className="flex-1">
            <Button className="w-full text-sm font-medium py-2 rounded-lg bg-[#5CA131] hover:bg-[#4a8f28] text-white transition-colors duration-150 cursor-pointer">
              View Product
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={handleContactClick}
            className="flex-1 text-sm font-medium py-2 rounded-lg border border-[#5CA131] text-[#5CA131] hover:bg-[#f2fbf2] transition-colors duration-150 cursor-pointer"
          >
            Contact
          </Button>
        </div>
      </div>

      {/* --- POPUP MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

            <div className="bg-[#5CA131] p-4 flex justify-between items-center">
              <h3 className="text-white font-semibold text-lg">
                {getModalTitle()}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6">
              {modalStep === "loading" && !error && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5CA131]"></div>
                </div>
              )}

              {error && (
                <div className="text-center py-4">
                  <p className="text-red-500 mb-4 text-sm">{error}</p>
                  <Button onClick={() => setIsModalOpen(false)} variant="outline">
                    Close
                  </Button>
                </div>
              )}

              {modalStep === "login_required" && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">
                    You must be logged in to view vendor contact details.
                  </p>
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-[#5CA131] hover:bg-[#4a8f28] text-white"
                      onClick={() => router.push("/login")}
                    >
                      Log In
                    </Button>
                  </div>
                </div>
              )}

              {modalStep === "form" && (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    To view the vendor's phone number, please complete your contact information.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">First Name</label>
                      <input
                        required
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5CA131]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Last Name</label>
                      <input
                        
                        type="text"
                        placeholder="optional"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5CA131]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Email</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      readOnly
                      className="w-full border border-gray-300 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter your phone number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5CA131]"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#5CA131] hover:bg-[#4a8f28] text-white mt-2">
                    Save & View Contact
                  </Button>
                </form>
              )}

              {modalStep === "contact_info" && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#4ade80] to-[#22c55e] rounded-full flex items-center justify-center mx-auto text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] relative">
                    <div className="absolute inset-0 rounded-full border-2 border-[#4ade80] animate-ping opacity-40" />
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-10 h-10 relative z-10 drop-shadow-md">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">You are contacting</p>
                    <h4 className="text-xl font-bold text-gray-900">{vendor.company_name}</h4>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone Number</p>

                    {vendor.company_phone ? (
                      <a
                        href={`tel:${vendor.company_phone}`}
                        className="text-2xl font-bold text-[#5CA131] tracking-wider hover:text-[#4a8f28] hover:underline transition-colors cursor-pointer block"
                      >
                        {vendor.company_phone}
                      </a>
                    ) : (
                      <p className="text-2xl font-bold text-gray-400 tracking-wider">
                        No number available
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-gray-400">
                    We have shared your contact details with the vendor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}