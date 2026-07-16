from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = "/Users/adrianrabang/my-first-app/output/pdf/RemyNest-TestFlight-Build-19-Checklist.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 16 * mm
MARGIN_TOP = 17 * mm
MARGIN_BOTTOM = 16 * mm

INK = colors.HexColor("#1B1630")
PURPLE = colors.HexColor("#34205F")
PURPLE_MID = colors.HexColor("#6B428E")
GOLD = colors.HexColor("#E6B945")
SAND = colors.HexColor("#F8F2E8")
LAVENDER = colors.HexColor("#EEE8F5")
MUTED = colors.HexColor("#625C70")
LINE = colors.HexColor("#DCD5E6")
GREEN = colors.HexColor("#2F6E59")
RED = colors.HexColor("#A44A4A")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.4)
    canvas.line(MARGIN_X, 11 * mm, PAGE_WIDTH - MARGIN_X, 11 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN_X, 7 * mm, "RemyNest - TestFlight Build 19 device acceptance")
    canvas.drawRightString(PAGE_WIDTH - MARGIN_X, 7 * mm, f"Page {doc.page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=27, leading=32, textColor=INK, alignment=TA_CENTER, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="CoverSub", parent=styles["Normal"], fontName="Helvetica",
    fontSize=11.5, leading=16, textColor=MUTED, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=15, leading=19, textColor=PURPLE, spaceBefore=4, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="Body", parent=styles["Normal"], fontName="Helvetica",
    fontSize=9.4, leading=13, textColor=INK,
))
styles.add(ParagraphStyle(
    name="Small", parent=styles["Normal"], fontName="Helvetica",
    fontSize=8.1, leading=10.5, textColor=MUTED,
))
styles.add(ParagraphStyle(
    name="Cell", parent=styles["Normal"], fontName="Helvetica",
    fontSize=8.7, leading=11.5, textColor=INK,
))
styles.add(ParagraphStyle(
    name="CellMuted", parent=styles["Normal"], fontName="Helvetica",
    fontSize=8.1, leading=10.3, textColor=MUTED,
))


def p(text, style="Cell"):
    return Paragraph(text, styles[style])


def metadata_table():
    rows = [
        [p("<b>Tester</b>"), "", p("<b>Device</b>"), ""],
        [p("<b>iOS version</b>"), "", p("<b>Date / time</b>"), ""],
        [p("<b>Network</b>"), p("Wi-Fi / Cellular"), p("<b>Build</b>"), p("1.0 (19)")],
    ]
    table = Table(rows, colWidths=[28 * mm, 60 * mm, 30 * mm, 54 * mm], rowHeights=[9 * mm] * 3)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 0), (0, -1), SAND),
        ("BACKGROUND", (2, 0), (2, -1), SAND),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return table


def section(title, intro, checks):
    items = [[p("Check", "CellMuted"), p("Pass criteria", "CellMuted"), p("Result / notes", "CellMuted")]]
    for check, criterion in checks:
        items.append([p("[ ] " + check), p(criterion), ""])
    table = Table(items, colWidths=[53 * mm, 76 * mm, 43 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LAVENDER),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.6 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.6 * mm),
    ]))
    return KeepTogether([
        Paragraph(title, styles["Section"]),
        Paragraph(intro, styles["Small"]),
        Spacer(1, 3.5 * mm),
        table,
        Spacer(1, 6 * mm),
    ])


def signoff():
    rows = [
        [p("<b>Release decision</b>"), p("[ ] Pass - ready for App Store screenshots and submission<br/>[ ] Hold - issue(s) logged below")],
        [p("<b>Critical issue found?</b>"), p("[ ] No<br/>[ ] Yes - do not proceed; include a screenshot and reproduction steps")],
        [p("<b>Tester sign-off</b>"), ""],
    ]
    table = Table(rows, colWidths=[48 * mm, 124 * mm], rowHeights=[16 * mm, 16 * mm, 17 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 0), (0, -1), SAND),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return table


