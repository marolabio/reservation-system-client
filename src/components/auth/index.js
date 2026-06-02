import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import { setAlert } from "../../actions/alert";
import { loadUser, login } from "../../actions/auth";
import PropTypes from "prop-types";

import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { green } from "@mui/material/colors";
import Copyright from "./../layout/Copyright";
import Helmet from "../layout/Helmet";

const SignInSide = (props) => {
  const { isAuthenticated, loading, loadUser } = props;
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const { email, password } = formData;

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace("/bookings");
    }
  }, [isAuthenticated, loading, router]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (email && password) {
      setSubmitting(true);
      props
        .login({ identifier: email, password })
        .then(() => setSubmitting(false));
    } else {
      props.setAlert("Email and password are required.", "error");
    }
  };

  return (
    <Grid container component="main" sx={{ height: "100vh" }}>
      <Helmet title="Login" />
      <CssBaseline />
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={(theme) => ({
          backgroundImage: "url(https://source.unsplash.com/random)",
          backgroundRepeat: "no-repeat",
          backgroundColor:
            theme.palette.mode === "light"
              ? theme.palette.grey[50]
              : theme.palette.grey[900],
          backgroundSize: "cover",
          backgroundPosition: "center",
        })}
      />
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={(theme) => ({
            margin: theme.spacing(8, 4),
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
            Sign in
          </Typography>
          <form
            style={{ width: "100%", marginTop: 8 }}
            noValidate
            onSubmit={(e) => onSubmit(e)}
          >
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
              value={email}
              onChange={onChange}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={onChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={(theme) => ({ margin: theme.spacing(3, 0, 2) })}
              disabled={submitting}
            >
              Sign In
              {submitting && (
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
            <Grid container>
              <Grid item xs>
                <Link href="/forgot-password">Forgot password?</Link>
              </Grid>
            </Grid>
            <Box mt={5}>
              <Copyright />
            </Box>
          </form>
        </Box>
      </Grid>
    </Grid>
  );
};

SignInSide.propTypes = {
  setAlert: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired,
  loadUser: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool,
  loading: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  loading: state.auth.loading,
});

export default connect(mapStateToProps, { setAlert, loadUser, login })(SignInSide);
