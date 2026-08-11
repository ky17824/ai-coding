/**
 * lib/intake-questions.ts 에서 창업자 설문지 docx를 만든다.
 *
 *   node scripts/build-questionnaire-docx.js "docs/해외진출 준비도 진단 설문 55문항.docx"
 *
 * `docx` 패키지가 프로젝트에 없으면 전역 설치본을 쓴다.
 *   NODE_PATH=$(npm root -g) node scripts/build-questionnaire-docx.js <출력경로>
 * 둘 다 없으면 `npm i -D docx`.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle
} = require("docx");

const out = process.argv[2];
if (!out) throw new Error("출력 경로를 인자로 주세요.");

const root = path.resolve(__dirname, "..");
const bundle = path.join(os.tmpdir(), `intake-${process.pid}.cjs`);
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "lib/intake-questions.ts"),
  "--bundle", "--format=cjs", "--platform=node", `--outfile=${bundle}`
]);
const { INTAKE_STAGES, INTAKE_ITEMS, INTAKE_QUESTIONS } = require(bundle);
fs.unlinkSync(bundle);

const W = 9026;
const FONT = "Pretendard";
const GRAY = "595959";
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const CIRCLED = ["①", "②", "③", "④"];

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: opts.before ?? 0, after: opts.after ?? 100 },
    alignment: opts.align,
    indent: opts.indent,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        size: opts.size ?? 20,
        color: opts.color,
        font: FONT
      })
    ]
  });

const infoRow = (label) =>
  new TableRow({
    children: [
      new TableCell({
        width: { size: 2200, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [p(label, { bold: true, after: 0 })]
      }),
      new TableCell({
        width: { size: W - 2200, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [p("", { after: 0 })]
      })
    ]
  });

const answerBox = () =>
  new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: W, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [p("", { after: 0 }), p("", { after: 0 })]
          })
        ]
      })
    ]
  });

const children = [];

children.push(
  new Paragraph({
    spacing: { after: 120 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "해외진출 준비도 진단 설문", bold: true, size: 40, font: FONT })]
  }),
  p("창업자 작성용 · 55문항", { align: AlignmentType.CENTER, color: GRAY, after: 400 })
);

children.push(
  new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [2200, W - 2200],
    rows: [infoRow("회사명"), infoRow("작성자 · 직책"), infoRow("작성일"), infoRow("목표 국가"), infoRow("주요 제품 · 서비스")]
  }),
  p("", { after: 300 })
);

children.push(
  new Paragraph({
    spacing: { after: 120 },
    border: { bottom: LINE },
    children: [new TextRun({ text: "작성 안내", bold: true, size: 24, font: FONT })]
  }),
  p("· 각 문항은 지금 상태에 가장 가까운 보기 하나를 고르시면 됩니다. 아직 하지 않은 것을 고르셔도 불이익은 없습니다.", { after: 80 }),
  p("· ①은 «그 부분까지 생각해보지 못했다», ②는 «필요한 줄은 알지만 아직 못 했다», ③은 «실제로 해봤다», ④는 «반복됐거나 외부에서 확인받았다»는 뜻입니다.", { after: 80 }),
  p("· ③이나 ④를 고르신 문항만 아래 칸에 간단히 적어주세요. ①·②를 고르신 문항은 비워두셔도 됩니다.", { after: 80 }),
  p("· 계약서, 고객명부, 재무자료 원본은 제출하지 않으셔도 됩니다. 고객사 이름은 «고객 A»처럼 익명으로 적으셔도 됩니다.", { after: 80 }),
  p("· 각 단계의 문항에서 배점 기준 80% 이상이 ③ 또는 ④이면 그 단계를 통과한 것으로 봅니다.", { after: 400 })
);

let qNo = 0;
for (const stage of INTAKE_STAGES) {
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
      children: [new TextRun({ text: `${stage.label} 단계`, bold: true, size: 30, font: FONT })]
    }),
    p(stage.intro, { color: GRAY, after: 300 })
  );

  for (const item of INTAKE_ITEMS.filter((i) => i.stageId === stage.id)) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 160 },
        border: { bottom: LINE },
        children: [new TextRun({ text: item.label, bold: true, size: 24, font: FONT })]
      })
    );

    for (const q of INTAKE_QUESTIONS.filter((x) => x.itemId === item.id)) {
      qNo += 1;
      children.push(
        new Paragraph({
          spacing: { before: 220, after: 80 },
          children: [
            new TextRun({ text: `Q${qNo}. `, bold: true, size: 21, font: FONT }),
            new TextRun({ text: q.question, size: 21, font: FONT })
          ]
        })
      );
      q.options.forEach((option, index) => {
        children.push(
          p(`☐ ${CIRCLED[index]} ${option}`, { indent: { left: 280 }, after: 40 })
        );
      });
      children.push(
        p(`③·④를 고르셨다면 — ${q.followUp}`, {
          before: 60,
          italics: true,
          color: GRAY,
          size: 18,
          after: 80
        }),
        answerBox(),
        p("", { after: 0 })
      );
    }
  }
}

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  sections: [{ children }]
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log(`${out} — ${qNo}문항`);
});
