import React from "react";
import "./index.css";

const DashboardCardPrimaryHeading: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <h2 className="DashboardCardPrimaryHeading-h2">
      {children}
    </h2>
  );
};

const DashboardCardSecondaryHeading: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <p className="DashboardCardSecondaryHeading-p">
      {children}
    </p>
  );
};

const DashboardCardIcon: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="DashboardCard-img-wrpr">
      {children}
    </div>
  );
};

const DashboardCardRoot: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="DashboardCard-wrapper">
      {children}
    </div>
  );
};

const DashboardCard = Object.assign(DashboardCardRoot, {
  PrimaryHeading: DashboardCardPrimaryHeading,
  SecondaryHeading: DashboardCardSecondaryHeading,
  Icon: DashboardCardIcon,
});

export default DashboardCard;
