interface NativeColorFieldProps {
  value?: string;
  onChange?: (value: string) => void;
}

const tagColors = [
  "#e9bd4e",
  "#ef946c",
  "#e77991",
  "#b58ce1",
  "#7f9ee8",
  "#60afd1",
  "#65b98c",
  "#8fa261",
];

export function NativeColorField({
  value = "#78c6a3",
  onChange,
}: NativeColorFieldProps) {
  const currentColor = /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : "#78c6a3";

  return (
    <div className="tag-color-picker">
      <div
        className="tag-color-palette"
        role="group"
        aria-label="Màu tag có sẵn"
      >
        {tagColors.map((color) => {
          const selected = color === currentColor;

          return (
            <button
              key={color}
              type="button"
              className={selected ? "is-selected" : ""}
              style={{ backgroundColor: color }}
              aria-label={`Chọn màu ${color}`}
              aria-pressed={selected}
              onClick={() => onChange?.(color)}
            >
              {selected && <span aria-hidden="true">✓</span>}
            </button>
          );
        })}

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
