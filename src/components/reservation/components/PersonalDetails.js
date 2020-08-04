import React, { useRef, useEffect } from "react";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";

export default function PersonalDetails({ handleFormChange, state, validate }) {
  const {
    inputFocus,
    form: { firstName, lastName, email, confirmEmail, contactNumber },
    formErrors: {
      firstNameError,
      lastNameError,
      emailError,
      confirmEmailError,
      contactNumberError,
    },
  } = state;
  const inputRef = useRef([]);

  useEffect(() => {
    let next = inputRef.current[inputFocus];
    if (next) {
      next.focus();
    }
  }, [inputFocus]);

  return (
    <React.Fragment>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            variant="outlined"
            id="First name"
            label="First name"
            name="firstName"
            value={firstName}
            onChange={handleFormChange}
            fullWidth
            helperText={firstNameError}
            error={firstNameError}
            onBlur={validate}
            inputRef={(el) => (inputRef.current["firstName"] = el)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            variant="outlined"
            id="Last name"
            label="Last name"
            name="lastName"
            value={lastName}
            onChange={handleFormChange}
            fullWidth
            helperText={lastNameError}
            error={lastNameError}
            onBlur={validate}
            inputRef={(el) => (inputRef.current["lastName"] = el)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            required
            id="Contact Number"
            label="Contact Number"
            name="contactNumber"
            value={contactNumber}
            onChange={handleFormChange}
            fullWidth
            helperText={contactNumberError}
            error={contactNumberError}
            onBlur={validate}
            inputRef={(el) => (inputRef.current["contactNumber"] = el)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            required
            id="Email Address"
            label="Email Address"
            name="email"
            value={email}
            onChange={handleFormChange}
            fullWidth
            helperText={emailError}
            error={emailError}
            onBlur={validate}
            inputRef={(el) => (inputRef.current["email"] = el)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            required
            id="Confirm Email Address"
            label="Confirm Email Address"
            name="confirmEmail"
            fullWidth
            value={confirmEmail}
            onChange={handleFormChange}
            helperText={confirmEmailError}
            error={confirmEmailError}
            onBlur={validate}
            inputRef={(el) => (inputRef.current["confirmEmail"] = el)}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2" gutterBottom>
            Note: In order to effectively use our services and system, we
            require our customers to provide a valid email address for
            communication purposes. Rest assured, all the data registered in our
            system is private and confidential.
          </Typography>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}
