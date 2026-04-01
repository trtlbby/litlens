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
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const { host } = new URL(url);
        const transport = (await import("nodemailer")).createTransport(
          resolveSmtpConfig(provider.server)
        );
        const result = await transport.sendMail({
          to: identifier,
          from: provider.from as string,
          subject: `Sign in to ${host}`,
          text: `Sign in to ${host}\n${url}\n\n`,
          html: buildMagicLinkEmail({ url, host }),
        });

        const failed = result.rejected.filter(Boolean);
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

function buildMagicLinkEmail({ url, host }: { url: string; host: string }) {
  const escapedHost = host.replace(/\./g, "&#8203;.");
  // Inline CSS keeps the template provider-agnostic and reliable across clients
  return `<!DOCTYPE html>
  <html lang="en" style="margin:0;padding:0;">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Sign in to ${escapedHost}</title>
      <style>
        body { margin:0; padding:0; background:#0b0c10; font-family:'Segoe UI', Arial, sans-serif; color:#e6edf3; }
        a { color:inherit; }
      </style>
    </head>
    <body>
      <table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#0b0c10,#111827); padding:32px 0;">
        <tr>
          <td align="center">
            <table width="560" role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#0f172a; border:1px solid #1f2937; border-radius:18px; box-shadow:0 24px 60px rgba(0,0,0,0.35); overflow:hidden;">
              <tr>
                <td style="padding:32px 32px 16px; text-align:center;">
                  <div style="display:inline-flex; align-items:center; gap:10px; font-weight:700; letter-spacing:0.3px; color:#a5b4fc; text-transform:uppercase; font-size:13px;">LitLens</div>
                  <div style="margin-top:10px; font-size:26px; font-weight:700; color:#e2e8f0;">Light up your research</div>
                  <div style="margin-top:10px; font-size:16px; color:#94a3b8;">A secure one-tap sign in for ${escapedHost}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px 24px; text-align:center;">
                  <a href="${url}" style="display:inline-block; padding:14px 28px; background:linear-gradient(90deg,#6366f1,#22d3ee); color:#0b1021; font-weight:700; font-size:16px; border-radius:999px; text-decoration:none; box-shadow:0 12px 30px rgba(99,102,241,0.35);">Lit the lens Now</a>
                  <div style="margin-top:12px; font-size:13px; color:#cbd5e1;">The link expires soon. If you didn’t request it, you can safely ignore this email.</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px 32px; background:#0b1021; text-align:left; color:#94a3b8; font-size:13px; line-height:1.6;">
                  <div style="font-weight:600; color:#cbd5e1; margin-bottom:6px;">Plain link</div>
                  <div style="word-break:break-all; color:#e2e8f0;">${url}</div>
                </td>
              </tr>
            </table>
            <div style="margin-top:16px; color:#475569; font-size:12px;">Sent by LitLens · ${escapedHost}</div>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function resolveSmtpConfig(server: string | any) {
  if (typeof server !== "string") return server;

  const url = new URL(server);
  const port = Number(url.port) || 587;
  const secure = port === 465 || url.protocol === "smtps:";

  return {
    host: url.hostname,
    port,
    secure,
    auth: {
      user: decodeURIComponent(url.username),
      pass: decodeURIComponent(url.password),
    },
    tls: { servername: url.hostname },
  };
}
