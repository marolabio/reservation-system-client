import React from "react";
import { Helmet as ReactHelmet } from "react-helmet";
import PropTypes from "prop-types";

function Helmet({ children, title, description, keywords }) {
  return (
    <ReactHelmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
    </ReactHelmet>
  );
}

Helmet.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  keywords: PropTypes.array,
};

export default Helmet;
