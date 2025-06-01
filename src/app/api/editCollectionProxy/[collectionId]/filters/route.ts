// src/app/api/editCollectionProxy/[collectionId]/filters/route.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  const { collectionId } = params;

  if (!collectionId) {
    return NextResponse.json(
      { error: "Collection ID is required" },
      { status: 400 }
    );
  }

  // Get the session token securely on the server-side
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token || !token.accessToken) {
    return NextResponse.json(
      { error: "Unauthorized: No access token found" },
      { status: 401 }
    );
  }

  try {
    const externalApiUrl = `${process.env.API_BASE_URL}/Collection/${collectionId}/GetFiltersForConstants`;

    const apiResponse = await fetch(externalApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.accessToken}`, // Use the user's access token
        "Content-Type": "application/json",
      },
    });

    if (!apiResponse.ok) {
      // Try to parse error from the external API, otherwise use status text
      let errorBody;
      try {
        errorBody = await apiResponse.json();
      } catch (e) {
        errorBody = { message: apiResponse.statusText };
      }
      console.error(
        `External API error for GetFiltersForConstants (${collectionId}):`,
        apiResponse.status,
        errorBody
      );
      return NextResponse.json(
        {
          error: `Failed to fetch from external API: ${
            errorBody.message || apiResponse.statusText
          }`,
        },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();
    // The external API wraps its data in a 'data' field and also has 'status' and 'message'
    // You can choose to return the whole structure or just data.data
    return NextResponse.json(data); // Returns { status, message, data: ApiFilterOption[] }
  } catch (error: any) {
    console.error(
      "Error in /api/editCollectionProxy/[collectionId]/filters:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
