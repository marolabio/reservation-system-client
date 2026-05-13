import React from "react";
import Head from "next/head";
import PropTypes from "prop-types";

function Helmet({ children, title, description, keywords }) {
  return (
    <Head>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords.join(",")} />}
      {children}
    </Head>
  );
}

Helmet.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  keywords: PropTypes.array,
};

export default Helmet;
