// app/api/exceptions/list/route.js

import { connectDb } from "@/lib/mongodb";
import { verifyFirebaseToken, getUserProfile } from "@/lib/firebase-admin";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { escapeRegex, sanitizeSortField } from "@/utils/mongoUtils";

// Forces Next.js to treat this as a runtime API instead of trying to statically compile it during npm run build
export const dynamic = "force-dynamic";

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "status",
  "date",
  "studentEmail",
  "reason",
]);

export async function GET(request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.split(" ")[1];
    const authResult = await verifyFirebaseToken(token);

    if (!authResult.valid) {
      return jsonError(
        { message: "Unauthorized", reason: authResult.reason },
        401
      );
    }

    const decodedToken = authResult.decodedToken;
    const profile = await getUserProfile(decodedToken.uid);

    if (!profile) {
      return jsonError("User profile not found", 404);
    }

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );

    // Search — escape metacharacters and cap length to prevent ReDoS
    const rawSearch = searchParams.get("search") || "";
    const search = escapeRegex(rawSearch);

    // Sorting — validate against an explicit allowlist to prevent field-name injection
    const sortBy = sanitizeSortField(
      searchParams.get("sortBy"),
      ALLOWED_SORT_FIELDS,
      "createdAt"
    );
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Validation
    if (page < 1 || limit < 1) {
      return jsonError("Page and limit must be greater than 0", 400);
    }

    const skip = (page - 1) * limit;

    const db = await connectDb();
    const collection = db.collection("exceptions");

    // Base query
    const query = {
      status: "pending",
    };

    // Role-based filtering
    if (profile.role === "student") {
      query.studentEmail = decodedToken.email;
    } else if (profile.role !== "admin" && profile.role !== "teacher") {
      return jsonError("Forbidden", 403);
    }

    // Search filter
    if (search) {
      query.$or = [
        {
          reason: {
            $regex: search,
            $options: "i",
          },
        },
        {
          studentEmail: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Total count
    const total = await collection.countDocuments(query);

    // Fetch data
    const exceptions = await collection
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalPages = Math.ceil(total / limit);

    return jsonSuccess(
      {
        exceptions,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
        },
      },
      200
    );
  } catch (error) {
    console.error("Database route error:", error);
    return jsonError("Internal server error", 500);
  }
}