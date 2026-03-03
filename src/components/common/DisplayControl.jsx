/**
 * DisplayControl
 * Single header dropdown for all card display settings:
 * card size, aspect ratio, and font size.
 */

import useStore from "../../store";
import Dropdown from "./Dropdown";
import { getFontSizeOptions } from "../../utils/fontSizeHelpers";

// Card size SVG icons
const SizeIcon = ({ size }) => {
  if (size === "small") return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <rect x="1" y="1" width="5" height="5" rx="0.8" />
      <rect x="7.5" y="1" width="5" height="5" rx="0.8" />
      <rect x="14" y="1" width="5" height="5" rx="0.8" />
      <rect x="1" y="7.5" width="5" height="5" rx="0.8" />
      <rect x="7.5" y="7.5" width="5" height="5" rx="0.8" />
      <rect x="14" y="7.5" width="5" height="5" rx="0.8" />
      <rect x="1" y="14" width="5" height="5" rx="0.8" />
      <rect x="7.5" y="14" width="5" height="5" rx="0.8" />
      <rect x="14" y="14" width="5" height="5" rx="0.8" />
    </svg>
  );
  if (size === "medium") return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <rect x="1" y="1" width="8" height="8" rx="1" />
      <rect x="11" y="1" width="8" height="8" rx="1" />
      <rect x="1" y="11" width="8" height="8" rx="1" />
      <rect x="11" y="11" width="8" height="8" rx="1" />
    </svg>
  );
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <rect x="1" y="1" width="18" height="18" rx="2" />
    </svg>
  );
};

// Aspect ratio SVG icons
const RatioIcon = ({ ratio }) => {
  if (ratio === "square") return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="2" y="2" width="16" height="16" rx="1.5" />
    </svg>
  );
  if (ratio === "portrait") return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="5" y="1" width="10" height="18" rx="1.5" />
    </svg>
  );
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="1" y="5" width="18" height="10" rx="1.5" />
    </svg>
  );
};

const SIZES = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const RATIOS = [
  { value: "square", label: "Square" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

const DisplayControl = () => {
  const gridSize = useStore((s) => s.settings?.gridSize || "medium");
  const aspectRatio = useStore((s) => s.settings?.aspectRatio || "square");
  const fontSize = useStore((s) => s.settings?.fontSize || "medium");
  const updateSettings = useStore((s) => s.updateSettings);

  const fontSizeOptions = getFontSizeOptions();

  const iconBtn = (active) =>
    `flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    }`;

  return (
    <Dropdown
      trigger={
        <button
          className="p-2 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Display settings"
          title="Display settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
      }
      align="right"
      width="w-56"
      ariaLabel="Display settings menu"
    >
      <div className="p-3 space-y-4">

        {/* Card size */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Card Size
          </p>
          <div className="flex gap-1">
            {SIZES.map(({ value, label }) => (
              <button key={value} onClick={() => updateSettings({ gridSize: value })} className={iconBtn(gridSize === value)} title={label}>
                <SizeIcon size={value} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* Aspect ratio */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Aspect Ratio
          </p>
          <div className="flex gap-1">
            {RATIOS.map(({ value, label }) => (
              <button key={value} onClick={() => updateSettings({ aspectRatio: value })} className={iconBtn(aspectRatio === value)} title={label}>
                <RatioIcon ratio={value} />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* Font size */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Font Size
          </p>
          <div className="flex flex-wrap gap-1">
            {fontSizeOptions.map(({ value, label, class: cls }) => (
              <button
                key={value}
                onClick={() => updateSettings({ fontSize: value })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  fontSize === value
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                } ${cls}`}
                title={label}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </Dropdown>
  );
};

export default DisplayControl;
