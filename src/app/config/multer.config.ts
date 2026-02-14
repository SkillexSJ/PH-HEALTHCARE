/**
 * MULTER CONFIGURATION WITH CLOUDINARY STORAGE
 * This configuration handles file uploads to Cloudinary cloud storage
 * - Automatically organizes files into folders (pdfs/images)
 * - Generates unique, SEO-friendly filenames
 * - Supports auto resource type detection
 */

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinaryUpload } from "./cloudinary.config";

/**
 * Configure Cloudinary as the storage engine for Multer
 * This replaces local disk storage with cloud storage
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinaryUpload,

  /**
   * Dynamic params function - runs for each uploaded file
   * Customizes how files are stored in Cloudinary
   */
  params: async (req, file) => {
    // Extract original filename from uploaded file
    const originalName = file.originalname;

    // Get file extension (e.g., 'jpg', 'pdf', 'png')
    const extension = originalName.split(".").pop()?.toLocaleLowerCase();

    /**
     * Create a clean, URL-friendly filename
     * Steps:
     * 1. Remove file extension
     * 2. Convert to lowercase
     * 3. Replace spaces with hyphens
     * 4. Remove special characters (keep only alphanumeric and hyphens)
     */
    const fileNameWithoutExtension = originalName
      .split(".")
      .slice(0, -1)
      .join(".")
      .toLowerCase()
      .replace(/\s+/g, "-")
      // eslint-disable-next-line no-useless-escape
      .replace(/[^a-z0-9\-]/g, "");

    /**
     * Generate unique filename to prevent collisions
     * Format: {random-string}-{timestamp}-{cleaned-filename}
     * Example: "a7b3c9-1707926400000-doctor-profile"
     */
    const uniqueName =
      Math.random().toString(36).substring(2) +
      "-" +
      Date.now() +
      "-" +
      fileNameWithoutExtension;

    /**
     * Organize files into folders based on type
     * PDFs go to 'pdfs' folder, everything else goes to 'images'
     */
    const folder = extension === "pdf" ? "pdfs" : "images";

    /**
     * Return Cloudinary upload parameters
     * - folder: Cloudinary folder path (e.g., 'ph-healthcare/images')
     * - public_id: Unique identifier for the file
     * - resource_type: 'auto' lets Cloudinary detect the file type
     */
    return {
      folder: `ph-healthcare/${folder}`,
      public_id: uniqueName,
      resource_type: "auto",
    };
  },
});

/**
 * Export configured Multer instance
 * Usage in routes: multerUpload.single('file') or multerUpload.array('files')
 */
export const multerUpload = multer({ storage });
