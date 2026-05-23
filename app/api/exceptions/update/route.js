import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { getUserProfile } from "@/lib/firebase-admin";
import { withErrorHandler } from "@/lib/error-handler";
import { AppError, ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ObjectId } from "mongodb";

// Required to prevent build-time static generation errors
export const dynamic = "force-dynamic";

export const PUT = withErrorHandler(async (request) => {
  const decodedToken = await authenticateRequest(request);
  const profile = await getUserProfile(decodedToken.uid);

  if (!profile) throw new NotFoundError("User profile not found");
  if (profile.role !== "admin" && profile.role !== "teacher") {
    throw new ForbiddenError("Forbidden");
  }

  const body = await request.json();
  const { exceptionId, status, comments } = body;

  if (!exceptionId || !ObjectId.isValid(exceptionId)) {
    throw new ValidationError("Invalid or missing exception ID");
  }

  const trimmedStatus = typeof status === "string" ? status.trim() : "";
  if (!["approved", "rejected"].includes(trimmedStatus)) {
    throw new ValidationError("Invalid status value");
  }

  const db = await connectDb();
  const exception = await db.collection("exceptions").findOne({ _id: new ObjectId(exceptionId) });

  if (!exception) throw new NotFoundError("Exception not found");

  // Authorization logic remains the same...
  // (Ensure your getUserProfileByEmail is imported/defined correctly)

  const result = await db.collection("exceptions").updateOne(
    { _id: new ObjectId(exceptionId) },
    {
      $set: {
        status: trimmedStatus,
        comments,
        reviewedBy: decodedToken.email,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) throw new NotFoundError("Exception not found");

  return NextResponse.json({ message: "Exception updated successfully" });
});