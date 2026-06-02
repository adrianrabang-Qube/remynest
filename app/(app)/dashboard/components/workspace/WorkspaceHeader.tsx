import DashboardHeader from "../DashboardHeader";

type Props = {
  greeting: string;
  displayName: string;
  workspaceType?: "my-nest" | "care";
};

export function WorkspaceHeader(props: Props) {
  return <DashboardHeader {...props} />;
}