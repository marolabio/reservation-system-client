import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Alert as MuiAlert } from "@material-ui/lab/";

const Alert = ({ alerts }) =>
  alerts !== null &&
  alerts.length > 0 &&
  alerts.map((alert) => (
    <MuiAlert key={alert.id} severity={alert.alertType}>
      {alert.msg}
    </MuiAlert>
  ));

Alert.propTypes = {
  alerts: PropTypes.array.isRequired,
};

const mapStateToProps = (state) => {
  console.log(state)
  return {
    alerts: state.alert,
  }
};

export default connect(mapStateToProps)(Alert);
