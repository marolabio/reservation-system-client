import React, { useState } from "react";
import Link from "next/link";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { setAlert } from "../../actions/alert";
import { forgotPassword } from "../../actions/forgotPassword";

import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import { green } from "@mui/material/colors";
import Copyright from "../layout/Copyright";
import Helmet from "../layout/Helmet";

const ForgotPassword = (props) => {
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
      <Box
        sx={(theme) => ({
          marginTop: theme.spacing(10),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        })}
      >
        <Avatar
          sx={(theme) => ({
            margin: theme.spacing(1),
            backgroundColor: theme.palette.secondary.main,
          })}
        >
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
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </Typography>
        <form style={{ width: "100%", marginTop: 8 }} noValidate onSubmit={(e) => onSubmit(e)}>
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
            sx={(theme) => ({ margin: theme.spacing(3, 0, 2) })}
            disabled={loading}
          >
            Submit
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  color: green[500],
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  marginTop: "-12px",
                  marginLeft: "-12px",
                }}
              />
            )}
          </Button>
          <Link href="/">Return to sign in page</Link>
        </form>
      </Box>
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
