import PaymentPage from "./payment";

export default function ReservationRefundPage(props) {
  return <PaymentPage {...props} forcedType="refund" />;
}
