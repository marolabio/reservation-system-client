import React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";

export default function PersonalDetails({ handleChange, state, validate }) {
  const {
    firstName,
    lastName,
    email,
    firstNameError,
    lastNameError,
    emailError,
    confirmEmailError,
  } = state;

  return (
    <React.Fragment>
      <Typography variant="h6" gutterBottom>
        Personal Details
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            variant="outlined"
            id="First name"
            name="firstName"
            label="First name"
            value={firstName}
            onChange={handleChange}
            fullWidth
            helperText={firstNameError}
            error={firstNameError}
            onBlur={validate}
            autoFocus
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            variant="outlined"
            id="Last name"
            name="lastName"
            label="Last name"
            value={lastName}
            onChange={handleChange}
            fullWidth
            helperText={lastNameError}
            error={lastNameError}
            onBlur={validate}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            required
            id="Email"
            name="email"
            label="Email Address"
            value={email}
            onChange={handleChange}
            fullWidth
            helperText={emailError}
            error={emailError}
            onBlur={validate}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            required
            id="emailConfirmation"
            name="emailConfirmation"
            label="Confirm Email Address"
            fullWidth
            helperText={confirmEmailError}
            onBlur={validate}
          />
        </Grid>
      </Grid>
    </React.Fragment>
  );
}
