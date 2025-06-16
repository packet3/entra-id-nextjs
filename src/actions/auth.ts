import type { NextAuthConfig } from 'next-auth';
import MicrosoftEntraID from "@auth/core/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";
import NextAuth from 'next-auth';

async function refreshAccessToken(accessToken: any) {
  try {
    const url = "https://login.microsoftonline.com/75311731-0c71-4e22-98ac-8dc9d72e56a5/oauth2/v2.0/token";
    console.log("Refreshing access token", accessToken);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=refresh_token`
        + `&client_secret=${process.env.AZURE_AD_CLIENT_SECRET}`
        + `&refresh_token=${accessToken.refreshToken}`
        + `&client_id=${process.env.AZURE_AD_CLIENT_ID}`
    });

    const res = await response.json();
    console.log("Refreshing access token", res);

    return {
      ...accessToken,
      accessToken: res.access_token,
      accessTokenExpires: Date.now() + res.expires_in * 1000,
      refreshToken: res.refresh_token ?? accessToken.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error(error);

    return {
      ...accessToken,
      error: "RefreshAccessTokenError",
    };
  }
}


const providers: Provider[] = [
  MicrosoftEntraID({
    clientId: process.env.MICROSOFT_ENTRA_ID_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET || '',
    issuer: process.env.MICROSOFT_ENTRA_ID_TENANT_ID || '',
    authorization: {
      params: {
        scope: 'offline_access Group.Read.All GroupMember.Read.All openid profile email User.Read',
      },
    },
  }),
]

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider()
      return { id: providerData.id, name: providerData.name }
    } else {
      return { id: provider.id, name: provider.name }
    }
  })
  .filter((provider) => provider.id !== "credentials");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
  },
  callbacks: {
    async jwt({ token, profile, account }) {
      //console.log('jwt callback called', profile, account);
      console.log('inside jwt')
      if (account && profile) {
        //console.log('inside jwt if', token);
        token.accessToken = account.access_token;
        token.accessTokenExpires = (account?.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000);
        token.refreshToken = account.refresh_token;

        token.id = typeof profile.oid === "string" ? profile.oid : undefined; // For convenience, the user's OID is called ID.
        token.groups = Array.isArray(profile.groups) ? profile.groups : [];
        token.username = typeof profile.preferred_username === "string" ? profile.preferred_username : undefined;
      }

      if (typeof token.accessTokenExpires === "number" && Date.now() < token.accessTokenExpires) {
        console.log("Access token is still valid");
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token, user }) {
      console.log('session callback called', session, token, user);
      // Add the access token to the session.user object
      (session as any).accessToken = token.accessToken;
      session.user.id = token.id as string; // Ensure id is a string
      (session as any).user.username = token.username as string; // Ensure username is a string
      (session as any).user.groups = token.groups

      const splittedName = (session.user.name ?? "").split(" ");
      (session as any).user.firstName = splittedName.length > 0 ? splittedName[0] : null;
      (session as any).user.lastName = splittedName.length > 1 ? splittedName[1] : null;

  
      return session;
    },
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth
    },



  },
})
