import { Page } from "../components/layout/Page.tsx";
import { PlaceholderList } from "../components/layout/PlaceholderList.tsx";

export function RunningPage() {
  return (
    <Page
      eyebrow="Treadmill"
      title="Running"
      lede="Warm-up, intervals, recovery, and cooldown will be separate segments. Only running segments count toward pace."
    >
      <PlaceholderList
        title="Calculator is next"
        items={[
          "Distance from minutes and treadmill speed",
          "Walking time kept out of running distance and pace",
          "Saved sessions you can reuse",
        ]}
      />
    </Page>
  );
}
