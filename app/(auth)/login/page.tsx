import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  alternates: {
    canonical: "/login",
  },
};

export default function Page() {
  return <LoginClient />;
}