import NextAuth, { NextAuthOptions, User, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

interface ApiAuthData {
  accessToken: string;
  expiresIn: number; // in seconds
  refreshToken: string;
  refreshExpiresIn: number; // in seconds
  tokenType: string;
}

interface ApiResponse<T> {
  status: number;
  message: string | null;
  data?: T;
}

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    console.log("Attempting to refresh access token. Current refresh token:", token.refreshToken);
    const response = await fetch(`${process.env.API_BASE_URL}/Auth/RefreshTokenLogin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    const refreshedTokensResponse: ApiResponse<ApiAuthData> = await response.json();

    if (!response.ok || refreshedTokensResponse.status !== 0 || !refreshedTokensResponse.data) {
      console.error("Error refreshing access token:", refreshedTokensResponse.message || "Unknown error");
      return {
        ...token,
        error: "RefreshAccessTokenError", // Propagate error
      };
    }

    console.log("Access token refreshed successfully.");
    const newApiData = refreshedTokensResponse.data;

    return {
      ...token,
      accessToken: newApiData.accessToken,
      accessTokenExpires: Date.now() + newApiData.expiresIn * 1000,
      refreshToken: newApiData.refreshToken ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("Exception during refreshAccessToken:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username (Email)", type: "text", placeholder: "frontendtask@secilstore.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req): Promise<User | null> {
        if (!credentials) {
          return null;
        }

        try {
          const loginApiUrl = `${process.env.API_BASE_URL}/Auth/Login`;
          console.log("Attempting login to:", loginApiUrl);

          const response = await fetch(loginApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          const responseBody: ApiResponse<ApiAuthData> = await response.json();

          if (response.ok && responseBody.status === 0 && responseBody.data) {
            const apiData = responseBody.data;
            console.log("Login successful for:", credentials.username);
            return {
              id: credentials.username,
              email: credentials.username,
              accessToken: apiData.accessToken,
              refreshToken: apiData.refreshToken,
              accessTokenExpires: Date.now() + apiData.expiresIn * 1000,
            };
          } else {
            console.error(`API Login Error for ${credentials.username}:`, responseBody.message || `Status ${response.status}`);
            throw new Error(responseBody.message || "Invalid username or password");
          }
        } catch (error: any) {
          console.error("Exception during authorize:", error);
          throw new Error(error.message || "An unexpected error occurred during login.");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }): Promise<JWT> {
      if (account && user) {
        console.log("JWT callback: Initial sign-in");
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = user.accessTokenExpires;
        token.id = user.id;
        token.email = user.email;

        return token;
      }

      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        console.log("JWT callback: Access token is still valid.");
        return token;
      }

      console.log("JWT callback: Access token expired. Attempting refresh.");
      if (!token.refreshToken) {
          console.warn("JWT callback: No refresh token available to refresh access token.");
          return token;
      }
      return refreshAccessToken(token);
    },

    async session({ session, token }): Promise<Session> {
      session.user.id = token.id;
      session.user.name = token.name;
      session.user.email = token.email;
      session.accessToken = token.accessToken;
      session.error = token.error;

      console.log("Session callback invoked. Current session error:", session.error);
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect users to login page on error (error type will be in query string)
    // signOut: '/auth/signout',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };