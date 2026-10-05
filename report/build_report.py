import math
from pathlib import Path
from textwrap import wrap

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "report" / "output" / "AYN_AL_SIJILL_Project_Report_Final.pdf"
TEAM_SCREENSHOT = ROOT / "report" / "assets" / "team-landing.png"
INCIDENT_IMAGE = ROOT / "report" / "assets" / "incident-evidence.png"

W, H = A4
M = 42

INK = colors.HexColor("#101820")
NAVY = colors.HexColor("#06141E")
NAVY_2 = colors.HexColor("#0E2230")
PAPER = colors.HexColor("#F7F4EC")
WHITE = colors.HexColor("#F5FAFC")
MUTED = colors.HexColor("#60717C")
RULE = colors.HexColor("#CFD8DA")
BLUE = colors.HexColor("#2BA7FF")
GREEN = colors.HexColor("#57D7A0")
RED = colors.HexColor("#FF6C56")
ORANGE = colors.HexColor("#C94800")
PALE_BLUE = colors.HexColor("#DCEBFA")
PALE_GREEN = colors.HexColor("#E0EEE2")
PALE_ORANGE = colors.HexColor("#F2DFC8")


def register_fonts():
    pdfmetrics.registerFont(TTFont("Body", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
    pdfmetrics.registerFont(TTFont("BodyBold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
    pdfmetrics.registerFont(TTFont("Mono", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"))


def text(c, value, x, y, size=10, font="Body", color=INK, leading=None):
    c.setFont(font, size)
    c.setFillColor(color)
    if leading is None:
        leading = size * 1.35
    for line in value.split("\n"):
        c.drawString(x, y, line)
        y -= leading
    return y


def paragraph(c, value, x, y, width, size=9.2, font="Body", color=INK, leading=None):
    if leading is None:
        leading = size * 1.45
    c.setFont(font, size)
    c.setFillColor(color)
    words = value.split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if c.stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            c.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def label(c, value, x, y, color=BLUE):
    c.setFillColor(color)
    c.setFont("Mono", 7.2)
    c.drawString(x, y, value.upper())


def footer(c, page, dark=False):
    color = colors.HexColor("#91A6B2") if dark else MUTED
    c.setStrokeColor(colors.HexColor("#27404E") if dark else RULE)
    c.setLineWidth(0.5)
    c.line(M, 28, W - M, 28)
    c.setFillColor(color)
    c.setFont("Body", 6.8)
    c.drawString(M, 16, "AYN AL-SIJILL  |  SDA Cloud Computing Bootcamp")
    c.drawRightString(W - M, 16, f"PROJECT REPORT  |  0{page}")


def rounded_box(c, x, y, width, height, fill, stroke=None, radius=8):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, y, width, height, radius, fill=1, stroke=1 if stroke else 0)


def metric(c, x, y, number, caption, color=BLUE):
    c.setFillColor(color)
    c.circle(x + 4, y + 15, 3, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("BodyBold", 15)
    c.drawString(x + 15, y + 8, number)
    c.setFillColor(colors.HexColor("#A8BAC3"))
    c.setFont("Body", 7.2)
    c.drawString(x + 15, y - 4, caption)


def page_one(c):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    label(c, "Azure observability and incident response", M, H - 48, GREEN)
    c.setFillColor(WHITE)
    c.setFont("BodyBold", 28)
    c.drawString(M, H - 86, "AYN AL-SIJILL")
    c.setFillColor(BLUE)
    c.circle(W - M - 10, H - 69, 8, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#B8DFFF"))
    c.setLineWidth(1)
    c.circle(W - M - 10, H - 69, 15, fill=0, stroke=1)

    c.setFillColor(WHITE)
    c.setFont("BodyBold", 22)
    c.drawString(M, H - 130, "Revenue can fail while")
    c.drawString(M, H - 159, "the dashboard still looks healthy.")
    paragraph(
        c,
        "AYN AL-SIJILL reveals failures hidden between payment, order, and inventory systems. It gives the business one clear view of what happened, why it happened, and where action is needed.",
        M,
        H - 189,
        325,
        9.2,
        color=colors.HexColor("#B8C9D1"),
        leading=13.2,
    )

    img = ImageReader(str(INCIDENT_IMAGE))
    image_y = 326
    image_h = 260
    c.drawImage(img, 0, image_y, width=W, height=image_h, preserveAspectRatio=False, mask="auto")
    c.setFillColor(colors.Color(0.02, 0.08, 0.12, alpha=0.16))
    c.rect(0, image_y, W, image_h, fill=1, stroke=0)

    rounded_box(c, M, 250, W - 2 * M, 62, NAVY_2, colors.HexColor("#27404E"), 10)
    label(c, "The business problem", M + 16, 295, RED)
    c.setFillColor(WHITE)
    c.setFont("BodyBold", 13)
    c.drawString(M + 16, 273, "The Ghost Order")
    paragraph(
        c,
        "A payment is authorized, but no order is created. This can lead to support cases, reversed authorizations, and lost customer trust. AYN AL-SIJILL connects the synthetic journey so teams can investigate the failure with context.",
        M + 150,
        293,
        W - 2 * M - 168,
        8.1,
        color=colors.HexColor("#B8C9D1"),
        leading=11.3,
    )

    label(c, "What the solution brings to the business", M, 224, GREEN)
    benefits = [
        ("01", "See hidden failures", "Find issues that ordinary success metrics can miss.", GREEN),
        ("02", "Understand the cause", "Connect the customer journey across every service.", BLUE),
        ("03", "Respond with context", "Give teams the evidence they need to act quickly.", RED),
        ("04", "Learn across patterns", "Use reporting data to reduce repeated incidents.", colors.HexColor("#E8C56B")),
    ]
    gap = 9
    box_w = (W - 2 * M - 3 * gap) / 4
    for i, (number, title, detail, color) in enumerate(benefits):
        x = M + i * (box_w + gap)
        rounded_box(c, x, 151, box_w, 60, NAVY_2, colors.HexColor("#27404E"), 7)
        c.setFillColor(color)
        c.setFont("Mono", 7)
        c.drawString(x + 10, 194, number)
        c.setFillColor(WHITE)
        c.setFont("BodyBold", 7.6)
        c.drawString(x + 10, 180, title)
        paragraph(c, detail, x + 10, 168, box_w - 20, 6.2, color=colors.HexColor("#A8BAC3"), leading=8.3)

    label(c, "The wider view", M, 126, BLUE)
    metric(c, M, 79, "Checkout", "SUCCESS AND FAILURE JOURNEYS", GREEN)
    metric(c, M + 160, 79, "Alerts", "IMMEDIATE INCIDENT CONTEXT", BLUE)
    metric(c, M + 305, 79, "Reports", "QUERYABLE REPORTING FOUNDATION", RED)
    paragraph(
        c,
        "The demonstration uses synthetic data. It shows how the same approach can protect real customer journeys when connected to production systems with the right governance and security controls.",
        M,
        56,
        W - 2 * M,
        7.4,
        color=colors.HexColor("#91A6B2"),
        leading=10,
    )
    footer(c, 1, dark=True)
    c.showPage()


def page_two(c):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    label(c, "Infrastructure and service stack", M, H - 45, ORANGE)
    c.setFillColor(INK)
    c.setFont("BodyBold", 25)
    c.drawString(M, H - 80, "Azure and the services we used.")
    paragraph(
        c,
        "AYN AL-SIJILL combines managed Azure services with a containerized observability stack. Each component has a focused role, from generating checkout journeys and protecting credentials to storing evidence, investigating incidents, and producing reports.",
        M,
        H - 107,
        W - 2 * M,
        8.9,
        color=MUTED,
        leading=12.6,
    )

    label(c, "Microsoft Azure", M, 684, BLUE)
    azure_services = [
        ("Azure Functions", "Runs the synthetic checkout API, scheduled journeys, incident logic, and reporting endpoints.", PALE_BLUE, BLUE),
        ("Azure Virtual Machine", "Hosts the Dockerized Caddy and Elastic services used for ingestion and investigation.", PALE_ORANGE, ORANGE),
        ("Azure SQL Database", "Stores a structured reporting copy of operational events for later analysis.", PALE_GREEN, GREEN),
        ("Azure Key Vault", "Protects runtime secrets and the optional Telegram bot credentials.", colors.HexColor("#F2D9D6"), RED),
        ("Azure Blob Storage", "Stores remote Terraform state and supports state locking during infrastructure changes.", PALE_BLUE, BLUE),
        ("Azure Logic Apps", "Starts the observability VM every day at 09:00 Riyadh time.", PALE_ORANGE, ORANGE),
        ("VM Auto-shutdown", "Deallocates the VM at 23:00 Riyadh time to control demo operating costs.", PALE_GREEN, GREEN),
        ("Azure networking", "Allows public HTTPS while keeping SSH, Elasticsearch, Kibana, and Logstash data ports private.", colors.HexColor("#F2D9D6"), RED),
    ]
    card_gap = 10
    card_w = (W - 2 * M - card_gap) / 2
    card_h = 70
    for i, (title, detail, fill, accent) in enumerate(azure_services):
        col = i % 2
        row = i // 2
        x = M + col * (card_w + card_gap)
        y = 598 - row * (card_h + 8)
        rounded_box(c, x, y, card_w, card_h, fill, None, 10)
        c.setFillColor(accent)
        c.circle(x + 16, y + 49, 4, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("BodyBold", 9)
        c.drawString(x + 28, y + 45, title)
        paragraph(c, detail, x + 16, y + 29, card_w - 32, 6.7, color=MUTED, leading=9.2)

    label(c, "Observability services on the VM", M, 274, ORANGE)
    vm_services = [
        ("Caddy", "HTTPS and routing"),
        ("Logstash", "Event processing"),
        ("Elasticsearch", "Evidence storage"),
        ("Kibana", "Investigation views"),
        ("Filebeat", "Linux and Docker logs"),
    ]
    vm_gap = 8
    vm_w = (W - 2 * M - 4 * vm_gap) / 5
    fills = [PALE_ORANGE, PALE_GREEN, PALE_BLUE, colors.HexColor("#F2D9D6"), PALE_GREEN]
    for i, ((title, detail), fill) in enumerate(zip(vm_services, fills)):
        x = M + i * (vm_w + vm_gap)
        rounded_box(c, x, 198, vm_w, 58, fill, None, 7)
        c.setFillColor(INK)
        c.setFont("BodyBold", 7.2)
        c.drawString(x + 9, 236, title)
        paragraph(c, detail, x + 9, 220, vm_w - 18, 5.9, color=MUTED, leading=8)

    label(c, "Provisioning, delivery, and response", M, 170, BLUE)
    delivery = [
        ("GitHub Actions", "Defines validation and optional OIDC deployment."),
        ("Terraform", "Provisions Azure resources and keeps the environment repeatable."),
        ("Cloud-init + Docker Compose", "Prepares the VM and runs the service stack."),
        ("Bash validation", "Configures, validates, and seeds historical journeys."),
        ("Telegram Bot API", "Sends alerts for failed checkout scenarios."),
    ]
    delivery_w = (W - 2 * M - 4 * 7) / 5
    for i, (title, detail) in enumerate(delivery):
        x = M + i * (delivery_w + 7)
        rounded_box(c, x, 83, delivery_w, 70, colors.white, RULE, 7)
        c.setFillColor(INK)
        c.setFont("BodyBold", 6.1)
        title_lines = wrap(title, 19)
        for line_i, line in enumerate(title_lines):
            c.drawString(x + 10, 134 - line_i * 7.5, line)
        detail_y = 118 - max(0, len(title_lines) - 1) * 7.5
        paragraph(c, detail, x + 10, detail_y, delivery_w - 20, 5.4, color=MUTED, leading=7.4)
    footer(c, 2)
    c.showPage()


def clipped_image(c, path, x, y, width, height):
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = max(width / iw, height / ih)
    draw_w = iw * scale
    draw_h = ih * scale
    p = c.beginPath()
    p.roundRect(x, y, width, height, 10)
    c.saveState()
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(image, x + (width - draw_w) / 2, y + (height - draw_h) / 2, draw_w, draw_h, mask="auto")
    c.restoreState()


def team_person(c, x, y, initial, name, discipline, fill):
    c.setFillColor(fill)
    c.circle(x + 12, y + 12, 12, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("BodyBold", 8)
    c.drawCentredString(x + 12, y + 9, initial)
    c.setFont("BodyBold", 8.2)
    c.drawString(x + 31, y + 15, name)
    c.setFillColor(MUTED)
    c.setFont("Body", 6.3)
    c.drawString(x + 31, y + 4, discipline)


def draw_qr(c, url, x, y, size):
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    qr_width = bounds[2] - bounds[0]
    qr_height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / qr_width, 0, 0, size / qr_height, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, c, x, y)


def page_three(c):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    asset_dir = ROOT / "report" / "assets" / "azure"

    def diagram_node(x, y, width, height, title, subtitle, icon=None, accent=BLUE):
        rounded_box(c, x, y, width, height, NAVY_2, colors.HexColor("#294454"), 7)
        c.setFillColor(accent)
        c.rect(x, y, 3, height, fill=1, stroke=0)
        text_x = x + 11
        if icon is not None:
            c.drawImage(
                ImageReader(str(icon)),
                x + 9,
                y + height - 27,
                19,
                19,
                preserveAspectRatio=True,
                anchor="c",
                mask="auto",
            )
            text_x = x + 34
        c.setFillColor(WHITE)
        c.setFont("BodyBold", 7.2)
        c.drawString(text_x, y + height - 18, title)
        c.setFillColor(colors.HexColor("#9BB0BB"))
        c.setFont("Body", 5.5)
        for line_i, line in enumerate(wrap(subtitle, max(15, int(width / 4.8)))):
            c.drawString(x + 11, y + height - 34 - line_i * 7.2, line)

    def badge(x, y, width, height, initials, title, subtitle, accent):
        rounded_box(c, x, y, width, height, NAVY_2, colors.HexColor("#294454"), 8)
        c.setFillColor(accent)
        c.circle(x + 24, y + height / 2, 15, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("BodyBold", 7)
        c.drawCentredString(x + 24, y + height / 2 - 2.5, initials)
        c.setFillColor(WHITE)
        c.setFont("BodyBold", 7.5)
        c.drawString(x + 48, y + height - 22, title)
        c.setFillColor(colors.HexColor("#9BB0BB"))
        c.setFont("Body", 5.7)
        c.drawString(x + 48, y + 14, subtitle)

    def route(points, color=BLUE, dashed=False, arrow_end=True):
        c.setStrokeColor(color)
        c.setFillColor(color)
        c.setLineWidth(1.05)
        if dashed:
            c.setDash(3, 2)
        for (x1, y1), (x2, y2) in zip(points, points[1:]):
            c.line(x1, y1, x2, y2)
        c.setDash()
        if arrow_end and len(points) >= 2:
            x1, y1 = points[-2]
            x2, y2 = points[-1]
            angle = math.atan2(y2 - y1, x2 - x1)
            size = 4.5
            left = (x2 - size * math.cos(angle - 0.55), y2 - size * math.sin(angle - 0.55))
            right = (x2 - size * math.cos(angle + 0.55), y2 - size * math.sin(angle + 0.55))
            path = c.beginPath()
            path.moveTo(x2, y2)
            path.lineTo(*left)
            path.lineTo(*right)
            path.close()
            c.drawPath(path, fill=1, stroke=0)

    label(c, "Architecture overview", M, H - 45, GREEN)
    c.setFillColor(WHITE)
    c.setFont("BodyBold", 24)
    c.drawString(M, H - 79, "One journey across the Azure platform.")
    paragraph(
        c,
        "The diagram shows the synthetic event path, SQL reporting branch, optional incident alerts, scheduled VM operations, and the GitHub Actions deployment workflow.",
        M,
        H - 105,
        W - 2 * M,
        8.3,
        color=colors.HexColor("#9BB0BB"),
        leading=11.6,
    )

    azure_x, azure_y, azure_w, azure_h = 104, 184, 446, 500
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.1)
    c.setDash(7, 4)
    c.roundRect(azure_x, azure_y, azure_w, azure_h, 10, fill=0, stroke=1)
    c.setDash()
    c.setFillColor(BLUE)
    c.setFont("Mono", 7)
    c.drawString(azure_x + 15, azure_y + azure_h - 20, "MICROSOFT AZURE  /  RG-AYN-SIJILL")

    # External viewer and public HTTPS route.
    badge(15, 455, 76, 66, "01", "Viewer", "HTTPS 443", GREEN)

    # Managed Azure services.
    diagram_node(126, 577, 121, 68, "Checkout Function", "shop API + timer", asset_dir / "functions.png", BLUE)
    diagram_node(260, 577, 121, 68, "Reporting Function", "authenticated ingest API", asset_dir / "functions.png", BLUE)
    diagram_node(394, 577, 132, 68, "Azure SQL", "reporting view", asset_dir / "sql-database.png", GREEN)

    c.setFillColor(colors.HexColor("#9BB0BB"))
    c.setFont("Mono", 5.5)
    c.drawString(260, 657, "ONE FUNCTION APP / TWO API ROLES")

    # VM network boundary.
    vm_x, vm_y, vm_w, vm_h = 126, 294, 260, 248
    c.setStrokeColor(colors.HexColor("#397FAD"))
    c.setLineWidth(0.9)
    c.setDash(2, 3)
    c.roundRect(vm_x, vm_y, vm_w, vm_h, 8, fill=0, stroke=1)
    c.setDash()
    c.drawImage(
        ImageReader(str(asset_dir / "network-security.png")),
        vm_x + 12,
        vm_y + vm_h - 31,
        20,
        20,
        preserveAspectRatio=True,
        mask="auto",
    )
    c.setFillColor(colors.HexColor("#79C8F2"))
    c.setFont("BodyBold", 6.8)
    c.drawString(vm_x + 38, vm_y + vm_h - 21, "SUBNET + NSG  /  UBUNTU VM  /  DOCKER COMPOSE")

    # Runtime services inside the VM.
    diagram_node(143, 455, 102, 53, "Caddy", "TLS + routing", None, BLUE)
    diagram_node(267, 455, 102, 53, "Logstash", "event processing", None, ORANGE)
    diagram_node(143, 375, 102, 53, "Filebeat", "host + Docker logs", None, GREEN)
    diagram_node(267, 375, 102, 53, "Elasticsearch", "event storage", None, GREEN)
    diagram_node(205, 310, 102, 48, "Kibana", "MAJLIS · NABD · MASAR · ATHAR", None, BLUE)
    c.drawImage(
        ImageReader(str(asset_dir / "virtual-machine.png")),
        vm_x + vm_w - 39,
        vm_y + 9,
        27,
        27,
        preserveAspectRatio=True,
        mask="auto",
    )

    # Supporting Azure services.
    diagram_node(401, 483, 125, 58, "Azure Key Vault", "runtime + Telegram secrets", asset_dir / "key-vault.png", colors.HexColor("#F2C14E"))
    diagram_node(401, 403, 125, 58, "Blob Storage", "Terraform state + locking", asset_dir / "storage.png", GREEN)
    diagram_node(401, 323, 125, 58, "Logic App", "09:00 Riyadh start", asset_dir / "logic-apps.png", BLUE)

    diagram_node(401, 243, 125, 58, "VM Auto-shutdown", "23:00 Riyadh stop", None, BLUE)

    # Runtime data flow.
    route([(91, 488), (143, 488)], GREEN)
    route([(187, 577), (187, 541), (194, 541), (194, 508)], BLUE)
    c.drawString(198, 548, "EVENTS")
    route([(245, 481), (267, 481)], ORANGE)
    route([(245, 410), (256, 410), (256, 440), (284, 440), (284, 455)], GREEN)
    route([(318, 455), (318, 428)], GREEN)
    route([(267, 399), (256, 399), (256, 358)], BLUE)
    route([(143, 465), (135, 465), (135, 334), (205, 334)], BLUE)
    route([(318, 508), (318, 553), (320, 553), (320, 577)], ORANGE)
    c.setFillColor(colors.HexColor("#9BB0BB"))
    c.setFont("Mono", 5.1)
    c.drawString(326, 550, "REPORTING COPY")
    route([(381, 611), (394, 611)], GREEN)

    # Control and secret relationships.
    route([(401, 512), (381, 512), (381, 598)], colors.HexColor("#F2C14E"), dashed=True)
    route([(401, 352), (386, 352)], BLUE, dashed=True)
    route([(401, 272), (378, 272), (378, 294)], BLUE, dashed=True)

    # External automation and notification services.
    badge(112, 88, 174, 68, "GH", "GitHub Actions", "validate · OIDC plan · approval · apply", BLUE)
    badge(316, 88, 174, 68, "TG", "Telegram alerts", "synthetic failure incident card", RED)
    route([(199, 156), (199, 176), (532, 176), (532, 432), (526, 432)], BLUE, dashed=True)
    route([(199, 176), (256, 176), (256, 294)], BLUE, dashed=True)
    c.setFillColor(colors.HexColor("#79C8F2"))
    c.setFont("Mono", 5.4)
    c.drawString(216, 166, "OIDC + TERRAFORM")
    route([(187, 645), (187, 676), (540, 676), (540, 122), (490, 122)], RED, dashed=True)
    c.setFillColor(colors.HexColor("#FF8A78"))
    c.setFont("Mono", 5.2)
    c.drawString(449, 668, "FAILED CHECKOUT")

    # Minimal legend, keeping the page diagram-first.
    c.setFillColor(colors.HexColor("#9BB0BB"))
    c.setFont("Body", 6.2)
    c.drawString(M, 62, "Solid lines: runtime data flow")
    c.drawString(M + 145, 62, "Dashed lines: deployment, schedule, or secret access")
    c.drawRightString(W - M, 62, "Synthetic commerce data only")
    footer(c, 3, dark=True)
    c.showPage()


def page_four(c):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    label(c, "The people behind the idea", M, H - 45, ORANGE)
    c.setFillColor(INK)
    c.setFont("BodyBold", 25)
    c.drawString(M, H - 80, "Meet the team.")
    paragraph(
        c,
        "We met through the SDA Cloud Computing Bootcamp and built AYN AL-SIJILL by combining multidisciplinary thinking, business analysis, cybersecurity, and cloud delivery. Different perspectives helped us examine the same problem from the customer, business, security, and operational sides.",
        M,
        H - 106,
        W - 2 * M,
        8.6,
        color=MUTED,
        leading=12.2,
    )

    clipped_image(c, TEAM_SCREENSHOT, M, 350, W - 2 * M, 335)
    c.setStrokeColor(colors.HexColor("#D8CCBA"))
    c.setLineWidth(0.7)
    c.roundRect(M, 350, W - 2 * M, 335, 10, fill=0, stroke=1)

    label(c, "Four complementary perspectives", M, 319, ORANGE)
    team_person(c, M, 273, "S", "Saud", "Multidisciplinary", PALE_ORANGE)
    team_person(c, M + 127, 273, "N", "Norah", "IT & Business Analysis", PALE_GREEN)
    team_person(c, M + 283, 273, "R", "Retaj", "Cybersecurity", PALE_BLUE)
    team_person(c, M + 410, 273, "L", "Lama", "Cybersecurity", colors.HexColor("#F2D9D6"))

    c.setStrokeColor(RULE)
    c.line(M, 257, W - M, 257)

    rounded_box(c, M, 77, W - 2 * M, 153, colors.white, colors.HexColor("#D8CCBA"), 12)
    label(c, "Continue the conversation", M + 18, 208, ORANGE)
    c.setFillColor(INK)
    c.setFont("BodyBold", 16)
    c.drawString(M + 18, 181, "Visit our team website.")
    paragraph(
        c,
        "Explore our backgrounds, experience, and resumes. The website is separate from the AYN AL-SIJILL solution and serves as the introduction to the people who created it.",
        M + 18,
        160,
        340,
        8,
        color=MUTED,
        leading=11.5,
    )
    c.setFillColor(ORANGE)
    c.setFont("Mono", 8)
    c.drawString(M + 18, 112, "sda-team-collective.vercel.app")
    c.linkURL("https://sda-team-collective.vercel.app", (M + 18, 105, M + 205, 121), relative=0)
    c.setFillColor(MUTED)
    c.setFont("Body", 6.5)
    c.drawString(M + 18, 94, "Scan the code or select the address in the PDF.")
    draw_qr(c, "https://sda-team-collective.vercel.app", W - M - 112, 98, 91)
    footer(c, 4)
    c.showPage()


def build():
    register_fonts()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
    c.setTitle("AYN AL-SIJILL Project Report")
    c.setAuthor("Saud, Retaj, Norah, and Lama")
    c.setSubject("Azure observability project, services, Ghost Order workflow, and team landing page")
    page_one(c)
    page_two(c)
    page_three(c)
    page_four(c)
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
