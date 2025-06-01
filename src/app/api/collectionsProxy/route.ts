import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // The `getToken` is useful if you later decide this proxy needs to be authenticated
  // or if the target API endpoint (/Collection/GetAll) itself requires authentication.
  // For now, as per Postman, /Collection/GetAll seems public.
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  // Example: If you wanted to protect this proxy endpoint itself:
  // if (!token) {
  //   return NextResponse.json({ error: 'Unauthorized access to proxy' }, { status: 401 });
  // }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("pageSize") || "10";

  const backendApiUrl = `${process.env.API_BASE_URL}/Collection/GetAll?page=${page}&pageSize=${pageSize}`;

  try {
    const apiResponse = await fetch(backendApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token?.accessToken}`, // Assuming accessToken is on your JWT token
      },
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      console.error(
        "Backend API Error:",
        errorData,
        "Status:",
        apiResponse.status
      );
      return NextResponse.json(
        {
          error: `Backend API request failed: ${apiResponse.statusText}`,
          details: errorData,
        },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Proxy route fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch collections via proxy.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
