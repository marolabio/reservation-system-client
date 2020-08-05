import React from "react";
import { Link } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Title from "./Title";

const useStyles = makeStyles((theme) => {
  console.log({ theme });
  return {
    seeMore: {
      marginTop: theme.spacing(3),
    },
    link: {
      textDecoration: "none",
      color: theme.palette.primary.main,
    },
  };
});

export default function Customers({ reservations }) {
  const classes = useStyles();

  const rows = reservations.map((res) => {
    const { first_name, last_name, email, contact_number } = res.customer;
    return {
      name: `${first_name} ${last_name}`,
      email,
      contactNumber: contact_number,
      status: res.status,
    };
  });

  return (
    <React.Fragment>
      <Title>Recent Customers</Title>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Customer Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Contact Number</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.contactNumber}</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className={classes.seeMore}>
        <Link className={classes.link} to="customers">
          See more customers
        </Link>
      </div>
    </React.Fragment>
  );
}
