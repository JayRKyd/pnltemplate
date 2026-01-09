"use client";

import { useEffect } from "react";
import { upsertCurrentUser } from "@/app/actions/upsert-user";

// Client wrapper to call the server action on mount.
export function UpsertUserOnMount() {
  useEffect(() => {
    upsertCurrentUser().catch((err) => {
      console.error("Upsert user failed", err);
    });
  }, []);

  return null;
}
