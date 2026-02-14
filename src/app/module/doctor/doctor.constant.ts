/**
 * DOCTOR MODULE CONSTANTS
 * Configuration for QueryBuilder search, filter, and include operations
 * These constants define what fields users can search/filter and what relations can be included
 */

import { Prisma } from "../../../generated/prisma/client";

/**
 * Fields that can be searched using the global searchTerm parameter
 * Example: /api/doctors?searchTerm=cardiology
 * Will search across ALL these fields using case-insensitive partial matching
 *
 * Direct fields: name, email, qualification, etc.
 * Nested fields: specialties.specialty.title (searches in related specialty)
 */
export const doctorSearchableFields = [
  "name", // Doctor's name
  "email", // Doctor's email
  "qualification", // Medical qualifications (e.g., 'MBBS', 'MD')
  "designation", // Job title (e.g., 'Senior Consultant')
  "currentWorkingPlace", // Hospital/clinic name
  "registrationNumber", // Medical license number
  "specialties.specialty.title", // Specialty names (e.g., 'Cardiology', 'Neurology')
];

/**
 * Fields that can be filtered with specific values or operators
 * Example: /api/doctors?gender=MALE&appointmentFee[lte]=200&specialties.specialty.title=Cardiology
 *
 * Security: Only these fields are allowed to prevent unauthorized data access
 * Supports: direct filters, nested filters, and range operators (lt, gte, etc.)
 */
export const doctorFilterableFields = [
  "gender", // Filter by gender (MALE/FEMALE)
  "isDeleted", // Filter soft-deleted doctors
  "appointmentFee", // Filter by price (supports range: [lt], [gte], etc.)
  "experience", // Years of experience (supports range operators)
  "registrationNumber", // Filter by specific registration number
  "specialties.specialtyId", // Filter by specialty ID (nested)
  "currentWorkingPlace", // Filter by hospital/clinic
  "designation", // Filter by job title
  "qualification", // Filter by degree/certification
  "specialties.specialty.title", // Filter by specialty name (nested)
  "user.role", // Filter by user role (nested)
];

/**
 * Configuration for dynamic includes via query parameter
 * Example: /api/doctors?include=appointments,reviews
 * Only relations defined here can be included (security + performance control)
 *
 * Structure: Maps relation names to their Prisma include configuration
 * Each relation can have nested includes for deep data loading
 */
export const doctorIncludeConfig: Partial<
  Record<
    keyof Prisma.DoctorInclude,
    Prisma.DoctorInclude[keyof Prisma.DoctorInclude]
  >
> = {
  // Include doctor's user account information
  user: true,

  // Include doctor's specialties with full specialty details
  specialties: {
    include: {
      specialty: true, // Nested: get specialty title, description, etc.
    },
  },

  // Include all appointments with patient and doctor details
  appointments: {
    include: {
      patient: true, // Patient information
      doctor: true, // Doctor information (self-reference)
    },
  },

  // Include doctor's available schedules
  doctorSchedules: {
    include: {
      schedule: true, // Full schedule details (date, time slots)
    },
  },

  // Include prescriptions written by this doctor
  prescriptions: true,

  // Include patient reviews/ratings for this doctor
  reviews: true,
};
