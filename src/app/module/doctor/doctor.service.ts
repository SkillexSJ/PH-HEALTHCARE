import status from "http-status";
import { Doctor, Prisma } from "../../../generated/prisma/client";
import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
  doctorFilterableFields,
  doctorIncludeConfig,
  doctorSearchableFields,
} from "./doctor.constant";
import { IUpdateDoctorPayload } from "./doctor.interface";

/**
 * GET ALL DOCTORS WITH ADVANCED FILTERING, SEARCH, PAGINATION & SORTING
 *
 * Example URLs:
 * - Basic: /api/doctors
 * - Search: /api/doctors?searchTerm=cardiology
 * - Filter: /api/doctors?gender=MALE&appointmentFee[lte]=200
 * - Paginate: /api/doctors?page=2&limit=10
 * - Sort: /api/doctors?sortBy=appointmentFee&sortOrder=asc
 * - Include: /api/doctors?include=appointments,reviews
 * - Combined: /api/doctors?searchTerm=heart&appointmentFee[gte]=100&sortBy=experience&include=reviews
 *
 * @param query - Query parameters from request (searchTerm, page, filters, etc.)
 * @returns Paginated doctors with metadata (total, totalPages, etc.)
 */
const getAllDoctors = async (query: IQueryParams) => {
  /**
   * OLD APPROACH (commented out):
   * - Manual Prisma query with hardcoded where/include
   * - No search, filter, pagination support
   * - Not reusable
   */
  // const doctors = await prisma.doctor.findMany({
  //     where: {
  //         isDeleted: false,
  //     },
  //     include: {
  //         user: true,
  //         specialties: {
  //             include: {
  //                 specialty: true
  //             }
  //         }
  //     }
  // })

  /**
   * NEW APPROACH: QueryBuilder Pattern
   * - Automatically builds complex Prisma queries from URL params
   * - Reusable across all modules (Patient, Admin, etc.)
   * - Type-safe with generics
   */
  const queryBuilder = new QueryBuilder<
    Doctor,
    Prisma.DoctorWhereInput,
    Prisma.DoctorInclude
  >(
    prisma.doctor, // Prisma model to query
    query, // URL query params (req.query)
    {
      searchableFields: doctorSearchableFields, // Fields to search (name, email, etc.)
      filterableFields: doctorFilterableFields, // Allowed filter fields (gender, fee, etc.)
    },
  );

  /**
   * Build and execute query using method chaining
   * Each method modifies the internal query object
   * Order matters for some methods (e.g., fields() must be last)
   */
  const result = await queryBuilder
    // 1. Apply global search across searchableFields (if searchTerm is provided)
    .search()

    // 2. Apply specific filters from query params (gender, fee, specialty, etc.)
    .filter()

    // 3. Add hardcoded where conditions (exclude soft-deleted doctors)
    .where({
      isDeleted: false,
    })

    // 4. Always include user and specialties (default includes)
    .include({
      user: true, // Doctor's user account
      specialties: {
        // Doctor's specialties with nested specialty details
        include: {
          specialty: true, // Specialty title, description, etc.
        },
      },
    })

    // 5. Allow dynamic includes from query param (?include=appointments,reviews)
    .dynamicInclude(doctorIncludeConfig)

    // 6. Apply pagination (page & limit from query params)
    .paginate()

    // 7. Apply sorting (sortBy & sortOrder from query params)
    .sort()

    // 8. Apply field selection if requested (?fields=id,name,email)
    // NOTE: Must be last as it conflicts with include
    .fields()

    // 9. Execute the built query (runs findMany + count in parallel)
    .execute();

  console.log(result); // Debug: log the result
  return result; // Returns: { data: Doctor[], meta: { page, limit, total, totalPages } }
};

const getDoctorById = async (id: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      user: true,
      specialties: {
        include: {
          specialty: true,
        },
      },
      appointments: {
        include: {
          patient: true,
          schedule: true,
          prescription: true,
        },
      },
      doctorSchedules: {
        include: {
          schedule: true,
        },
      },
      reviews: true,
    },
  });
  return doctor;
};

const updateDoctor = async (id: string, payload: IUpdateDoctorPayload) => {
  const isDoctorExist = await prisma.doctor.findUnique({
    where: {
      id,
    },
  });

  if (!isDoctorExist) {
    throw new AppError(status.NOT_FOUND, "Doctor not found");
  }

  const { doctor: doctorData, specialties } = payload;

  await prisma.$transaction(async (tx) => {
    if (doctorData) {
      await tx.doctor.update({
        where: {
          id,
        },
        data: {
          ...doctorData,
        },
      });
    }

    if (specialties && specialties.length > 0) {
      for (const specialty of specialties) {
        const { specialtyId, shouldDelete } = specialty;
        if (shouldDelete) {
          await tx.doctorSpecialty.delete({
            where: {
              doctorId_specialtyId: {
                doctorId: id,
                specialtyId,
              },
            },
          });
        } else {
          await tx.doctorSpecialty.upsert({
            where: {
              doctorId_specialtyId: {
                doctorId: id,
                specialtyId,
              },
            },
            create: {
              doctorId: id,
              specialtyId,
            },
            update: {},
          });
        }
      }
    }
  });

  const doctor = await getDoctorById(id);

  return doctor;
};

//soft delete
const deleteDoctor = async (id: string) => {
  const isDoctorExist = await prisma.doctor.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!isDoctorExist) {
    throw new AppError(status.NOT_FOUND, "Doctor not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctor.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: isDoctorExist.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED, // Optional: you may also want to block the user
      },
    });

    await tx.session.deleteMany({
      where: { userId: isDoctorExist.userId },
    });

    await tx.doctorSpecialty.deleteMany({
      where: { doctorId: id },
    });
  });

  return { message: "Doctor deleted successfully" };
};

export const DoctorService = {
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
