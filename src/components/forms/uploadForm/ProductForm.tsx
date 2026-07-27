// ProductForm.tsx

'use client'

import { useForm } from 'react-hook-form'
import axios from 'axios'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FileText, Image as ImageIcon, Package, AlertCircle, X, Loader2, Youtube, Users, Table } from 'lucide-react'
import api from '@/lib/api'
import { useUser } from '@/context/UserContext'
import Image from 'next/image'
import { Product } from '@/types'
import { toast } from "sonner"
import Link from 'next/link'
// import 'react-quill-new/dist/quill.snow.css'
import dynamic from 'next/dynamic'


const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false })

// Helper function for SEO-friendly slug
const slugify = (text: string): string => {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/-+$/, '')
}

// NEW: simple HTML detection helper
const containsHTML = (text?: string) => {
  if (!text) return false
  return /<\/?[a-z][\s\S]*>/i.test(text)
}

// Helper to safely parse JSON
const parseJsonSafe = (data: any, fallback: any = {}) => {
  if (!data) return fallback;
  if (typeof data === 'string') {
    try {
      let parsed = JSON.parse(data);
      // Handle potential double-stringification by the backend
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (e) { }
      }
      return parsed;
    } catch (e) {
      return fallback;
    }
  }
  return data;
};

// ✅ UPGRADED: Ultimate Helper to convert Arrays, Objects, and Strings into clean multi-line text
const normalizeProductDetails = (details: any) => {
  const parsed = parseJsonSafe(details, {});
  const cleaned: Record<string, string> = {};

  Object.keys(parsed).forEach(key => {
    let val = parsed[key];

    // 1. Try to parse stringified JSON values inside the specific field
    if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
      try {
        val = JSON.parse(val);
      } catch (e) {
        // If it fails to parse, leave it as a string
      }
    }

    // 2. Format the value perfectly based on what it is
    if (Array.isArray(val)) {
      // It's an Array: ["Item 1", "Item 2"] -> "Item 1\nItem 2"
      cleaned[key] = val
        .map(item => typeof item === 'object' ? JSON.stringify(item) : String(item))
        .join('\n');

    } else if (val !== null && typeof val === 'object') {
      // It's a Key-Value Object: {"Brand": "MHE", "Color": "Red"} -> "Brand: MHE\nColor: Red"
      cleaned[key] = Object.entries(val)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

    } else {
      // It's just a standard string, number, or boolean
      cleaned[key] = String(val || '');
    }
  });
  return cleaned;
};

type FieldOption = {
  label: string
  value: string
}

type ProductDetailField = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'
  required: boolean
  options?: FieldOption[]
  placeholder?: string
}

type Category = {
  id: number
  name: string
  subcategories: Subcategory[]
  product_details: ProductDetailField[]
}

type Subcategory = {
  id: number
  name: string
  product_details: ProductDetailField[]
}

type ProductImage = {
  id: number;
  image: string; // URL path to the image or video URL
  product: number;
  is_video?: boolean; // Now derived from the serializer, should be present
}

type AdminVendor = {
  id: number;
  brand: string;
  company_name: string;
  user_info?: {
    id: number;
  }
}

type ProductFormData = {
  // 徴 ADDED: user field to manage ownership during create/update
  user: string;
  category: string;
  subcategory: string;
  name: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  manufacturer?: string;
  model?: string;
  price: string;
  type: string[];
  direct_sale: boolean;
  hide_price: boolean;
  online_payment: boolean;
  stock_quantity: number;
  brochure?: FileList;
  offer?: FileList;
  images?: FileList;
  product_details: Record<string, string>;
  isVendor?: boolean;
}

const TYPE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'rental', label: 'Rental' },
  { value: 'attachments', label: 'Attachments' },

]

// --- CONSTANTS FOR IMAGE VALIDATION ---
const MIN_IMAGE_SIZE_BYTES = 50 * 1024; // 50 KB
const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

// --- CONSTANTS FOR DOCUMENT VALIDATION (Brochure / Offer) ---
// Accept PDF, PPT, PPTX, DOC, DOCX
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx']
const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const DOCUMENT_ACCEPT_ATTR = '.pdf,.ppt,.pptx,.doc,.docx'

const isAllowedDocument = (file: File): boolean => {
  const name = file.name.toLowerCase()
  return (
    ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type) ||
    ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext))
  )
}

interface ProductFormProps {
  product?: Product;
  defaultType?: 'new' | 'used' | 'rental';
  onSuccess?: () => void;
  isVendor?: boolean;
  initialUserId?: string;
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'clean'] // 'clean' removes formatting
  ],
}


