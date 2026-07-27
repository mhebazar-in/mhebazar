"use client";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutTemplate,
  User2,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const Sidebar = () => {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/admin",
    },
    {
      icon: FileText,
      label: "Enquiry History",
      subItems: [
        { label: "Quotes", href: "/admin/forms/quotes" },
        { label: "Direct Purchase", href: "/admin/forms/direct-buy" },
        { label: "Rental", href: "/admin/forms/rentals" },
        {
          label: "Training Registrations",
          href: "/admin/forms/training-registrations",
        },
      ],
    },
    {
      icon: Users,
      label: "Registered User",
      subItems: [
        {
          label: "Registered Vendors",
          href: "/admin/accounts/registered-vendors",
        },
        { label: "Registered Users", href: "/admin/accounts/users" },
      ],
    },
    {
      icon: Plus,
      label: "Add Products",
      subItems: [
        { label: "Categories", href: "/admin/add-products/categories" },
        { label: "Subcategories", href: "/admin/add-products/subcategories" },
      ],
    },
    {
      icon: MessageSquare,
      label: "Contact History",
      subItems: [
        { label: "Newsletter", href: "/admin/contact/newsletter" },
        { label: "Contact Forms", href: "/admin/contact/contact-form" },
      ],
    },
    {
      icon: LayoutTemplate,
      label: "Blogs",
      href: "/admin/blogs",
    },
    {
      icon: User2,
      label: "Vendor Tracking",
      href: "/admin/vendor-tracking",
    },
    {
      icon: FileDown,
      label: "Document Downloads",
      href: "/admin/document-downloads",
    },

  ];

  const toggleSubmenu = (index: number) => {
    if (!isExpanded) return;
    setOpenSubmenu(openSubmenu === index ? null : index);
  };

  return (
    <div className="sticky top-0 left-0 w-fit h-screen">
      <div
        className={`h-full bg-gradient-to-b from-white to-white-50 border-r-2 border-[#5da031]/20 shadow-lg transition-all duration-100 ease-linear ${
          isExpanded ? "w-64" : "w-16"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-3 py-4 border-b-2 border-[#5da031]/20 bg-gradient-to-r from-[#5da031]/5 to-white">
            <div className="flex items-center justify-between">
              {isExpanded && (
                 <Link href="/" className="flex-grow flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                  <Image
                    src="/mhe-logo.png"
                    alt="MHE Bazar Logo"
                    width={100}
                    height={40}
                    className="w-auto h-10 object-contain"
                  />
                </Link>
              )}

              <button
                onClick={() => {
                  setOpenSubmenu(null);
                  setIsExpanded((prev) => !prev);
                }}
                className="p-2 rounded-lg border border-transparent"
                aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {isExpanded ? (
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <ul className="space-y-0.5">
              {menuItems.map((item, index) => (
                <li key={item.label}>
                  <div>
                    <div
                      className={`flex items-center p-1.5 rounded-lg cursor-pointer group border border-transparent
                      ${
                        pathname === item.href
                          ? "text-[#5da031] font-semibold"
                          : "text-gray-700"
                      }`}
                      onClick={() =>
                        item.subItems ? toggleSubmenu(index) : null
                      }
                    >
                      <div
                        className={`p-1 rounded-md border border-transparent 
                        ${
                          pathname === item.href
                            ? "text-[#5da031]"
                            : "text-gray-600"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>

                      {isExpanded && (
                        <>
                          {item.href ? (
                            <Link
                              href={item.href}
                              className={`ml-2 font-medium flex-1 
                                ${
                                  pathname === item.href
                                    ? "text-[#5da031] font-semibold"
                                    : "text-gray-700"
                                }`}
                            >
                              {item.label}
                            </Link>
                          ) : (
                            <span
                              className={`ml-2 font-medium flex-1 
                                ${
                                  pathname === item.href
                                    ? "text-[#5da031] font-semibold"
                                    : "text-gray-700"
                                }`}
                            >
                              {item.label}
                            </span>
                          )}

                     

                          {item.subItems && (
                            <div className="p-1 rounded">
                              <ChevronDown
                                className={`w-4 h-4 transition-all duration-100 
                                  ${
                                    openSubmenu === index
                                      ? "rotate-0"
                                      : "-rotate-90"
                                  }
                                  ${
                                    pathname === item.href
                                      ? "text-[#5da031]"
                                      : "text-gray-400"
                                  }`}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Submenu */}
                    {isExpanded && item.subItems && (
                      <div
                        className={`overflow-hidden transition-all duration-100 ${
                          openSubmenu === index
                            ? "max-h-40 opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="mt-0.5 ml-5 space-y-0.5">
                          {item.subItems.map((subItem) => (
                            <Link
                              key={subItem.label}
                              href={subItem.href}
                              className={`flex items-center p-1 pl-2 rounded-lg border-l-2
                                ${
                                  pathname === subItem.href
                                    ? "border-[#5da031] text-[#5da031] font-medium"
                                    : "border-[#5da031]/20 text-gray-600"
                                }`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full mr-2
                                ${
                                  pathname === subItem.href
                                    ? "bg-[#5da031] scale-110"
                                    : "bg-[#5da031]/40"
                                }`}
                              />
                              <span>{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-3 border-t-2 border-[#5da031]/20 bg-gradient-to-r from-[#5da031]/5 to-white">
            {isExpanded ? (
              <div className="text-center">
                <p className="text-xs text-[#5da031] font-medium">
                  © 2025 MHE BAZAR
                </p>
                <p className="text-xs text-[#5da031]/70">All rights reserved</p>
              </div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-[#5da031]/20 to-[#5da031]/40 rounded-lg mx-auto shadow-sm" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;