def build_pdf():
    doc = BaseDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
    )
    frame = Frame(MARGIN_X, MARGIN_BOTTOM, PAGE_WIDTH - 2 * MARGIN_X, PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM, id="body")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=footer)])

    story = []
    story += [Spacer(1, 19 * mm)]
    story += [Paragraph("RemyNest", styles["CoverTitle"])]
    story += [Paragraph("TestFlight Build 19 - Device Acceptance Checklist", styles["CoverSub"])]
    story += [Spacer(1, 7 * mm)]
    banner = Table([[p("<b>Purpose:</b> confirm this TestFlight candidate is safe and ready for App Store screenshots and submission. Test on a real iPhone; record any issue before continuing.", "Body")]], colWidths=[172 * mm])
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SAND),
        ("BOX", (0, 0), (-1, -1), 0.7, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
    ]))
    story += [banner, Spacer(1, 9 * mm), metadata_table(), Spacer(1, 10 * mm)]
    story += [Paragraph("How to use this checklist", styles["Section"])]
    story += [Paragraph("Work top to bottom. Mark each item only after you have performed it. A crash, broken login, missing private media, failed upload, failed notification, or unsafe disclosure is a release hold.", styles["Body"])]
    story += [Spacer(1, 7 * mm)]
    story += [Paragraph("Issue capture", styles["Section"])]
    story += [Paragraph("For every defect, capture a screenshot or screen recording and note: route, device, network, exact steps, expected result, actual result, and whether it reproduces after relaunch.", styles["Body"])]
    story += [Spacer(1, 12 * mm)]
    story += [Paragraph("Gate 1 - Native shell and account access", styles["Section"])]
    story += [Paragraph("Complete these first. Do not spend time testing deeper flows if this gate fails.", styles["Small"])]
    story += [Spacer(1, 3 * mm)]
    story += [p("[ ] Installed Build 19 from TestFlight and launched from the Home Screen.", "Body"), Spacer(1, 2 * mm)]
    story += [p("[ ] Purple warm-glow icon and sand splash look correct; no stretch, flash, or blank screen.", "Body"), Spacer(1, 2 * mm)]
    story += [p("[ ] Sign in succeeds; sign out and back in shows only the current account's content.", "Body")]
    story += [PageBreak()]

    story += [section("1. Native shell and navigation", "Confirm the iOS wrapper feels stable before testing content.", [
        ("Cold launch and relaunch", "Launch from the Home Screen, then relaunch from the app switcher. No crash, blank screen, or long stuck loader."),
        ("Icon and splash", "Purple fingerprint-heart-bird icon is crisp; warm sand splash displays without a visual glitch."),
        ("Safe areas", "On a notched iPhone, no controls or text sit under the notch, Dynamic Island, or home indicator."),
        ("Core navigation", "Visit Home, Memories, Timeline, Reminders, Library/Activities, and Settings. Back navigation and scrolling work."),
        ("Menus and Nest", "Open More drawer, profile menu, and Nest. Close each normally; no frozen overlay, clipped sheet, or trapped scroll."),
        ("Shared-device sign-out", "After signing out and back in, no previous user's memories or profile details flash on screen."),
    ])]
    story += [section("2. Memories and private media", "Use disposable test content. Confirm core creation and private-media delivery on the device.", [
        ("Text memory", "Create a text-only memory. It appears in the feed and opens with the saved content."),
        ("Photo memory", "Create a memory with one or more photos. Upload completes; thumbnail, detail view, and full-screen viewing all work."),
        ("Edit and delete", "Edit a test memory and delete it. The feed updates correctly; no stale duplicate or misleading empty state."),
        ("Network sanity", "If practical, view an existing private image once on Wi-Fi and once on cellular. Images load without exposing an error."),
    ])]
    story += [PageBreak()]

    story += [section("3. Voice memory and Remy", "These checks cover the newly declared microphone use and key interactive surfaces.", [
        ("Microphone permission", "Start a voice memory. Permission wording is clear and relevant; deny/retry behavior is calm if tested."),
        ("Record and save", "Record a short clip, stop, listen back, and save it as a memory. No stuck recording indicator remains."),
        ("Playback", "Open the saved memory and play the clip through the standard audio control. No autoplay or silent failure."),
        ("Discard and re-record", "Discard once or re-record once. Microphone releases and the form remains usable."),
        ("Ask Remy", "Open Ask Remy and send one harmless test prompt. Composer is unobstructed and a response renders."),
        ("Nest interaction", "Idle Nest opens to Remy and the six-action violet sheet. It fits the screen and closes normally."),
    ])]
    story += [section("4. Reminders and notifications", "Test both device-local reminders and the OneSignal delivery path.", [
        ("Local reminder - locked", "Create a reminder due in a few minutes, lock the phone, and confirm the notification arrives."),
        ("Local reminder - foreground", "With the app open, confirm the near-term reminder presents visibly/audibly."),
        ("Recurring completion", "Mark one recurring reminder 'Done for today'. It advances once only; it does not create duplicates or skip an extra occurrence."),
        ("OneSignal test push", "Send a test push from the OneSignal dashboard. It arrives; tapping it opens the app normally."),
    ])]
    story += [PageBreak()]

    story += [section("5. Final journey and release decision", "Complete only after every prior gate has passed.", [
        ("Activities", "Open one Activity, perform a simple action if applicable, then return. No blank screen or broken route."),
        ("Care workspace", "If available for this account, switch to a care profile. Data remains correctly isolated from My Nest."),
        ("Failure scan", "No crash, blocked login, broken upload, missing media, notification failure, or major visual regression observed."),
        ("Evidence", "Screenshots or recordings exist for every issue, with route and reproduction notes."),
        ("Submission readiness", "All critical checks pass. This build is suitable for App Store screenshots and the submission package."),
    ])]
    story += [Paragraph("Issue log", styles["Section"])]
    issue_rows = [[p("Issue / steps to reproduce", "CellMuted"), p("Expected vs actual", "CellMuted"), p("Evidence / severity", "CellMuted")]]
    for _ in range(3):
        issue_rows.append(["", "", ""])
    issues = Table(issue_rows, colWidths=[68 * mm, 62 * mm, 42 * mm], rowHeights=[8 * mm] + [13 * mm] * 3, repeatRows=1)
    issues.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LAVENDER),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
    ]))
    story += [issues, Spacer(1, 7 * mm), signoff()]
    doc.build(story)


if __name__ == "__main__":
    build_pdf()
