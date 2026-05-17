import { connectDb } from "@/lib/mongodb";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { ObjectId } from "mongodb";
import { jsonError, jsonSuccess } from "@/lib/api-response";

export async function PUT(request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.split(" ")[1];

    const decodedToken = await verifyFirebaseToken(token);

    if (!decodedToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { exceptionId, status, comments } = body;

    if (!exceptionId) {
      return jsonError("exceptionId is required", 400);
    }

    const db = await connectDb();

    const result = await db.collection("exceptions").updateOne(
      { _id: new ObjectId(exceptionId) },
      {
        $set: {
          status,
          comments,
          reviewedBy: decodedToken.email,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: "Exception not found" }, { status: 404 });
    }

    return Response.json(
      {
        success: true,
        data: {
          message: "Exception updated successfully",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Exception update error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