export default function ProductForm({ product, onSuccess, defaultType, isVendor = false, initialUserId }: ProductFormProps) {
  const [defaultCategory, setDefaultCategory] = useState<string>('')
  const [defaultSubcategory, setDefaultSubcategory] = useState<string>('')
  const [firstImageFile, setFirstImageFile] = useState<File | null>(null); // State for first/main image file
  const [imageFiles, setImageFiles] = useState<File[]>([]) // State for additional image files
  const [brochureFile, setBrochureFile] = useState<File | null>(null)
  const [offerFile, setOfferFile] = useState<File | null>(null)
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);


  // existingImages holds ALL media (images and video links) from the backend
  const [existingImages, setExistingImages] = useState<ProductImage[]>(
    (product?.images as ProductImage[]) || []
  );
  const [keptBrochureUrl, setKeptBrochureUrl] = useState<string | null>(null);
  const [keptOfferUrl, setKeptOfferUrl] = useState<string | null>(null);
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>([]); // New state for NEW YouTube links to be saved

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    resetField,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: product
      ? {
        category: String(product.category),
        subcategory: product.subcategory ? String(product.subcategory) : '',
        name: product.name,
        // 徴 CRITICAL FIX: Set original user ID for update (prevents ownership change)
        user: String(product.user),
        description: product.description,
        meta_title: product.meta_title,
        meta_description: product.meta_description,
        manufacturer: product.manufacturer,
        model: product.model,
        price: product.price,
        type: product ? parseJsonSafe(product.type, []) : [],



        direct_sale: product.direct_sale,
        hide_price: product.hide_price,
        online_payment: product.online_payment,
        stock_quantity: product.stock_quantity,
        product_details: product ? parseJsonSafe(product.product_details, {}) : {},
      }
      : {
        // Default values for new product
        user: '', // Will be set from context below
        direct_sale: true,
        hide_price: false,
        online_payment: false,
        stock_quantity: 1,
        type: [],
        // ✅ Price Field: Set default to '0.00'
        price: '0.00',
        category: '',
        subcategory: '',
        // ✅ Meta Title/Description: Set default/pre-filled values
        meta_title: '',
        meta_description: '',
      },
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [dynamicFields, setDynamicFields] = useState<ProductDetailField[]>([])
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>(() => {
    // ✅ Call the function here
    return product ? normalizeProductDetails(product.product_details) : {};
  });;

  useEffect(() => {
    if (product) {
      //  console.log("PRODUCT DETAILS FROM BACKEND:", product.product_details);
      //  const parsed = parseJsonSafe(product.product_details, {});
      //  console.log("PARSED VALUES:", parsed);
      setDynamicValues(normalizeProductDetails(product.product_details));
    } else {
      setDynamicValues({});
    }
  }, [product]);

  const selectedCategoryId = watch('category')
  const selectedSubcategoryId = watch('subcategory')
  const productName = watch('name');
  const productManufacturer = watch('manufacturer');
  const productModel = watch('model');
  const descriptionValue = watch('description'); // <- new: watch description
  const { user } = useUser();
  const [newYoutubeLink, setNewYoutubeLink] = useState(''); // State for the YouTube link input

  const hasSelectedRequiredFields = selectedCategoryId &&
    (!subcategories.length || (subcategories.length > 0 && selectedSubcategoryId))

  const [warning, setWarning] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


  useEffect(() => {
    const fetchVendorBrand = async () => {
      try {
        if (!user?.id) return;
        // If editing an existing product and it already has a manufacturer, don't overwrite
        if (product && product.manufacturer) return;

        setVendorLoading(true);

        // Fetch the specific logged-in vendor's details directly
        const res = await api.get('/vendor/dashboard/');
        const vendorDetails = res.data?.vendor_details;

        if (vendorDetails) {
          // Prioritize brand, fallback to company name
          const manufacturer =
            vendorDetails.brand?.trim() || vendorDetails.company_name?.trim();

          if (manufacturer) {
            setValue('manufacturer', manufacturer, { shouldDirty: false });
          }
        }
      } catch (err) {
        console.error('Failed to load vendor brand from DB', err);
      } finally {
        setVendorLoading(false);
      }
    };

    fetchVendorBrand();
  }, [user, product, setValue]);

  // 徴 NEW EFFECT: Fetch vendors for admins to designate ownership
  useEffect(() => {
    const fetchVendorsForAdmin = async () => {
      if (isVendor) return; // Only for admins

      try {
        setVendorsLoading(true);
        let allApproved: AdminVendor[] = [];
        let nextUrl: string | null = '/vendor/approved/';

        // Fetch ALL pages to ensure every approved vendor is listed
        while (nextUrl) {
          const res: any = await api.get(nextUrl);
          const data = res.data?.results || res.data || [];
          allApproved = [...allApproved, ...(Array.isArray(data) ? data : [])];

          // Extract the path for the next page from the absolute URL returned by Django
          if (res.data?.next) {
            const next: string = res.data.next;
            const apiIndex: number = next.indexOf('/api/');
            nextUrl = apiIndex !== -1 ? next.substring(apiIndex + 5) : null;
          } else {
            nextUrl = null;
          }
        }

        setVendors(allApproved);
      } catch (error) {
        console.error('Failed to fetch vendors for admin selection:', error);
      } finally {
        setVendorsLoading(false);
      }
    };

    fetchVendorsForAdmin();
  }, [isVendor]);

  // 徴 NEW EFFECT: Set the user ID for NEW products from context
  useEffect(() => {
    if (!product) {
      // If admin is adding for a specific vendor, use the initialUserId from prop
      // Otherwise, if it's a vendor, use their own ID
      const targetId = initialUserId || (isVendor && user?.id ? String(user.id) : null);
      if (targetId) {
        setValue("user", targetId);
      }
    }
  }, [user, product, setValue, isVendor, initialUserId]);
  // 
  // ✅ Meta Title/Description: Pre-fill logic based on productName
  useEffect(() => {
    if (!product || !product.meta_title) {
      const defaultTitle = productName || '';
      setValue('meta_title', defaultTitle);
    }
    if (!product || !product.meta_description) {
      const defaultDesc = productName ? `Explore the specifications and details of the new ${productName}.` : '';
      setValue('meta_description', defaultDesc);
    }
  }, [productName, product, setValue])

  useEffect(() => {
    if (!product && defaultType) {
      setValue('type', [defaultType], { shouldDirty: false });
    }
  }, [defaultType, product, setValue]);



  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_BASE_URL}/categories/`)
        const categoriesData = response.data?.results || response.data || []

        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData)
          if (product?.category) {
            const categoryId = String(product.category);
            setDefaultCategory(categoryId)
            setValue('category', categoryId)
          }
        } else {
          setCategories([])
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
        toast.error('Failed to load categories')
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [product, setValue, API_BASE_URL])

  // Handle category change (sets subcategories and initial dynamic fields)
  useEffect(() => {
    if (!selectedCategoryId) return

    const selectedCat = categories.find((cat) => String(cat.id) === selectedCategoryId)
    if (!selectedCat) return

    const subs = selectedCat.subcategories || []
    setSubcategories(subs)

    // Preserve subcategory if it exists on the product for edit mode
    let subToSet = '';
    if (product?.subcategory && subs.some(sub => String(sub.id) === String(product.subcategory))) {
      subToSet = String(product.subcategory);
    } else if (subs.length > 0) {
      // If categories switch, clear subcategory
      resetField('subcategory');
    }

    // Set default/existing subcategory only if available
    setDefaultSubcategory(subToSet);
    if (subToSet) setValue('subcategory', subToSet);
  }, [selectedCategoryId, categories, resetField, product, setValue])

  // Dynamic Schema Inference Helper
  // Dynamic Schema Inference Helper
  const inferDynamicFieldsIfNeeded = (schemaDetails: any[], productData: any) => {
    if (!productData || Object.keys(productData).length === 0) return schemaDetails;

    // 1. Create a copy of the existing category schema
    const mergedSchema = [...schemaDetails];

    // 2. Keep track of field names we already have so we don't duplicate them
    const existingFieldNames = new Set(schemaDetails.map((f: any) => f.name));

    // 3. Loop through all the actual data from the database
    Object.keys(productData).forEach(key => {
      // If the database has a key that isn't in our standard category schema, add it dynamically!
      if (!existingFieldNames.has(key)) {
        const val = productData[key];
        mergedSchema.push({
          name: key,
          label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          // Use textarea if it's long or has newlines
          type: (typeof val === 'string' && (val.length > 100 || val.includes('\n'))) ? 'textarea' : 'text',
          required: false // Extra mapped fields shouldn't block submission
        });
      }
    });

    return mergedSchema;
  };

  // Set dynamic fields for Category
  useEffect(() => {
    if (!selectedCategoryId) return;

    const selectedCat = categories.find(c => String(c.id) === selectedCategoryId)
    const subs = subcategories.length > 0 ? subcategories : (selectedCat?.subcategories || []);

    if (subs.length === 0 && selectedCat) {
      let catDetails = parseJsonSafe(selectedCat.product_details, []);

      // ✅ FIX: Magically map unmapped JSON key-value objects back to the form during Editing
      if (product && product.product_details) {
        const parsedProductData = parseJsonSafe(product.product_details, {});
        catDetails = inferDynamicFieldsIfNeeded(catDetails, parsedProductData);
      }

      setDynamicFields(catDetails)
      setWarning(catDetails.length > 0 ? '' : 'No product details defined in this category.')
    } else if (!selectedSubcategoryId) {
      setDynamicFields([])
      if (subs.length > 0) {
        setWarning('Select a subcategory to load product details.')
      }
    }
  }, [selectedCategoryId, categories, selectedSubcategoryId, subcategories, product])

  // Handle subcategory change (sets dynamic fields)
  useEffect(() => {
    if (!selectedSubcategoryId) {
      // Fallback to category-level details if no subcategory is selected and none exist
      const selectedCat = categories.find((cat) => String(cat.id) === selectedCategoryId)
      if (selectedCat && selectedCat.subcategories.length === 0) {
        let catDetails = parseJsonSafe(selectedCat.product_details, [])

        // ✅ FIX: Magically map unmapped JSON
        if (product && product.product_details) {
          const parsedProductData = parseJsonSafe(product.product_details, {});
          catDetails = inferDynamicFieldsIfNeeded(catDetails, parsedProductData);
        }

        setDynamicFields(catDetails)
        setWarning(catDetails.length > 0 ? '' : 'No product details defined in this category.')
      }
      return;
    }

    const sub = subcategories.find((s) => String(s.id) === selectedSubcategoryId)
    if (!sub) return

    let subDetails = parseJsonSafe(sub.product_details, []);

    // ✅ FIX: Magically map unmapped JSON
    if (product && product.product_details) {
      const parsedProductData = parseJsonSafe(product.product_details, {});
      subDetails = inferDynamicFieldsIfNeeded(subDetails, parsedProductData);
    }

    setDynamicFields(subDetails)
    setWarning(subDetails.length > 0 ? '' : 'No product details defined in this subcategory.')
  }, [selectedSubcategoryId, subcategories, selectedCategoryId, categories, product])

  const handleDynamicValueChange = (fieldName: string, value: string) => {
    setDynamicValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  // Initialize kept brochure URL and existing images
  useEffect(() => {
    if (product?.brochure) {
      setKeptBrochureUrl(product.brochure);
    }
    if (product?.offer) {
      setKeptOfferUrl(product.offer);
    }
    if (product?.images) {
      // The list of all existing media (images and video links)
      const allExistingMedia = (product.images as ProductImage[]) || [];

      // Filter out existing video links into the local state if needed (for initial deletion logic)
      const existingVideoLinks = allExistingMedia
        .filter(img => img.is_video)
        .map(img => img.image);

      // existingImages will hold ALL media (images and video links) from the backend
      setExistingImages(allExistingMedia);

      // Note: We don't populate the 'youtubeLinks' state for existing links, only for new ones
    }
  }, [product])

  // Inject a clean HTML table into the Quill Editor
  const handleInsertTable = () => {
    const currentDesc = watch('description') || '';
    const tableHTML = `
      <table data-row="2" data-col="2" style="width:100%; border-collapse: collapse; border: 1px solid #e5e7eb; margin: 10px 0;">
        <tbody>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 8px;"><strong>Header 1</strong></td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;"><strong>Header 2</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Data 1</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Data 2</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    // Append the table to the current content
    setValue('description', currentDesc + tableHTML, { shouldDirty: true });
  };


  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    const formData = new FormData();

    // 徴 CRITICAL FIX: Ensure user ID is the FIRST element and always sent.
    if (data.user) {
      formData.append("user", data.user);
    } else {
      toast.error("User information is missing. Cannot proceed.");
      setIsSubmitting(false);
      return;
    }

    // ... (append standard fields)
    formData.append('category', data.category);
    formData.append('subcategory', data.subcategory || '');
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    formData.append('meta_title', data.meta_title || '');
    formData.append('meta_description', data.meta_description || '');
    formData.append('manufacturer', data.manufacturer || '');
    formData.append('model', data.model || '');
    // ✅ Price Field: Default to '0.00' if empty
    formData.append('price', data.price || '0.00');
    formData.append('type', JSON.stringify(data.type || []));
    formData.append('direct_sale', String(data.direct_sale));
    formData.append('hide_price', String(data.hide_price));
    formData.append('online_payment', String(data.online_payment));
    formData.append('stock_quantity', String(data.stock_quantity));
    formData.append('product_details', JSON.stringify(dynamicValues));

    // ✅ YouTube Link Support: Add NEW YouTube links to formData (backend handles saving these as ProductImage records)
    formData.append('youtube_links', JSON.stringify(youtubeLinks));

    // ✅ Admin Upload Auto-Approval: If uploaded by admin (!isVendor), default to approved/active
    if (!isVendor) {
      formData.append('status', 'approved');
      formData.append('is_active', 'true');
    }

    let productId: number | undefined;

    try {
      const method = product ? 'put' : 'post';
      const url = product ? `/products/${product.id}/` : '/products/';

      // 1. Save/Update Main Product Data (This also saves the NEW YouTube links in the backend via perform_create/update)
      const productResponse = await api[method](url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      productId = product?.id || productResponse.data.id;

      // --- File Uploads (Brochure and Images) ---

      // 2. Brochure Upload/Update (Existing logic)
      if (brochureFile) {
        const brochureFormData = new FormData()
        brochureFormData.append('brochure', brochureFile)
        const brochureUrl = `/products/${productId}/upload_brochure/`
        try {
          await api.post(brochureUrl, brochureFormData, { headers: { 'Content-Type': 'multipart/form-data' } })
          setKeptBrochureUrl(brochureFile.name)
          setBrochureFile(null)
          toast.success("Brochure uploaded successfully")
        } catch (brochureError) {
          console.error("Failed to upload brochure:", brochureError)
          toast.error("Failed to upload brochure")
        }
      }

      if (offerFile) {
        const offerFormData = new FormData()
        offerFormData.append('offer', offerFile)
        const offerUrl = `/products/${productId}/upload_offer/`
        try {
          await api.post(offerUrl, offerFormData, { headers: { 'Content-Type': 'multipart/form-data' } })
          setKeptOfferUrl(offerFile.name)
          setOfferFile(null)
          toast.success("Offer uploaded successfully")
        } catch (offerError) {
          console.error("Failed to upload offer:", offerError)
          toast.error("Failed to upload offer")
        }
      }

      // 3. CONSOLIDATED Image Upload (Handles First Image and Additional Images)
      const allNewImageFiles: File[] = [];

      // Crucially, push the main image first
      if (firstImageFile) {
        allNewImageFiles.push(firstImageFile);
      }
      // Then push the additional images
      allNewImageFiles.push(...imageFiles);

      // 🚨 REMOVED: The custom 'upload_first_image' section has been removed

      if (allNewImageFiles.length > 0) {
        const imagesFormData = new FormData()
        // Send all files under the 'images' key
        allNewImageFiles.forEach((img) => imagesFormData.append('images', img))

        // Use the existing upload_images endpoint
        const imagesUrl = `/products/${productId}/upload_images/`;

        try {
          const response = await api.post(imagesUrl, imagesFormData, { headers: { 'Content-Type': 'multipart/form-data' } })

          // Safely handle response data which should contain the new ProductImage records
          const newImagesArray: ProductImage[] = Array.isArray(response.data)
            ? response.data
            : (response.data.images && Array.isArray(response.data.images))
              ? response.data.images
              : [];

          // Update the list of all existing media (images + video links)
          setExistingImages(prev => [...prev, ...newImagesArray]);
          setImageFiles([]);
          setFirstImageFile(null); // Clear the main image file state
          toast.success("New image files uploaded successfully")
        } catch (imagesError) {
          console.error("Failed to upload images:", imagesError)
          toast.error("Failed to upload new image files")
        }
      }

      // 4. Re-sync media after links are saved
      if (youtubeLinks.length > 0) {
        try {
          // Fetch the product again to get the IDs for the newly saved video links
          const res = await api.get(url);
          setExistingImages(res.data.images || []);
          setYoutubeLinks([]); // Clear NEW links once they're in the DB
          toast.success("New video links saved.")
        } catch (e) {
          console.error("Failed to re-sync media after video upload:", e);
          // Handle toast error if needed, but successful post is already done.
        }
      }


      toast.success(
        product ? "Product Updated" : "Product Created",
        {
          description: "Your product has been saved successfully!",
          duration: 3000,
        }
      )
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error)
      toast.error(
        product ? "Failed to update product" : "Failed to create product",
        {
          description: "Something went wrong. Please check the form and try again.",
          duration: 3000,
        }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBrochureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && isAllowedDocument(file)) {
      setBrochureFile(file)
      setKeptBrochureUrl(null);
    } else {
      setBrochureFile(null);
      event.target.value = '';
      toast.warning('Please select a valid document (PDF, PPT, PPTX, DOC, DOCX) for the brochure.')
    }
  }

  const handleOfferChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && isAllowedDocument(file)) {
      setOfferFile(file)
      setKeptOfferUrl(null);
    } else if (file) {
      setOfferFile(null);
      event.target.value = '';
      toast.warning('Please select a valid document (PDF, PPT, PPTX, DOC, DOCX) for the offer.')
    }
  }

  const handleFirstImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ✅ Image Upload Note & Validation: Size check
    if (file.size < MIN_IMAGE_SIZE_BYTES || file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`Image size must be between 50 KB and 1 MB. This file is ${Math.round(file.size / 1024)} KB.`);
      setFirstImageFile(null);
      event.target.value = '';
      return;
    }

    if (file.type.startsWith('image/')) {
      setFirstImageFile(file);
    } else {
      setFirstImageFile(null);
      toast.warning('Please select a valid image file.');
    }
  }

  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const validImages = Array.from(files).filter(file => {
        // ✅ Image Upload Note & Validation: Size check
        if (file.size < MIN_IMAGE_SIZE_BYTES || file.size > MAX_IMAGE_SIZE_BYTES) {
          toast.error(`Image '${file.name}' skipped: size must be between 50 KB and 1 MB.`);
          return false;
        }
        if (!file.type.startsWith('image/')) {
          toast.warning(`File '${file.name}' was not an image and was skipped.`);
          return false;
        }
        return true;
      })

      setImageFiles(prev => [...prev, ...validImages])
      event.target.value = '';
    }
  }

  // ✅ YouTube Link Support: Handler for adding a link
  const addYoutubeLink = () => {
    const link = newYoutubeLink.trim();
    if (link && !youtubeLinks.includes(link)) {
      // Simple URL check 
      if (link.toLowerCase().startsWith('http')) {
        setYoutubeLinks(prev => [...prev, link]);
        setNewYoutubeLink('');
      } else {
        toast.error("Please enter a valid URL for the YouTube link.");
      }
    } else if (youtubeLinks.includes(link)) {
      toast.warning("This YouTube link is already added.");
    }
  }

  // ✅ YouTube Link Support: Handler for removing a link
  const removeYoutubeLink = async (linkOrId: string | number) => {
    if (typeof linkOrId === 'string') {
      // Remove from NEW links (local state)
      setYoutubeLinks(prev => prev.filter(link => link !== linkOrId));
    } else if (typeof linkOrId === 'number' && product?.id) {
      // Remove from EXISTING links (database by ID)

      const confirmation = window.confirm(
        "Warning: Are you sure you want to permanently delete this video link?"
      );

      if (!confirmation) return;

      try {
        // Use the standard delete-images endpoint
        await api.delete(`/products/${product.id}/delete-images/`, { data: { image_ids: [linkOrId] } });

        // Remove from existingImages state 
        setExistingImages(prev => prev.filter(img => img.id !== linkOrId));
        toast.success('Video link removed successfully');
      } catch (error) {
        console.error('Failed to remove video link:', error);
        toast.error('Failed to remove video link');
      }
    }
  }

  const removeBrochure = () => {
    setBrochureFile(null)
    const input = document.getElementById('brochure-input') as HTMLInputElement
    if (input) input.value = ''
  }

  const removeOffer = () => {
    setOfferFile(null)
    const input = document.getElementById('offer-input') as HTMLInputElement
    if (input) input.value = ''
  }

  const removeFirstImage = () => {
    setFirstImageFile(null)
    const input = document.getElementById('first-image-input') as HTMLInputElement
    if (input) input.value = ''
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== index))
  }


  const removeExistingImage = async (imageId: number) => {
    if (!product?.id) return;

    const confirmation = window.confirm(
      "Warning: This action cannot be reversed. Are you sure you want to permanently delete this image?"
    );

    if (!confirmation) {
      return;
    }

    try {
      await api.delete(`/products/${product.id}/delete-images/`, { data: { image_ids: [imageId] } })

      setExistingImages(prev => prev.filter(img => img.id !== imageId))
      toast.success('Image removed successfully')
    } catch (error) {
      console.error('Failed to remove image:', error)
      toast.error('Failed to remove image')
    }
  }

  const removeExistingBrochure = async () => {
    if (!product?.id) return
    try {
      await api.delete(`/products/${product.id}/delete-brochure/`)
      setKeptBrochureUrl(null);
      toast.success('Brochure removed successfully')
    } catch (error) {
      console.error('Failed to remove brochure:', error)
      toast.error('Failed to remove brochure')
    }
  }

  const removeExistingOffer = async () => {
    if (!product?.id) return
    try {
      await api.delete(`/products/${product.id}/delete-offer/`)
      setKeptOfferUrl(null);
      toast.success('Offer removed successfully')
    } catch (error) {
      console.error('Failed to remove offer:', error)
      toast.error('Failed to remove offer')
    }
  }

  const renderDynamicField = (field: ProductDetailField) => {
    const fieldValue = dynamicValues[field.name];

    // ✅ Placeholders: Use field.label as fallback placeholder
    const placeholder = field.placeholder || field.label;

    switch (field.type) {
      case 'text':
        return (
          <Input
            className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder={placeholder}
            value={fieldValue || ''}
            onChange={(e) => handleDynamicValueChange(field.name, e.target.value)}
            required={field.required}
          />
        )
      case 'textarea':
        // ✅ FIX: Calculate lines based on '\n' to set dynamic height, and allow vertical resizing
        const lineCount = (fieldValue || '').split('\n').length;
        const dynamicMinHeight = Math.max(80, lineCount * 24); // roughly 24px height per line

        return (
          <Textarea
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm resize-y"
            style={{ minHeight: `${dynamicMinHeight}px` }}
            placeholder={placeholder}
            value={fieldValue || ''}
            onChange={(e) => handleDynamicValueChange(field.name, e.target.value)}
            required={field.required}
          />
        )
      case 'select':
        return (
          <Select
            onValueChange={(value) => handleDynamicValueChange(field.name, value)}
            value={fieldValue || ''}
            required={field.required}
          >
            <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm">
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(field.options) && field.options.length > 0 ? (
                field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1 text-sm text-gray-500">
                  No options available
                </div>
              )}
            </SelectContent>
          </Select>
        )
      case 'radio':
        return (
          <RadioGroup
            onValueChange={(value: string) => handleDynamicValueChange(field.name, value)}
            value={fieldValue || ''}
            required={field.required}
            className="flex flex-col space-y-3"
          >
            {Array.isArray(field.options) && field.options.length > 0 ? (
              field.options.map((option: FieldOption) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={option.value}
                    id={`${field.name}-${option.value}`}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor={`${field.name}-${option.value}`} className="text-sm font-medium">
                    {option.label}
                  </Label>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No options available</div>
            )}
          </RadioGroup>
        )
      case 'checkbox':
        return (
          <div className="flex flex-col space-y-3">
            {Array.isArray(field.options) && field.options.length > 0 ? (
              field.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`${field.name}-${option.value}`}
                    // The dynamic value stores a comma-separated string for checkboxes
                    checked={fieldValue?.split(',').includes(option.value) || false}
                    onCheckedChange={(checked: boolean | "indeterminate") => {
                      const currentValues: string[] = fieldValue?.split(',').filter(Boolean) || []
                      const newValues: string[] = checked === true
                        ? [...currentValues, option.value]
                        : currentValues.filter((v: string) => v !== option.value)
                      handleDynamicValueChange(field.name, newValues.join(','))
                    }}
                    className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor={`${field.name}-${option.value}`} className="text-sm font-medium">
                    {option.label}
                  </Label>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No options available</div>
            )}
          </div>
        )
      default:
        return null
    }
  }


  const livePreviewUrl = useMemo(() => {
    if (productName) {
      const slug = slugify(productName);
      return `https://www.mhebazar.in/product/${slug}`;
    }
    return '';
  }, [productName]);

  const livePreviewName = useMemo(() => {
    const productCapacity = dynamicValues['capacity'] || dynamicValues['Capacity'] || '';
    const formattedName = `${productManufacturer || ''} ${productName || ''} ${productModel || ''}${productCapacity || ''}`.trim().replace(/\s+/g, ' ');
    return formattedName;
  }, [productName, productManufacturer, productModel, dynamicValues]);

  // Determine the file name to display for the brochure
  const brochureDisplayName = useMemo(() => {
    if (brochureFile) return brochureFile.name;
    if (keptBrochureUrl) {
      // Extract file name from the URL path if it exists
      const parts = keptBrochureUrl.split('/');
      return parts[parts.length - 1] || "Existing Brochure";
    }
    return null;
  }, [brochureFile, keptBrochureUrl]);

  // Determine the file name to display for the offer
  const offerDisplayName = useMemo(() => {
    if (offerFile) return offerFile.name;
    if (keptOfferUrl) {
      // Extract file name from the URL path if it exists
      const parts = keptOfferUrl.split('/');
      return parts[parts.length - 1] || "Existing Offer";
    }
    return null;
  }, [offerFile, keptOfferUrl]);

  // Filter existing media for display: Images only
  const displayableImages = useMemo(() => {
    // is_video is derived by the serializer based on the string value (URL vs path)
    return existingImages.filter(img => !img.is_video);
  }, [existingImages]);

  // Filter existing media for display: Videos only
  const displayableVideos = useMemo(() => {
    return existingImages.filter(img => img.is_video);
  }, [existingImages]);

  // Get the display name for the first image
  const firstImageDisplayName = useMemo(() => {
    if (firstImageFile) return firstImageFile.name;
    // Attempt to find the first NON-VIDEO image in existingImages if in edit mode
    const existingFirstImage = displayableImages[0];
    if (existingFirstImage) {
      const parts = existingFirstImage.image.split('/');
      return parts[parts.length - 1] || "Existing Image";
    }
    return null;
  }, [firstImageFile, displayableImages]);

  // Get the ID of the current main image (for deletion button)
  const currentMainImageId = useMemo(() => {
    const mainImage = displayableImages[0];
    return mainImage ? mainImage.id : null;
  }, [displayableImages]);



  // Handler for type selection, implementing mutual exclusivity for 'new' and 'used'
  const handleTypeChange = (optionValue: string, checked: boolean | "indeterminate") => {
    const currentTypes = watch('type') || [];

    let newTypes: string[];

    if (checked) {
      if (optionValue === 'new' && currentTypes.includes('used')) {
        newTypes = [...currentTypes.filter((value) => value !== 'used'), 'new'];
      } else if (optionValue === 'used' && currentTypes.includes('new')) {
        newTypes = [...currentTypes.filter((value) => value !== 'new'), 'used'];
      } else {
        newTypes = [...currentTypes, optionValue];
      }
    } else {
      newTypes = currentTypes.filter((value) => value !== optionValue);
    }

    setValue('type', newTypes);
  }

  return (

    <div className="flex flex-col h-full bg-white">
      <div className="max-w-md mx-auto bg-white ">
        {/* Header */}
        {/* <div className="shrink-0  bg-white z-30"> */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-semibold mb-2 text-gray-900">{product ? "Edit Product" : "Add Product"}</h1>
          {/* </div> */}
        </div>

        <div className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 徴 ADMIN ONLY: Vendor Selection */}
            {!isVendor && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label className="text-sm font-semibold text-blue-800 mb-2 block flex items-center gap-2">
                  <Users className="w-4 h-4" /> Designate Product Owner (Vendor)
                </Label>
                <Select
                  disabled={vendorsLoading}
                  value={watch('user')}
                  onValueChange={(val) => {
                    setValue('user', val);
                    // Match the manufacturer to the selected vendor's brand
                    const selectedVendor = vendors.find(v => String(v.user_info?.id) === val);
                    if (selectedVendor) {
                      const brandName = selectedVendor.brand || selectedVendor.company_name;
                      if (brandName) {
                        setValue('manufacturer', brandName);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-10 bg-white border-blue-300">
                    <SelectValue placeholder={vendorsLoading ? "Loading Vendors..." : "Search and Select Vendor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors
                      .slice() // Clone to avoid mutating state directly
                      .sort((a, b) => {
                        const nameA = (a.brand || a.company_name || '').toLowerCase();
                        const nameB = (b.brand || b.company_name || '').toLowerCase();
                        return nameA.localeCompare(nameB);
                      })
                      .map((v) => (
                        <SelectItem key={v.id} value={String(v.user_info?.id)}>
                          {v.brand || v.company_name} ({v.user_info?.id})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-blue-600 mt-1">
                  Admins: Choose which vendor will own this product.
                </p>
              </div>
            )}

            <div className="sticky top-0 z-20 bg-white pt-2 pb-4 space-y-4 border-b shadow-sm px-4">
              {/* Corrected Grid: Stacked by default, 2 columns on small screens and up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">

                {/* Category Field */}
                <div className="flex flex-col space-y-2 min-w-0">
                  <Label className="text-sm text-gray-600 mb-1 block">
                    Select category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    onValueChange={(val) => {
                      setValue('category', val);
                      setValue('subcategory', '');
                      setDefaultSubcategory('');
                    }}
                    value={selectedCategoryId || defaultCategory}
                    disabled={loading}
                    required
                  >
                    <SelectTrigger
                      className={`h-12 w-full border-gray-300 text-sm text-gray-700 overflow-hidden ${errors.category ? 'border-red-500' : ''}`}
                    >
                      <SelectValue placeholder="Select Category">
                        <span className="truncate block">
                          {loading ? "Loading..." : (categories.find(cat => String(cat.id) === (selectedCategoryId || defaultCategory))?.name || "Select Category")}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(categories) && categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-red-500 text-xs mt-1">Category is required</p>
                  )}
                </div>

                {/* Subcategory Field */}
                {subcategories.length > 0 && (
                  <div className="flex flex-col space-y-2 min-w-0">
                    <Label className="text-sm text-gray-600 mb-1 block">
                      Select SubCategory <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      onValueChange={(val) => setValue('subcategory', val)}
                      value={watch('subcategory') || defaultSubcategory}
                      required
                    >
                      <SelectTrigger
                        className={`h-12 w-full border-gray-300 text-sm text-gray-700 overflow-hidden ${errors.subcategory ? 'border-red-500' : ''}`}
                      >
                        <SelectValue placeholder="Select Subcategory">
                          <span className="truncate block">
                            {subcategories.find(sub => String(sub.id) === (watch('subcategory') || defaultSubcategory))?.name || "Select Subcategory"}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={String(sub.id)}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.subcategory && (
                      <p className="text-red-500 text-xs mt-1">Subcategory is required</p>
                    )}
                  </div>
                )}
              </div>

              {/* Product Name & Live URL (Inside Sticky) */}
              {hasSelectedRequiredFields && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">Product Name <span className="text-red-500">*</span></Label>
                    <Input
                      {...register('name', { required: true })}
                      placeholder="Enter product name"
                      className="h-10 border-gray-300 text-sm"
                    />
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100 break-words">
                    <p className="mb-1"><span className="font-semibold">Live Name:</span> {livePreviewName || '...'}</p>
                    <p className="break-all"><span className="font-semibold">Live URL:</span> <span className="text-blue-600">{livePreviewUrl}</span></p>
                  </div>
                </div>
              )}
            </div>

            {hasSelectedRequiredFields && (
              <>

                {/* <div>
                  <Label className="text-sm text-gray-600 mb-1 block">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...register('name', { required: true })}
                    placeholder="Enter product name"
                    className="h-10 border-gray-300 text-sm"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">Product name is required</p>
                  )}
                 
                  <div className="mt-2 text-xs text-gray-500">
                    <p>
                      <span className="font-semibold text-gray-700">Live Product Name:</span>{' '}
                      {livePreviewName || 'Enter product details to see a preview'}
                    </p>
                    <p className='truncate'>
                      <span className="font-semibold text-gray-700">Live URL:</span>{' '}
                      <Link href={livePreviewUrl} target="_blank" className="text-blue-600 hover:underline">
                        {livePreviewUrl}
                      </Link>
                    </p>
                    <></>
                  </div>
                </div> */}


{/* Description */}
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Description</Label>
                  <div className="bg-white rounded-md overflow-hidden">
                    <JoditEditor
                      value={descriptionValue || ''}
                      config={{
                        readonly: false,
                        placeholder: 'Type your product description here...',
                        height: 300,
                        // ✅ FIX: Disable the hidden paste popup so Ctrl+V works instantly
                        askBeforePasteHTML: false,
                        askBeforePasteFromWord: false,
                      }}
                      onBlur={(newContent) => setValue('description', newContent, { shouldDirty: true })}
                    />
                  </div>
                </div>

                {/* Vendor (Manufacturer) */}
                <div>

                  <Label className="text-sm text-gray-600 mb-1 block">Vendor (Manufacturer)</Label>
                  <Input
                    {...register('manufacturer')}
                    placeholder="Vendor name"
                    className="h-10 border-gray-300 text-sm"

                  />
                </div>

                {/* Model and Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">Model</Label>
                    <Input
                      {...register('model')}
                      placeholder="Model number"
                      className="h-10 border-gray-300 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">
                      Price
                      {/* ✅ Price Field: Removed * for mandatory requirement */}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register('price', { valueAsNumber: false })}
                      placeholder="0.00"
                      className="h-10 border-gray-300 text-sm"
                    />
                    {/* ✅ Price Field: Removed error display */}
                  </div>
                </div>

                {/* SEO Information */}
                {!isVendor && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">Meta Title</Label>
                      <Input
                        {...register('meta_title')}
                        placeholder="SEO title"
                        className="h-10 border-gray-300 text-sm"
                      />
                      {/* ✅ Meta Title/Description: Added note */}
                      <p className="text-gray-500 text-xs mt-1">
                        You can change this if you want.
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">Meta Description</Label>
                      <Input
                        {...register('meta_description')}
                        placeholder="SEO description"
                        className="h-10 border-gray-300 text-sm"
                      />
                      {/* ✅ Meta Title/Description: Added note */}
                      <p className="text-gray-500 text-xs mt-1">
                        You can change this if you want.
                      </p>
                    </div>
                  </div>
                )}

                {/* Type Selection */}
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Type</Label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {TYPE_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${option.value}`}
                          checked={watch('type')?.includes(option.value) || false}
                          // ✅ New vs Used: Use custom handler for mutual exclusivity
                          onCheckedChange={(checked) => handleTypeChange(option.value, checked)}
                        />
                        <Label
                          htmlFor={`type-${option.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.type && <p className="text-red-500 text-xs mt-1">At least one type is required</p>}
                </div>

                {/* Dynamic Fields */}
                {warning && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-yellow-800 text-xs">{warning}</p>
                  </div>
                )}

                {Array.isArray(dynamicFields) && dynamicFields.map((field) => (
                  <div key={field.name}>
                    <Label className="text-sm text-gray-600 mb-1 block">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderDynamicField(field)}
                  </div>
                ))}

                {/* Stock and Visibility Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">Stock Quantity</Label>
                    <Input
                      type="number"
                      {...register('stock_quantity', { valueAsNumber: true, min: 0 })}
                      className="h-10 border-gray-300 text-sm"
                    />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="direct_sale"
                        checked={watch('direct_sale')}
                        onCheckedChange={(checked) => setValue('direct_sale', !!checked)}
                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />

                      <Label htmlFor="direct_sale" className="text-sm font-medium">
                        Buy Now
                      </Label>


                    </div>
                    <div className="-mt-2">
                      <span className="text-[11px] text-gray-400 leading-snug max-w-xs sm:max-w-sm md:max-w-md break-words">
                        ( If selected, users will see{" "}
                        <strong className="font-semibold text-gray-900">
                          Buy Now
                        </strong>{" "}
                        instead of{" "}
                        <strong className="font-semibold text-gray-900">
                          Get Quote
                        </strong>. )
                      </span>
                    </div>



                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hide_price"
                        checked={watch('hide_price')}
                        onCheckedChange={(checked) => setValue('hide_price', !!checked)}
                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor="hide_price" className="text-sm font-medium">Hide Price</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="online_payment"
                        checked={watch('online_payment')}
                        onCheckedChange={(checked) => setValue('online_payment', !!checked)}
                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor="online_payment" className="text-sm font-medium">Online Payment</Label>
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900">Media Upload</h3>

                  {/* Brochure Upload/Display (Existing logic) */}
                  <div className='border p-3 rounded-lg'>
                    <Label className="text-sm text-gray-600 mb-2 block">Brochure (PDF, PPT, DOC)</Label>
                    <input
                      id="brochure-input"
                      type="file"
                      accept={DOCUMENT_ACCEPT_ATTR}
                      style={{ display: 'none' }}
                      onChange={handleBrochureChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-10 border-gray-300 text-gray-600 text-sm"
                      onClick={() => document.getElementById('brochure-input')?.click()}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Select Brochure
                    </Button>

                    {(brochureFile || keptBrochureUrl) && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm flex items-center justify-between">
                        <div className="flex items-center truncate">
                          <FileText className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                          <span className="text-gray-700 truncate">
                            {/* Use the computed display name */}
                            {brochureDisplayName}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 h-6 p-1 ml-2 flex-shrink-0"
                          onClick={brochureFile ? removeBrochure : removeExistingBrochure}
                        >
                          <X size={14} className="mr-1" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Offer Upload/Display */}
                  <div className='border p-3 rounded-lg'>
                    <Label className="text-sm text-gray-600 mb-2 block">Offer (PDF, PPT, DOC)</Label>
                    <input
                      id="offer-input"
                      type="file"
                      accept={DOCUMENT_ACCEPT_ATTR}
                      style={{ display: 'none' }}
                      onChange={handleOfferChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-10 border-gray-300 text-gray-600 text-sm"
                      onClick={() => document.getElementById('offer-input')?.click()}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Select Offer
                    </Button>

                    {(offerFile || keptOfferUrl) && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm flex items-center justify-between">
                        <div className="flex items-center truncate">
                          <FileText className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                          <span className="text-gray-700 truncate">
                            {/* Use the computed display name */}
                            {offerDisplayName}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 h-6 p-1 ml-2 flex-shrink-0"
                          onClick={offerFile ? removeOffer : removeExistingOffer}
                        >
                          <X size={14} className="mr-1" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Images Upload/Youtube Link Section */}
                  <div className='border p-3 rounded-lg space-y-4'>
                    <Label className="text-sm text-gray-600 mb-2 block">Product Images & Videos</Label>

                    {/* Main Product Image */}
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">1. Main Product Image (First Image)</Label>
                      <p className="text-xs text-gray-500 mb-2">
                        {/* ✅ Image Upload Note: Added size constraint */}
                        Image size must be between 50 KB and 1 MB.
                      </p>
                      <input
                        id="first-image-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFirstImageChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-10 border-gray-300 text-gray-600 text-sm"
                        onClick={() => document.getElementById('first-image-input')?.click()}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Select Main Image
                      </Button>

                      {(firstImageFile || currentMainImageId) && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm flex items-center justify-between">
                          <div className="flex items-center truncate">
                            <ImageIcon className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                            <span className="text-gray-700 truncate">
                              {firstImageFile?.name || firstImageDisplayName}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 h-6 p-1 ml-2 flex-shrink-0"
                            // Simplified removal for main image (new file or first existing image)
                            onClick={firstImageFile ? removeFirstImage : () => currentMainImageId && removeExistingImage(currentMainImageId)}
                          >
                            <X size={14} className="mr-1" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className='border-t pt-4 space-y-4'>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">2. Additional Media</Label>
                      <p className="text-xs text-gray-500 mb-2">
                        {/* ✅ Image Upload Note: Added size constraint */}
                        Image size must be between 50 KB and 1 MB.
                      </p>
                      <input
                        id="images-input"
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleImagesChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-10 border-gray-300 text-gray-600 text-sm"
                        onClick={() => document.getElementById('images-input')?.click()}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Add Additional Images
                      </Button>

                      {/* ✅ YouTube Link Support: Input for YouTube Links */}
                      <div className="flex items-center space-x-2">
                        <Input
                          type="url"
                          placeholder="Paste YouTube Link here (e.g., https://youtu.be/...)"
                          className="h-10 border-gray-300 text-sm flex-grow"
                          value={newYoutubeLink}
                          onChange={(e) => setNewYoutubeLink(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-10 text-white bg-red-600 hover:bg-red-700 flex-shrink-0"
                          onClick={addYoutubeLink}
                          disabled={!newYoutubeLink.trim()}
                        >
                          <Youtube className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>


                    {/* New Images and New YouTube Links Preview */}
                    {(imageFiles.length > 0 || youtubeLinks.length > 0) && (
                      <div className="mt-4">
                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">New Media to Upload:</Label>
                        <div className="flex flex-wrap gap-2">
                          {/* New Images */}
                          {imageFiles.map((file, idx) => (
                            <div key={`new-img-${idx}`} className="relative group aspect-square w-1/5 min-w-[60px] max-w-[80px]">
                              <Image
                                src={URL.createObjectURL(file)}
                                alt={`New Image Preview ${idx + 1}`}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="rounded"
                              />
                              <button
                                type="button"
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-100 transition-opacity z-10"
                                onClick={() => removeImage(idx)}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          {/* New YouTube Links */}
                          {youtubeLinks.map((link, idx) => (
                            <div
                              key={`new-yt-${idx}`}
                              className="relative group w-1/2 min-w-[150px] max-w-[200px] p-2 border border-yellow-400 bg-yellow-50 rounded-lg flex items-center text-xs text-yellow-800"
                            >
                              <Youtube className="w-4 h-4 mr-1 text-red-600 flex-shrink-0" />
                              <span className="truncate flex-grow" title={link}>YouTube Link</span>
                              <button
                                type="button"
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-100 transition-opacity z-10"
                                onClick={() => removeYoutubeLink(link)}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Existing Images and Videos Display (for editing products) */}
                    {existingImages.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">Existing Media (Click to delete):</Label>
                        <div className="flex flex-wrap gap-2">
                          {existingImages.map((img) => (
                            <div
                              key={img.id}
                              className="relative group aspect-square w-1/5 min-w-[60px] max-w-[80px]"
                            >
                              {img.is_video ? (
                                <div
                                  className="w-full h-full bg-red-100 rounded flex flex-col items-center justify-center p-1 cursor-pointer"
                                  onClick={() => removeYoutubeLink(img.id)}
                                  title={img.image}
                                >
                                  <Youtube className="w-4 h-4 text-red-600" />
                                  <span className='text-[8px] text-red-800 truncate w-full text-center'>Video</span>
                                </div>
                              ) : (
                                <Image
                                  src={img.image}
                                  alt={product?.name || "Product Image"}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                  className="rounded cursor-pointer"
                                  onClick={() => removeExistingImage(img.id)}
                                />
                              )}

                              <button
                                type="button"
                                onClick={() => img.is_video ? removeYoutubeLink(img.id) : removeExistingImage(img.id)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-100 transition-opacity z-10"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !hasSelectedRequiredFields || watch('type').length === 0}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:bg-gray-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {product ? "Updating Product..." : "Creating Product..."}
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  {product ? "Update Product" : "Create Product"}
                </>
              )}
            </Button>

          </form>
        </div>
      </div>
    </div>
  )
}