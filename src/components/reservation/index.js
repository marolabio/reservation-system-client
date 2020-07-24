import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import PersonalDetails from "./components/PersonalDetails";
import SelectRoom from "./components/SelectRoom";
import Review from "./components/Review";
import Content from "../layout/Content";

const useStyles = makeStyles((theme) => ({
  stepper: {
    padding: theme.spacing(3, 0, 5),
    background: "transparent",
  },
  buttons: {
    display: "flex",
    justifyContent: "flex-end",
  },
  button: {
    marginTop: theme.spacing(3),
    marginLeft: theme.spacing(1),
  },
}));

const steps = ["Select room", "Enter personal details", "Review reservation"];

export default function Reservations(props) {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);

  const handleNext = (data) => {
    setActiveStep(activeStep + 1);
    console.log("data", data)
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <SelectRoom handleNext={handleNext} />;
      case 1:
        return <PersonalDetails />;
      case 2:
        return <Review />;
      default:
        throw new Error("Unknown step");
    }
  };

  return (
    <Content title="Reservations" loading={false}>
      <Stepper activeStep={activeStep} className={classes.stepper}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <React.Fragment>
        {activeStep === steps.length ? (
          <React.Fragment>
            <Typography variant="h5" gutterBottom>
              Reservation Successful!.
            </Typography>
            <Typography variant="subtitle1">
              Your transaction number is #2001539. We have emailed your
              reservation confirmation, and will send you an update when your
              reservation has shipped.
            </Typography>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {getStepContent(activeStep)}
            <div className={classes.buttons}>
              {activeStep !== 0 && (
                <React.Fragment>
                  <Button onClick={handleBack} className={classes.button}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleNext()}
                    className={classes.button}
                  >
                    {activeStep === steps.length - 1
                      ? "Place reservation"
                      : "Next"}
                  </Button>
                </React.Fragment>
              )}
            </div>
          </React.Fragment>
        )}
      </React.Fragment>
    </Content>
  );
}
