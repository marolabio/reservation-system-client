import React from "react";
import ErrorPage from "next/error";

export default function MyError({ statusCode }) {
  return <ErrorPage statusCode={statusCode} />;
}

MyError.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
