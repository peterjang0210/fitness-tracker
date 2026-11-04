import { Page } from "../components/layout/Page.tsx";
import { PlaceholderList } from "../components/layout/PlaceholderList.tsx";

export function ProgressPage() {
  return (
    <Page
      eyebrow="Charts"
      title="Progress"
      lede="Strength and running charts will update from the workouts saved in this browser."
    >
      <PlaceholderList
        title="Charts are later"
        items={[
          "Bench and squat working weight, estimated 1RM, and weekly volume",
          "Running distance, duration, pace, and treadmill speed",
          "A date range so you can look at one block of training",
        ]}
      />
    </Page>
  );
}
