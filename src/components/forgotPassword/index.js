import React, { useState } from "react";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { setAlert } from "../../actions/alert";
import { forgotPassword } from "../../actions/forgotPassword";

import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Box from "@material-ui/core/Box";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import { green } from "@material-ui/core/colors";
import Copyright from "../layout/Copyright";
import Helmet from "../layout/Helmet";

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(10),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

const ForgotPassword = (props) => {
  const classes = useStyles();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setLoading(true);
      props.forgotPassword({ email }).then(() => setLoading(false));
    } else {
      props.setAlert("Email is required.", "error");
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Helmet title="Forgot Password" />
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Forgot your password?
        </Typography>
        <Typography
          variant="subtitle1"
          gutterBottom
          align="center"
          color="textSecondary"
        >
          Enter your email address and we'll send you a link to reset your
          password
        </Typography>
        <form className={classes.form} noValidate onSubmit={(e) => onSubmit(e)}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
            disabled={loading}
          >
            Submit
            {loading && (
              <CircularProgress size={24} className={classes.buttonProgress} />
            )}
          </Button>
          <Link to="/">Return to sign in page</Link>
        </form>
      </div>
      <Box mt={8}>
        <Copyright />
      </Box>
    </Container>
  );
};

ForgotPassword.propTypes = {
  setAlert: PropTypes.func.isRequired,
  forgotPassword: PropTypes.func.isRequired,
};

export default connect(null, { forgotPassword, setAlert })(ForgotPassword);
