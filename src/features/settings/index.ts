/**
 * Public surface of the Settings module.
 *
 * A host application mounts `SettingsRuntime` once at the root — it applies the
 * stored settings and hosts the notification queue — and renders the screen
 * wherever it wants it. Anything that needs to raise a notification imports
 * `notify`; anything that needs to read a preference imports `useSettings`.
 */

export { SettingsRuntime } from "./components/SettingsRuntime";
export { NotificationHost } from "./components/NotificationHost";
export { useSettings, useSettingsStore } from "./store/settingsStore";
export type { EventLevel, SettingsEvent } from "./store/settingsStore";
export { notify, useNotifyStore } from "./store/notifyStore";
export { applySettings, SETTINGS_INIT_SCRIPT } from "./lib/apply";
export { readPersistedSettings, readHomeHref } from "./lib/readPersisted";
export * from "./types";
