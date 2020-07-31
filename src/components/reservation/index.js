import React, { useState } from "react";
import { connect } from "react-redux";
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
import moment from "moment";
import { reserve } from "./../../actions/reservation";

const steps = ["Select room", "Enter personal details", "Review reservation"];

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

const Reservation = ({ reserve }) => {
  const classes = useStyles();
  const [state, setState] = useState({
    activeStep: 0,
    checkin: moment().add(1, "days").format("YYYY-MM-DD"),
    checkout: moment().add(2, "days").format("YYYY-MM-DD"),
    roomQuantity: 1,
    room: {},
    adult: 1,
    children: 0,
    inputFocus: "",
    form: {
      firstName: "",
      lastName: "",
      email: "",
      confirmEmail: "",
    },
    formErrors: {
      firstNameError: "",
      lastNameError: "",
      emailError: "",
      confirmEmailError: "",
    },
  });
  const { activeStep } = state;

  const validate = (e) => {
    const { name, value, id } = e.target;
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; //eslint-disable-line

    // Conditional validations
    setState((prevState) => ({
      ...prevState,
      formErrors: {
        ...prevState.formErrors,
        [`${name}Error`]: !value
          ? `${id} is required`
          : name === "email" && !re.test(value)
          ? "Invalid email address"
          : name === "confirmEmail" && value !== state.form.email
          ? "Email address do not match"
          : "",
        confirmEmailError:
          (state.form.confirmEmail && value !== state.form.confirmEmail) ||
          (state.form.email && value !== state.form.email)
            ? "Email address do not match"
            : "",
      },
    }));
  };

  const nextStep = () => {
    const { formErrors, form } = state;
    if (activeStep === 1) {
      const emptyInputKeys = Object.keys(form).filter((key) => {
        return form[key] === "";
      });

      // Input focus on the first input when input is empty
      if (emptyInputKeys.length > 0) {
        setState((prevState) => ({
          ...prevState,
          inputFocus: emptyInputKeys[0],
        }));
        return;
      }

      if (Object.values(formErrors).some((val) => val !== "")) return;
    }

    setState((prevState) => ({
      ...prevState,
      activeStep: prevState.activeStep + 1,
    }));
  };

  const prevStep = () => {
    setState((prevState) => ({
      ...prevState,
      activeStep: prevState.activeStep - 1,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setState((prevState) => ({
      ...prevState,
      form: {
        ...prevState.form,
        [name]: value,
      },
    }));
  };

  const handleDateChange = (name, date) => {
    setState((prevState) => ({
      ...prevState,
      [name]: date.format("YYYY-MM-DD"),
    }));
  };

  const handleSelectRoom = (room) => {
    setState((prevState) => ({
      ...prevState,
      room,
    }));

    nextStep();
  };

  const handleChangeRoom = () => {
    setState((prevState) => ({
      ...prevState,
      room: {},
    }));
  };

  const handlePlaceReservation = () => {
    const {
      form: { firstName, lastName, email },
      room,
      roomQuantity,
      checkin,
      checkout,
      children,
      adult,
    } = state;

    const params = {
      rooms: [{ id: room.id, quantity: roomQuantity }],
      firstName,
      lastName,
      email,
      checkin,
      checkout,
      children,
      adult,
    };

    reserve(params).then(() => nextStep());
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <SelectRoom
            handleSelectRoom={handleSelectRoom}
            handleChangeRoom={handleChangeRoom}
            handleChange={handleChange}
            handleDateChange={handleDateChange}
            nextStep={nextStep}
            state={state}
          />
        );
      case 1:
        return (
          <PersonalDetails
            handleFormChange={handleFormChange}
            handleDateChange={handleDateChange}
            state={state}
            validate={validate}
          />
        );
      case 2:
        return <Review state={state} />;
      default:
        throw new Error("Unknown step");
    }
  };

  console.log("state", state);

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
              Reservation Successful!
            </Typography>
            <Typography variant="subtitle1">
              We will send you an update when your reservation has been
              approved. Thank you
            </Typography>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {getStepContent(activeStep)}
            <div className={classes.buttons}>
              {activeStep !== 0 && (
                <React.Fragment>
                  <Button onClick={() => prevStep()} className={classes.button}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      activeStep === steps.length - 1
                        ? handlePlaceReservation()
                        : nextStep();
                    }}
                    className={classes.button}
                  >
                    {activeStep === steps.length - 1
                      ? "Place reservation"
                      : "Next"}
                  </Button>
                </React.Fragment>
              )}

              {activeStep === 0 && Object.keys(state.room).length !== 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => nextStep()}
                  className={classes.button}
                >
                  Next
                </Button>
              )}
            </div>
          </React.Fragment>
        )}
      </React.Fragment>
    </Content>
  );
};

export default connect(null, { reserve })(Reservation);
