import { DefaultSession, DefaultUser, Session as NextAuthSession } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends NextAuthSession {
    accessToken?: string;
    error?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   * Also the shape of the user object returned by the `authorize` callback.
   */
  interface User extends DefaultUser {
    // Properties returned from your `authorize` callback
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number; // in ms
    id: string;
    email?: string | null;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends NextAuthJWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number; // in ms
    id: string;
    error?: string;
    name?: string | null;
    email?: string | null;
  }
}