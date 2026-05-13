import React from "react";
import ErrorPage from "next/error";

export default function NotFoundPage() {
  return <ErrorPage statusCode={404} />;
}
