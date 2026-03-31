import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import EmailProvider from "next-auth/providers/nodemailer";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER || {
        host: "localhost",
        port: 2525,
        auth: {
          user: "",
          pass: "",
        },
      },
      from: process.env.EMAIL_FROM || "LitLens <noreply@litlens.app>",
      // Custom sendVerificationRequest to print the Magic Link to the terminal for local dev
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`\n======================================================`);
          console.log(`MAGIC LINK GENERATED FOR: ${identifier}`);
          console.log(`CLICK HERE TO LOGIN: `);
          console.log(`${url}`);
          console.log(`======================================================\n`);
          return;
        }

        // Production setup - Requires actual SMTP settings in Vercel
        const { host } = new URL(url);
        const transport = (await import("nodemailer")).createTransport(provider.server);
        const result = await transport.sendMail({
          to: identifier,
          from: provider.from as string,
          subject: `Sign in to ${host}`,
          text: `Sign in to ${host}\n${url}\n\n`,
          html: `<body><p>Sign in to <strong>${host}</strong></p><p><a href="${url}">Click here to log in</a></p></body>`,
        });

        const failed = result.rejected.concat(result.pending).filter(Boolean);
        if (failed.length) {
          throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: "database", // Database strategy is required for Email Provider
  },
});

export async function verifyProjectAccess(projectUserId: string | null) {
  // If no userId, it's a legacy public project
  if (!projectUserId) return true;
  
  const session = await auth();
  if (!session?.user?.id) return false;
  return session.user.id === projectUserId;
}
