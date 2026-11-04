import { Page } from "../components/layout/Page.tsx";
import { PlaceholderList } from "../components/layout/PlaceholderList.tsx";

export function WorkoutsPage() {
  return (
    <Page
      eyebrow="Strength"
      title="Workouts"
      lede="Tuesday bench, Wednesday squat, and Friday’s secondary session will be logged here."
    >
      <PlaceholderList
        title="Logging is next"
        items={[
          "Weight, reps, and RPE for each set",
          "Previous performance and a suggested working weight",
          "Edit, reorder, and group exercises into supersets",
          "Pounds as the default unit",
        ]}
      />
    </Page>
  );
}
