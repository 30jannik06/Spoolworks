"use client";

import { createAuthClient } from "better-auth/react";

// baseURL unset: the client uses the current origin, which keeps Vercel
// preview deployments working without per-preview config.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut } = authClient;
