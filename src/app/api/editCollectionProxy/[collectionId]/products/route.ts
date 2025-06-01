// src/app/api/editCollectionProxy/[collectionId]/products/route.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  const { collectionId } = await params;

  if (!collectionId) {
    return NextResponse.json(
      { error: "Collection ID is required" },
      { status: 400 }
    );
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token || !token.accessToken) {
    return NextResponse.json(
      { error: "Unauthorized: No access token found" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { additionalFilters, page, pageSize } = body;

    const externalApiUrl = `${process.env.API_BASE_URL}/Collection/${collectionId}/GetProductsForConstants`;

    const apiResponse = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        additionalFilters: additionalFilters || [],
        page: page || 1,
        pageSize: pageSize || 10,
      }),
    });

    if (!apiResponse.ok) {
      let errorBody;
      try {
        errorBody = await apiResponse.json();
      } catch (e) {
        errorBody = { message: apiResponse.statusText };
      }
      console.error(
        `External API error for GetProductsForConstants (${collectionId}):`,
        apiResponse.status,
        errorBody
      );
      return NextResponse.json(
        {
          error: `Failed to fetch products from external API: ${
            errorBody.message || apiResponse.statusText
          }`,
        },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();
    if (data && data.data) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { error: "Invalid data structure from external API" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error(
      "Error in /api/editCollectionProxy/[collectionId]/products:",
      error
    );
    return NextResponse.json(
      {
        error: "Internal server error while fetching products",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
