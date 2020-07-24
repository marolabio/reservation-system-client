import React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";

export default function PersonalDetails() {
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
            id="firstName"
            name="firstName"
            label="First name"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            variant="outlined"
            id="lastName"
            name="lastName"
            label="Last name"
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            variant="outlined"
            required
            id="email"
            name="email"
            label="Email Address"
            fullWidth
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
          />
        </Grid>
      </Grid>
    </React.Fragment>
  );
}
