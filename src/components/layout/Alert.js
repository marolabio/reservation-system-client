import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Alert as MuiAlert } from "@material-ui/lab/";
import Snackbar from "@material-ui/core/Snackbar";
import { removeAlert } from "./../../actions/alert";

const Alert = ({ alerts, removeAlert }) => {

  return (
    alerts !== null &&
    alerts.length > 0 &&
    alerts.map((alert) => (
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={alerts.length > 0}
        key={alert.id}
        autoHideDuration={6000}
        onClose={() => removeAlert(alert.id)}
      >
        <MuiAlert
          onClose={() => removeAlert(alert.id)}
          severity={alert.alertType}
        >
          {alert.msg}
        </MuiAlert>
      </Snackbar>
    ))
  );
};

Alert.propTypes = {
  alerts: PropTypes.array.isRequired,
};

const mapStateToProps = (state) => {
  console.log(state);
  return {
    alerts: state.alert,
  };
};

export default connect(mapStateToProps, { removeAlert })(Alert);
