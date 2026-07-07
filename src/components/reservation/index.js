import React, { useState } from "react";
import { connect } from "react-redux";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import PersonalDetails from "./components/PersonalDetails";
import SelectRoom from "./components/SelectRoom";
import Review from "./components/Review";
import Content from "../layout/Content";
import moment from "moment";
import { reserve } from "./../../actions/reservation";

const steps = ["Select room", "Enter personal details", "Review reservation"];

const Reservation = ({ reserve }) => {
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
      contactNumber: "",
      cityProvince: "",
      email: "",
      confirmEmail: "",
    },
    formErrors: {
      firstNameError: "",
      lastNameError: "",
      contactNumberError: "",
      emailError: "",
      confirmEmailError: "",
    },
  });
  const { activeStep } = state;

  const validate = (e) => {
    const { name, value, id } = e.target;
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; //eslint-disable-line

    // Conditional validations
    setState((prevState) => {
      const nextForm = { ...prevState.form, [name]: value };
      const emailError =
        nextForm.email && !re.test(nextForm.email)
          ? "Invalid email address"
          : "";
      const confirmEmailError =
        nextForm.email &&
        nextForm.confirmEmail &&
        nextForm.confirmEmail !== nextForm.email
          ? "Email address do not match"
          : "";

      return {
        ...prevState,
        formErrors: {
          ...prevState.formErrors,
          [`${name}Error`]: !value
            ? ["email", "confirmEmail", "cityProvince"].includes(name)
              ? ""
              : `${id} is required`
            : "",
          emailError,
          confirmEmailError,
        },
      };
    });
  };

  const nextStep = () => {
    const { formErrors, form } = state;
    if (activeStep === 1) {
      const emptyInputKeys = Object.keys(form).filter((key) => {
        if (["cityProvince", "email", "confirmEmail"].includes(key)) return false;
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
      form: { firstName, lastName, email, contactNumber, cityProvince },
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
      contactNumber,
      cityProvince,
      email,
      checkin,
      checkout,
      children,
      adult,
    };

    reserve(params).then(() => {
      nextStep();
    });
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

  // console.log("state", state);

  return (
    <Content title="Reservations" loading={false}>
      <Stepper
        activeStep={activeStep}
        sx={(theme) => ({
          padding: theme.spacing(3, 0, 5),
          background: "transparent",
        })}
      >
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
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {activeStep !== 0 && (
                <React.Fragment>
                  <Button
                    onClick={() => prevStep()}
                    sx={(theme) => ({
                      marginTop: theme.spacing(3),
                      marginLeft: theme.spacing(1),
                    })}
                  >
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
                    sx={(theme) => ({
                      marginTop: theme.spacing(3),
                      marginLeft: theme.spacing(1),
                    })}
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
                  sx={(theme) => ({
                    marginTop: theme.spacing(3),
                    marginLeft: theme.spacing(1),
                  })}
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
