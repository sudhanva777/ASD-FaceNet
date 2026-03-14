import os
import uuid
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.config import settings
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.report import ReportRequest

REPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "reports"


def generate_report(
    report_data: ReportRequest,
    prediction: Prediction,
    user: User,
) -> str:
    """Generate a PDF screening report and return its file path."""
    os.makedirs(REPORTS_DIR, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"report_{report_data.prediction_id}_{timestamp}.pdf"
    filepath = str(REPORTS_DIR / filename)

    report_id = str(uuid.uuid4()).upper()
    generated_at = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

    doc = SimpleDocTemplate(
        filepath,
        pagesize=LETTER,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22,
        spaceAfter=4,
        textColor=colors.HexColor("#1a3a5c"),
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=10,
        spaceAfter=2,
        textColor=colors.HexColor("#555555"),
        fontName="Helvetica",
        alignment=TA_CENTER,
    )
    section_header_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Normal"],
        fontSize=11,
        spaceBefore=14,
        spaceAfter=6,
        textColor=colors.HexColor("#1a3a5c"),
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#333333"),
        fontName="Helvetica",
    )
    img_label_style = ParagraphStyle(
        "ImgLabel",
        parent=styles["Normal"],
        fontSize=9,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#333333"),
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#440000"),
        fontName="Helvetica-Bold",
    )
    notes_style = ParagraphStyle(
        "Notes",
        parent=styles["Normal"],
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#333333"),
        fontName="Helvetica",
    )

    elements = []

    # ── Header ──────────────────────────────────────────────────────────
    elements.append(Paragraph("ASD-FaceNet Screening Report", title_style))
    elements.append(
        Paragraph(
            "AIEMS, Dept. of ISE — Final Year B.E. Project 2024-25",
            subtitle_style,
        )
    )
    elements.append(Spacer(1, 6))

    meta_table = Table(
        [
            [
                Paragraph(f"<b>Report ID:</b> {report_id}", body_style),
                Paragraph(f"<b>Generated:</b> {generated_at}", body_style),
            ]
        ],
        colWidths=[3.5 * inch, 3.5 * inch],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(meta_table)
    elements.append(
        HRFlowable(
            width="100%",
            thickness=1.5,
            color=colors.HexColor("#2a5a8a"),
            spaceAfter=10,
        )
    )

    # ── Subject Information ──────────────────────────────────────────────
    elements.append(Paragraph("SUBJECT INFORMATION", section_header_style))
    subject_table = Table(
        [
            [
                Paragraph("<b>Name</b>", body_style),
                Paragraph(report_data.subject_name, body_style),
                Paragraph("<b>Age</b>", body_style),
                Paragraph(str(report_data.subject_age), body_style),
            ],
            [
                Paragraph("<b>Gender</b>", body_style),
                Paragraph(report_data.subject_gender, body_style),
                Paragraph("", body_style),
                Paragraph("", body_style),
            ],
        ],
        colWidths=[1.1 * inch, 2.4 * inch, 1.1 * inch, 2.4 * inch],
    )
    subject_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef4fb")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#eef4fb")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8d8e8")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    elements.append(subject_table)

    # ── Screening Information ────────────────────────────────────────────
    elements.append(Paragraph("SCREENING INFORMATION", section_header_style))
    tester_designation = report_data.tester_designation or "—"
    date_of_screening = (
        prediction.created_at.strftime("%B %d, %Y")
        if prediction.created_at
        else "—"
    )
    screening_table = Table(
        [
            [
                Paragraph("<b>Purpose</b>", body_style),
                Paragraph(report_data.screening_purpose, body_style),
                Paragraph("<b>Tester Name</b>", body_style),
                Paragraph(report_data.tester_name, body_style),
            ],
            [
                Paragraph("<b>Designation</b>", body_style),
                Paragraph(tester_designation, body_style),
                Paragraph("<b>Date</b>", body_style),
                Paragraph(date_of_screening, body_style),
            ],
        ],
        colWidths=[1.1 * inch, 2.4 * inch, 1.1 * inch, 2.4 * inch],
    )
    screening_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef4fb")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#eef4fb")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8d8e8")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    elements.append(screening_table)

    # ── Prediction Results ───────────────────────────────────────────────
    elements.append(Paragraph("PREDICTION RESULTS", section_header_style))

    is_asd = prediction.label == "ASD"
    label_color = colors.HexColor("#cc3300") if is_asd else colors.HexColor("#006633")
    label_bg = (
        colors.HexColor("#fff0ee") if is_asd else colors.HexColor("#eefff5")
    )
    bar_color_hex = "#cc3300" if is_asd else "#006633"
    label_text = "ASD Detected" if is_asd else "Typically Developing (TD)"

    classification_style = ParagraphStyle(
        "Classification",
        parent=styles["Normal"],
        fontSize=14,
        fontName="Helvetica-Bold",
        textColor=label_color,
        alignment=TA_CENTER,
    )

    confidence_pct = round(prediction.confidence * 100, 1)
    asd_prob_pct = round(prediction.asd_probability * 100, 1)

    results_table = Table(
        [
            [
                Paragraph("<b>Classification</b>", body_style),
                Paragraph(f"<b>{label_text}</b>", classification_style),
            ],
            [
                Paragraph("<b>Confidence Score</b>", body_style),
                Paragraph(f"<b>{confidence_pct}%</b>", body_style),
            ],
            [
                Paragraph("<b>ASD Probability</b>", body_style),
                Paragraph(f"{asd_prob_pct}%", body_style),
            ],
            [
                Paragraph("<b>Model</b>", body_style),
                Paragraph("EfficientNet-B0 (ONNX Runtime)", body_style),
            ],
        ],
        colWidths=[1.8 * inch, 5.2 * inch],
    )
    results_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef4fb")),
                ("BACKGROUND", (1, 0), (1, 0), label_bg),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8d8e8")),
                ("PADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    elements.append(results_table)

    # Confidence bar (visual)
    elements.append(Spacer(1, 6))
    bar_width_total = 7.0 * inch
    filled_w = bar_width_total * prediction.confidence
    empty_w = bar_width_total * (1.0 - prediction.confidence)

    if empty_w < 1:  # less than 1 pt — treat as fully filled
        bar_visual = Table([[""]], colWidths=[bar_width_total], rowHeights=[12])
        bar_visual.setStyle(
            TableStyle(
                [("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bar_color_hex))]
            )
        )
    else:
        bar_visual = Table(
            [["", ""]],
            colWidths=[filled_w, empty_w],
            rowHeights=[12],
        )
        bar_visual.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (0, 0),
                        colors.HexColor(bar_color_hex),
                    ),
                    ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#dddddd")),
                    ("GRID", (0, 0), (-1, -1), 0, colors.white),
                ]
            )
        )
    elements.append(bar_visual)
    elements.append(
        Paragraph(
            f"<i>Confidence bar — {confidence_pct}% certainty</i>",
            ParagraphStyle(
                "BarCaption",
                parent=styles["Normal"],
                fontSize=8,
                textColor=colors.HexColor("#888888"),
                spaceBefore=3,
            ),
        )
    )
    elements.append(Spacer(1, 8))

    # ── Images Section ───────────────────────────────────────────────────
    elements.append(Paragraph("IMAGES", section_header_style))

    orig_path = os.path.join(settings.UPLOAD_DIR, prediction.original_image)
    grad_path = (
        os.path.join(settings.GRADCAM_DIR, prediction.gradcam_image)
        if prediction.gradcam_image
        else None
    )

    img_w = 3.0 * inch
    img_h = 2.5 * inch

    def _make_img_cell(path):
        if path and os.path.exists(path):
            return RLImage(path, width=img_w, height=img_h)
        return Paragraph("[Image not available]", body_style)

    orig_cell = _make_img_cell(orig_path)
    grad_cell = _make_img_cell(grad_path)

    images_table = Table(
        [
            [
                Paragraph("Original Image", img_label_style),
                Paragraph("Grad-CAM Heatmap", img_label_style),
            ],
            [orig_cell, grad_cell],
        ],
        colWidths=[3.5 * inch, 3.5 * inch],
    )
    images_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 8),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8d8e8")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8d8e8")),
                ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#eef4fb")),
            ]
        )
    )
    elements.append(images_table)
    elements.append(Spacer(1, 10))

    # ── Interpretation Notes ──────────────────────────────────────────────
    elements.append(Paragraph("INTERPRETATION NOTES", section_header_style))
    elements.append(
        Paragraph(
            "A classification of ASD indicates facial features consistent with patterns identified in the "
            "training dataset. Confidence score represents model certainty. Higher scores indicate stronger "
            "pattern match.",
            notes_style,
        )
    )
    elements.append(Spacer(1, 6))
    elements.append(
        Paragraph(
            "Grad-CAM heatmap highlights facial regions that most influenced the model's decision. "
            "Warmer colors (red) indicate higher activation regions.",
            notes_style,
        )
    )
    elements.append(Spacer(1, 12))

    # ── Disclaimer ────────────────────────────────────────────────────────
    elements.append(Paragraph("DISCLAIMER", section_header_style))
    disclaimer_box = Table(
        [
            [
                Paragraph(
                    "DISCLAIMER: This report is generated by ASD-FaceNet, a research prototype developed "
                    "for academic purposes. It is NOT a medical diagnosis. Results must be interpreted by "
                    "qualified healthcare professionals using validated clinical instruments such as ADOS-2 "
                    "and ADI-R. This tool should never be used as the sole basis for clinical decisions.",
                    disclaimer_style,
                )
            ]
        ],
        colWidths=[7.0 * inch],
    )
    disclaimer_box.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#cc3300")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff8f7")),
                ("PADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    elements.append(disclaimer_box)

    # ── Build ────────────────────────────────────────────────────────────
    def _add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#888888"))
        page_num = f"Page {doc.page}"
        canvas.drawString(0.75 * inch, 0.4 * inch, f"Generated by ASD-FaceNet v1.0  |  {generated_at}")
        canvas.drawRightString(
            LETTER[0] - 0.75 * inch, 0.4 * inch, page_num
        )
        canvas.restoreState()

    doc.build(elements, onFirstPage=_add_footer, onLaterPages=_add_footer)
    return filepath
