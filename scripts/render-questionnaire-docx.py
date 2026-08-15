#!/usr/bin/env python3
"""Render a locale- and version-specific readiness catalog to DOCX."""

import argparse
import json
import subprocess
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


COPY = {
    "ko": {
        "title": "글로벌 진출 준비도 진단 설문",
        "subtitle": "창업자 작성용 · {count}문항 · v{version}",
        "info": ["회사명", "작성자 · 직책", "작성일", "목표 국가", "주요 제품·서비스"],
        "guide": "작성 안내",
        "instructions": [
            "각 문항은 지금 상태에 가장 가까운 보기 하나를 고르시면 됩니다. 아직 하지 않은 것을 고르셔도 불이익은 없습니다.",
            "①은 ‘그 부분까지 생각해보지 못했다’, ②는 ‘필요한 줄은 알지만 아직 못 했다’, ③은 ‘실제로 해봤다’, ④는 ‘반복됐거나 외부에서 확인받았다’는 뜻입니다.",
            "③이나 ④를 고르신 문항만 아래 칸에 간단히 적어주세요. ①·②를 고르신 문항은 비워두셔도 됩니다.",
            "계약서, 고객명부, 재무자료 원본은 제출하지 않으셔도 됩니다. 고객사 이름은 ‘고객 A’처럼 익명으로 적으셔도 됩니다.",
            "각 단계의 문항에서 배점 기준 80% 이상이 ③ 또는 ④이면 그 단계를 통과한 것으로 봅니다.",
        ],
        "follow_up": "③·④를 고르셨다면",
        "done": "문항",
    },
    "en": {
        "title": "Global Market Entry Readiness Assessment",
        "subtitle": "Founder Workbook · {count} Questions · v{version}",
        "info": ["Company", "Founder · Role", "Date", "Target Country", "Primary Product or Service"],
        "guide": "How to Complete This Assessment",
        "instructions": [
            "Choose the option that best reflects where you are today. There is no penalty for selecting work you have not started.",
            "① means ‘not considered yet,’ ② ‘recognized or planned,’ ③ ‘executed with an example,’ and ④ ‘repeated or externally validated.’",
            "For answers ③ or ④, add a brief note in the space provided. You may leave the space blank for answers ① and ②.",
            "Do not submit original contracts, customer lists, or financial records. You may anonymize customer names, for example as ‘Customer A.’",
            "A stage passes when at least 80% of its weighted score is rated ③ or ④ and no critical prerequisite remains unresolved.",
        ],
        "follow_up": "If you selected ③ or ④",
        "done": "questions",
    },
}
FONT = "Arial Unicode MS"


def set_cell_shading(cell, fill):
    shading = OxmlElement("w:shd")
    shading.set(qn("w:fill"), fill)
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_margins(cell, value=100):
    margins = cell._tc.get_or_add_tcPr().first_child_found_in("w:tcMar")
    if margins is None:
        margins = OxmlElement("w:tcMar")
        cell._tc.get_or_add_tcPr().append(margins)
    for side in ("top", "left", "bottom", "right"):
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")
        margins.append(node)


def add_text(paragraph, text, *, size=10, bold=False, italic=False, color=None):
    run = paragraph.add_run(text)
    run.font.name = FONT
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    if any("가" <= char <= "힣" for char in text):
        language = OxmlElement("w:lang")
        language.set(qn("w:val"), "ko-KR")
        language.set(qn("w:eastAsia"), "ko-KR")
        run._element.rPr.append(language)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    return run


def add_paragraph(doc, text="", *, size=10, bold=False, italic=False, color=None, before=0, after=6, align=None):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    if align is not None:
        paragraph.alignment = align
    add_text(paragraph, text, size=size, bold=bold, italic=italic, color=color)
    return paragraph


def load_catalog(root, locale, version, node):
    command = [node, str(root / "scripts/build-questionnaire-docx.js"), "--json", "--locale", locale, "--version", version]
    return json.loads(subprocess.run(command, cwd=root, check=True, capture_output=True, text=True).stdout)


def render(output, locale, version, node):
    root = Path(__file__).resolve().parents[1]
    catalog = load_catalog(root, locale, version, node)
    copy = COPY[locale]
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.55)
    section.bottom_margin = Inches(0.55)
    section.left_margin = Inches(0.65)
    section.right_margin = Inches(0.65)

    add_paragraph(doc, copy["title"], size=22, bold=True, after=4, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_paragraph(doc, copy["subtitle"].format(count=len(catalog["questions"]), version=version), color="666666", after=18, align=WD_ALIGN_PARAGRAPH.CENTER)

    info = doc.add_table(rows=0, cols=2)
    info.alignment = WD_TABLE_ALIGNMENT.CENTER
    info.autofit = False
    for label in copy["info"]:
        row = info.add_row()
        row.cells[0].width = Inches(1.6)
        row.cells[1].width = Inches(5.5)
        set_cell_shading(row.cells[0], "F2F2F2")
        for cell in row.cells:
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        add_text(row.cells[0].paragraphs[0], label, bold=True)
        add_text(row.cells[1].paragraphs[0], "")

    add_paragraph(doc, copy["guide"], size=13, bold=True, before=14, after=6)
    for instruction in copy["instructions"]:
        add_paragraph(doc, f"• {instruction}", after=3)

    items_by_stage = {}
    for item in catalog["items"]:
        items_by_stage.setdefault(item["stageId"], []).append(item)
    questions_by_item = {}
    for question in catalog["questions"]:
        questions_by_item.setdefault(question["itemId"], []).append(question)

    q_no = 0
    for stage in catalog["stages"]:
        heading = add_paragraph(doc, stage["label"], size=17, bold=True, after=4)
        heading.paragraph_format.keep_with_next = True
        add_paragraph(doc, stage["intro"], color="666666", after=12)
        for item in items_by_stage.get(stage["id"], []):
            add_paragraph(doc, item["label"], size=13, bold=True, before=8, after=5)
            for question in questions_by_item.get(item["id"], []):
                q_no += 1
                paragraph = add_paragraph(doc, before=7, after=4)
                critical = "★ " if question.get("critical") else ""
                add_text(paragraph, f"Q{q_no}. {critical}", size=10.5, bold=True)
                add_text(paragraph, question["question"], size=10.5)
                for index, option in enumerate(question["options"]):
                    option_paragraph = add_paragraph(doc, f"☐ {'①②③④'[index]} {option}", after=2)
                    option_paragraph.paragraph_format.left_indent = Inches(0.2)
                add_paragraph(doc, f'{copy["follow_up"]} — {question["followUp"]}', size=9, italic=True, color="666666", before=3, after=3)
                box = doc.add_table(rows=1, cols=1)
                box.alignment = WD_TABLE_ALIGNMENT.CENTER
                set_cell_margins(box.cell(0, 0), 120)
                add_text(box.cell(0, 0).paragraphs[0], "\n")

    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output)
    print(f"{output} — {q_no} {copy['done']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("locale", choices=("ko", "en"))
    parser.add_argument("--version", choices=("4.0", "5.0"), default="4.0")
    parser.add_argument("--node", default="node")
    args = parser.parse_args()
    render(args.output, args.locale, args.version, args.node)
