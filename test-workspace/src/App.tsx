import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

function Button(props: ButtonProps) {
  return <button {...props} />;
}

export const Demo = <Button /*cursor*/ />;
