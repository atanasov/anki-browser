/**
 * UI Scale Service
 * Manages the global UI zoom level by setting the root font-size.
 * All Tailwind rem-based classes scale automatically with this.
 * Mirrors the pattern used by themeService.
 */

import dataService from "./dataService";

export const UI_SCALE_OPTIONS = [
  { value: 0.85, label: "85%" },
  { value: 0.90, label: "90%" },
  { value: 1.00, label: "100%" },
  { value: 1.10, label: "110%" },
  { value: 1.20, label: "120%" },
  { value: 1.35, label: "135%" },
];

class UiScaleService {
  constructor() {
    this.listeners = new Set();
    this.apply();
  }

  getScale() {
    return dataService.getSetting("uiScale", 1.0);
  }

  setScale(scale) {
    dataService.setSetting("uiScale", scale);
    this.apply();
    this.notifyListeners();
  }

  apply() {
    const scale = this.getScale();
    document.documentElement.style.fontSize = `${16 * scale}px`;
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const scale = this.getScale();
    this.listeners.forEach((cb) => {
      try { cb(scale); } catch (_) {}
    });
  }
}

export default new UiScaleService();
