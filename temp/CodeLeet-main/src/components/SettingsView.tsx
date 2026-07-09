import { useState } from "react";
import { AppSettings, loadSettings, saveSettings } from "../settings";
import { THEMES } from "../themes";

export default function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  const updateSettings = (newS: AppSettings) => {
    setSettings(newS);
    saveSettings(newS);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-[11px] font-bold tracking-widest uppercase text-gray-400">
          Settings
        </h3>
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        <SettingRow
          title="Celebration Mode"
          desc="Show GTA-style banner on submission"
        >
          <Toggle
            enabled={settings.overlayEnabled}
            onToggle={() =>
              updateSettings({
                ...settings,
                overlayEnabled: !settings.overlayEnabled,
              })
            }
          />
        </SettingRow>

        <SettingRow title="Sound Effects" desc="Play Wasted / Mission Passed">
          <Toggle
            enabled={settings.soundEnabled}
            onToggle={() =>
              updateSettings({
                ...settings,
                soundEnabled: !settings.soundEnabled,
              })
            }
          />
        </SettingRow>
      </Section>

      {/* Theme */}
      <Section title="Theme">
        <div className="space-y-1">
          <select
            value={settings.theme}
            onChange={(e) =>
              updateSettings({ ...settings, theme: e.target.value })
            }
            className="
              w-full rounded-lg bg-gray-900
              border border-gray-700
              px-3 py-2 text-sm text-gray-200
              focus:border-green-500 focus:outline-none
              transition cursor-pointer
            "
          >
            {Object.entries(THEMES).map(([key, theme]) => (
              <option key={key} value={key}>
                {theme.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500">
            Controls banner visuals and sound style
          </p>
        </div>
      </Section>

      {/* Info */}
      <div
        className="
          rounded-lg border border-gray-700
          bg-gray-900/60 px-3 py-2
          text-[10px] text-gray-400
        "
      >
        Settings are saved automatically to your browser.
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-xl border border-gray-700
        bg-gradient-to-br from-gray-900 to-gray-800
        p-4 space-y-4
      "
    >
      <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
        {title}
      </div>
      {children}
    </div>
  );
}

function SettingRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-gray-200">{title}</div>
        <div className="text-[11px] text-gray-500">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-green-500/40
        ${
          enabled
            ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
            : "bg-gradient-to-r from-gray-700 to-gray-600"
        }
      `}
    >
      {/* Knob */}
      <span
        className={`
          absolute left-1 flex h-5 w-5 items-center justify-center
          rounded-full bg-white text-[10px] font-bold
          shadow-md
          transition-transform duration-300 ease-out cursor-pointer
          ${
            enabled
              ? "translate-x-5 text-green-600"
              : "translate-x-0 text-gray-400"
          }
        `}
      ></span>
    </button>
  );
}
