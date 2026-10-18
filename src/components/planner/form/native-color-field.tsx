import { presetColors } from "@/lib/recent-colors";

interface NativeColorFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  /** Custom colors picked lately, newest first; shown under the presets. */
  recentColors?: readonly string[];
}

function ColorSwatch({
  color,
  selected,
  onPick,
}: {
  color: string;
  selected: boolean;
  onPick: (color: string) => void;
}) {
  return (
    <button
      type="button"
      className={selected ? "is-selected" : ""}
      style={{ backgroundColor: color }}
      aria-label={`Chọn màu ${color}`}
      aria-pressed={selected}
      onClick={() => onPick(color)}
    >
      {selected && <span aria-hidden="true">✓</span>}
    </button>
  );
}


export function NativeColorField({
  value = "#78c6a3",
  onChange,
  recentColors = [],
}: NativeColorFieldProps) {
  const currentColor = /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : "#78c6a3";

  return (
    <div className="tag-color-picker">
      <div
        className="tag-color-palette"
        role="group"
        aria-label="Màu có sẵn"
      >
        {presetColors.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            selected={color === currentColor}
            onPick={(picked) => onChange?.(picked)}
          />
        ))}

        <label
          className="tag-color-custom"
          aria-label="Chọn màu tùy chỉnh"
          title="Chọn màu tùy chỉnh"
        >
          <input
            type="color"
            value={currentColor}
            aria-label="Chọn màu tùy chỉnh"
            onChange={(event) => onChange?.(event.target.value)}
          />
          <span aria-hidden="true">+</span>
        </label>
      </div>

      {recentColors.length > 0 && (
        <div className="tag-color-recent">
          <span className="tag-color-recent-label">Gần đây</span>
          <div
            className="tag-color-palette"
            role="group"
            aria-label="Màu dùng gần đây"
          >
            {recentColors.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={color === currentColor}
                onPick={(picked) => onChange?.(picked)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="tag-color-value">
        <span
          className="native-color-swatch"
          style={{ backgroundColor: currentColor }}
        />
        <span>Màu đang chọn</span>
        <code>{currentColor.toUpperCase()}</code>
      </div>
    </div>
  );
}
