import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Page } from "../components/layout/Page.tsx";
import { STORAGE_KEY, type ThemePreference, type WeightUnit } from "../storage/appData.ts";
import { useAppState } from "../state/useAppState.ts";

const themeOptions: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Paper background" },
  { value: "dark", label: "Dark", hint: "Low-light background" },
  { value: "system", label: "System", hint: "Follow this device" },
];

const unitOptions: { value: WeightUnit; label: string; hint: string }[] = [
  { value: "lb", label: "Pounds", hint: "Default for the log" },
  { value: "kg", label: "Kilograms", hint: "Display preference" },
];

export function SettingsPage() {
  const { settings, storageError, updateSettings } = useAppState();
  const savedLabel = settings.updatedAt
    ? `Last saved ${new Date(settings.updatedAt).toLocaleString()}`
    : "No custom settings saved yet. A change is written to this browser immediately.";

  return (
    <Page
      eyebrow="Preferences"
      title="Settings"
      lede="Theme and units are stored on this device. Refresh the page and they should still be here."
    >
      <div className="settings-stack">
        <ChoiceGroup
          name="theme"
          legend="Appearance"
          value={settings.theme}
          options={themeOptions}
          onChange={(theme) => updateSettings({ theme })}
        />
        <ChoiceGroup
          name="weight-unit"
          legend="Weight unit"
          value={settings.weightUnit}
          options={unitOptions}
          onChange={(weightUnit) => updateSettings({ weightUnit })}
        />
        <article className="panel">
          <h2>Local storage</h2>
          <p>{savedLabel}</p>
          <p className="meta">
            Key <code>{STORAGE_KEY}</code>. No account, no server, no sync.
          </p>
          {storageError ? <p className="error">{storageError}</p> : <p className="ok">Storage is available.</p>}
        </article>
      </div>
    </Page>
  );
}
