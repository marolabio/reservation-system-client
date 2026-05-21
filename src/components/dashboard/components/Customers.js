import React from "react";
import Link from "next/link";
import { makeStyles } from "@mui/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
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
        <Link className={classes.link} href="/customers">
          See more customers
        </Link>
      </div>
    </React.Fragment>
  );
}
