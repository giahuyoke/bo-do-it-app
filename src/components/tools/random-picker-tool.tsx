"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button, Input, InputNumber, Segmented } from "antd";
import { useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import {
  formatGroups,
  parseNames,
  pickRandom,
  splitIntoGroups,
} from "@/lib/tools/random-picker";

type Mode = "pick" | "groups";
type GroupMode = "count" | "size";

export function RandomPickerTool() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("pick");
  const [pickCount, setPickCount] = useState(1);
  const [groupMode, setGroupMode] = useState<GroupMode>("count");
  const [groupValue, setGroupValue] = useState(2);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [groups, setGroups] = useState<string[][] | null>(null);

  const names = parseNames(text);
  const error = !names.length
    ? null
    : mode === "pick" && pickCount > names.length
      ? `Chỉ có ${names.length} tên, không bốc được ${pickCount} người.`
      : mode === "groups" && groupMode === "count" && groupValue > names.length
        ? `Chỉ có ${names.length} tên, không chia được ${groupValue} nhóm.`
        : null;
  const ready = names.length > 0 && !error;
  const result = mode === "pick" ? picked : groups;

  const run = () => {
    if (!ready) return;
    if (mode === "pick") setPicked(pickRandom(names, pickCount));
    else setGroups(splitIntoGroups(names, { mode: groupMode, value: groupValue }));
  };

  const resultText =
    mode === "pick" ? (picked ?? []).join("\n") : formatGroups(groups ?? []);

  return (
    <div className="tool-columns">
      <section className="tool-column">
        <header className="tool-column-heading">
          Danh sách <span>{names.length} tên</span>
        </header>
        <Input.TextArea
          className="tool-textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"Mỗi dòng một tên, ví dụ:\nAn\nBình\nChi"}
          aria-label="Danh sách tên, mỗi dòng một tên"
        />
      </section>

      <section className="tool-column">
        <header className="tool-column-heading">Tùy chọn</header>
        <div className="tool-fields">
          <Segmented
            block
            value={mode}
            onChange={(value) => setMode(value as Mode)}
            options={[
              { label: "Bốc thăm", value: "pick" },
              { label: "Chia nhóm", value: "groups" },
            ]}
          />
          {mode === "pick" ? (
            <label className="tool-field">
              <span>Số người cần bốc</span>
              <InputNumber
                min={1}
                max={999}
                precision={0}
                value={pickCount}
                onChange={(value) => setPickCount(value ?? 1)}
              />
            </label>
          ) : (
            <>
              <Segmented
                block
                value={groupMode}
                onChange={(value) => setGroupMode(value as GroupMode)}
                options={[
                  { label: "Số nhóm", value: "count" },
                  { label: "Số người mỗi nhóm", value: "size" },
                ]}
              />
              <label className="tool-field">
                <span>{groupMode === "count" ? "Chia thành" : "Tối đa mỗi nhóm"}</span>
                <InputNumber
                  min={1}
                  max={999}
                  precision={0}
                  value={groupValue}
                  onChange={(value) => setGroupValue(value ?? 1)}
                  suffix={groupMode === "count" ? "nhóm" : "người"}
                />
              </label>
            </>
          )}
          {error ? <span className="tool-field-error">{error}</span> : null}
          <Button
            type="primary"
            size="large"
            icon={result ? <ReloadOutlined /> : undefined}
            disabled={!ready}
            onClick={run}
          >
            {mode === "pick"
              ? result ? "Bốc lại" : "Bốc thăm"
              : result ? "Chia lại" : "Chia nhóm"}
          </Button>
        </div>
      </section>

      <section className="tool-column">
        <header className="tool-column-heading">
          Kết quả
          <CopyButton text={result ? resultText : ""} />
        </header>
        {mode === "pick" && picked ? (
          <ol className="random-picked" aria-live="polite">
            {picked.map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
          </ol>
        ) : mode === "groups" && groups ? (
          <div className="random-groups" aria-live="polite">
            {groups.map((group, index) => (
              <div key={index} className="random-group">
                <strong>
                  Nhóm {index + 1} <span>{group.length} người</span>
                </strong>
                <ul>
                  {group.map((name, nameIndex) => (
                    <li key={`${name}-${nameIndex}`}>{name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="tool-placeholder">
            {names.length
              ? "Bấm nút để xem kết quả."
              : "Nhập danh sách tên, mỗi dòng một tên."}
          </p>
        )}
      </section>
    </div>
  );
}
