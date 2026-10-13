"use client";

import { SwapOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input } from "antd";
import { useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import {
  applyLineOperation,
  countLines,
  type LineOperation,
} from "@/lib/tools/line-tools";

interface Applied {
  output: string;
  steps: string[];
}

export function LineToolsTool() {
  const [input, setInput] = useState("");
  // Operations stack on the current output; editing the input starts over.
  const [applied, setApplied] = useState<Applied | null>(null);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  const output = applied?.output ?? "";
  const apply = (operation: LineOperation, label: string) =>
    setApplied((current) => ({
      output: applyLineOperation(current?.output ?? input, operation),
      steps: [...(current?.steps ?? []), label],
    }));

  const actions: Array<{ label: string; detail: string; operation: () => LineOperation }> = [
    { label: "Sắp xếp A → Z", detail: "a, ă, â, b…", operation: () => ({ type: "sort", direction: "asc" }) },
    { label: "Sắp xếp Z → A", detail: "y, x, v…", operation: () => ({ type: "sort", direction: "desc" }) },
    {
      label: "Bỏ dòng trùng",
      detail: "giữ dòng đầu",
      operation: () => ({ type: "dedupe", caseSensitive: !ignoreCase }),
    },
    { label: "Đảo thứ tự", detail: "dưới lên trên", operation: () => ({ type: "reverse" }) },
    { label: "Xáo trộn", detail: "ngẫu nhiên", operation: () => ({ type: "shuffle" }) },
    { label: "Bỏ dòng trống", detail: "", operation: () => ({ type: "removeEmpty" }) },
    { label: "Cắt khoảng trắng", detail: "đầu & cuối dòng", operation: () => ({ type: "trim" }) },
  ];

  return (
    <div className="tool-columns">
      <section className="tool-column">
        <header className="tool-column-heading">
          Input <span>{countLines(input)} dòng</span>
        </header>
        <Input.TextArea
          className="tool-textarea"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setApplied(null);
          }}
          placeholder={"Mỗi dòng một mục, ví dụ:\ncam\ntáo\ncam\nchuối"}
          aria-label="Văn bản đầu vào, mỗi dòng một mục"
        />
      </section>

      <section className="tool-column">
        <header className="tool-column-heading">Thao tác</header>
        <div className="line-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="line-action"
              disabled={!input}
              onClick={() => apply(action.operation(), action.label)}
            >
              <span>{action.label}</span>
              {action.detail ? <small>{action.detail}</small> : null}
            </button>
          ))}
          <Checkbox checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)}>
            Bỏ trùng không phân biệt hoa thường
          </Checkbox>
          <div className="line-affix">
            <Input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              placeholder="Tiền tố, vd: {n}. "
              aria-label="Tiền tố"
            />
            <Input
              value={suffix}
              onChange={(event) => setSuffix(event.target.value)}
              placeholder="Hậu tố, vd: ,"
              aria-label="Hậu tố"
            />
            <Button
              disabled={!input || (!prefix && !suffix)}
              onClick={() => apply({ type: "affix", prefix, suffix }, "Thêm tiền tố/hậu tố")}
            >
              Thêm vào mỗi dòng
            </Button>
            <small>
              <code>{"{n}"}</code> là số thứ tự dòng.
            </small>
          </div>
        </div>
      </section>

      <section className="tool-column">
        <header className="tool-column-heading">
          Output
          {applied ? (
            <span>
              {countLines(input)} dòng → {countLines(output)} dòng
            </span>
          ) : null}
        </header>
        {applied ? (
          <>
            <ol className="line-steps" aria-label="Các bước đã áp dụng">
              {applied.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            <Input.TextArea className="tool-textarea" value={output} readOnly aria-label="Kết quả" />
            <div className="tool-actions">
              <CopyButton text={output} />
              <Button
                icon={<SwapOutlined />}
                onClick={() => {
                  setInput(output);
                  setApplied(null);
                }}
              >
                Dùng làm input
              </Button>
              <Button onClick={() => setApplied(null)}>Đặt lại</Button>
            </div>
          </>
        ) : (
          <p className="tool-placeholder">
            {input
              ? "Chọn một thao tác. Có thể bấm nhiều thao tác nối tiếp nhau."
              : "Nhập văn bản vào ô Input, mỗi dòng một mục."}
          </p>
        )}
      </section>
    </div>
  );
}
