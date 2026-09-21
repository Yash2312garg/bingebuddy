import DashboardCard from "../Components/DashboardCard";

const CardWrapper: React.FC = () => {
  return (
    <>
      <div className="CardWrapper-cntr">
        <DashboardCard>
          <DashboardCard.Icon>
            <img src="" alt="asd" />
          </DashboardCard.Icon>
          <DashboardCard.PrimaryHeading>3</DashboardCard.PrimaryHeading>
          <DashboardCard.SecondaryHeading>
            New Order
          </DashboardCard.SecondaryHeading>
        </DashboardCard>
        <DashboardCard>
          <DashboardCard.Icon>
            <img src="" alt="asd" />
          </DashboardCard.Icon>
          <DashboardCard.PrimaryHeading>5</DashboardCard.PrimaryHeading>
          <DashboardCard.SecondaryHeading>
            Active Orders
          </DashboardCard.SecondaryHeading>
        </DashboardCard>
        <DashboardCard>
          <DashboardCard.Icon>
            <img src="" alt="asd" />
          </DashboardCard.Icon>
          <DashboardCard.PrimaryHeading>$1847.50</DashboardCard.PrimaryHeading>
          <DashboardCard.SecondaryHeading>
            Today's Revenue
          </DashboardCard.SecondaryHeading>
        </DashboardCard>
                <DashboardCard>
          <DashboardCard.Icon>
            <img src="" alt="asd" />
          </DashboardCard.Icon>
          <DashboardCard.PrimaryHeading>0</DashboardCard.PrimaryHeading>
          <DashboardCard.SecondaryHeading>
            Total Items
          </DashboardCard.SecondaryHeading>
        </DashboardCard>
      </div>
    </>
  );
};
export default CardWrapper;
